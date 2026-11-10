import CoreAI
import DigUpKit
import Foundation
import Tokenizers

/// [PlutoBar] EmbeddingGemma 2 on the Apple Neural Engine, through Core AI (macOS 27), in this process.
///
/// The ANEMLL conversion splits the model into three towers that run fully on the Neural Engine. Text goes straight
/// to the text tower; an image or a 2.66 s piece of audio goes through its own tower first, and its soft tokens take
/// the place of the image/audio placeholders in `<bos> … <eos>`. Longer audio (DigUp's 30 s windows) is the mean of
/// its pieces, as ANEMLL's embedder does. Measured against the reference host path: cosine ≥ 0.999.
///
/// The Neural Engine draws a fraction of the GPU's power for this work, and nothing here keeps it busy between
/// calls. Core AI compiles each tower for this Mac's Neural Engine once and caches it (the first load of a tower
/// takes about half a minute; later ones, milliseconds).
@available(macOS 27.0, *)
public final class AneEmbedder: Embedder, @unchecked Sendable {
    /// Which vectors this pipeline makes; indexes record it, and vectors from another source never share an index.
    public static let modelInfo = WorkerInfo(model: "google/embeddinggemma-2", revision: AneModels.revision,
                                             runtime: "coreai-ane-anemll1", dtype: "fp16", dim: 768,
                                             textOnly: false, loadSeconds: nil)
    public private(set) var info: WorkerInfo

    private let models: AneModels
    private let table: EmbedTable
    private let tokenizer: any Tokenizer
    private var text: InferenceFunction?
    private var vision: InferenceFunction?
    private var audio: InferenceFunction?
    private let textOnly: Bool

    public init(models: AneModels, textOnly: Bool) throws {
        let started = Date()
        guard models.complete(textOnly: textOnly) else { throw WorkerError.notFound("the Neural Engine model isn't downloaded yet") }
        self.models = models
        self.textOnly = textOnly
        table = try EmbedTable(models.host.appendingPathComponent("embed_tokens.safetensors"))
        let host = models.host
        do { tokenizer = try Self.blocking { try await AutoTokenizer.from(modelFolder: host) } }
        catch { throw WorkerError.failed("loading the tokenizer: \(error)") }
        text = try Self.load(models.tower("text_embeds_s320"), "text_embeds_s320")
        if !textOnly {
            vision = try Self.load(models.tower("vision_s280"), "vision_s280")
            audio = try Self.load(models.tower("audio_s280"), "audio_s280")
        }
        var info = Self.modelInfo
        info = WorkerInfo(model: info.model, revision: info.revision, runtime: info.runtime, dtype: info.dtype,
                          dim: info.dim, textOnly: textOnly, loadSeconds: Date().timeIntervalSince(started))
        self.info = info
    }

    /// A tower, specialized for the Neural Engine only (never the GPU), from Core AI's cache after the first time.
    ///
    /// macOS can purge the compiled Neural Engine program (~/Library/Caches/coreai-cache) while Core AI's index of it
    /// (~/Library/Application Support/coreai-cache) survives; a load from that stale entry fails ("nilError"). Then
    /// the entry is dropped and the tower compiled again (about half a minute, once).
    private static func load(_ url: URL, _ function: String) throws -> InferenceFunction {
        let options = SpecializationOptions(preferredComputeUnitKind: .neuralEngine)
        let attempt = {
            try blocking {
                let model = try await AIModel.specialize(contentsOf: url, options: options, cachePolicy: .persistent)
                guard let fn = try model.loadFunction(named: function) else {
                    throw WorkerError.failed("\(url.lastPathComponent) has no function \(function)")
                }
                return fn
            }
        }
        do {
            return try attempt()
        } catch {
            try? AIModelCache.default.deleteEntries(for: url)
            do { return try attempt() } catch {
                throw WorkerError.failed("loading \(function) on the Neural Engine: \(error)")
            }
        }
    }

    public func close() {
        text = nil
        vision = nil
        audio = nil
    }

    // MARK: Embedder

    public func embedTexts(_ texts: [String]) throws -> [[Float]] {
        try texts.map { string in
            var ids = tokenizer.encode(text: string)
            if ids.count > Tokens.length { ids = Array(ids.prefix(Tokens.length)) }
            return try runText(ids: ids, media: nil)
        }
    }

    public func embedImages(_ paths: [String], budget: Int) throws -> [Embedding] {
        guard let vision else { throw WorkerError.failed("text-only embedder") }
        return paths.map { path in
            embedding {
                let image = try ImageInput.prepare(path)
                var soft = try run(vision, [
                    "pixel_values": Self.array(image.pixels, shape: [1, ImageInput.maxPatches, 768]),
                    "pixel_position_ids": Self.array(image.positions, shape: [1, ImageInput.maxPatches, 2]),
                ], output: "soft_tokens")
                soft.removeLast(soft.count - image.slots * EmbedTable.hidden)
                return try runText(ids: [Tokens.bos] + Array(repeating: Tokens.image, count: image.slots) + [Tokens.eos],
                                   media: (Tokens.image, soft))
            }
        }
    }

    public func embedAudio(_ paths: [String]) throws -> [Embedding] {
        guard audio != nil else { throw WorkerError.failed("text-only embedder") }
        return paths.map { path in
            embedding {
                let samples = try AudioInput.read(path)
                var sum = [Float](repeating: 0, count: 768)
                var count = 0
                var start = 0
                while start < samples.count {
                    let piece = samples[start..<min(start + AudioInput.pieceSamples, samples.count)]
                    start += AudioInput.pieceSamples
                    if piece.count < AudioInput.rate / 10 { break }
                    guard let vector = try embedAudioPiece(piece) else { continue }
                    for i in 0..<768 { sum[i] += vector[i] }
                    count += 1
                }
                guard count > 0 else { throw WorkerError.failed("audio too short") }
                return Self.unit(sum)
            }
        }
    }

    private func embedAudioPiece(_ piece: ArraySlice<Float>) throws -> [Float]? {
        guard let audio, let input = AudioInput.prepare(piece) else { return nil }
        var soft = try run(audio, [
            "input_features": Self.array(input.features, shape: [1, 1, AudioInput.frames, AudioInput.bins]),
            "input_features_mask": Self.array(input.mask, shape: [1, 1, AudioInput.frames, 1]),
        ], output: "soft_tokens")
        soft.removeLast(soft.count - input.slots * EmbedTable.hidden)
        return try runText(ids: [Tokens.bos] + Array(repeating: Tokens.audio, count: input.slots) + [Tokens.eos],
                           media: (Tokens.audio, soft))
    }

    // MARK: The towers

    /// Token rows (media placeholders replaced by `media`'s soft tokens, in order), padded to 320 → unit vector.
    private func runText(ids: [Int], media: (id: Int, rows: [Float16])?) throws -> [Float] {
        guard let text else { throw WorkerError.failed("the embedder is closed") }
        let hidden = EmbedTable.hidden
        var embeds = [Float16](repeating: 0, count: Tokens.length * hidden)
        var mask = [Float16](repeating: 0, count: Tokens.length)
        var next = 0   // the next soft-token row
        embeds.withUnsafeMutableBufferPointer { out in
            for (position, id) in ids.enumerated() where position < Tokens.length {
                let target = out.baseAddress! + position * hidden
                if let media, id == media.id {
                    media.rows.withUnsafeBufferPointer { rows in
                        target.update(from: rows.baseAddress! + next * hidden, count: hidden)
                    }
                    next += 1
                } else {
                    table.row(id, into: target)
                }
                mask[position] = 1
            }
        }
        let vector = try run(text, [
            "inputs_embeds": Self.array(embeds, shape: [1, Tokens.length, hidden]),
            "attention_mask": Self.array(mask, shape: [1, Tokens.length]),
        ], output: "embedding")
        return Self.unit(vector.map(Float.init))
    }

    /// Runs a tower and returns one output as fp16 values.
    private func run(_ function: InferenceFunction, _ inputs: [String: NDArray], output: String) throws -> [Float16] {
        let box = UncheckedBox(function)
        let feed = UncheckedBox(inputs)
        return try Self.blocking {
            var outputs = try await box.value.run(inputs: feed.value)
            guard let value = outputs.remove(output), let array = value.ndArray else {
                throw WorkerError.failed("no \(output) in the tower's outputs")
            }
            let count = array.shape.reduce(1, *)
            return array.view(as: Float16.self).withUnsafePointer { p, _, _ in Array(UnsafeBufferPointer(start: p, count: count)) }
        }
    }

    /// An fp16 tensor filled with one memcpy (NDArray(scalars:) copies element by element: 8 ms of CPU for a text
    /// call, 100 for an image).
    private static func array(_ values: [Float16], shape: [Int]) -> NDArray {
        var nd = NDArray(shape: shape, scalarType: .float16)
        values.withUnsafeBufferPointer { src in
            nd.mutableView(as: Float16.self).withUnsafeMutablePointer { dst, _, _ in
                dst.update(from: src.baseAddress!, count: src.count)
            }
        }
        return nd
    }

    private func embedding(_ body: () throws -> [Float]) -> Embedding {
        do { return Embedding(vector: try body(), error: nil) } catch { return Embedding(vector: nil, error: "\(error)") }
    }

    private static func unit(_ v: [Float]) -> [Float] {
        let norm = v.reduce(0) { $0 + $1 * $1 }.squareRoot()
        return norm > 0 ? v.map { $0 / norm } : v
    }

    /// Core AI is async; the Embedder protocol isn't. Waits on a background task (never called on the main actor's
    /// executor, so it can't deadlock).
    private static func blocking<T>(_ body: @escaping @Sendable () async throws -> T) throws -> T {
        let done = DispatchSemaphore(value: 0)
        let result = UncheckedBox<Result<T, any Error>?>(nil)
        Task.detached(priority: .utility) {
            do { result.value = .success(try await body()) } catch { result.value = .failure(error) }
            done.signal()
        }
        done.wait()
        return try result.value!.get()
    }
}

final class UncheckedBox<T>: @unchecked Sendable {
    var value: T
    init(_ value: T) { self.value = value }
}

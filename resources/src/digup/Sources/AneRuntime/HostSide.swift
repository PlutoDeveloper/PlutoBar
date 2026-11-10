import Accelerate
import DigUpKit
import Foundation
import ImageIO

/// [PlutoBar] What happens on the CPU around the Neural Engine towers, ported from ANEMLL's host
/// (api/coreai_host.py, api/embedder.py) and transformers' Gemma 4 processors, so the towers see exactly the inputs
/// the reference gives them.

// MARK: - Token embeddings

/// `language_model.embed_tokens` (bf16 [262144, 512]) and its sqrt(512) scale, memory-mapped: only the rows a
/// sequence uses are ever read from disk.
final class EmbedTable: @unchecked Sendable {
    static let hidden = 512
    private let data: Data
    private let base: Int
    let scale: Float

    init(_ url: URL) throws {
        data = try Data(contentsOf: url, options: .alwaysMapped)
        let headerLength = data.withUnsafeBytes { Int($0.loadUnaligned(fromByteOffset: 0, as: UInt64.self)) }
        guard let header = try JSONSerialization.jsonObject(with: data.subdata(in: 8..<(8 + headerLength))) as? [String: Any],
              let weight = header["embed_tokens.weight"] as? [String: Any], weight["dtype"] as? String == "BF16",
              let offsets = weight["data_offsets"] as? [Int]
        else { throw WorkerError.failed("embed_tokens.safetensors: not the expected bf16 table") }
        base = 8 + headerLength + offsets[0]
        if let s = header["embed_scale"] as? [String: Any], let o = s["data_offsets"] as? [Int] {
            scale = data.withUnsafeBytes { $0.loadUnaligned(fromByteOffset: 8 + headerLength + o[0], as: Float.self) }
        } else {
            scale = Float(Double(Self.hidden).squareRoot())
        }
    }

    /// Row `id`, scaled, written as fp16 into `out` (512 values).
    func row(_ id: Int, into out: UnsafeMutablePointer<Float16>) {
        data.withUnsafeBytes { raw in
            let start = base + id * Self.hidden * 2
            for i in 0..<Self.hidden {
                let bits = UInt32(raw.loadUnaligned(fromByteOffset: start + i * 2, as: UInt16.self)) << 16
                out[i] = Float16(Float(bitPattern: bits) * scale)
            }
        }
    }
}

enum Tokens {
    static let bos = 2, eos = 1, pad = 0
    static let image = 258880, audio = 258881
    /// The text tower's fixed sequence length.
    static let length = 320
}

// MARK: - Images (Gemma4ImageProcessor: aspect-preserving resize, 16 px patches, no normalization)

struct PreparedImage {
    var pixels: [Float16]      // [2520, 768]: each patch row-major, channels last, 0…1
    var positions: [Float16]   // [2520, 2]: (x, y) of each patch, -1 for padding
    var slots: Int             // valid patches / 9: the soft tokens that count
}

enum ImageInput {
    static let patch = 16, pool = 3, maxPatches = 2520

    /// transformers' `get_aspect_ratio_preserving_size`.
    static func targetSize(height: Int, width: Int) -> (height: Int, width: Int)? {
        let targetPixels = Double(maxPatches * patch * patch)
        let factor = (targetPixels / Double(height * width)).squareRoot()
        let side = pool * patch
        var h = Int((factor * Double(height) / Double(side)).rounded(.down)) * side
        var w = Int((factor * Double(width) / Double(side)).rounded(.down)) * side
        if h == 0 && w == 0 { return nil }
        let maxSide = (maxPatches / (pool * pool)) * side
        if h == 0 {
            h = side
            w = min(Int((Double(width) / Double(height)).rounded(.down)) * side, maxSide)
        } else if w == 0 {
            w = side
            h = min(Int((Double(height) / Double(width)).rounded(.down)) * side, maxSide)
        }
        return (h, w)
    }

    static func prepare(_ path: String) throws -> PreparedImage {
        guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
              let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = props[kCGImagePropertyPixelWidth] as? Int, let height = props[kCGImagePropertyPixelHeight] as? Int,
              targetSize(height: height, width: width) != nil
        else { throw WorkerError.failed("can't read image \(path)") }
        // A very large picture (over 4× the target's sides) is first decoded smaller by ImageIO, which is far cheaper
        // than decoding 48 MP; the exact PIL resize then runs from there.
        let target0 = targetSize(height: height, width: width)!
        let limit = max(target0.height, target0.width) * 4
        let image: CGImage?
        if max(width, height) > limit {
            let options: [CFString: Any] = [
                kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: limit,
                kCGImageSourceCreateThumbnailWithTransform: false,
            ]
            image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
        } else {
            image = CGImageSourceCreateImageAtIndex(source, 0, nil)
        }
        guard let decoded = image, let (srcW, srcH, src) = rgbPixels(decoded),
              let (h, w) = targetSize(height: srcH, width: srcW)
        else { throw WorkerError.failed("can't decode image \(path)") }
        let rgba = (srcW == w && srcH == h) ? src : PILResize.bicubic(src, width: srcW, height: srcH, to: w, h)

        let ph = h / patch, pw = w / patch, dim = patch * patch * 3
        var pixels = [Float16](repeating: 0, count: maxPatches * dim)
        var positions = [Float16](repeating: -1, count: maxPatches * 2)
        for pr in 0..<ph {
            for pc in 0..<pw {
                let index = pr * pw + pc
                positions[index * 2] = Float16(Float(pc))
                positions[index * 2 + 1] = Float16(Float(pr))
                var o = index * dim
                for py in 0..<patch {
                    let row = (pr * patch + py) * w * 3
                    for px in 0..<patch {
                        let p = row + (pc * patch + px) * 3
                        pixels[o] = Float16(Float(rgba[p]) / 255)
                        pixels[o + 1] = Float16(Float(rgba[p + 1]) / 255)
                        pixels[o + 2] = Float16(Float(rgba[p + 2]) / 255)
                        o += 3
                    }
                }
            }
        }
        return PreparedImage(pixels: pixels, positions: positions, slots: (ph * pw) / (pool * pool))
    }
}

extension ImageInput {
    /// The picture's own RGB values, 8 bits, no color conversion (as PIL reads a file), alpha dropped.
    static func rgbPixels(_ image: CGImage) -> (Int, Int, [UInt8])? {
        let w = image.width, h = image.height
        // Its own color space when that's RGB (no conversion), else sRGB.
        let space = (image.colorSpace?.model == .rgb ? image.colorSpace : nil) ?? CGColorSpace(name: CGColorSpace.sRGB)!
        var rgba = [UInt8](repeating: 0, count: w * h * 4)
        guard let context = CGContext(data: &rgba, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                                      space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
        else { return nil }
        context.interpolationQuality = .none
        context.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        var rgb = [UInt8](repeating: 0, count: w * h * 3)
        for i in 0..<(w * h) {
            rgb[i * 3] = rgba[i * 4]
            rgb[i * 3 + 1] = rgba[i * 4 + 1]
            rgb[i * 3 + 2] = rgba[i * 4 + 2]
        }
        return (w, h, rgb)
    }
}

/// PIL's `Image.resize(…, BICUBIC)` for 8-bit RGB, exactly (libImaging/Resample.c): separable, horizontal then
/// vertical, an antialiased cubic (a = -0.5) whose support grows with the downscale, fixed-point coefficients
/// with 22 fraction bits, and rounding to 8 bits between the passes.
enum PILResize {
    private static let precision = 22

    private static func cubic(_ x: Double) -> Double {
        let a = -0.5, x = abs(x)
        if x < 1 { return ((a + 2) * x - (a + 3)) * x * x + 1 }
        if x < 2 { return (((x - 5) * x + 8) * x - 4) * a }
        return 0
    }

    /// For each output pixel: the first input pixel and its fixed-point weights.
    private static func coefficients(input: Int, output: Int) -> [(start: Int, weights: [Int32])] {
        let scale = Double(input) / Double(output)
        let filterScale = max(scale, 1)
        let support = 2 * filterScale
        return (0..<output).map { xx in
            let center = (Double(xx) + 0.5) * scale
            let ss = 1 / filterScale
            let xmin = max(Int(center - support + 0.5), 0)
            let xmax = min(Int(center + support + 0.5), input) - xmin
            var k = (0..<xmax).map { cubic((Double($0 + xmin) - center + 0.5) * ss) }
            let total = k.reduce(0, +)
            if total != 0 { k = k.map { $0 / total } }
            let one = Double(1 << precision)
            return (xmin, k.map { Int32($0 < 0 ? $0 * one - 0.5 : $0 * one + 0.5) })
        }
    }

    private static func clip8(_ v: Int64) -> UInt8 {
        let x = v >> precision
        return UInt8(clamping: x)
    }

    static func bicubic(_ src: [UInt8], width: Int, height: Int, to outW: Int, _ outH: Int) -> [UInt8] {
        let half = Int64(1) << (precision - 1)
        // Horizontal.
        var mid = src
        var midW = width
        if outW != width {
            let cx = coefficients(input: width, output: outW)
            mid = [UInt8](repeating: 0, count: outW * height * 3)
            for y in 0..<height {
                for x in 0..<outW {
                    let (start, w) = cx[x]
                    var s0 = half, s1 = half, s2 = half
                    for i in 0..<w.count {
                        let p = (y * width + start + i) * 3
                        s0 += Int64(src[p]) * Int64(w[i])
                        s1 += Int64(src[p + 1]) * Int64(w[i])
                        s2 += Int64(src[p + 2]) * Int64(w[i])
                    }
                    let o = (y * outW + x) * 3
                    mid[o] = clip8(s0)
                    mid[o + 1] = clip8(s1)
                    mid[o + 2] = clip8(s2)
                }
            }
            midW = outW
        }
        guard outH != height else { return mid }
        // Vertical.
        let cy = coefficients(input: height, output: outH)
        var out = [UInt8](repeating: 0, count: midW * outH * 3)
        for y in 0..<outH {
            let (start, w) = cy[y]
            for x in 0..<midW {
                var s0 = half, s1 = half, s2 = half
                for i in 0..<w.count {
                    let p = ((start + i) * midW + x) * 3
                    s0 += Int64(mid[p]) * Int64(w[i])
                    s1 += Int64(mid[p + 1]) * Int64(w[i])
                    s2 += Int64(mid[p + 2]) * Int64(w[i])
                }
                let o = (y * midW + x) * 3
                out[o] = clip8(s0)
                out[o + 1] = clip8(s1)
                out[o + 2] = clip8(s2)
            }
        }
        return out
    }
}

// MARK: - Audio (Gemma4AudioFeatureExtractor: 128-bin log-mel, 20 ms Hann frames, 10 ms hop)

struct PreparedAudio {
    var features: [Float16]   // [280, 128]
    var mask: [Float16]       // [280]: 1 = a real frame
    var slots: Int            // ceil(real frames / 4)
}

enum AudioInput {
    static let rate = 16_000, frameLength = 320, hop = 160, fftLength = 512, bins = 128, frames = 280
    static let melFloor: Float = 0.001
    /// Samples per piece: 280 frames with 5% headroom, as ANEMLL's `_window_samples` (99 frames a second).
    static let pieceSamples = Int(Double(rate) * (Double(frames) / 99.0) * 0.95)

    /// Periodic Hann window (np.hanning(321)[:-1]).
    static let window: [Float] = (0..<frameLength).map { 0.5 - 0.5 * cos(2 * .pi * Float($0) / Float(frameLength)) }

    /// HTK mel filter bank without normalization, [257, 128] (transformers' `mel_filter_bank`).
    static let filters: [Float] = {
        func mel(_ hz: Double) -> Double { 2595 * log10(1 + hz / 700) }
        func hz(_ mel: Double) -> Double { 700 * (pow(10, mel / 2595) - 1) }
        let count = fftLength / 2 + 1
        let lo = mel(0), hi = mel(8000)
        let edges = (0..<(bins + 2)).map { hz(lo + (hi - lo) * Double($0) / Double(bins + 1)) }
        let fft = (0..<count).map { Double(rate / 2) * Double($0) / Double(count - 1) }
        var out = [Float](repeating: 0, count: count * bins)
        for f in 0..<count {
            for m in 0..<bins {
                let down = -(edges[m] - fft[f]) / (edges[m + 1] - edges[m])
                let up = (edges[m + 2] - fft[f]) / (edges[m + 2] - edges[m + 1])
                out[f * bins + m] = Float(max(0, min(down, up)))
            }
        }
        return out
    }()

    /// 16-bit mono WAV (what the extractors write) as floats in -1…1, resampled if it isn't 16 kHz mono.
    static func read(_ path: String) throws -> [Float] {
        let data = try Data(contentsOf: URL(fileURLWithPath: path))
        guard data.count > 44, data.prefix(4) == Data("RIFF".utf8) else { throw WorkerError.failed("not a WAV file: \(path)") }
        var offset = 12
        var channels = 1, sampleRate = rate, bits = 16
        var samples: [Float] = []
        while offset + 8 <= data.count {
            let id = String(decoding: data[offset..<offset + 4], as: UTF8.self)
            let size = Int(data.withUnsafeBytes { $0.loadUnaligned(fromByteOffset: offset + 4, as: UInt32.self) })
            let body = offset + 8
            if id == "fmt " {
                data.withUnsafeBytes { raw in
                    channels = Int(raw.loadUnaligned(fromByteOffset: body + 2, as: UInt16.self))
                    sampleRate = Int(raw.loadUnaligned(fromByteOffset: body + 4, as: UInt32.self))
                    bits = Int(raw.loadUnaligned(fromByteOffset: body + 14, as: UInt16.self))
                }
            } else if id == "data" {
                guard bits == 16 else { throw WorkerError.failed("only 16-bit WAV: \(path)") }
                let end = min(body + size, data.count)
                let frameCount = (end - body) / (2 * channels)
                samples = data.withUnsafeBytes { raw in
                    (0..<frameCount).map { i in
                        var sum: Float = 0
                        for c in 0..<channels {
                            sum += Float(raw.loadUnaligned(fromByteOffset: body + (i * channels + c) * 2, as: Int16.self))
                        }
                        return sum / Float(channels) / 32768
                    }
                }
            }
            offset = body + size + (size & 1)
        }
        guard sampleRate != rate, !samples.isEmpty else { return samples }
        // Linear resample (the extractors already write 16 kHz; this is a fallback).
        let ratio = Double(sampleRate) / Double(rate)
        let count = Int(Double(samples.count) / ratio)
        return (0..<count).map { i in
            let x = Double(i) * ratio, j = Int(x), t = Float(x - Double(j))
            return j + 1 < samples.count ? samples[j] * (1 - t) + samples[j + 1] * t : samples[min(j, samples.count - 1)]
        }
    }

    /// One piece (≤ `pieceSamples`) → the audio tower's inputs.
    static func prepare(_ piece: ArraySlice<Float>) -> PreparedAudio? {
        // Pad to a multiple of 128 (the extractor's default), then 160 zeros on the left; the mask follows.
        let padded = ((piece.count + 127) / 128) * 128
        let left = frameLength / 2
        var wave = [Float](repeating: 0, count: left + padded)
        var keep = [Bool](repeating: false, count: left + padded)
        for (i, s) in piece.enumerated() {
            wave[left + i] = s
            keep[left + i] = true
        }
        let unfold = frameLength + 1
        let count = (wave.count - unfold) / hop + 1
        guard count > 0 else { return nil }
        let real = min(count, frames)

        let log2n = vDSP_Length(9)   // 512
        guard let setup = vDSP_create_fftsetup(log2n, FFTRadix(kFFTRadix2)) else { return nil }
        defer { vDSP_destroy_fftsetup(setup) }
        var features = [Float16](repeating: 0, count: frames * bins)
        var mask = [Float16](repeating: 0, count: frames)
        var frame = [Float](repeating: 0, count: fftLength)
        var re = [Float](repeating: 0, count: fftLength / 2), im = [Float](repeating: 0, count: fftLength / 2)
        var magnitude = [Float](repeating: 0, count: fftLength / 2 + 1)
        var mel = [Float](repeating: 0, count: bins)
        for f in 0..<real {
            let start = f * hop
            let valid = keep[start + unfold - 1]
            mask[f] = valid ? 1 : 0
            for i in 0..<fftLength { frame[i] = i < frameLength ? wave[start + i] * window[i] : 0 }
            re.withUnsafeMutableBufferPointer { rp in
                im.withUnsafeMutableBufferPointer { ip in
                    var split = DSPSplitComplex(realp: rp.baseAddress!, imagp: ip.baseAddress!)
                    frame.withUnsafeBufferPointer { fp in
                        fp.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: fftLength / 2) {
                            vDSP_ctoz($0, 2, &split, 1, vDSP_Length(fftLength / 2))
                        }
                    }
                    vDSP_fft_zrip(setup, &split, 1, log2n, FFTDirection(FFT_FORWARD))
                }
            }
            // vDSP's real FFT is scaled by 2; DC and Nyquist are packed in element 0.
            magnitude[0] = abs(re[0]) / 2
            magnitude[fftLength / 2] = abs(im[0]) / 2
            for k in 1..<(fftLength / 2) { magnitude[k] = (re[k] * re[k] + im[k] * im[k]).squareRoot() / 2 }
            vDSP_mmul(magnitude, 1, filters, 1, &mel, 1, 1, vDSP_Length(bins), vDSP_Length(fftLength / 2 + 1))
            for m in 0..<bins {
                features[f * bins + m] = valid ? Float16(log(mel[m] + melFloor)) : 0
            }
        }
        let slots = (real + 3) / 4
        return slots > 0 ? PreparedAudio(features: features, mask: mask, slots: slots) : nil
    }
}

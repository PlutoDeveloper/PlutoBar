// apple-speech: PlutoBar's dictation on Apple's own speech model (SpeechAnalyzer
// with SpeechTranscriber, macOS 26+). The model runs in macOS's speech service
// on the Neural Engine, so dictation costs this process a few MB and the GPU
// nothing (whisper.cpp holds ~650 MB and runs on the GPU).
//
// One JSON object per line each way (src/main/local/speech/appleSpeech.js):
//   in:  {"id": n, "wav": "/path.wav", "language": "en" | null, "words": ["PlutoBar", …]}
//        {"id": n, "prepare": "en" | null}       the language's model installed (a download, once)
//   out: {"id": n, "text": "…", "ms": n}  |  {"id": n, "ready": true, "locale": "en_US"}  |  {"id": n, "error": "…"}
import AVFAudio
import Foundation
import Speech

@available(macOS 26.0, *)
enum AppleSpeech {
    /// The transcriber's locale for an ISO-639-1 code (nil: this Mac's language).
    static func locale(for language: String?) async throws -> Locale {
        let wanted = language.map { Locale(identifier: $0) } ?? Locale.current
        if let locale = await SpeechTranscriber.supportedLocale(equivalentTo: wanted) { return locale }
        if language == nil, let english = await SpeechTranscriber.supportedLocale(equivalentTo: Locale(identifier: "en-US")) {
            return english
        }
        throw Failure("Apple's speech model doesn't support \(wanted.identifier)")
    }

    /// The locale's model on this Mac, downloading it if needed.
    static func prepare(_ locale: Locale) async throws {
        let transcriber = SpeechTranscriber(locale: locale, preset: .transcription)
        switch await AssetInventory.status(forModules: [transcriber]) {
        case .installed: return
        case .unsupported: throw Failure("Apple's speech model doesn't support \(locale.identifier)")
        default:
            _ = try? await AssetInventory.reserve(locale: locale)
            if let request = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
                try await request.downloadAndInstall()
            }
        }
    }

    static func transcribe(_ path: String, locale: Locale, words: [String]) async throws -> String {
        let transcriber = SpeechTranscriber(locale: locale, preset: .transcription)
        let context = AnalysisContext()
        if !words.isEmpty { context.contextualStrings[.general] = words }
        let file = try AVAudioFile(forReading: URL(fileURLWithPath: path))
        let collect = Task {
            var text = AttributedString()
            for try await result in transcriber.results where result.isFinal { text += result.text }
            return String(text.characters)
        }
        let analyzer = try await SpeechAnalyzer(inputAudioFile: file, modules: [transcriber],
                                                analysisContext: context, finishAfterFile: true)
        _ = analyzer
        return try await collect.value.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

struct Failure: Error, CustomStringConvertible {
    let description: String
    init(_ d: String) { description = d }
}

func reply(_ object: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: object),
          let line = String(data: data, encoding: .utf8) else { return }
    print(line)
    fflush(stdout)
}

@available(macOS 26.0, *)
func serve() {
    var locales: [String: Locale] = [:]   // by requested language ("" = this Mac's)
    while let line = readLine() {
        guard let data = line.data(using: .utf8),
              let request = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { continue }
        let id = request["id"] ?? NSNull()
        let done = DispatchSemaphore(value: 0)
        Task {
            defer { done.signal() }
            do {
                let language = (request["language"] as? String) ?? (request["prepare"] as? String)
                let key = language ?? ""
                let locale: Locale
                if let known = locales[key] {
                    locale = known
                } else {
                    locale = try await AppleSpeech.locale(for: language)
                    try await AppleSpeech.prepare(locale)
                    locales[key] = locale
                }
                if request.keys.contains("prepare") {
                    reply(["id": id, "ready": true, "locale": locale.identifier])
                } else if let wav = request["wav"] as? String {
                    let started = Date()
                    let text = try await AppleSpeech.transcribe(wav, locale: locale, words: request["words"] as? [String] ?? [])
                    reply(["id": id, "text": text, "ms": Int(Date().timeIntervalSince(started) * 1000)])
                }
            } catch {
                reply(["id": id, "error": "\(error)"])
            }
        }
        done.wait()
    }
}

if #available(macOS 26.0, *) {
    serve()
} else {
    reply(["error": "Apple's speech model needs macOS 26"])
    exit(1)
}

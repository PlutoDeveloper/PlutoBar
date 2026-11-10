import DigUpKit
import Foundation

/// [PlutoBar] Where the Neural Engine model lives and whether it's all there: the ANEMLL conversion of
/// EmbeddingGemma 2 (huggingface.co/anemll/anemll-embeddinggemma-2-ane, Apache 2.0), three Core AI towers plus the
/// slim host side (tokenizer, configs, the token embedding table).
///
///   text_embeds_s320  320 token rows (text, with image/audio soft tokens spliced in) → the 768-d embedding
///   vision_s280       2520 patches of 16 px → 280 soft tokens
///   audio_s280        280 log-mel frames (2.8 s) → 70 soft tokens
public struct AneModels: Sendable {
    public let folder: URL

    public static let revision = "914f7f89142e33e77833254d9c9b90c3cef7303b"   // google/embeddinggemma-2, as converted
    public static let towers = ["text_embeds_s320", "vision_s280", "audio_s280"]
    /// SHA-256 of each tower's weights (towers.yaml): a tower is only used when it matches.
    public static let checksums = [
        "text_embeds_s320": "8181d927facbcee1817a1bcb5efbd9a502b5468d5c131c0839aa624b7e1b8e1a",
        "vision_s280": "5ebb5342a5c78ab2790c82358e3ad90092ea3bbdde6a9dc85a47d4ecc8d37c0c",
        "audio_s280": "bbbd714866d5b37a2ccd9c8ec0899f966dbf5dac66031f886522a8fc6824c35f",
    ]
    public static let hostFiles = ["tokenizer.json", "tokenizer_config.json", "config.json", "embed_tokens.safetensors"]

    /// The Hugging Face repository and the revision of it these files are from.
    public static let repository = "anemll/anemll-embeddinggemma-2-ane"
    public static let repositoryRevision = "18e1b7e85cdf0c58d924c5d270c7a4be1a40159a"

    /// What `digup download-model --ane` fetches (1.49 GB), each checked against its SHA-256 before it gets its name.
    /// The text tower and host side first: searching works once they're here.
    public static let files: [ModelFiles.File] = [
        ("LICENSE", 10173, "a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9"),
        ("NOTICE", 1821, "afc64bd52b69b95ce84dd35cfd7a382fe0be746238be4243d3ae463f567962a3"),
        ("host/tokenizer.json", 32_170_510, "4d777ef5bdc1aa36227abdfb77c3e49e7b9c892d16e1b6bda41c393504828be4"),
        ("host/tokenizer_config.json", 1599, "17bd5d6e9364ca49a534e1502076593317c298d4a663623091ed45388f004874"),
        ("host/config.json", 4455, "b8f1e9931b57fbc054acdb445c41765d55b0074c58d145fa82839941ad1b5bb3"),
        ("host/embed_tokens.safetensors", 268_435_637, "a37078ff5786d9bf75b059bdc8f4009f4311bf8e7ffbc287b66bab3d38457996"),
        ("text_embeds_s320/text_embeds_s320.aimodel/main.hash", 32, "600d0dac28ed6ddc67c8f1c6529f4df4ab9b53ac8aa5da93d211a5082c9b1e20"),
        ("text_embeds_s320/text_embeds_s320.aimodel/metadata.json", 105, "345f34b85ffaf21d75b02973973d11c609946b1132a6ca10d750660cdf095b79"),
        ("text_embeds_s320/text_embeds_s320.aimodel/main.mlirb", 290_900_383, "8181d927facbcee1817a1bcb5efbd9a502b5468d5c131c0839aa624b7e1b8e1a"),
        ("vision_s280/vision_s280.aimodel/main.hash", 32, "67fe323baee07ab8c148dd48856e80ded32d7a678ab1640e1f4b844e9c8ddd4f"),
        ("vision_s280/vision_s280.aimodel/metadata.json", 105, "2e0ab08552d79365d4a42fc59c0edf0201ee99489497b68c097c84a7fb8ae7fe"),
        ("vision_s280/vision_s280.aimodel/main.mlirb", 307_191_762, "5ebb5342a5c78ab2790c82358e3ad90092ea3bbdde6a9dc85a47d4ecc8d37c0c"),
        ("audio_s280/audio_s280.aimodel/main.hash", 32, "303a6cf68b2b097fc0ad8c04d197c09d5f02159bf5dc2bbc4d1dd21ce3d123c5"),
        ("audio_s280/audio_s280.aimodel/metadata.json", 105, "0d4f7f5e5cfb81623c78dfa5aeac81850104a71f9d9d312831f8d2f11965c766"),
        ("audio_s280/audio_s280.aimodel/main.mlirb", 588_591_673, "bbbd714866d5b37a2ccd9c8ec0899f966dbf5dac66031f886522a8fc6824c35f"),
    ].map { name, bytes, sha in
        ModelFiles.File(name: name, bytes: Int64(bytes), sha256: sha,
                        source: URL(string: "https://huggingface.co/\(repository)/resolve/\(repositoryRevision)/\(name)")!)
    }

    public init(folder: URL) { self.folder = folder }

    /// `$DIGUP_ANE_MODELS`, else `<DigUp home>/ANE`.
    public static var installed: AneModels {
        if let dir = ProcessInfo.processInfo.environment["DIGUP_ANE_MODELS"], !dir.isEmpty {
            return AneModels(folder: URL(fileURLWithPath: dir, isDirectory: true))
        }
        return AneModels(folder: AppPaths.applicationSupport.appendingPathComponent("ANE", isDirectory: true))
    }

    public func tower(_ name: String) -> URL {
        folder.appendingPathComponent("\(name)/\(name).aimodel", isDirectory: true)
    }

    public var host: URL { folder.appendingPathComponent("host", isDirectory: true) }

    /// Everything a text-only (query) or full (indexing) embedder needs is on disk.
    public func complete(textOnly: Bool) -> Bool {
        let towers = textOnly ? ["text_embeds_s320"] : Self.towers
        let fm = FileManager.default
        return towers.allSatisfy { fm.fileExists(atPath: tower($0).appendingPathComponent("main.mlirb").path) }
            && Self.hostFiles.allSatisfy { fm.fileExists(atPath: host.appendingPathComponent($0).path) }
    }

    /// The Neural Engine runtime needs macOS 27's Core AI.
    public static var supported: Bool {
        if #available(macOS 27.0, *) { return true }
        return false
    }
}

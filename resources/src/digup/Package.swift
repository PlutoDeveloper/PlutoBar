// swift-tools-version: 6.2
// DigUp's search engine (github.com/ARahim3/DigUp, MIT; see LICENSE and UPSTREAM_COMMIT), built into PlutoBar:
// the `digup` command-line tool, which PlutoBar runs to download the model, index the folders you choose
// (index-service) and search them (search-service). macOS only; DigUp's own app, its Windows and Linux shell and
// its tests are left out. Changes from upstream are marked [PlutoBar].
//   scripts/build-digup.sh builds it (llama.cpp first, via scripts/build-llama.sh here) into resources/bin/digup.
import PackageDescription

let vendor = "\(Context.packageDirectory)/Vendor"

let package = Package(
    name: "DigUp",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "digup", targets: ["digup"]),
    ],
    targets: [
        // The engine: crawler, extractors, index store, the embedder interface and worker client, search. No UI.
        .target(name: "DigUpKit"),
        // llama.cpp, static with Metal (scripts/build-llama.sh builds it into Vendor/llama), and EmbeddingGemma 2 on it.
        .systemLibrary(name: "CLlama", path: "Sources/CLlama"),
        .target(name: "LlamaRuntime", dependencies: ["CLlama", "DigUpKit"],
                linkerSettings: [.unsafeFlags(["-L\(vendor)/llama/lib"])]),
        .executableTarget(name: "digup", dependencies: ["DigUpKit", "LlamaRuntime"]),
    ]
)

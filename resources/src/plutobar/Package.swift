// swift-tools-version: 5.9
// PlutoBar: VoiceOS's Spotlight-style bar. One Liquid Glass search field that
// finds apps, actions, clipboard items and (through DigUp) your files by what's
// in them, and hands everything else to the assistant, Siri-in-Spotlight style.
//   PlutoAddon  Node-API entry point (plutobar.node), loaded into VoiceOS's main
//               process by src/main/local/plutobar/index.js
//   PlutoBar    the panel and its SwiftUI views; it only draws: every result and
//               every answer comes from JS
import PackageDescription

let package = Package(
  name: "PlutoBar",
  platforms: [.macOS(.v14)],
  products: [
    .library(name: "PlutoBar", type: .dynamic, targets: ["PlutoAddon", "PlutoBar"]),
  ],
  targets: [
    // N-API symbols come from the Electron process that loads it.
    .target(
      name: "PlutoAddon",
      path: "Sources/PlutoAddon",
      cSettings: [.define("NAPI_VERSION", to: "8")],
      linkerSettings: [.unsafeFlags(["-Xlinker", "-undefined", "-Xlinker", "dynamic_lookup"])]
    ),
    .target(name: "PlutoBar", path: "Sources/PlutoBar"),
  ]
)

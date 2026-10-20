import AppKit
import SwiftUI

// PlutoBar Settings, laid out like System Settings: a sidebar of panes, each a
// grouped form. JS owns every value (src/main/local/settingsWindow.js) and
// pushes them in with `update(_:)`; every change goes out as
// {"a":"settings","do":…} and comes back in the next push.
final class SettingsController: NSObject, NSWindowDelegate {
  let model = SettingsModel()
  private var window: NSWindow?

  var isVisible: Bool { window?.isVisible == true }

  func show(pane: String?) {
    if let pane, let p = SettingsModel.Pane(rawValue: pane) { model.pane = p }
    let window = self.window ?? makeWindow()
    self.window = window
    NSApp.activate(ignoringOtherApps: true)
    window.makeKeyAndOrderFront(nil)
    model.act("opened")
  }

  func close() { window?.close() }

  private func makeWindow() -> NSWindow {
    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 780, height: 600),
      styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
    window.title = "PlutoBar Settings"
    window.titlebarAppearsTransparent = true
    window.toolbarStyle = .unified
    window.minSize = NSSize(width: 680, height: 480)
    window.isReleasedWhenClosed = false
    window.delegate = self
    // The window keeps the size you give it; panes don't resize it.
    let hosting = NSHostingView(rootView: SettingsView(model: model))
    hosting.sizingOptions = []
    window.contentView = hosting
    window.center()
    window.setFrameAutosaveName("PlutoBar Settings")
    return window
  }

  func windowWillClose(_ notification: Notification) {
    model.act("closed")
    window = nil
  }
}

final class SettingsModel: ObservableObject {
  enum Pane: String, CaseIterable, Identifiable {
    case general, search, pluto, apps, dictation, permissions, about
    var id: String { rawValue }
    var title: String {
      switch self {
      case .general: "General"
      case .search: "Search"
      case .pluto: "Pluto"
      case .apps: "Apps & Actions"
      case .dictation: "Dictation & Speech"
      case .permissions: "Privacy & Permissions"
      case .about: "About"
      }
    }
    var symbol: String {
      switch self {
      case .general: "gearshape.fill"
      case .search: "magnifyingglass"
      case .pluto: "sparkles"
      case .apps: "square.grid.2x2.fill"
      case .dictation: "waveform"
      case .permissions: "hand.raised.fill"
      case .about: "info.circle.fill"
      }
    }
    var tint: Color {
      switch self {
      case .general: .gray
      case .search: .blue
      case .pluto: .purple
      case .apps: .orange
      case .dictation: .pink
      case .permissions: .indigo
      case .about: .gray
      }
    }
  }

  struct Option: Identifiable, Hashable {
    let id: String
    let label: String
  }

  struct Folder: Identifiable, Equatable {
    let path: String
    let detail: String
    var id: String { path }
  }

  @Published var pane: Pane = .general
  @Published var s: [String: Any] = [:]
  @Published var folders: [Folder] = []
  @Published var skipped: [Folder] = []
  @Published var codeFolders: [Folder] = []
  @Published var typesText = ""
  @Published var keyText = ""
  private var typesEdited = false

  func update(_ o: [String: Any]) {
    s = o
    let rows = { (list: Any?) in
      (list as? [[String: Any]] ?? []).map { Folder(path: $0["path"] as? String ?? "", detail: $0["detail"] as? String ?? "") }
    }
    folders = rows(search["folders"])
    skipped = rows(search["skipped"])
    codeFolders = rows(search["codeFolders"])
    if !typesEdited { typesText = search["types"] as? String ?? "" }
    if let p = o["pane"] as? String, let pane = Pane(rawValue: p) { self.pane = pane }
  }

  // Sections of the state.
  var general: [String: Any] { s["general"] as? [String: Any] ?? [:] }
  var search: [String: Any] { s["search"] as? [String: Any] ?? [:] }
  var pluto: [String: Any] { s["pluto"] as? [String: Any] ?? [:] }
  var speech: [String: Any] { s["speech"] as? [String: Any] ?? [:] }
  var permissions: [String: Any] { s["permissions"] as? [String: Any] ?? [:] }
  var about: [String: Any] { s["about"] as? [String: Any] ?? [:] }

  func options(_ list: Any?) -> [Option] {
    (list as? [[String: Any]] ?? []).map { Option(id: $0["id"] as? String ?? "", label: $0["label"] as? String ?? "") }
  }

  // A binding that sends `what` with the new value.
  func bool(_ section: [String: Any], _ key: String, _ what: String) -> Binding<Bool> {
    Binding(get: { section[key] as? Bool ?? false }, set: { [weak self] v in self?.act(what, ["value": v]) })
  }

  func string(_ section: [String: Any], _ key: String, _ what: String) -> Binding<String> {
    Binding(get: { section[key] as? String ?? "" }, set: { [weak self] v in self?.act(what, ["value": v]) })
  }

  func typesChanged(_ text: String) {
    typesText = text
    typesEdited = true
  }

  func commitTypes() {
    typesEdited = false
    act("types", ["value": typesText])
  }

  func pick(_ what: String, prompt: String) {
    let panel = NSOpenPanel()
    panel.canChooseDirectories = true
    panel.canChooseFiles = false
    panel.allowsMultipleSelection = true
    panel.prompt = prompt
    panel.beginSheetModal(for: NSApp.keyWindow ?? NSWindow()) { [weak self] r in
      guard r == .OK else { return }
      self?.act(what, ["paths": panel.urls.map(\.path)])
    }
  }

  func act(_ what: String, _ extra: [String: Any] = [:]) {
    var payload: [String: Any] = ["a": "settings", "do": what]
    payload.merge(extra) { $1 }
    guard let data = try? JSONSerialization.data(withJSONObject: payload), let json = String(data: data, encoding: .utf8) else { return }
    json.withCString { plutobarEmitAction($0) }
  }
}

// MARK: - Views

struct SettingsView: View {
  @ObservedObject var model: SettingsModel

  var body: some View {
    NavigationSplitView {
      List(SettingsModel.Pane.allCases, selection: Binding(get: { model.pane }, set: { if let p = $0 { model.pane = p } })) { pane in
        Label {
          Text(pane.title)
        } icon: {
          Image(systemName: pane.symbol)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 20, height: 20)
            .background(RoundedRectangle(cornerRadius: 5, style: .continuous).fill(pane.tint.gradient))
        }
        .tag(pane)
      }
      .navigationSplitViewColumnWidth(min: 190, ideal: 210, max: 240)
    } detail: {
      Group {
        switch model.pane {
        case .general: GeneralPane()
        case .search: SearchPane()
        case .pluto: PlutoPane()
        case .apps: AppsPane()
        case .dictation: DictationPane()
        case .permissions: PermissionsPane()
        case .about: AboutPane()
        }
      }
      .formStyle(.grouped)
      .navigationTitle(model.pane.title)
    }
    .environmentObject(model)
    .frame(minWidth: 680, minHeight: 480)
  }
}

private struct Note: View {
  let text: String
  var body: some View {
    Text(text).font(.system(size: 11)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
  }
}

private struct StatusDot: View {
  let ok: Bool
  var body: some View {
    Image(systemName: ok ? "checkmark.circle.fill" : "exclamationmark.circle.fill").foregroundStyle(ok ? .green : .orange)
  }
}

// MARK: General

private struct GeneralPane: View {
  @EnvironmentObject var m: SettingsModel
  private let shortcuts: [(String, String)] = [
    ("Command+Space", "⌘ Space"), ("Alt+Space", "⌥ Space"), ("Control+Alt+Space", "⌃⌥ Space"), ("Command+Shift+Space", "⇧⌘ Space"),
  ]

  var body: some View {
    let g = m.general
    Form {
      Section {
        Picker("Open PlutoBar with", selection: m.string(g, "shortcut", "shortcut")) {
          ForEach(shortcuts, id: \.0) { Text($0.1).tag($0.0) }
        }
        if g["spotlightConflict"] as? Bool == true {
          HStack {
            Note(text: "Spotlight still answers ⌘ Space.")
            Spacer()
            Button("Turn Off Spotlight's ⌘ Space") { m.act("freeSpotlight") }
          }
        } else if g["shortcutOk"] as? Bool == false {
          Note(text: "Another app already uses that shortcut. Pick another.")
        }
        Toggle("PlutoBar is on", isOn: m.bool(g, "enabled", "enabled"))
      } header: {
        Text("Shortcut")
      } footer: {
        Note(text: "Holding your voice shortcut talks to Pluto from anywhere, with or without the bar open.")
      }
      Section("When PlutoBar starts") {
        Toggle("Open at login", isOn: m.bool(g, "loginItem", "loginItem"))
        Toggle("Show in the Dock", isOn: m.bool(g, "showInDock", "showInDock"))
        Toggle("Show indexing progress in the menu bar", isOn: m.bool(g, "menuBarProgress", "menuBarProgress"))
      }
      Section {
        Toggle("Ask Pluto first when a query reads like a question", isOn: m.bool(g, "askFirst", "askFirst"))
        Toggle("Calculator and website shortcuts", isOn: m.bool(g, "quickAnswers", "quickAnswers"))
      } header: {
        Text("Results")
      } footer: {
        Note(text: "Ask Pluto is always offered. With the first switch on, it's the top hit for questions and requests (“what's…”, “remind me…”).")
      }
      Section("Clipboard history") {
        Toggle("Keep what I copy (⌘4)", isOn: m.bool(g, "clipboard", "clipboard"))
        HStack {
          Note(text: "The last 8 hours, in memory only. Copies a password manager marks as concealed are never kept.")
          Spacer()
          Button("Clear History") { m.act("clearClipboard") }
        }
      }
      Section {
        HStack {
          Text("Setup")
          Spacer()
          Button("Run Setup Again…") { m.act("runSetup") }
        }
      }
    }
  }
}

// MARK: Search

private struct SearchPane: View {
  @EnvironmentObject var m: SettingsModel

  var body: some View {
    let s = m.search
    Form {
      Section {
        VStack(alignment: .leading, spacing: 8) {
          HStack {
            Text(s["headline"] as? String ?? "").font(.system(size: 13, weight: .semibold))
            Spacer()
            if s["indexing"] as? Bool == true { ProgressView().controlSize(.small) }
          }
          if let p = s["progress"] as? Double { ProgressView(value: p) }
          Note(text: s["detail"] as? String ?? "")
        }
        .padding(.vertical, 4)
        HStack {
          Button(s["paused"] as? Bool == true ? "Resume Indexing" : "Pause Indexing") { m.act("pause", ["value": !(s["paused"] as? Bool ?? false)]) }
          Button("Index Now") { m.act("indexNow") }
          Spacer()
          if (s["model"] as? String) == "needed" || (s["model"] as? String) == "failed" {
            Button("Download Search Model") { m.act("downloadModel") }
          }
        }
        Toggle("Do the first pass on battery too", isOn: m.bool(s, "onBattery", "onBattery"))
      } header: {
        Text("Index")
      } footer: {
        Note(text: "New files are read a moment after they appear, on any power source. The first pass of a big folder waits for power unless you turn that on.")
      }
      Section {
        ForEach(m.folders) { f in FolderLine(folder: f) { m.act("removeFolder", ["path": f.path]) } }
        Button { m.pick("addFolders", prompt: "Search") } label: { Label("Add Folder…", systemImage: "plus") }
      } header: {
        Text("Folders to search")
      }
      Section {
        ForEach(m.skipped) { f in FolderLine(folder: f) { m.act("unskipFolder", ["path": f.path]) } }
        Button { m.pick("skipFolders", prompt: "Skip") } label: { Label("Skip a Folder…", systemImage: "plus") }
        TextField("File types to skip", text: Binding(get: { m.typesText }, set: { m.typesChanged($0) }), prompt: Text("e.g. heic, txt"))
          .onSubmit { m.commitTypes() }
      } header: {
        Text("Leave out")
      } footer: {
        Note(text: "Keys, certificates, passwords, hidden folders, apps and caches are always skipped. Press Return after editing the file types.")
      }
      Section {
        Toggle("Search my code", isOn: m.bool(s, "codeOn", "codeOn"))
        if s["codeOn"] as? Bool == true {
          ForEach(m.codeFolders) { f in FolderLine(folder: f) { m.act("removeCodeFolder", ["path": f.path]) } }
          Button { m.pick("addCodeFolders", prompt: "Search") } label: { Label("Add Code Folder…", systemImage: "plus") }
        }
      } header: {
        Text("Code")
      } footer: {
        Note(text: "Start a search with code: to find a function by what it does (“code: retry with backoff”). Results open in your editor at the line.")
      }
      Section {
        Note(text: "File search is DigUp's engine (MIT, by Abdur Rahim) with Google DeepMind's EmbeddingGemma 2, running entirely on this Mac. PlutoBar only reads your files: it never changes, moves or uploads them.")
      }
    }
  }
}

private struct FolderLine: View {
  let folder: SettingsModel.Folder
  let remove: () -> Void
  var body: some View {
    HStack(spacing: 10) {
      Image(nsImage: NSWorkspace.shared.icon(forFile: folder.path)).resizable().frame(width: 22, height: 22)
      VStack(alignment: .leading, spacing: 1) {
        Text((folder.path as NSString).abbreviatingWithTildeInPath).lineLimit(1).truncationMode(.middle)
        if !folder.detail.isEmpty { Text(folder.detail).font(.system(size: 11)).foregroundStyle(.secondary) }
      }
      Spacer()
      Button(action: remove) { Image(systemName: "minus.circle.fill").foregroundStyle(.secondary) }.buttonStyle(.plain).help("Remove")
    }
  }
}

// MARK: Pluto

private struct PlutoPane: View {
  @EnvironmentObject var m: SettingsModel

  var body: some View {
    let p = m.pluto
    let claude = p["claude"] as? [String: Any] ?? [:]
    let signedIn = claude["signedIn"] as? Bool ?? false
    let usingKey = (p["engine"] as? String) == "apikey"
    Form {
      Section {
        HStack {
          StatusDot(ok: signedIn || p["apiKey"] as? Bool == true)
          VStack(alignment: .leading, spacing: 1) {
            Text(claude["title"] as? String ?? "Claude")
            Note(text: claude["detail"] as? String ?? "")
          }
          Spacer()
          if claude["installed"] as? Bool == false {
            Button("Install Claude Code") { m.act("installClaude") }
          } else if !signedIn {
            Button("Sign In") { m.act("signIn") }
          } else {
            Button("Refresh") { m.act("refreshClaude") }
          }
        }
        Picker("Use", selection: m.string(p, "engine", "engine")) {
          Text("My Claude account (Claude Code)").tag("subscription")
          Text("An API key").tag("apikey")
        }
      } header: {
        Text("Claude")
      } footer: {
        Note(text: "Pluto is Claude. PlutoBar runs your installed Claude Code (Pro and Max plans) and never sees your password, or uses an Anthropic API key.")
      }
      Section("Models") {
        if usingKey {
          Picker("Pluto", selection: m.string(p, "apiModel", "apiModel")) { ForEach(m.options(p["apiModels"])) { Text($0.label).tag($0.id) } }
          Picker("Quick tasks", selection: m.string(p, "apiFastModel", "apiFastModel")) { ForEach(m.options(p["apiModels"])) { Text($0.label).tag($0.id) } }
        } else {
          Picker("Pluto", selection: m.string(p, "model", "model")) { ForEach(m.options(p["models"])) { Text($0.label).tag($0.id) } }
          Picker("Quick tasks", selection: m.string(p, "fastModel", "fastModel")) { ForEach(m.options(p["models"])) { Text($0.label).tag($0.id) } }
        }
      }
      Section {
        if p["apiKey"] as? Bool == true {
          HStack {
            Text("API key saved")
            Spacer()
            Button("Remove", role: .destructive) { m.act("clearKey") }
          }
        } else {
          HStack {
            SecureField("API key", text: $m.keyText, prompt: Text("sk-ant-…"))
            Button("Save") {
              m.act("saveKey", ["key": m.keyText])
              m.keyText = ""
            }
            .disabled(m.keyText.trimmingCharacters(in: .whitespaces).isEmpty)
          }
        }
        if let e = p["error"] as? String, !e.isEmpty { Note(text: e) }
      } header: {
        Text("API key")
      } footer: {
        Note(text: "Optional. Stored encrypted with your Keychain.")
      }
      Section("Voice") {
        Toggle("Speak Pluto's answers", isOn: m.bool(p, "speak", "speak"))
        Picker("Voice", selection: m.string(p, "voice", "voice")) { ForEach(m.options(p["voices"])) { Text($0.label).tag($0.id) } }
        Picker("Speed", selection: m.string(p, "speed", "speed")) {
          Text("Slow").tag("slow")
          Text("Normal").tag("normal")
          Text("Fast").tag("fast")
        }
        HStack {
          Spacer()
          Button("Play Sample") { m.act("previewVoice") }
        }
      }
      Section {
        Toggle("Let Pluto search my files", isOn: m.bool(p, "filesTool", "filesTool"))
        HStack {
          Note(text: "What Pluto may do in your apps (send, create, move), and which actions ask for your OK first.")
          Spacer()
          Button("Agent Actions…") { m.act("openPage", ["page": "agent"]) }
        }
        HStack {
          Note(text: "Every conversation with Pluto and every dictation.")
          Spacer()
          Button("History…") { m.act("openPage", ["page": "history"]) }
        }
      } header: {
        Text("What Pluto can do")
      }
    }
  }
}

// MARK: Apps & Actions

private struct AppsPane: View {
  @EnvironmentObject var m: SettingsModel

  var body: some View {
    let p = m.pluto
    Form {
      Section {
        HStack {
          Note(text: "Connect Messages, Mail, Notes, Calendar, Reminders, Finder, Music, Spotify, Obsidian, coding agents, MCP servers and more. Pluto uses them when you ask.")
          Spacer()
          Button("Manage Apps…") { m.act("openPage", ["page": "appstore"]) }
        }
      } header: {
        Text("Connected apps")
      }
      Section {
        Toggle("X (Twitter)", isOn: m.bool(p, "x", "x"))
      } header: {
        Text("Built in")
      } footer: {
        Note(text: "Reads public posts, profiles and search with no account; posting opens X with the text ready for you to send.")
      }
      Section {
        HStack {
          Note(text: "Toggle Dark Mode, Lock Screen, Play/Pause, your Shortcuts and more show up as you type, or browse them with ⌘3.")
          Spacer()
          Button("Open Shortcuts") { m.act("openShortcuts") }
        }
      } header: {
        Text("Actions in the bar")
      }
    }
  }
}

// MARK: Dictation & Speech

private struct DictationPane: View {
  @EnvironmentObject var m: SettingsModel

  var body: some View {
    let s = m.speech
    Form {
      Section {
        Picker("Speech recognition", selection: m.string(s, "whisperModel", "whisperModel")) {
          ForEach(m.options(s["whisperModels"])) { Text($0.label).tag($0.id) }
        }
        if let text = s["status"] as? String, !text.isEmpty {
          HStack {
            Note(text: text)
            Spacer()
            if s["needsDownload"] as? Bool == true { Button("Download") { m.act("downloadSpeech") } }
          }
        }
      } header: {
        Text("Speech")
      } footer: {
        Note(text: "Whisper runs on this Mac, offline. The models download once.")
      }
      Section {
        HStack {
          Note(text: "Hold your dictation shortcut in any app and talk: PlutoBar types what you say. Polishing, your dictionary and shortcuts are on the Dictation page.")
          Spacer()
          Button("Dictation…") { m.act("openPage", ["page": "dictation"]) }
        }
        HStack {
          Note(text: "Voice shortcuts, microphone and languages.")
          Spacer()
          Button("Shortcuts & Microphone…") { m.act("openClassicSettings") }
        }
      } header: {
        Text("Dictation")
      }
    }
  }
}

// MARK: Permissions

private struct PermissionsPane: View {
  @EnvironmentObject var m: SettingsModel

  var body: some View {
    let p = m.permissions
    Form {
      Section {
        PermissionLine(title: "Microphone", detail: "Hearing you while you hold a shortcut or press the mic.", ok: p["microphone"] as? String == "granted") { m.act("microphone") }
        PermissionLine(title: "Accessibility", detail: "Typing for you, pasting clipboard items, and letting Pluto press buttons in other apps.", ok: p["accessibility"] as? String == "granted") { m.act("accessibility") }
        PermissionLine(title: "Screen Recording", detail: "Optional: lets Pluto look at your screen when you ask about it.", ok: p["screen"] as? String == "granted") { m.act("screen") }
      } header: {
        Text("Permissions")
      } footer: {
        Note(text: p["packaged"] as? Bool == false ? "This is the development build (“Electron”), which macOS doesn't grant reliably. Run npm run app for the signed PlutoBar." : "macOS also asks once before PlutoBar reads folders like Desktop and Documents, and before Pluto controls another app.")
      }
      Section("Privacy") {
        Note(text: "Speech, the voice and file search run on this Mac. Only what you ask Pluto goes to Claude. PlutoBar sends nothing to the old VoiceOS servers, and has no analytics.")
      }
    }
  }
}

private struct PermissionLine: View {
  let title: String
  let detail: String
  let ok: Bool
  let open: () -> Void
  var body: some View {
    HStack {
      StatusDot(ok: ok)
      VStack(alignment: .leading, spacing: 1) {
        Text(title)
        Note(text: detail)
      }
      Spacer()
      if !ok { Button("Allow…", action: open) }
    }
  }
}

// MARK: About

private struct AboutPane: View {
  @EnvironmentObject var m: SettingsModel

  var body: some View {
    let a = m.about
    Form {
      Section {
        HStack(spacing: 16) {
          Image(nsImage: NSApp.applicationIconImage).resizable().frame(width: 64, height: 64)
          VStack(alignment: .leading, spacing: 3) {
            Text("PlutoBar").font(.system(size: 20, weight: .bold))
            Text("Version \(a["version"] as? String ?? "")").foregroundStyle(.secondary)
          }
        }
        .padding(.vertical, 6)
        HStack {
          Note(text: a["dataPath"] as? String ?? "")
          Spacer()
          Button("Show in Finder") { m.act("revealData") }
        }
      }
      Section("Built with") {
        Note(text: "DigUp's search engine (MIT) · EmbeddingGemma 2 by Google DeepMind (Apache 2.0) · llama.cpp (MIT) · whisper.cpp (MIT) · Kokoro (Apache 2.0) · Claude by Anthropic. Grew out of VoiceOS.")
      }
    }
  }
}

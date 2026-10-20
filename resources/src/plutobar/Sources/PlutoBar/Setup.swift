import AppKit
import SwiftUI

// First launch, DigUp-style: one step at a time, the big download starting on
// Get Started and shown at the bottom of every later step, each step applied
// as you continue, the shortcut tried for real, and a last page of things to
// try. JS owns the facts (permissions, downloads, Claude, DigUp) and pushes
// them in with `update(_:)`; buttons go out as {"a":"setup","do":…}.
final class SetupController: NSObject, NSWindowDelegate {
  let model = SetupModel()
  private var window: NSWindow?

  var isVisible: Bool { window?.isVisible == true }

  func show() {
    let window = self.window ?? makeWindow()
    self.window = window
    NSApp.activate(ignoringOtherApps: true)
    window.makeKeyAndOrderFront(nil)
    model.act("opened")
  }

  func close() { window?.close() }

  private func makeWindow() -> NSWindow {
    let window = NSWindow(
      contentRect: NSRect(origin: .zero, size: SetupView.size),
      styleMask: [.titled, .closable, .fullSizeContentView], backing: .buffered, defer: false)
    window.titlebarAppearsTransparent = true
    window.titleVisibility = .hidden
    window.isMovableByWindowBackground = true
    window.title = "Welcome to PlutoBar"
    window.isReleasedWhenClosed = false
    window.delegate = self
    model.close = { [weak self] in self?.close() }
    window.contentView = NSHostingView(rootView: SetupView(model: model))
    window.center()
    return window
  }

  func windowWillClose(_ notification: Notification) {
    model.act("closed", ["finished": model.finished])
    window?.contentView = nil
    window = nil
  }
}

final class SetupModel: ObservableObject {
  enum Step: Int, CaseIterable { case welcome, permissions, claude, files, shortcut, ready }

  struct Folder: Identifiable, Equatable {
    let path: String
    var chosen = true
    var detail = ""
    var id: String { path }
  }

  @Published var step = Step.welcome
  @Published var finished = false

  // Facts from JS.
  @Published var speechPhase = "needed"  // needed | downloading | ready | failed
  @Published var speechFraction: Double = 0
  @Published var speechText = ""
  @Published var microphone = "not-determined"
  @Published var accessibility = "denied"
  @Published var packaged = true
  @Published var claudeInstalled = false
  @Published var claudeSignedIn = false
  @Published var claudeChecked = false
  @Published var claudeAccount = ""
  @Published var hasApiKey = false
  @Published var claudeError = ""
  @Published var folders: [Folder] = []
  @Published var codeOn = false
  @Published var codeFolders: [Folder] = []
  @Published var foldersSummary = ""
  @Published var searchable = 0
  @Published var pendingFiles = 0
  @Published var shortcut = "Alt+Space"
  @Published var shortcutOk = true
  @Published var spotlightConflict = false
  @Published var hotkeyWorked = false
  @Published var loginItem = true
  @Published var busy = ""

  var close: () -> Void = {}

  func update(_ o: [String: Any]) {
    if let s = o["speech"] as? [String: Any] {
      speechPhase = s["phase"] as? String ?? speechPhase
      speechFraction = s["fraction"] as? Double ?? 0
      speechText = s["text"] as? String ?? ""
    }
    if let p = o["permissions"] as? [String: Any] {
      microphone = p["microphone"] as? String ?? microphone
      accessibility = p["accessibility"] as? String ?? accessibility
      packaged = p["packaged"] as? Bool ?? packaged
    }
    if let c = o["claude"] as? [String: Any] {
      claudeInstalled = c["installed"] as? Bool ?? false
      claudeSignedIn = c["signedIn"] as? Bool ?? false
      claudeChecked = c["checked"] as? Bool ?? false
      claudeAccount = c["account"] as? String ?? ""
      hasApiKey = c["apiKey"] as? Bool ?? false
      claudeError = c["error"] as? String ?? ""
    }
    if let f = o["files"] as? [String: Any] {
      let rows = { (list: Any?) in
        (list as? [[String: Any]] ?? []).map {
          Folder(path: $0["path"] as? String ?? "", chosen: $0["chosen"] as? Bool ?? false, detail: $0["detail"] as? String ?? "")
        }
      }
      folders = rows(f["folders"])
      codeOn = f["codeOn"] as? Bool ?? false
      codeFolders = rows(f["codeFolders"])
      foldersSummary = f["summary"] as? String ?? ""
      searchable = f["searchable"] as? Int ?? 0
      pendingFiles = f["pending"] as? Int ?? 0
    }
    if let s = o["shortcut"] as? String { shortcut = s }
    if let ok = o["shortcutOk"] as? Bool { shortcutOk = ok }
    if let c = o["spotlightConflict"] as? Bool { spotlightConflict = c }
    if o["hotkey"] as? Bool == true { withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) { hotkeyWorked = true } }
    if let l = o["loginItem"] as? Bool { loginItem = l }
    if let b = o["busy"] as? String { busy = b }
    if let step = o["step"] as? Int, let s = Step(rawValue: step) { go(to: s) }
  }

  var claudeReady: Bool { claudeSignedIn || hasApiKey }
  var permissionsReady: Bool { microphone == "granted" && accessibility == "granted" }

  // MARK: steps

  func next() {
    switch step {
    case .welcome:
      act("start")  // the go-ahead for the speech downloads
      go(to: .permissions)
    case .permissions: go(to: .claude)
    case .claude: go(to: .files)
    case .files: go(to: .shortcut)
    case .shortcut: go(to: .ready)
    case .ready:
      finished = true
      act("finish", ["loginItem": loginItem])
      close()
    }
  }

  func back() {
    guard let s = Step(rawValue: step.rawValue - 1) else { return }
    go(to: s)
  }

  func go(to s: Step) {
    withAnimation(.easeInOut(duration: 0.22)) { step = s }
    if s == .shortcut { hotkeyWorked = false }
    act("step", ["step": s.rawValue])
  }

  // Folders from the standard picker, for the Files step.
  func pickFolders(code: Bool) {
    let panel = NSOpenPanel()
    panel.canChooseDirectories = true
    panel.canChooseFiles = false
    panel.allowsMultipleSelection = true
    panel.prompt = "Search"
    panel.message = code ? "Choose folders with your code projects" : "Choose folders for PlutoBar to search"
    let done: (NSApplication.ModalResponse) -> Void = { [weak self] r in
      guard r == .OK else { return }
      self?.act(code ? "addCodeFolders" : "addFolders", ["paths": panel.urls.map(\.path)])
    }
    if let window = NSApp.keyWindow { panel.beginSheetModal(for: window, completionHandler: done) } else { done(panel.runModal()) }
  }

  func act(_ what: String, _ extra: [String: Any] = [:]) {
    var payload: [String: Any] = ["a": "setup", "do": what]
    payload.merge(extra) { $1 }
    guard let data = try? JSONSerialization.data(withJSONObject: payload), let json = String(data: data, encoding: .utf8) else { return }
    json.withCString { plutobarEmitAction($0) }
  }
}

// MARK: - Views

struct SetupView: View {
  static let size = CGSize(width: 680, height: 600)
  @ObservedObject var model: SetupModel

  var body: some View {
    VStack(spacing: 0) {
      Group {
        switch model.step {
        case .welcome: WelcomeStep()
        case .permissions: PermissionsStep()
        case .claude: ClaudeStep()
        case .files: FilesStep()
        case .shortcut: ShortcutStep()
        case .ready: ReadyStep()
        }
      }
      .transition(.opacity.combined(with: .offset(x: 12)))
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: model.step == .welcome ? .center : .top)
      .padding(.horizontal, 48)
      .padding(.top, 46)
      Divider()
      footer
    }
    .frame(width: Self.size.width, height: Self.size.height)
    .background(alignment: .top) {
      // A soft wash of Pluto's colors behind the top of each step.
      LinearGradient(colors: [PlutoGlow.colors[0], PlutoGlow.colors[2], PlutoGlow.colors[3]], startPoint: .leading, endPoint: .trailing)
        .frame(height: 280)
        .mask(LinearGradient(colors: [.black.opacity(0.16), .clear], startPoint: .top, endPoint: .bottom))
        .ignoresSafeArea()
    }
    .environmentObject(model)
  }

  private var footer: some View {
    HStack(spacing: 14) {
      StepDots(current: model.step.rawValue, count: SetupModel.Step.allCases.count)
      if model.step != .welcome { SpeechStatus() }
      Spacer(minLength: 8)
      if model.step == .files {
        Text(model.foldersSummary).font(.system(size: 12)).foregroundStyle(.secondary).lineLimit(1)
      }
      if model.step != .welcome, model.step != .ready {
        Button("Back") { model.back() }
      }
      Button(continueTitle) { model.next() }
        .keyboardShortcut(.defaultAction)
    }
    .controlSize(.large)
    .padding(.horizontal, 20)
    .frame(height: 64)
  }

  private var continueTitle: String {
    switch model.step {
    case .welcome: "Get Started"
    case .ready: "Start Using PlutoBar"
    case .claude where !model.claudeReady: "Skip for Now"
    case .files where !model.folders.contains(where: \.chosen): "Skip for Now"
    default: "Continue"
    }
  }
}

private struct StepDots: View {
  let current: Int
  let count: Int
  var body: some View {
    HStack(spacing: 6) {
      ForEach(0..<count, id: \.self) { i in
        Circle().fill(i == current ? Color.primary.opacity(0.55) : Color.primary.opacity(0.15)).frame(width: 6, height: 6)
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Step \(current + 1) of \(count)")
  }
}

// The speech models' download, small, at the bottom of every step after the first.
private struct SpeechStatus: View {
  @EnvironmentObject var model: SetupModel
  var body: some View {
    HStack(spacing: 7) {
      switch model.speechPhase {
      case "ready":
        Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
        Text("Models ready")
      case "failed":
        Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
        Text(model.speechText.isEmpty ? "Download failed" : model.speechText).lineLimit(1)
        Button("Try Again") { model.act("start") }.controlSize(.small)
      case "downloading":
        ProgressView(value: model.speechFraction).progressViewStyle(.circular).controlSize(.small)
        Text("Downloading models · \(model.speechText)").lineLimit(1)
      default:
        Image(systemName: "arrow.down.circle").foregroundStyle(.secondary)
        Text("Models not downloaded")
        Button("Download") { model.act("start") }.controlSize(.small)
      }
    }
    .font(.system(size: 12))
    .foregroundStyle(.secondary)
  }
}

private struct StepTitle: View {
  let title: String
  let subtitle: String
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(title).font(.system(size: 24, weight: .bold))
      Text(subtitle).font(.system(size: 13)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

private struct Feature: View {
  let icon: AnyView
  let title: String
  let example: String
  var body: some View {
    HStack(spacing: 14) {
      icon
        .frame(width: 34, height: 34)
        .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(Color.primary.opacity(0.08)))
      VStack(alignment: .leading, spacing: 2) {
        Text(title).font(.system(size: 14, weight: .semibold))
        Text(example).font(.system(size: 12)).foregroundStyle(.secondary)
      }
    }
    .frame(maxWidth: 480, alignment: .leading)
  }
}

private func symbol(_ name: String) -> AnyView {
  AnyView(Image(systemName: name).font(.system(size: 16, weight: .medium)).foregroundStyle(.primary))
}

private struct WelcomeStep: View {
  var body: some View {
    VStack(spacing: 0) {
      Image(nsImage: NSApp.applicationIconImage)
        .resizable()
        .frame(width: 104, height: 104)
        .shadow(color: PlutoGlow.colors[0].opacity(0.4), radius: 16, y: 6)
      Text("PlutoBar").font(.system(size: 30, weight: .bold)).padding(.top, 8)
      Text("Search it. Ask it. Done.").font(.system(size: 16)).foregroundStyle(.secondary).padding(.top, 2)
      VStack(alignment: .leading, spacing: 16) {
        Feature(icon: symbol("magnifyingglass"), title: "Find anything",
                example: "apps, actions, your clipboard, and files by what's in them: “a dog on the beach”")
        Feature(icon: AnyView(PlutoOrb().padding(8)), title: "Ask Pluto",
                example: "questions, writing, and things to do on your Mac: “remind me to call mom at 6”")
        Feature(icon: symbol("mic"), title: "Or just say it",
                example: "hold your voice shortcut and talk, or type into any app by voice")
      }
      .padding(.top, 30)
      HStack(alignment: .top, spacing: 12) {
        Image(systemName: "lock.shield").font(.system(size: 18)).foregroundStyle(.secondary).frame(width: 30)
        Text("Speech, Pluto's voice and file search all run on this Mac: PlutoBar downloads their models once "
          + "(about 1.6 GB). Nothing you index ever leaves your Mac; only what you ask Pluto goes to Claude.")
          .font(.system(size: 12)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
      }
      .padding(.top, 26)
      .frame(maxWidth: 480, alignment: .leading)
    }
    .frame(maxWidth: .infinity)
    .padding(.bottom, 30)
  }
}

// One thing to set up: what it is, whether it's done, and the button that does it.
private struct SetupRow<Trailing: View>: View {
  let symbol: String
  let title: String
  let detail: String
  let done: Bool
  @ViewBuilder var trailing: Trailing

  var body: some View {
    HStack(spacing: 14) {
      Image(systemName: symbol).font(.system(size: 18)).foregroundStyle(.secondary).frame(width: 28)
      VStack(alignment: .leading, spacing: 2) {
        Text(title).font(.system(size: 14, weight: .semibold))
        Text(detail).font(.system(size: 12)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
      }
      Spacer(minLength: 12)
      if done {
        Label("Done", systemImage: "checkmark.circle.fill").labelStyle(.iconOnly).font(.system(size: 20)).foregroundStyle(.green)
          .transition(.scale.combined(with: .opacity))
      } else {
        trailing
      }
    }
    .padding(14)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.primary.opacity(0.045)))
    .animation(.spring(response: 0.3, dampingFraction: 0.75), value: done)
  }
}

private struct PermissionsStep: View {
  @EnvironmentObject var model: SetupModel
  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      StepTitle(title: "Let PlutoBar hear and help",
                subtitle: "Two permissions, asked once. You can change them anytime in System Settings → Privacy & Security.")
      VStack(spacing: 10) {
        SetupRow(symbol: "mic", title: "Microphone",
                 detail: "So Pluto can hear you while you hold the voice shortcut or press the mic. Never otherwise.",
                 done: model.microphone == "granted") {
          Button(model.microphone == "denied" ? "Open Settings" : "Allow") { model.act("microphone") }
        }
        SetupRow(symbol: "accessibility", title: "Accessibility",
                 detail: "So PlutoBar can type for you, paste clipboard items, and let Pluto press buttons in other apps when you ask.",
                 done: model.accessibility == "granted") {
          Button("Open Settings") { model.act("accessibility") }
        }
      }
      if !model.packaged {
        Label("This is the development build (“Electron”), which macOS doesn't grant reliably. Run npm run app for the signed PlutoBar.",
              systemImage: "exclamationmark.triangle")
          .font(.system(size: 11)).foregroundStyle(.orange).fixedSize(horizontal: false, vertical: true)
      } else if model.accessibility != "granted" {
        Label("In Accessibility, turn on PlutoBar, then come back here.", systemImage: "info.circle")
          .font(.system(size: 11)).foregroundStyle(.secondary)
      }
    }
  }
}

private struct ClaudeStep: View {
  @EnvironmentObject var model: SetupModel
  @State private var key = ""
  @State private var usingKey = false

  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      StepTitle(title: "Connect Pluto's brain",
                subtitle: "Pluto is Claude. PlutoBar uses the Claude account you're signed into in Claude Code, or an Anthropic API key. It never sees or stores your Claude password.")
      SetupRow(symbol: "sparkles", title: claudeTitle, detail: claudeDetail, done: model.claudeReady) {
        if model.busy == "claude" {
          ProgressView().controlSize(.small)
        } else if !model.claudeInstalled {
          Button("Install Claude Code") { model.act("installClaude") }
        } else {
          Button("Sign In") { model.act("signIn") }
        }
      }
      if !model.claudeReady {
        DisclosureGroup(isExpanded: $usingKey) {
          HStack(spacing: 8) {
            SecureField("sk-ant-…", text: $key).textFieldStyle(.roundedBorder)
            Button("Save") {
              model.act("apiKey", ["key": key])
              key = ""
            }
            .disabled(key.trimmingCharacters(in: .whitespaces).isEmpty || model.busy == "apiKey")
          }
          .padding(.top, 8)
        } label: {
          Text("Use an API key instead").font(.system(size: 12, weight: .medium)).foregroundStyle(.secondary)
        }
        .padding(.horizontal, 4)
      }
      if !model.claudeError.isEmpty {
        Label(model.claudeError, systemImage: "exclamationmark.triangle").font(.system(size: 12)).foregroundStyle(.orange)
          .fixedSize(horizontal: false, vertical: true)
      }
      Text("You can skip this and still search: Pluto answers once Claude is connected (Settings → Claude).")
        .font(.system(size: 11)).foregroundStyle(.secondary)
    }
  }

  private var claudeTitle: String {
    if model.claudeSignedIn { return model.claudeAccount.isEmpty ? "Claude connected" : "Claude: \(model.claudeAccount)" }
    if model.hasApiKey { return "Claude: API key" }
    if !model.claudeChecked { return "Looking for Claude Code…" }
    return model.claudeInstalled ? "Claude Code isn't signed in" : "Claude Code isn't installed"
  }

  private var claudeDetail: String {
    if model.claudeReady { return "Pluto is ready to answer." }
    return model.claudeInstalled
      ? "Sign In opens Anthropic's own sign-in page in your browser."
      : "Install Claude Code (free with Claude Pro and Max), then sign in."
  }
}

private struct FilesStep: View {
  @EnvironmentObject var model: SetupModel

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      StepTitle(title: "What should PlutoBar search?",
                subtitle: "Photos by what they show, PDFs at the page, recordings and videos at the moment. Pick folders; you can change them anytime in Settings → PlutoBar.")
      ScrollView {
        VStack(spacing: 6) {
          ForEach(model.folders) { f in
            FolderRow(folder: f) { model.act("toggleFolder", ["path": f.path]) }
          }
          HStack {
            Button {
              model.pickFolders(code: false)
            } label: {
              Label("Add Folder…", systemImage: "plus")
            }
            .controlSize(.small)
            Spacer()
          }
          .padding(.top, 2)
          Toggle(isOn: Binding(get: { model.codeOn }, set: { model.act("codeOn", ["on": $0]) })) {
            VStack(alignment: .leading, spacing: 2) {
              Text("Search my code too").font(.system(size: 13, weight: .medium))
              Text("Start a search with code: to find a function by what it does. It opens in your editor at the line.")
                .font(.system(size: 11)).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
          }
          .toggleStyle(.switch)
          .padding(.top, 12)
          if model.codeOn {
            ForEach(model.codeFolders) { f in
              FolderRow(folder: f, removable: true) { model.act("removeCodeFolder", ["path": f.path]) }
            }
            HStack {
              Button {
                model.pickFolders(code: true)
              } label: {
                Label("Add Code Folder…", systemImage: "plus")
              }
              .controlSize(.small)
              Spacer()
            }
          }
        }
      }
      HStack(alignment: .top, spacing: 8) {
        Image(systemName: "info.circle").foregroundStyle(.secondary)
        Text("macOS asks before PlutoBar can read folders like Desktop, Documents and Downloads. It only reads files: never changes, moves or uploads them. Keys, passwords, hidden folders and apps are always skipped.")
          .fixedSize(horizontal: false, vertical: true)
      }
      .font(.system(size: 11))
      .foregroundStyle(.secondary)
      .padding(.bottom, 10)
    }
  }
}

private struct FolderRow: View {
  let folder: SetupModel.Folder
  var removable = false
  let action: () -> Void

  var body: some View {
    HStack(spacing: 12) {
      if removable {
        Button(action: action) { Image(systemName: "minus.circle.fill").foregroundStyle(.secondary) }.buttonStyle(.plain)
      } else {
        Toggle("", isOn: Binding(get: { folder.chosen }, set: { _ in action() })).labelsHidden().toggleStyle(.checkbox)
      }
      Image(nsImage: NSWorkspace.shared.icon(forFile: folder.path)).resizable().frame(width: 26, height: 26)
      VStack(alignment: .leading, spacing: 1) {
        Text((folder.path as NSString).abbreviatingWithTildeInPath).font(.system(size: 13, weight: .medium)).lineLimit(1).truncationMode(.middle)
        Text(folder.detail).font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
      }
      Spacer()
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.primary.opacity(folder.chosen ? 0.06 : 0.03)))
    .opacity(folder.chosen || removable ? 1 : 0.6)
    .contentShape(Rectangle())
    .onTapGesture { if !removable { action() } }
  }
}

private struct ShortcutStep: View {
  @EnvironmentObject var model: SetupModel
  private let options: [(String, String, String)] = [
    ("Command+Space", "⌘ Space", "Like Spotlight"),
    ("Alt+Space", "⌥ Space", ""),
    ("Control+Alt+Space", "⌃⌥ Space", ""),
    ("Command+Shift+Space", "⇧⌘ Space", ""),
  ]

  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      StepTitle(title: "Your shortcut",
                subtitle: "Press it in any app to open PlutoBar. Press it again, or Esc, to close it.")
      LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
        ForEach(options, id: \.0) { value, keys, note in
          let selected = model.shortcut == value
          Button {
            model.act("shortcut", ["value": value])
          } label: {
            VStack(spacing: 4) {
              Text(keys).font(.system(size: 20, weight: .medium, design: .rounded))
              Text(note.isEmpty ? " " : note).font(.system(size: 11)).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(selected ? Color.accentColor.opacity(0.16) : Color.primary.opacity(0.045)))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(selected ? Color.accentColor : .clear, lineWidth: 1.5))
            .contentShape(Rectangle())
          }
          .buttonStyle(.plain)
        }
      }
      if model.spotlightConflict {
        HStack(spacing: 10) {
          Label("Spotlight still answers ⌘ Space.", systemImage: "info.circle")
            .font(.system(size: 12)).foregroundStyle(.secondary)
          Spacer()
          Button("Turn Off Spotlight's ⌘ Space") { model.act("freeSpotlight") }
        }
      }
      if !model.shortcutOk {
        Label("Another app already uses that shortcut. Pick another.", systemImage: "exclamationmark.triangle")
          .font(.system(size: 12)).foregroundStyle(.orange)
      }
      HStack(spacing: 12) {
        Image(systemName: model.hotkeyWorked ? "checkmark.circle.fill" : "keyboard")
          .font(.system(size: 22))
          .foregroundStyle(model.hotkeyWorked ? AnyShapeStyle(Color.green) : AnyShapeStyle(.secondary))
        VStack(alignment: .leading, spacing: 2) {
          Text(model.hotkeyWorked ? "That's it." : "Try it now: press \(label(model.shortcut))")
            .font(.system(size: 14, weight: .semibold))
          Text(model.hotkeyWorked ? "PlutoBar opened. Press Esc to close it, then continue." : "PlutoBar opens over this window.")
            .font(.system(size: 12)).foregroundStyle(.secondary)
        }
        Spacer()
      }
      .padding(14)
      .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.primary.opacity(0.045)))
    }
  }

  private func label(_ accel: String) -> String { options.first { $0.0 == accel }?.1 ?? accel }
}

private struct ReadyStep: View {
  @EnvironmentObject var model: SetupModel
  private let tips: [(String, String, String)] = [
    ("app.badge", "saf", "opens Safari"),
    ("equal.circle", "12% of 80", "answers right there"),
    ("photo", "a dog on the beach", "finds the photo"),
    ("film", "zebra in a video", "opens it at the moment"),
    ("chevron.left.forwardslash.chevron.right", "code: retry with backoff", "finds the function"),
    ("sparkles", "what's on my calendar today?", "asks Pluto"),
  ]

  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      StepTitle(title: "You're all set", subtitle: "A few things to try. ⌘1–⌘4 browse Applications, Files, Actions and Clipboard.")
      VStack(spacing: 8) {
        ForEach(tips, id: \.1) { icon, query, result in
          HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 14)).foregroundStyle(.secondary).frame(width: 22)
            Text(query).font(.system(size: 14, weight: .medium))
            Text(result).font(.system(size: 13)).foregroundStyle(.secondary)
            Spacer()
          }
          .padding(.horizontal, 14)
          .padding(.vertical, 9)
          .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.primary.opacity(0.045)))
        }
      }
      Toggle(isOn: $model.loginItem) {
        VStack(alignment: .leading, spacing: 2) {
          Text("Open PlutoBar at login").font(.system(size: 13, weight: .medium))
          Text("So the shortcut always works.").font(.system(size: 11)).foregroundStyle(.secondary)
        }
      }
      .toggleStyle(.switch)
    }
  }
}

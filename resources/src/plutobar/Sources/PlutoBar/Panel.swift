import AppKit
import SwiftUI

// The bar's window: a borderless, non-activating panel (it takes the keyboard
// without bringing VoiceOS forward, so the app you were in stays the front app,
// as with Spotlight). It sits a quarter of the way down the screen with the
// pointer and grows downward with its content.
final class PlutoPanel: NSPanel {
  override var canBecomeKey: Bool { true }
  override var canBecomeMain: Bool { false }
}

final class PlutoController: NSObject, NSWindowDelegate {
  static let width: CGFloat = 640
  // Room around the glass for its shadow.
  static let margin: CGFloat = 36

  let model = PlutoModel()
  private var panel: PlutoPanel?
  private var hosting: NSHostingView<PlutoRoot>?
  private var keyMonitor: Any?
  private var clickMonitors: [Any] = []
  private var contentHeight: CGFloat = PlutoMetrics.barHeight
  private var shrinkWork: DispatchWorkItem?
  private var topY: CGFloat = 0
  private var visible = false

  var isVisible: Bool { visible }

  private func makePanel() -> PlutoPanel {
    let panel = PlutoPanel(
      contentRect: NSRect(x: 0, y: 0, width: Self.width + Self.margin * 2, height: PlutoMetrics.barHeight + Self.margin * 2),
      styleMask: [.borderless, .nonactivatingPanel, .fullSizeContentView],
      backing: .buffered,
      defer: false
    )
    panel.isFloatingPanel = true
    panel.level = .modalPanel
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .transient, .ignoresCycle]
    panel.backgroundColor = .clear
    panel.isOpaque = false
    panel.hasShadow = false
    panel.hidesOnDeactivate = false
    panel.becomesKeyOnlyIfNeeded = false
    panel.isMovableByWindowBackground = false
    panel.animationBehavior = .none
    panel.delegate = self

    let root = PlutoRoot(model: model) { [weak self] h in self?.contentChanged(h) }
    let hosting = NSHostingView(rootView: root)
    hosting.sizingOptions = []
    hosting.frame = panel.contentRect(forFrameRect: panel.frame)
    hosting.autoresizingMask = [.width, .height]
    panel.contentView = hosting
    self.hosting = hosting
    return panel
  }

  // MARK: show / hide

  // `key`: take the keyboard (the shortcut, a click). A voice turn from the
  // shortcut shows the bar without taking it from the app you're typing in.
  func show(key: Bool = true) {
    let panel = self.panel ?? makePanel()
    self.panel = panel
    if !visible {
      place(panel)
      panel.alphaValue = 0
      visible = true
      model.opened()
      panel.orderFrontRegardless()
      NSAnimationContext.runAnimationGroup { ctx in
        ctx.duration = 0.14
        panel.animator().alphaValue = 1
      }
    }
    if key {
      panel.makeKey()
      model.focusToken += 1
    }
    installKeys()
  }

  func hide() {
    guard visible, let panel else { return }
    visible = false
    removeKeys()
    NSAnimationContext.runAnimationGroup({ ctx in
      ctx.duration = 0.12
      panel.animator().alphaValue = 0
    }, completionHandler: { [weak self] in
      guard let self, !self.visible else { return }
      panel.orderOut(nil)
    })
    model.hidden()
  }

  func toggle() { visible && (panel?.isKeyWindow ?? false) ? hide() : show() }

  // Clicking anywhere else closes the bar, unless the assistant still needs it
  // (listening, working, waiting for your approval).
  // Switching apps from the keyboard (⌘Tab) closes an idle search. A
  // conversation stays: other windows take focus for all sorts of reasons
  // while Pluto works, and only a click elsewhere should close it.
  func windowDidResignKey(_ notification: Notification) {
    guard visible, model.mode == .search, !model.holdsOpen else { return }
    hide()
  }

  // Like Spotlight: a click anywhere outside the bar closes it, whatever Pluto
  // is doing (it carries on, and the shortcut brings it back). Not while it's
  // listening or waiting for your approval.
  private func clickedOutside() {
    guard visible, model.phase != .listening, model.confirmation == nil else { return }
    hide()
  }

  private func installClickWatch() {
    guard clickMonitors.isEmpty else { return }
    let kinds: NSEvent.EventTypeMask = [.leftMouseDown, .rightMouseDown, .otherMouseDown]
    // Clicks in other apps (and the desktop).
    if let m = NSEvent.addGlobalMonitorForEvents(matching: kinds, handler: { [weak self] _ in self?.clickedOutside() }) {
      clickMonitors.append(m)
    }
    // Clicks in PlutoBar's own other windows.
    if let m = NSEvent.addLocalMonitorForEvents(matching: kinds, handler: { [weak self] event in
      if let self, let panel = self.panel, event.window !== panel { self.clickedOutside() }
      return event
    }) {
      clickMonitors.append(m)
    }
  }

  private func removeClickWatch() {
    for m in clickMonitors { NSEvent.removeMonitor(m) }
    clickMonitors = []
  }

  // The screen with the pointer: a quarter of the way down, centered.
  private func place(_ panel: PlutoPanel) {
    let mouse = NSEvent.mouseLocation
    let screen = NSScreen.screens.first { NSMouseInRect(mouse, $0.frame, false) } ?? NSScreen.main ?? NSScreen.screens[0]
    let f = screen.visibleFrame
    topY = f.maxY - (f.height * 0.2).rounded() + Self.margin
    let height = contentHeight + Self.margin * 2
    let x = (f.midX - (Self.width + Self.margin * 2) / 2).rounded()
    panel.setFrame(NSRect(x: x, y: topY - height, width: Self.width + Self.margin * 2, height: height), display: true)
  }

  // The content's height changed: grow right away (the new part is
  // transparent until the content animates into it), shrink once the
  // content's own animation is done, always keeping the top edge in place.
  private func contentChanged(_ h: CGFloat) {
    let h = ceil(h)
    guard abs(h - contentHeight) > 0.5 else { return }
    let grow = h > contentHeight
    contentHeight = h
    shrinkWork?.cancel()
    let apply = { [weak self] in
      guard let self, let panel = self.panel else { return }
      var frame = panel.frame
      let height = self.contentHeight + Self.margin * 2
      if self.visible, self.topY > 0 { frame.origin.y = self.topY - height } else { frame.origin.y = frame.maxY - height }
      frame.size.height = height
      panel.setFrame(frame, display: true)
    }
    if grow {
      apply()
    } else {
      let work = DispatchWorkItem(block: apply)
      shrinkWork = work
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.4, execute: work)
    }
  }

  // scripts/dev/plutobar.sh: the keys a test drives the bar with.
  func debugKey(_ name: String) {
    switch name {
    case "down": model.moveSelection(1)
    case "up": model.moveSelection(-1)
    case "return": model.activate()
    case "escape": if !model.escape() { hide() }
    case "home": withAnimation(PlutoMotion.morph) { model.showHome = true }
    default:
      if let s = PlutoModel.Scope.allCases.first(where: { $0.key == name }) { model.setScope(s) }
    }
  }

  // MARK: keys

  // Arrows, Return, Escape and ⌘1…⌘4 go to the bar before the text field sees them.
  private func installKeys() {
    installClickWatch()
    guard keyMonitor == nil else { return }
    keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
      guard let self, let panel = self.panel, event.window === panel else { return event }
      return self.key(event) ? nil : event
    }
  }

  private func removeKeys() {
    if let keyMonitor { NSEvent.removeMonitor(keyMonitor) }
    keyMonitor = nil
    removeClickWatch()
  }

  private func key(_ event: NSEvent) -> Bool {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    let command = flags.contains(.command)
    // While an approval is up: Escape cancels, ⌘Return approves, and every
    // other key belongs to the fields you may be editing.
    if model.confirmation != nil {
      if event.keyCode == 53 {
        model.cancelConfirmation()
        return true
      }
      if event.keyCode == 36, command {
        model.approve()
        return true
      }
      return false
    }
    switch event.keyCode {
    case 53:  // Escape
      if !model.escape() { hide() }
      return true
    case 125:  // ↓
      model.moveSelection(1)
      return true
    case 126:  // ↑
      model.moveSelection(-1)
      return true
    case 36, 76:  // Return
      model.activate(modifiers: flags)
      return true
    case 51:  // Delete on an empty field leaves the scope
      if model.query.isEmpty, model.scope != nil {
        model.setScope(nil)
        return true
      }
      return false
    default:
      break
    }
    if command, let chars = event.charactersIgnoringModifiers {
      if let scope = PlutoModel.Scope.allCases.first(where: { $0.key == chars }) {
        model.setScope(model.scope == scope ? nil : scope)
        return true
      }
      if chars == "n" {
        model.newConversation()
        return true
      }
      if chars == "w" {
        hide()
        return true
      }
    }
    return false
  }
}

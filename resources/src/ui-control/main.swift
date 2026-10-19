// ui-control — lets VoiceOS see and operate the frontmost app through the
// macOS Accessibility API (the same API screen readers use).
//
//   ui-control snapshot <state.json> [maxElements]   list the front window's controls (JSON)
//   ui-control press <state.json> <id>               press/click element <id> from the last snapshot
//   ui-control focus <state.json> <id>               focus a text field from the last snapshot
//   ui-control click <x> <y> [left|right|double]     click at screen point (points)
//   ui-control type <text>                           type text into the focused control
//   ui-control key <combo>                           e.g. "cmd+l", "return", "shift+tab", "down"
//   ui-control scroll <up|down|left|right> [lines] [x y]
//   ui-control describe <x> <y>                      what is at a screen point (role, label, app)
//
// UI_CONTROL_SELF_PID (VoiceOS's own pid): when VoiceOS itself is frontmost,
// e.g. the user typed the request into the notch, the app right behind it is
// the one to look at and operate. UI_CONTROL_STATE (the snapshot file) lets
// type/key/click/scroll bring that app forward first.
//
// Elements are addressed by their child-index path from the app element,
// saved in <state.json> by `snapshot`, so ids stay valid between commands.

import AppKit
import ApplicationServices
import Foundation

// MARK: - output

func emit(_ obj: Any) {
  let data = try! JSONSerialization.data(withJSONObject: obj, options: [.sortedKeys])
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write("\n".data(using: .utf8)!)
}

func fail(_ message: String) -> Never {
  emit(["ok": false, "error": message])
  exit(1)
}

// MARK: - AX helpers

func attr(_ el: AXUIElement, _ name: String) -> AnyObject? {
  var value: AnyObject?
  return AXUIElementCopyAttributeValue(el, name as CFString, &value) == .success ? value : nil
}

func str(_ el: AXUIElement, _ name: String) -> String? {
  guard let v = attr(el, name) else { return nil }
  if let s = v as? String { return s.isEmpty ? nil : s }
  if let n = v as? NSNumber { return n.stringValue }
  return nil
}

func children(_ el: AXUIElement) -> [AXUIElement] {
  (attr(el, kAXChildrenAttribute as String) as? [AXUIElement]) ?? []
}

func frame(_ el: AXUIElement) -> CGRect? {
  guard let p = attr(el, kAXPositionAttribute as String), let s = attr(el, kAXSizeAttribute as String) else { return nil }
  var point = CGPoint.zero
  var size = CGSize.zero
  AXValueGetValue(p as! AXValue, .cgPoint, &point)
  AXValueGetValue(s as! AXValue, .cgSize, &size)
  return CGRect(origin: point, size: size)
}

func clip(_ s: String?, _ n: Int) -> String? {
  guard var s = s?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return nil }
  s = s.replacingOccurrences(of: "\n", with: " ")
  return s.count > n ? String(s.prefix(n)) + "…" : s
}

// Rows, cells and some buttons carry their name in a child text element.
func innerText(_ el: AXUIElement, depth: Int = 0) -> String? {
  if depth > 4 { return nil }
  for child in children(el) {
    let role = str(child, kAXRoleAttribute as String)
    if role == "AXStaticText", let v = str(child, kAXValueAttribute as String) ?? str(child, kAXTitleAttribute as String) { return v }
    if let v = innerText(child, depth: depth + 1) { return v }
  }
  return nil
}

let actionable: Set<String> = [
  "AXButton", "AXLink", "AXTextField", "AXTextArea", "AXSearchField", "AXSecureTextField", "AXCheckBox",
  "AXRadioButton", "AXPopUpButton", "AXMenuButton", "AXComboBox", "AXTab", "AXMenuItem", "AXSlider",
  "AXDisclosureTriangle", "AXIncrementor", "AXCell", "AXRow", "AXSwitch", "AXToggle", "AXDockItem",
]
let textual: Set<String> = ["AXHeading", "AXStaticText"]

// MARK: - state (element paths from the last snapshot)

struct Entry: Codable { let path: [Int]; let role: String; let label: String?; let x: Double; let y: Double }
struct State: Codable { let pid: Int32; let entries: [Entry] }

let selfPid: pid_t? = ProcessInfo.processInfo.environment["UI_CONTROL_SELF_PID"].flatMap { Int32($0) }
let selfBundle: String? = selfPid.flatMap { NSRunningApplication(processIdentifier: $0)?.bundleIdentifier }

func isSelf(_ app: NSRunningApplication) -> Bool {
  if let selfPid, app.processIdentifier == selfPid { return true }
  if let selfBundle, let b = app.bundleIdentifier, b == selfBundle || b.hasPrefix(selfBundle + ".") { return true }
  return false
}

// The app to operate: the frontmost one, or the one right behind VoiceOS.
func frontApp() -> NSRunningApplication {
  guard let app = NSWorkspace.shared.frontmostApplication else { fail("No frontmost app") }
  if !isSelf(app) { return app }
  let info = (CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]]) ?? []
  for w in info {  // front to back
    guard (w[kCGWindowLayer as String] as? Int) == 0, let pid = w[kCGWindowOwnerPID as String] as? pid_t,
      let bounds = w[kCGWindowBounds as String] as? [String: Any],
      (bounds["Width"] as? Double ?? 0) > 80, (bounds["Height"] as? Double ?? 0) > 80,
      (w[kCGWindowAlpha as String] as? Double ?? 1) > 0.05,
      let owner = NSRunningApplication(processIdentifier: pid), !isSelf(owner), owner.activationPolicy == .regular
    else { continue }
    return owner
  }
  return app
}

// Before synthetic keys or clicks: if VoiceOS is in front, bring the app from
// the last snapshot forward so the input reaches it.
func activateTarget() {
  guard let front = NSWorkspace.shared.frontmostApplication, isSelf(front),
    let file = ProcessInfo.processInfo.environment["UI_CONTROL_STATE"],
    let data = FileManager.default.contents(atPath: file), let state = try? JSONDecoder().decode(State.self, from: data),
    let target = NSRunningApplication(processIdentifier: state.pid), !isSelf(target)
  else { return }
  target.activate()
  for _ in 0..<20 where NSWorkspace.shared.frontmostApplication?.processIdentifier != state.pid { usleep(25_000) }
  usleep(120_000)
}

// Name of a control, for people: its title/description, else its inner text.
func labelOf(_ el: AXUIElement) -> String? {
  clip(str(el, kAXTitleAttribute as String) ?? str(el, kAXDescriptionAttribute as String)
    ?? str(el, "AXLabel") ?? str(el, kAXHelpAttribute as String) ?? innerText(el), 80)
}

func resolve(_ root: AXUIElement, _ path: [Int]) -> AXUIElement? {
  var el = root
  for i in path {
    let kids = children(el)
    guard i < kids.count else { return nil }
    el = kids[i]
  }
  return el
}

func loadState(_ file: String) -> State {
  guard let data = FileManager.default.contents(atPath: file), let s = try? JSONDecoder().decode(State.self, from: data) else {
    fail("No snapshot yet — call look first")
  }
  return s
}

// MARK: - input events

func postClick(_ p: CGPoint, kind: String) {
  let src = CGEventSource(stateID: .hidSystemState)
  let (down, up, button): (CGEventType, CGEventType, CGMouseButton) =
    kind == "right" ? (.rightMouseDown, .rightMouseUp, .right) : (.leftMouseDown, .leftMouseUp, .left)
  CGEvent(mouseEventSource: src, mouseType: .mouseMoved, mouseCursorPosition: p, mouseButton: button)?.post(tap: .cghidEventTap)
  usleep(40_000)
  let clicks = kind == "double" ? 2 : 1
  for n in 1...clicks {
    let d = CGEvent(mouseEventSource: src, mouseType: down, mouseCursorPosition: p, mouseButton: button)
    let u = CGEvent(mouseEventSource: src, mouseType: up, mouseCursorPosition: p, mouseButton: button)
    d?.setIntegerValueField(.mouseEventClickState, value: Int64(n))
    u?.setIntegerValueField(.mouseEventClickState, value: Int64(n))
    d?.post(tap: .cghidEventTap)
    usleep(30_000)
    u?.post(tap: .cghidEventTap)
    usleep(60_000)
  }
}

func typeText(_ text: String) {
  let src = CGEventSource(stateID: .hidSystemState)
  for chunk in text.map({ String($0) }) {
    let utf16 = Array(chunk.utf16)
    for down in [true, false] {
      let e = CGEvent(keyboardEventSource: src, virtualKey: 0, keyDown: down)
      e?.keyboardSetUnicodeString(stringLength: utf16.count, unicodeString: utf16)
      e?.post(tap: .cghidEventTap)
    }
    usleep(8_000)
  }
}

let keyCodes: [String: CGKeyCode] = [
  "return": 36, "enter": 36, "tab": 48, "space": 49, "delete": 51, "backspace": 51, "escape": 53, "esc": 53,
  "left": 123, "right": 124, "down": 125, "up": 126, "home": 115, "end": 119, "pageup": 116, "pagedown": 121,
  "forwarddelete": 117, "f5": 96,
  "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9, "b": 11, "q": 12, "w": 13,
  "e": 14, "r": 15, "y": 16, "t": 17, "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23, "=": 24, "9": 25,
  "7": 26, "-": 27, "8": 28, "0": 29, "]": 30, "o": 31, "u": 32, "[": 33, "i": 34, "p": 35, "l": 37, "j": 38,
  "'": 39, "k": 40, ";": 41, "\\": 42, ",": 43, "/": 44, "n": 45, "m": 46, ".": 47, "`": 50,
]

func pressCombo(_ combo: String) {
  var parts = combo.lowercased().split(separator: "+").map { String($0).trimmingCharacters(in: .whitespaces) }
  guard let keyName = parts.popLast() else { fail("Empty key combo") }
  guard let code = keyCodes[keyName] else { fail("Unknown key: \(keyName)") }
  var flags: CGEventFlags = []
  for m in parts {
    switch m {
    case "cmd", "command": flags.insert(.maskCommand)
    case "shift": flags.insert(.maskShift)
    case "alt", "option", "opt": flags.insert(.maskAlternate)
    case "ctrl", "control": flags.insert(.maskControl)
    case "fn": flags.insert(.maskSecondaryFn)
    default: fail("Unknown modifier: \(m)")
    }
  }
  let src = CGEventSource(stateID: .hidSystemState)
  for down in [true, false] {
    let e = CGEvent(keyboardEventSource: src, virtualKey: code, keyDown: down)
    e?.flags = flags
    e?.post(tap: .cghidEventTap)
    usleep(20_000)
  }
}

// MARK: - snapshot

func snapshot(stateFile: String, max: Int) {
  let app = frontApp()
  let root = AXUIElementCreateApplication(app.processIdentifier)
  // Chromium and Electron apps only build their web accessibility tree on request.
  AXUIElementSetAttributeValue(root, "AXManualAccessibility" as CFString, kCFBooleanTrue)
  AXUIElementSetAttributeValue(root, "AXEnhancedUserInterface" as CFString, kCFBooleanTrue)

  let windows = children(root).enumerated().filter { str($0.element, kAXRoleAttribute as String) == "AXWindow" }
  let focused = attr(root, kAXFocusedWindowAttribute as String).map { $0 as! AXUIElement }
  let win = windows.first(where: { focused != nil && CFEqual($0.element, focused!) }) ?? windows.first
  guard let (winIndex, window) = win else {
    emit(["ok": true, "app": app.localizedName ?? "", "window": NSNull(), "elements": [], "note": "The app has no open window."])
    try? JSONEncoder().encode(State(pid: app.processIdentifier, entries: [])).write(to: URL(fileURLWithPath: stateFile))
    return
  }
  let winFrame = frame(window) ?? .zero
  var entries: [Entry] = []
  var out: [[String: Any]] = []
  var visited = 0
  var textBudget = 60
  var webAreas = 0
  var webEntries = 0
  var inWeb = false

  func walk(_ el: AXUIElement, _ path: [Int], _ depth: Int) {
    if entries.count >= max || visited > 6000 || depth > 60 { return }
    visited += 1
    let role = str(el, kAXRoleAttribute as String) ?? ""
    let enteringWeb = role == "AXWebArea" && !inWeb
    if enteringWeb { webAreas += 1; inWeb = true }
    defer { if enteringWeb { inWeb = false } }
    let f = frame(el)
    let visible = f.map { $0.width > 1 && $0.height > 1 && $0.intersects(winFrame.insetBy(dx: -2, dy: -2)) } ?? false
    if visible, let f = f, actionable.contains(role) || (textual.contains(role) && textBudget > 0) {
      let label = labelOf(el)
      let value = role == "AXSecureTextField" ? nil : clip(str(el, kAXValueAttribute as String), textual.contains(role) ? 120 : 60)
      let isText = textual.contains(role)
      if !isText || (label ?? value) != nil {
        if isText { textBudget -= 1 }
        var item: [String: Any] = ["id": entries.count, "role": String(role.dropFirst(2))]
        if let label { item["label"] = label }
        if let value, value != label { item["value"] = value }
        if (attr(el, kAXEnabledAttribute as String) as? Bool) == false { item["disabled"] = true }
        if (attr(el, kAXFocusedAttribute as String) as? Bool) == true { item["focused"] = true }
        entries.append(Entry(path: path, role: role, label: label ?? value, x: Double(f.midX), y: Double(f.midY)))
        if inWeb { webEntries += 1 }
        out.append(item)
      }
    }
    // Controls like buttons rarely contain further controls; skip their innards.
    if ["AXButton", "AXPopUpButton", "AXCheckBox", "AXRadioButton"].contains(role) { return }
    for (i, child) in children(el).enumerated() { walk(child, path + [i], depth + 1) }
  }
  walk(window, [winIndex], 0)
  // A web page whose tree hasn't been built yet (Chrome builds it on the
  // first accessibility request): give it a moment and look again.
  for _ in 0..<3 where webAreas > 0 && webEntries == 0 {
    usleep(500_000)
    entries = []; out = []; visited = 0; textBudget = 60; webAreas = 0; webEntries = 0
    walk(window, [winIndex], 0)
  }

  try? JSONEncoder().encode(State(pid: app.processIdentifier, entries: entries)).write(to: URL(fileURLWithPath: stateFile))
  var result: [String: Any] = [
    "ok": true,
    "app": app.localizedName ?? "",
    "window": str(window, kAXTitleAttribute as String) ?? "",
    "elements": out,
  ]
  if let url = str(window, "AXDocument") ?? webURL(window) { result["url"] = url }
  if entries.count >= max { result["note"] = "Showing the first \(max) elements." }
  emit(result)
}

func webURL(_ window: AXUIElement) -> String? {
  // Web areas expose their page URL.
  var stack = [window]
  var n = 0
  while let el = stack.popLast(), n < 400 {
    n += 1
    if str(el, kAXRoleAttribute as String) == "AXWebArea" {
      if let u = attr(el, "AXURL") { return (u as? URL)?.absoluteString ?? (u as? String) }
    }
    stack.append(contentsOf: children(el))
  }
  return nil
}

// MARK: - main

guard AXIsProcessTrusted() else { fail("VoiceOS needs Accessibility permission to control apps.") }
let args = CommandLine.arguments
guard args.count >= 2 else { fail("usage: ui-control <command> …") }

switch args[1] {
case "snapshot":
  guard args.count >= 3 else { fail("snapshot needs a state file") }
  snapshot(stateFile: args[2], max: args.count >= 4 ? Int(args[3]) ?? 150 : 150)

case "press", "focus":
  guard args.count >= 4, let id = Int(args[3]) else { fail("\(args[1]) needs a state file and an element id") }
  let state = loadState(args[2])
  guard id >= 0, id < state.entries.count else { fail("No element \(id) in the last snapshot") }
  let entry = state.entries[id]
  let root = AXUIElementCreateApplication(state.pid)
  let el = resolve(root, entry.path)
  let stillThere = el.map { str($0, kAXRoleAttribute as String) == entry.role } ?? false
  if args[1] == "focus", stillThere, let el {
    AXUIElementSetAttributeValue(el, kAXFocusedAttribute as CFString, kCFBooleanTrue)
    emit(["ok": true, "did": "focused \(entry.label ?? entry.role)"])
  } else if args[1] == "press", stillThere, let el, AXUIElementPerformAction(el, kAXPressAction as CFString) == .success {
    emit(["ok": true, "did": "pressed \(entry.label ?? entry.role)"])
  } else {
    // Fall back to a real click at the element's last known center.
    let p = CGPoint(x: entry.x, y: entry.y)
    NSRunningApplication(processIdentifier: state.pid)?.activate()
    usleep(80_000)
    postClick(p, kind: "left")
    emit(["ok": true, "did": "clicked \(entry.label ?? entry.role)"])
  }

case "click":
  guard args.count >= 4, let x = Double(args[2]), let y = Double(args[3]) else { fail("click needs x y") }
  activateTarget()
  postClick(CGPoint(x: x, y: y), kind: args.count >= 5 ? args[4] : "left")
  emit(["ok": true, "did": "clicked \(Int(x)),\(Int(y))"])

case "type":
  guard args.count >= 3 else { fail("type needs text") }
  activateTarget()
  typeText(args[2...].joined(separator: " "))
  emit(["ok": true, "did": "typed"])

case "key":
  guard args.count >= 3 else { fail("key needs a combo") }
  activateTarget()
  for combo in args[2].split(separator: " ") { pressCombo(String(combo)); usleep(60_000) }
  emit(["ok": true, "did": "pressed \(args[2])"])

case "scroll":
  let dir = args.count >= 3 ? args[2] : "down"
  let lines = Int32(args.count >= 4 ? Int(args[3]) ?? 5 : 5)
  activateTarget()
  if args.count >= 6, let x = Double(args[4]), let y = Double(args[5]) {
    CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: .left)?.post(tap: .cghidEventTap)
    usleep(40_000)
  }
  let (dy, dx): (Int32, Int32) = dir == "up" ? (lines, 0) : dir == "down" ? (-lines, 0) : dir == "left" ? (0, lines) : (0, -lines)
  CGEvent(scrollWheelEvent2Source: nil, units: .line, wheelCount: 2, wheel1: dy, wheel2: dx, wheel3: 0)?.post(tap: .cghidEventTap)
  emit(["ok": true, "did": "scrolled \(dir)"])

case "describe":
  // The control at a screen point: the nearest ancestor that is a button,
  // link or menu item names what a click there would do.
  guard args.count >= 4, let x = Float(args[2]), let y = Float(args[3]) else { fail("describe needs x y") }
  var hit: AXUIElement?
  guard AXUIElementCopyElementAtPosition(AXUIElementCreateSystemWide(), x, y, &hit) == .success, var el = hit else {
    emit(["ok": true, "role": NSNull(), "label": NSNull()])
    break
  }
  var pid: pid_t = 0
  AXUIElementGetPid(el, &pid)
  var role = str(el, kAXRoleAttribute as String) ?? ""
  var label = labelOf(el)
  for _ in 0..<4 where !["AXButton", "AXLink", "AXMenuItem", "AXPopUpButton", "AXMenuButton", "AXCheckBox"].contains(role) {
    guard let parent = attr(el, kAXParentAttribute as String) else { break }
    el = parent as! AXUIElement
    let r = str(el, kAXRoleAttribute as String) ?? ""
    if ["AXButton", "AXLink", "AXMenuItem", "AXPopUpButton", "AXMenuButton", "AXCheckBox"].contains(r) {
      role = r
      label = labelOf(el) ?? label
    }
  }
  var found: [String: Any] = ["ok": true, "role": String(role.dropFirst(2))]
  if let label { found["label"] = label }
  if let name = NSRunningApplication(processIdentifier: pid)?.localizedName { found["app"] = name }
  emit(found)

default:
  fail("Unknown command: \(args[1])")
}

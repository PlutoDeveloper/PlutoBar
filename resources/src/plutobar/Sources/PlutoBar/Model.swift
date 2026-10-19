import AppKit
import SwiftUI

// What the bar shows. JS decides everything (which results, in which order,
// what the assistant says); this only keeps the latest of it and the
// selection, and sends the user's input back out through `act(_:)`.
final class PlutoModel: ObservableObject {
  enum Mode: Equatable { case search, conversation }

  // The four places Spotlight can browse (⌘1…⌘4).
  enum Scope: String, CaseIterable, Identifiable {
    case apps, files, actions, clipboard
    var id: String { rawValue }
    var title: String {
      switch self {
      case .apps: "Applications"
      case .files: "Files"
      case .actions: "Actions"
      case .clipboard: "Clipboard"
      }
    }
    var symbol: String {
      switch self {
      case .apps: "app.badge"
      case .files: "folder"
      case .actions: "square.stack.3d.up"
      case .clipboard: "doc.on.clipboard"
      }
    }
    var key: String {
      switch self {
      case .apps: "1"
      case .files: "2"
      case .actions: "3"
      case .clipboard: "4"
      }
    }
  }

  enum Icon: Equatable {
    case none
    case file(String)  // a file's or app's own icon (or its thumbnail)
    case image(String)  // a picture on disk, drawn as is
    case symbol(String)  // an SF Symbol
    case orb  // Pluto itself
  }

  struct Item: Identifiable, Equatable {
    let id: String
    let kind: String  // ask, app, file, action, clip, calc, web, scope, recent
    let title: String
    let subtitle: String
    let icon: Icon
    let thumb: Bool  // a picture of the file, not its icon
    let badge: String  // "p. 4", "1:23"…
    let accessory: String  // "⌘1"…
    let large: Bool  // the calculator's answer
  }

  struct Section: Identifiable, Equatable {
    let id: String
    let title: String
    let note: String
    let items: [Item]
  }

  // The assistant, as Siri shows it in Spotlight: one conversation, turn after turn.
  enum Phase: Equatable { case idle, listening, transcribing, thinking, working, answering, confirm, done, error }

  struct Field: Identifiable, Equatable {
    let key: String
    let label: String
    var value: String
    let editable: Bool
    var id: String { key }
  }

  struct Confirmation: Equatable {
    let id: String
    let title: String
    var fields: [Field]
  }

  struct WeatherDay: Equatable, Identifiable {
    let day: String
    let symbol: String
    let high: Int
    let low: Int
    var id: String { day }
  }

  enum Card: Equatable {
    case weather(place: String, temp: Int, condition: String, symbol: String, high: Int?, low: Int?, days: [WeatherDay])
    case stock(ticker: String, name: String, price: Double, change: Double, percent: Double, currency: String, points: [Double])
  }

  struct Turn: Identifiable, Equatable {
    let id = UUID()
    var question: String
    var reply = ""
    var step = ""
    var card: Card?
    var error = ""
  }

  @Published var mode: Mode = .search
  @Published var query = ""
  @Published var scope: Scope?
  @Published private(set) var sections: [Section] = []
  @Published var selection: String?
  @Published var showHome = false
  @Published var hoveringBar = false

  @Published private(set) var turns: [Turn] = []
  @Published private(set) var phase: Phase = .idle
  @Published private(set) var level: CGFloat = 0
  @Published private(set) var speaking = false
  @Published var confirmation: Confirmation?
  // What JS says about the world: DigUp's index, the shortcut.
  @Published private(set) var filesNote = ""
  @Published private(set) var recent: [Item] = []

  // Bumped when the bar opens, so the text field takes focus again.
  @Published var focusToken = 0

  var onHide: (() -> Void)?

  private var querySeq = 0
  private var shownSeq = 0

  var items: [Item] { sections.flatMap(\.items) }

  var isBusy: Bool { [.transcribing, .thinking, .working, .answering].contains(phase) }

  // The bar must not close on its own while any of these is true.
  var holdsOpen: Bool { phase == .listening || phase == .confirm || isBusy || confirmation != nil }

  var placeholder: String {
    if phase == .listening { return "Listening…" }
    if let scope { return scope.title }
    return mode == .conversation ? "Ask a follow-up" : "Search or ask Pluto"
  }

  // MARK: input out

  func queryChanged() {
    querySeq += 1
    if !query.isEmpty { showHome = false }
    act(["a": "query", "q": query, "scope": scope?.rawValue ?? "", "seq": querySeq, "mode": mode == .conversation ? "conversation" : "search"])
  }

  func setScope(_ s: Scope?) {
    withAnimation(PlutoMotion.morph) {
      scope = s
      showHome = false
      if s != nil, mode == .conversation, !holdsOpen { mode = .search }
    }
    queryChanged()
  }

  func moveSelection(_ delta: Int) {
    let list = mode == .search ? (query.isEmpty && scope == nil ? homeItems : items) : []
    guard !list.isEmpty else {
      if delta > 0, mode == .search, query.isEmpty, scope == nil { withAnimation(PlutoMotion.morph) { showHome = true } }
      return
    }
    if !showHome, query.isEmpty, scope == nil {
      withAnimation(PlutoMotion.morph) { showHome = true }
      selection = list.first?.id
      return
    }
    let i = list.firstIndex { $0.id == selection } ?? -1
    let next = min(max(i + delta, 0), list.count - 1)
    selection = list[next].id
  }

  // The rows shown under an empty bar: the last conversation, then the four places.
  var homeItems: [Item] {
    recent + Scope.allCases.map {
      Item(id: "scope:" + $0.rawValue, kind: "scope", title: $0.title, subtitle: "", icon: .symbol($0.symbol), thumb: false, badge: "", accessory: "⌘" + $0.key, large: false)
    }
  }

  // Return: the selected row, or (nothing selected) ask Pluto.
  func activate(modifiers: NSEvent.ModifierFlags = []) {
    if mode == .conversation {
      sendFollowUp()
      return
    }
    let list = query.isEmpty && scope == nil ? (showHome ? homeItems : []) : items
    guard let item = list.first(where: { $0.id == selection }) ?? list.first else {
      if !query.trimmingCharacters(in: .whitespaces).isEmpty { ask(query) }
      return
    }
    activate(item, modifiers: modifiers)
  }

  func activate(_ item: Item, modifiers: NSEvent.ModifierFlags = []) {
    switch item.kind {
    case "scope":
      if let s = Scope(rawValue: String(item.id.dropFirst("scope:".count))) { setScope(s) }
    case "ask":
      ask(item.title)
    case "recent":
      withAnimation(PlutoMotion.morph) {
        mode = .conversation
        showHome = false
      }
    default:
      act(["a": "open", "id": item.id, "kind": item.kind, "reveal": modifiers.contains(.command), "copy": modifiers.contains(.option)])
    }
  }

  func ask(_ text: String) {
    let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !t.isEmpty else { return }
    withAnimation(PlutoMotion.morph) {
      if mode != .conversation { turns = [] }
      mode = .conversation
      showHome = false
      scope = nil
      turns.append(Turn(question: t))
      phase = .thinking
      query = ""
    }
    act(["a": "ask", "text": t])
  }

  func sendFollowUp() {
    let t = query.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !t.isEmpty, !isBusy else { return }
    ask(t)
  }

  func toggleVoice() {
    act(["a": phase == .listening ? "stopVoice" : "askVoice"])
  }

  func newConversation() {
    if phase == .listening { act(["a": "stopVoice"]) }
    act(["a": "dismiss"])
    withAnimation(PlutoMotion.morph) {
      turns = []
      phase = .idle
      mode = .search
      confirmation = nil
      query = ""
    }
    queryChanged()
  }

  func copyReply() {
    guard let reply = turns.last?.reply, !reply.isEmpty else { return }
    NSPasteboard.general.clearContents()
    NSPasteboard.general.setString(reply, forType: .string)
  }

  func approve() {
    guard let c = confirmation else { return }
    var edits: [String: String] = [:]
    for f in c.fields where f.editable { edits[f.key] = f.value }
    act(["a": "approve", "id": c.id, "edits": edits])
    withAnimation(PlutoMotion.morph) {
      confirmation = nil
      phase = .thinking
    }
  }

  func cancelConfirmation() {
    guard let c = confirmation else { return }
    act(["a": "cancel", "id": c.id])
    withAnimation(PlutoMotion.morph) {
      confirmation = nil
      phase = (turns.last?.reply.isEmpty ?? true) ? .idle : .done
    }
  }

  func stopSpeaking() { act(["a": "stopSpeaking"]) }

  // Escape: one step back at a time, then close.
  func escape() -> Bool {
    if phase == .listening {
      act(["a": "stopVoice"])
      return true
    }
    if !query.isEmpty {
      query = ""
      queryChanged()
      return true
    }
    if scope != nil {
      setScope(nil)
      return true
    }
    if showHome {
      withAnimation(PlutoMotion.morph) { showHome = false }
      return true
    }
    return false
  }

  // Like Spotlight, the bar opens empty. The last conversation stays one ↓
  // away (the "recent" row), unless Pluto is still in the middle of it.
  func opened() {
    if !holdsOpen {
      mode = .search
      query = ""
      scope = nil
      showHome = false
      selection = nil
    }
    focusToken += 1
    act(["a": "opened"])
  }

  func hidden() {
    showHome = false
    hoveringBar = false
    act(["a": "hidden"])
  }

  // MARK: results in

  func setResults(_ json: [String: Any]) {
    let seq = json["seq"] as? Int ?? 0
    // A slower answer to an older query never replaces a newer one.
    guard seq == 0 || seq >= shownSeq else { return }
    if seq > 0 { shownSeq = seq }
    let next = (json["sections"] as? [[String: Any]] ?? []).map { s in
      Section(
        id: s["id"] as? String ?? UUID().uuidString,
        title: s["title"] as? String ?? "",
        note: s["note"] as? String ?? "",
        items: (s["items"] as? [[String: Any]] ?? []).map(Self.item)
      )
    }
    let keep = json["keepSelection"] as? Bool ?? false
    withAnimation(PlutoMotion.list) { sections = next }
    let all = next.flatMap(\.items)
    if !keep || !all.contains(where: { $0.id == selection }) {
      selection = (json["selected"] as? String).flatMap { id in all.first { $0.id == id }?.id } ?? all.first?.id
    }
  }

  // Swaps one row in place (a video's frame arrives after the row).
  func updateItem(_ json: [String: Any]) {
    guard let id = json["id"] as? String else { return }
    sections = sections.map { s in
      Section(id: s.id, title: s.title, note: s.note, items: s.items.map { $0.id == id ? Self.item(json) : $0 })
    }
  }

  func setState(_ json: [String: Any]) {
    if let note = json["filesNote"] as? String { filesNote = note }
    if let recent = json["recent"] as? [[String: Any]] { self.recent = recent.map(Self.item) }
  }

  static func item(_ j: [String: Any]) -> Item {
    let icon: Icon
    let i = j["icon"] as? [String: Any] ?? [:]
    switch i["type"] as? String {
    case "file": icon = .file(i["path"] as? String ?? "")
    case "image": icon = .image(i["path"] as? String ?? "")
    case "symbol": icon = .symbol(i["name"] as? String ?? "circle")
    case "orb": icon = .orb
    default: icon = .none
    }
    return Item(
      id: j["id"] as? String ?? UUID().uuidString,
      kind: j["kind"] as? String ?? "",
      title: j["title"] as? String ?? "",
      subtitle: j["subtitle"] as? String ?? "",
      icon: icon,
      thumb: i["thumb"] as? Bool ?? false,
      badge: j["badge"] as? String ?? "",
      accessory: j["accessory"] as? String ?? "",
      large: j["large"] as? Bool ?? false
    )
  }

  // MARK: the assistant in (the same small events the notch gets: see notch.js)

  // Returns true when the bar should come up for this event (a voice turn, an approval).
  @discardableResult
  func handleAgent(_ e: [String: Any]) -> Bool {
    guard let type = e["t"] as? String else { return false }
    switch type {
    case "listen":
      if e["on"] as? Bool == true {
        guard phase != .listening else { return true }
        withAnimation(PlutoMotion.morph) {
          if mode != .conversation { turns = [] }
          mode = .conversation
          showHome = false
          scope = nil
          query = ""
          turns.append(Turn(question: ""))  // the transcript fills it in
          phase = .listening
        }
        return true
      } else if phase == .listening {
        set(.transcribing)
      }
    case "level":
      let v = CGFloat(e["v"] as? Double ?? 0)
      level = level * 0.55 + min(max(v, 0), 1) * 0.45
    case "phase":
      let transcript = e["transcript"] as? String ?? ""
      // A status after a finished turn starts the next one (a request from the shortcut, say).
      if [.idle, .done, .error].contains(phase) || turns.isEmpty {
        withAnimation(PlutoMotion.morph) {
          if mode != .conversation { turns = [] }
          turns.append(Turn(question: transcript))
        }
      }
      if var last = turns.last {
        if !transcript.isEmpty, last.reply.isEmpty { last.question = transcript }
        if let s = e["step"] as? String { last.step = s }
        replaceLast(last)
      }
      if mode != .conversation { withAnimation(PlutoMotion.morph) { mode = .conversation } }
      switch e["phase"] as? String {
      case "transcribing": if phase != .answering { set(.transcribing) }
      case "thinking": if phase != .answering { set(.thinking) }
      case "working": set(.working)
      default: break
      }
    case "text":
      guard let t = e["text"] as? String, !t.isEmpty else { return false }
      if turns.isEmpty { turns.append(Turn(question: "")) }
      if var last = turns.last {
        last.reply = t
        replaceLast(last)
      }
      if phase != .confirm { set(.answering) }
    case "result":
      if var last = turns.last {
        last.card = Self.card(e)
        replaceLast(last)
      }
    case "confirm":
      let fields = (e["fields"] as? [[String: Any]] ?? []).map {
        Field(key: $0["key"] as? String ?? "", label: $0["label"] as? String ?? "", value: $0["value"] as? String ?? "", editable: $0["editable"] as? Bool ?? false)
      }
      withAnimation(PlutoMotion.morph) {
        confirmation = Confirmation(id: e["id"] as? String ?? "", title: e["title"] as? String ?? "Approve this action?", fields: fields)
        mode = .conversation
        phase = .confirm
      }
      return true
    case "confirmResolved":
      if confirmation?.id == e["id"] as? String || e["id"] == nil {
        confirmation = nil
        if phase == .confirm { set((turns.last?.reply.isEmpty ?? true) ? .thinking : .answering) }
      }
    case "complete":
      guard phase != .idle, phase != .confirm else { return false }
      set(.done)
    case "error":
      if turns.isEmpty { turns.append(Turn(question: "")) }
      var last = turns[turns.count - 1]
      last.error = e["message"] as? String ?? "Something went wrong."
      replaceLast(last)
      if mode != .conversation { withAnimation(PlutoMotion.morph) { mode = .conversation } }
      set(.error)
    case "noSpeech":
      if phase == .listening || phase == .transcribing {
        if let last = turns.last, last.question.isEmpty, last.reply.isEmpty { turns.removeLast() }
        set(turns.isEmpty ? .idle : .done)
        if turns.isEmpty { withAnimation(PlutoMotion.morph) { mode = .search } }
      }
    case "speaking":
      speaking = e["on"] as? Bool ?? false
    case "dismiss":
      withAnimation(PlutoMotion.morph) {
        phase = turns.isEmpty ? .idle : .done
        confirmation = nil
      }
    default: break
    }
    return false
  }

  private func replaceLast(_ t: Turn) {
    guard !turns.isEmpty else { return }
    turns[turns.count - 1] = t
  }

  private func set(_ p: Phase) {
    guard p != phase else { return }
    withAnimation(PlutoMotion.morph) { phase = p }
  }

  private static func card(_ e: [String: Any]) -> Card? {
    switch e["kind"] as? String {
    case "weather":
      let days = (e["days"] as? [[String: Any]] ?? []).compactMap { d -> WeatherDay? in
        guard let day = d["day"] as? String, let hi = d["high"] as? Double, let lo = d["low"] as? Double else { return nil }
        return WeatherDay(day: day, symbol: weatherSymbol(d["condition"] as? String ?? "", day: true), high: Int(hi), low: Int(lo))
      }
      guard let temp = e["temp"] as? Double else { return nil }
      let condition = e["condition"] as? String ?? ""
      return .weather(
        place: e["place"] as? String ?? "", temp: Int(temp), condition: condition.capitalized,
        symbol: weatherSymbol(condition, day: e["isDay"] as? Bool ?? true),
        high: (e["high"] as? Double).map(Int.init), low: (e["low"] as? Double).map(Int.init), days: days)
    case "stock":
      guard let ticker = e["ticker"] as? String, let price = e["price"] as? Double else { return nil }
      return .stock(
        ticker: ticker, name: e["name"] as? String ?? ticker, price: price, change: e["change"] as? Double ?? 0,
        percent: e["changePercent"] as? Double ?? 0, currency: e["currency"] as? String ?? "", points: e["points"] as? [Double] ?? [])
    default: return nil
    }
  }

  static func weatherSymbol(_ condition: String, day: Bool) -> String {
    let c = condition.lowercased()
    if c.contains("thunder") { return "cloud.bolt.rain.fill" }
    if c.contains("snow") { return "cloud.snow.fill" }
    if c.contains("drizzle") { return "cloud.drizzle.fill" }
    if c.contains("rain") || c.contains("shower") { return "cloud.rain.fill" }
    if c.contains("fog") { return "cloud.fog.fill" }
    if c.contains("overcast") { return "smoke.fill" }
    if c.contains("cloud") || c.contains("partly") { return day ? "cloud.sun.fill" : "cloud.moon.fill" }
    return day ? "sun.max.fill" : "moon.stars.fill"
  }

  // MARK: out

  func act(_ payload: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: payload), let json = String(data: data, encoding: .utf8) else { return }
    json.withCString { plutobarEmitAction($0) }
  }
}

enum PlutoMotion {
  static let morph = Animation.spring(response: 0.38, dampingFraction: 0.86)
  static let list = Animation.spring(response: 0.28, dampingFraction: 0.9)
  static let open = Animation.spring(response: 0.32, dampingFraction: 0.78)
}

// Sends one action (JSON) to JS (Sources/PlutoAddon/addon.c).
@_silgen_name("plutobar_emit_action")
func plutobarEmitAction(_ json: UnsafePointer<CChar>)

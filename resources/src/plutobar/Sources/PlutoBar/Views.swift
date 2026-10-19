import AppKit
import QuickLookThumbnailing
import SwiftUI

enum PlutoMetrics {
  static let barHeight: CGFloat = 66
  static let barFont: CGFloat = 24
  static let gap: CGFloat = 10
  static let radius: CGFloat = 26
  static let listMax: CGFloat = 468
  static let talkMax: CGFloat = 430
}

// MARK: - The whole bar

struct PlutoRoot: View {
  @ObservedObject var model: PlutoModel
  let onHeight: (CGFloat) -> Void

  var body: some View {
    GlassGroup {
      VStack(spacing: PlutoMetrics.gap) {
        SearchBar()
        lower
      }
    }
    .frame(width: PlutoController.width)
    .fixedSize(horizontal: false, vertical: true)
    .background(GeometryReader { geo in Color.clear.preference(key: HeightKey.self, value: geo.size.height) })
    .onPreferenceChange(HeightKey.self) { onHeight($0) }
    .padding(PlutoController.margin)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .environmentObject(model)
  }

  @ViewBuilder private var lower: some View {
    if model.mode == .conversation {
      ConversationPanel().transition(.plutoDrop)
    } else if model.query.isEmpty && model.scope == nil {
      if model.showHome {
        ResultsPanel(sections: [.init(id: "home", title: "", note: "", items: model.homeItems)]).transition(.plutoDrop)
      }
    } else if !model.sections.isEmpty {
      ResultsPanel(sections: model.sections).transition(.plutoDrop)
    }
  }
}

private struct HeightKey: PreferenceKey {
  static var defaultValue: CGFloat = 0
  static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

extension AnyTransition {
  static var plutoDrop: AnyTransition {
    .asymmetric(
      insertion: .opacity.combined(with: .scale(scale: 0.96, anchor: .top)).combined(with: .offset(y: -8)),
      removal: .opacity.combined(with: .scale(scale: 0.98, anchor: .top))
    )
  }
}

// MARK: - Liquid Glass (macOS 26+), a blurred material before that

struct GlassGroup<Content: View>: View {
  @ViewBuilder let content: Content
  var body: some View {
    if #available(macOS 26.0, *) {
      GlassEffectContainer(spacing: PlutoMetrics.gap) { content }
    } else {
      content
    }
  }
}

struct Glass<S: InsettableShape>: ViewModifier {
  let shape: S
  func body(content: Content) -> some View {
    if #available(macOS 26.0, *) {
      content
        .glassEffect(.regular, in: shape)
        .shadow(color: .black.opacity(0.28), radius: 22, y: 10)
    } else {
      content
        .background(VisualEffect().clipShape(shape))
        .overlay(shape.strokeBorder(Color.white.opacity(0.14), lineWidth: 0.6))
        .shadow(color: .black.opacity(0.3), radius: 22, y: 10)
    }
  }
}

struct VisualEffect: NSViewRepresentable {
  func makeNSView(context: Context) -> NSVisualEffectView {
    let v = NSVisualEffectView()
    v.material = .hudWindow
    v.blendingMode = .behindWindow
    v.state = .active
    return v
  }
  func updateNSView(_ nsView: NSVisualEffectView, context: Context) {}
}

extension View {
  func glass<S: InsettableShape>(_ shape: S) -> some View { modifier(Glass(shape: shape)) }
}

// MARK: - The search field

struct SearchBar: View {
  @EnvironmentObject var model: PlutoModel
  @FocusState private var focused: Bool

  var body: some View {
    HStack(spacing: 14) {
      if let scope = model.scope {
        Image(systemName: scope.symbol)
          .font(.system(size: 19, weight: .medium))
          .foregroundStyle(.secondary)
          .transition(.scale.combined(with: .opacity))
      }
      ZStack(alignment: .leading) {
        if model.query.isEmpty {
          Text(listeningText ?? model.placeholder)
            .foregroundStyle(listeningText == nil ? .secondary : .primary)
            .lineLimit(1)
            .allowsHitTesting(false)
        }
        TextField("", text: $model.query)
          .textFieldStyle(.plain)
          .focused($focused)
          .onChange(of: model.query) { _ in model.queryChanged() }
      }
      .font(.system(size: PlutoMetrics.barFont, weight: .regular))
      trailing
    }
    .padding(.leading, 28)
    .padding(.trailing, 18)
    .frame(height: PlutoMetrics.barHeight)
    .contentShape(Capsule())
    .glass(Capsule())
    .overlay(PlutoGlow(active: glowing, level: model.phase == .listening ? model.level : 0.15).allowsHitTesting(false))
    .onHover { inside in
      model.hoveringBar = inside
      if inside, model.query.isEmpty, model.scope == nil, model.mode == .search, !model.showHome {
        withAnimation(PlutoMotion.morph) { model.showHome = true }
      }
    }
    .onAppear { focused = true }
    .onChange(of: model.focusToken) { _ in focused = true }
  }

  private var glowing: Bool { model.phase == .listening || model.isBusy }

  // While you talk, your words appear where you'd type.
  private var listeningText: String? {
    guard model.phase == .listening || model.phase == .transcribing else { return nil }
    let q = model.turns.last?.question ?? ""
    return q.isEmpty ? (model.phase == .listening ? "Listening…" : nil) : q
  }

  @ViewBuilder private var trailing: some View {
    HStack(spacing: 10) {
      if model.phase == .listening {
        Waveform(level: model.level).frame(width: 34, height: 18).transition(.opacity)
      } else if model.isBusy {
        PlutoOrb(spinning: true).frame(width: 20, height: 20).transition(.opacity)
      }
      Button(action: model.toggleVoice) {
        Image(systemName: model.phase == .listening ? "stop.fill" : "mic")
          .font(.system(size: 20, weight: .regular))
          .foregroundStyle(model.phase == .listening ? AnyShapeStyle(Color.red) : AnyShapeStyle(.secondary))
          .frame(width: 36, height: 36)
          .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .help(model.phase == .listening ? "Stop listening" : "Ask by voice")
    }
  }
}

// The Apple Intelligence edge: a slow-turning ring of color around the bar
// while Pluto listens or works, brighter with your voice.
struct PlutoGlow: View {
  let active: Bool
  let level: CGFloat
  static let colors: [Color] = [
    Color(red: 0.74, green: 0.51, blue: 0.95), Color(red: 0.96, green: 0.73, blue: 0.92),
    Color(red: 0.55, green: 0.62, blue: 1.0), Color(red: 1.0, green: 0.40, blue: 0.47),
    Color(red: 1.0, green: 0.73, blue: 0.44), Color(red: 0.78, green: 0.53, blue: 1.0),
    Color(red: 0.74, green: 0.51, blue: 0.95),
  ]

  var body: some View {
    TimelineView(.animation(paused: !active)) { tl in
      let t = tl.date.timeIntervalSinceReferenceDate
      let g = AngularGradient(colors: Self.colors, center: .center, angle: .degrees(t * 70))
      let l = min(max(level, 0), 1)
      // A crisp ring on the edge, and a soft glow that stays inside the bar
      // (outside it, the glass below would refract it into a streak).
      ZStack {
        Capsule().strokeBorder(g, lineWidth: 6 + 8 * l).blur(radius: 7).opacity(0.38 + 0.3 * l)
        Capsule().strokeBorder(g, lineWidth: 1.4 + 1.2 * l)
      }
      .mask(Capsule())
    }
    .opacity(active ? 1 : 0)
    .animation(.easeInOut(duration: 0.35), value: active)
  }
}

struct Waveform: View {
  let level: CGFloat
  var body: some View {
    TimelineView(.animation) { tl in
      let t = tl.date.timeIntervalSinceReferenceDate
      HStack(spacing: 3) {
        ForEach(0..<5, id: \.self) { i in
          let wave = (sin(t * 9 + Double(i) * 1.3) + 1) / 2
          Capsule()
            .fill(LinearGradient(colors: [PlutoGlow.colors[i], PlutoGlow.colors[i + 1]], startPoint: .top, endPoint: .bottom))
            .frame(width: 3.5, height: 4 + 14 * max(0.12, level) * CGFloat(0.4 + 0.6 * wave))
        }
      }
      .frame(maxHeight: .infinity)
    }
  }
}

// Pluto's mark: a small planet of the glow's colors.
struct PlutoOrb: View {
  var spinning = false
  var body: some View {
    TimelineView(.animation(paused: !spinning)) { tl in
      let t = spinning ? tl.date.timeIntervalSinceReferenceDate : 0
      ZStack {
        Circle().fill(AngularGradient(colors: PlutoGlow.colors, center: .center, angle: .degrees(t * 120)))
        Circle().fill(RadialGradient(colors: [.white.opacity(0.85), .white.opacity(0)], center: .init(x: 0.35, y: 0.3), startRadius: 0, endRadius: 9))
          .blendMode(.screen)
        Circle().strokeBorder(.white.opacity(0.35), lineWidth: 0.6)
      }
    }
  }
}

// MARK: - Results

struct ResultsPanel: View {
  @EnvironmentObject var model: PlutoModel
  let sections: [PlutoModel.Section]
  @State private var contentHeight: CGFloat = 0

  var body: some View {
    ScrollViewReader { proxy in
      ScrollView(.vertical, showsIndicators: false) {
        VStack(alignment: .leading, spacing: 2) {
          ForEach(sections) { section in
            if !section.title.isEmpty {
              HStack(spacing: 6) {
                Text(section.title).font(.system(size: 12, weight: .semibold)).foregroundStyle(.secondary)
                if !section.note.isEmpty {
                  Text(section.note).font(.system(size: 11)).foregroundStyle(.tertiary)
                }
              }
              .padding(.horizontal, 14)
              .padding(.top, section.id == sections.first?.id ? 2 : 10)
              .padding(.bottom, 2)
            }
            ForEach(section.items) { item in
              ResultRow(item: item, selected: model.selection == item.id).id(item.id)
            }
          }
        }
        .padding(8)
        .background(GeometryReader { g in Color.clear.preference(key: HeightKey.self, value: g.size.height) })
      }
      .onPreferenceChange(HeightKey.self) { contentHeight = $0 }
      .frame(height: min(max(contentHeight, 1), PlutoMetrics.listMax))
      .onChange(of: model.selection) { id in
        guard let id else { return }
        withAnimation(.easeOut(duration: 0.12)) { proxy.scrollTo(id) }
      }
    }
    .glass(RoundedRectangle(cornerRadius: PlutoMetrics.radius, style: .continuous))
  }
}

struct ResultRow: View {
  @EnvironmentObject var model: PlutoModel
  let item: PlutoModel.Item
  let selected: Bool

  var body: some View {
    HStack(spacing: 14) {
      ItemIcon(icon: item.icon, thumb: item.thumb)
        .frame(width: item.large ? 38 : 30, height: item.large ? 38 : 30)
      VStack(alignment: .leading, spacing: 2) {
        Text(item.title)
          .font(.system(size: item.large ? 26 : 16, weight: item.large ? .regular : .medium))
          .lineLimit(1)
          .truncationMode(.middle)
        if !item.subtitle.isEmpty {
          Text(item.subtitle)
            .font(.system(size: 13))
            .foregroundStyle(.secondary)
            .lineLimit(1)
            .truncationMode(.tail)
        }
      }
      Spacer(minLength: 8)
      if !item.badge.isEmpty {
        Text(item.badge)
          .font(.system(size: 11, weight: .medium).monospacedDigit())
          .foregroundStyle(.secondary)
          .padding(.horizontal, 7)
          .padding(.vertical, 3)
          .background(Capsule().fill(Color.primary.opacity(0.08)))
      }
      if !item.accessory.isEmpty {
        Text(item.accessory).font(.system(size: 15)).foregroundStyle(.tertiary)
      }
    }
    .padding(.horizontal, 14)
    .frame(height: item.large ? 64 : item.subtitle.isEmpty ? 46 : 56)
    .background(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .fill(selected ? Color.primary.opacity(0.12) : .clear)
    )
    .contentShape(Rectangle())
    .onTapGesture {
      model.selection = item.id
      model.activate(item, modifiers: NSEvent.modifierFlags)
    }
    .onHover { inside in if inside { model.selection = item.id } }
  }
}

struct ItemIcon: View {
  let icon: PlutoModel.Icon
  let thumb: Bool

  var body: some View {
    switch icon {
    case .none: Color.clear
    case .orb: PlutoOrb().padding(3)
    case .symbol(let name):
      Image(systemName: name).font(.system(size: 21, weight: .regular)).foregroundStyle(.primary).frame(maxWidth: .infinity, maxHeight: .infinity)
    case .file(let path): FileIcon(path: path, thumb: thumb)
    case .image(let path): FileIcon(path: path, thumb: true)
    }
  }
}

// A file's icon, or a picture of it (Quick Look), loaded off the main thread and kept.
struct FileIcon: View {
  let path: String
  let thumb: Bool
  @State private var image: NSImage?

  var body: some View {
    // A clear square the picture fills and is cut to, whatever its shape.
    Color.clear
      .overlay {
        if let image {
          Image(nsImage: image)
            .resizable()
            .aspectRatio(contentMode: thumb ? .fill : .fit)
        }
      }
      .clipShape(RoundedRectangle(cornerRadius: thumb ? 7 : 0, style: .continuous))
    .task(id: path + (thumb ? "#t" : "")) { image = await IconCache.shared.image(for: path, thumb: thumb) }
  }
}

actor IconCache {
  static let shared = IconCache()
  private var cache: [String: NSImage] = [:]

  func image(for path: String, thumb: Bool) async -> NSImage? {
    let key = path + (thumb ? "#t" : "")
    if let hit = cache[key] { return hit }
    var result: NSImage?
    if thumb {
      let request = QLThumbnailGenerator.Request(
        fileAt: URL(fileURLWithPath: path), size: CGSize(width: 64, height: 64), scale: 2, representationTypes: .thumbnail)
      result = try? await QLThumbnailGenerator.shared.generateBestRepresentation(for: request).nsImage
    }
    if result == nil { result = NSWorkspace.shared.icon(forFile: path) }
    if cache.count > 400 { cache.removeAll() }
    cache[key] = result
    return result
  }
}

// MARK: - The conversation (Siri in Spotlight)

struct ConversationPanel: View {
  @EnvironmentObject var model: PlutoModel
  @State private var contentHeight: CGFloat = 0

  var body: some View {
    VStack(spacing: 0) {
      ScrollViewReader { proxy in
        ScrollView(.vertical, showsIndicators: false) {
          VStack(alignment: .leading, spacing: 18) {
            ForEach(Array(model.turns.enumerated()), id: \.element.id) { i, turn in
              TurnView(turn: turn, isLast: i == model.turns.count - 1)
            }
            if model.confirmation != nil { ConfirmCard() }
            Color.clear.frame(height: 1).id("end")
          }
          .padding(.horizontal, 22)
          .padding(.top, 18)
          .padding(.bottom, 8)
          .background(GeometryReader { g in Color.clear.preference(key: HeightKey.self, value: g.size.height) })
        }
        .onPreferenceChange(HeightKey.self) { h in
          contentHeight = h
          proxy.scrollTo("end", anchor: .bottom)
        }
        .frame(height: min(max(contentHeight, 40), PlutoMetrics.talkMax))
      }
      footer
    }
    .glass(RoundedRectangle(cornerRadius: PlutoMetrics.radius, style: .continuous))
  }

  private var footer: some View {
    HStack(spacing: 8) {
      PlutoOrb(spinning: model.isBusy).frame(width: 14, height: 14)
      Text(statusText).font(.system(size: 12, weight: .medium)).foregroundStyle(.secondary).lineLimit(1)
      Spacer()
      if model.speaking {
        FooterButton(symbol: "speaker.slash", title: "Stop", action: model.stopSpeaking)
      }
      if !(model.turns.last?.reply.isEmpty ?? true) {
        FooterButton(symbol: "doc.on.doc", title: "Copy", action: model.copyReply)
      }
      FooterButton(symbol: "square.and.pencil", title: "New", shortcut: "⌘N", action: model.newConversation)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 10)
    .background(alignment: .top) { Rectangle().fill(Color.primary.opacity(0.08)).frame(height: 0.5) }
  }

  private var statusText: String {
    switch model.phase {
    case .listening: "Listening"
    case .transcribing: "Got it"
    case .thinking: "Thinking"
    case .working: "Working"
    case .answering: "Pluto"
    case .confirm: "Waiting for your OK"
    case .error: "Something went wrong"
    default: model.speaking ? "Speaking" : "Pluto · ⏎ to ask a follow-up"
    }
  }
}

struct FooterButton: View {
  let symbol: String
  let title: String
  var shortcut = ""
  let action: () -> Void
  @State private var hover = false

  var body: some View {
    Button(action: action) {
      HStack(spacing: 5) {
        Image(systemName: symbol).font(.system(size: 11, weight: .semibold))
        Text(title).font(.system(size: 12, weight: .medium))
        if !shortcut.isEmpty { Text(shortcut).font(.system(size: 11)).foregroundStyle(.tertiary) }
      }
      .padding(.horizontal, 9)
      .padding(.vertical, 5)
      .background(Capsule().fill(Color.primary.opacity(hover ? 0.12 : 0.06)))
    }
    .buttonStyle(.plain)
    .foregroundStyle(.secondary)
    .onHover { hover = $0 }
  }
}

struct TurnView: View {
  @EnvironmentObject var model: PlutoModel
  let turn: PlutoModel.Turn
  let isLast: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      if !turn.question.isEmpty {
        Text(turn.question)
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(.primary)
          .textSelection(.enabled)
          .fixedSize(horizontal: false, vertical: true)
      }
      if isLast, turn.reply.isEmpty, turn.error.isEmpty, [.listening, .transcribing, .thinking, .working].contains(model.phase) {
        ShimmerText(text: statusLine).font(.system(size: 14, weight: .medium))
      }
      if !turn.reply.isEmpty {
        MarkdownText(text: turn.reply)
          .font(.system(size: 15))
          .foregroundStyle(.primary.opacity(0.92))
          .lineSpacing(3)
          .textSelection(.enabled)
          .fixedSize(horizontal: false, vertical: true)
        if isLast, model.phase == .working, !turn.step.isEmpty {
          ShimmerText(text: turn.step).font(.system(size: 13, weight: .medium))
        }
      }
      if let card = turn.card { CardView(card: card) }
      if !turn.error.isEmpty {
        Label(turn.error, systemImage: "exclamationmark.triangle.fill")
          .font(.system(size: 14))
          .foregroundStyle(.orange)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var statusLine: String {
    switch model.phase {
    case .listening: "Listening…"
    case .transcribing: "Got it…"
    case .working: turn.step.isEmpty ? "Working…" : turn.step
    default: "Thinking…"
    }
  }
}

// Text with a sheen moving across it (Pluto at work).
struct ShimmerText: View {
  let text: String
  var body: some View {
    TimelineView(.animation) { tl in
      let t = tl.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 1.8) / 1.8
      Text(text)
        .foregroundStyle(.secondary)
        .overlay(
          LinearGradient(
            stops: [.init(color: .clear, location: max(0, t - 0.25)), .init(color: .white.opacity(0.9), location: t), .init(color: .clear, location: min(1, t + 0.25))],
            startPoint: .leading, endPoint: .trailing
          )
          .mask(Text(text))
        )
    }
  }
}

// Claude's replies: inline Markdown (bold, italics, code, links), with list
// bullets and headings tidied, since the bar has no room for block layout.
struct MarkdownText: View {
  let text: String
  var body: some View { Text(Self.render(text)) }

  static func render(_ text: String) -> AttributedString {
    var out = AttributedString()
    let lines = text.replacingOccurrences(of: "\r", with: "").components(separatedBy: "\n")
    for (i, raw) in lines.enumerated() {
      var line = raw
      let trimmed = line.trimmingCharacters(in: .whitespaces)
      var heading = false
      if trimmed.hasPrefix("#") {
        line = String(trimmed.drop(while: { $0 == "#" })).trimmingCharacters(in: .whitespaces)
        heading = true
      } else if trimmed.hasPrefix("- ") || trimmed.hasPrefix("* ") {
        let indent = String(repeating: "   ", count: (raw.count - raw.drop(while: { $0 == " " }).count) / 2)
        line = indent + "•  " + trimmed.dropFirst(2)
      }
      var part = (try? AttributedString(markdown: line, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))) ?? AttributedString(line)
      if heading { part.font = .system(size: 15, weight: .semibold) }
      out += part
      if i < lines.count - 1 { out += AttributedString("\n") }
    }
    return out
  }
}

// MARK: - Cards

struct CardView: View {
  let card: PlutoModel.Card
  var body: some View {
    Group {
      switch card {
      case let .weather(place, temp, condition, symbol, high, low, days):
        VStack(alignment: .leading, spacing: 10) {
          HStack(alignment: .center, spacing: 12) {
            Image(systemName: symbol).symbolRenderingMode(.multicolor).font(.system(size: 34))
            VStack(alignment: .leading, spacing: 1) {
              Text(place).font(.system(size: 13, weight: .medium)).foregroundStyle(.secondary)
              Text("\(temp)°").font(.system(size: 32, weight: .light))
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
              Text(condition).font(.system(size: 13, weight: .medium))
              if let high, let low { Text("H:\(high)°  L:\(low)°").font(.system(size: 12)).foregroundStyle(.secondary) }
            }
          }
          if !days.isEmpty {
            HStack {
              ForEach(days) { d in
                VStack(spacing: 4) {
                  Text(d.day).font(.system(size: 11, weight: .medium)).foregroundStyle(.secondary)
                  Image(systemName: d.symbol).symbolRenderingMode(.multicolor).font(.system(size: 16))
                  Text("\(d.high)°").font(.system(size: 12, weight: .medium))
                  Text("\(d.low)°").font(.system(size: 11)).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
              }
            }
          }
        }
      case let .stock(ticker, name, price, change, percent, currency, points):
        HStack(spacing: 14) {
          VStack(alignment: .leading, spacing: 2) {
            Text(ticker).font(.system(size: 15, weight: .semibold))
            Text(name).font(.system(size: 12)).foregroundStyle(.secondary).lineLimit(1)
          }
          Sparkline(points: points).stroke(change >= 0 ? Color.green : Color.red, lineWidth: 1.6).frame(height: 34)
          VStack(alignment: .trailing, spacing: 2) {
            Text(String(format: "%.2f %@", price, currency)).font(.system(size: 15, weight: .medium).monospacedDigit())
            Text(String(format: "%+.2f (%+.2f%%)", change, percent)).font(.system(size: 12).monospacedDigit())
              .foregroundStyle(change >= 0 ? Color.green : Color.red)
          }
        }
      }
    }
    .padding(14)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.primary.opacity(0.07)))
  }
}

struct Sparkline: Shape {
  let points: [Double]
  func path(in rect: CGRect) -> Path {
    var p = Path()
    guard points.count > 1, let lo = points.min(), let hi = points.max() else { return p }
    let span = max(hi - lo, 0.0001)
    for (i, v) in points.enumerated() {
      let pt = CGPoint(x: rect.minX + rect.width * CGFloat(i) / CGFloat(points.count - 1), y: rect.maxY - rect.height * CGFloat((v - lo) / span))
      i == 0 ? p.move(to: pt) : p.addLine(to: pt)
    }
    return p
  }
}

// MARK: - Approval

struct ConfirmCard: View {
  @EnvironmentObject var model: PlutoModel

  var body: some View {
    if let c = model.confirmation {
      VStack(alignment: .leading, spacing: 12) {
        Label(c.title, systemImage: "hand.raised.fill")
          .font(.system(size: 14, weight: .semibold))
          .fixedSize(horizontal: false, vertical: true)
        ForEach(Array(c.fields.enumerated()), id: \.element.id) { i, f in
          VStack(alignment: .leading, spacing: 4) {
            Text(f.label).font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary)
            if f.editable {
              TextField("", text: binding(i), axis: .vertical)
                .textFieldStyle(.plain)
                .font(.system(size: 14))
                .lineLimit(1...8)
                .padding(8)
                .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.primary.opacity(0.07)))
            } else {
              Text(f.value).font(.system(size: 14)).lineLimit(4).textSelection(.enabled)
            }
          }
        }
        HStack {
          Spacer()
          Button("Cancel", action: model.cancelConfirmation).buttonStyle(PillButton(prominent: false))
          Button("Approve  ⌘⏎", action: model.approve).buttonStyle(PillButton(prominent: true))
        }
      }
      .padding(14)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.primary.opacity(0.07)))
    }
  }

  private func binding(_ i: Int) -> Binding<String> {
    Binding(
      get: { model.confirmation?.fields[safe: i]?.value ?? "" },
      set: { v in
        guard var c = model.confirmation, c.fields.indices.contains(i) else { return }
        c.fields[i].value = v
        model.confirmation = c
      }
    )
  }
}

struct PillButton: ButtonStyle {
  let prominent: Bool
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.system(size: 13, weight: .semibold))
      .padding(.horizontal, 14)
      .padding(.vertical, 7)
      .foregroundStyle(prominent ? Color.white : Color.primary)
      .background(Capsule().fill(prominent ? Color.accentColor : Color.primary.opacity(0.1)))
      .opacity(configuration.isPressed ? 0.7 : 1)
  }
}

extension Array {
  subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}

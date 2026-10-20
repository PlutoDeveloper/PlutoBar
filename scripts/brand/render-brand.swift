// Renders PlutoBar's brand images: the app icon, the wordmark, the mark and
// the menu bar icon. The mark is the bar itself: a capsule with Pluto (the
// orb) at its start. The wordmark keeps VoiceOS's round "o".
//   swift scripts/brand/render-brand.swift <out-dir>
import AppKit

let out = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "brand-out", isDirectory: true)
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

// The glow's colors (Sources/PlutoBar/Views.swift PlutoGlow).
let glow: [NSColor] = [
  NSColor(red: 0.74, green: 0.51, blue: 0.95, alpha: 1), NSColor(red: 0.96, green: 0.73, blue: 0.92, alpha: 1),
  NSColor(red: 0.55, green: 0.62, blue: 1.0, alpha: 1), NSColor(red: 1.0, green: 0.40, blue: 0.47, alpha: 1),
  NSColor(red: 1.0, green: 0.73, blue: 0.44, alpha: 1), NSColor(red: 0.78, green: 0.53, blue: 1.0, alpha: 1),
  NSColor(red: 0.74, green: 0.51, blue: 0.95, alpha: 1),
]

func render(_ name: String, _ w: Int, _ h: Int, _ draw: (CGContext) -> Void) {
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4,
                             hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  let ctx = NSGraphicsContext.current!.cgContext
  ctx.setShouldAntialias(true)
  draw(ctx)
  NSGraphicsContext.restoreGraphicsState()
  try! rep.representation(using: .png, properties: [:])!.write(to: out.appendingPathComponent(name))
}

func capsule(_ r: CGRect) -> CGPath { CGPath(roundedRect: r, cornerWidth: r.height / 2, cornerHeight: r.height / 2, transform: nil) }

// An angular gradient of the glow's colors, computed per pixel (no seams).
func conic(_ ctx: CGContext, center: CGPoint, radius: CGFloat, start: CGFloat = -0.6) {
  let n = max(Int(radius * 2), 2)
  var px = [UInt8](repeating: 0, count: n * n * 4)
  let comps = glow.map { c -> [CGFloat] in let c = c.usingColorSpace(.deviceRGB)!; return [c.redComponent, c.greenComponent, c.blueComponent] }
  for y in 0..<n {
    for x in 0..<n {
      var a = atan2(CGFloat(n / 2 - y), CGFloat(x - n / 2)) - start
      a = a.truncatingRemainder(dividingBy: 2 * .pi)
      if a < 0 { a += 2 * .pi }
      let seg = a / (2 * .pi) * CGFloat(glow.count - 1)
      let i = min(Int(seg), glow.count - 2), f = seg - CGFloat(i)
      let o = (y * n + x) * 4
      for k in 0..<3 { px[o + k] = UInt8(max(0, min(255, (comps[i][k] * (1 - f) + comps[i + 1][k] * f) * 255))) }
      px[o + 3] = 255
    }
  }
  let provider = CGDataProvider(data: Data(px) as CFData)!
  let image = CGImage(width: n, height: n, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: n * 4, space: CGColorSpaceCreateDeviceRGB(),
                      bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue), provider: provider, decode: nil,
                      shouldInterpolate: true, intent: .defaultIntent)!
  ctx.draw(image, in: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
}

func orb(_ ctx: CGContext, center: CGPoint, radius: CGFloat) {
  ctx.saveGState()
  ctx.addEllipse(in: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
  ctx.clip()
  conic(ctx, center: center, radius: radius * 1.5)
  let hl = CGGradient(colorsSpace: nil, colors: [NSColor.white.withAlphaComponent(0.85).cgColor, NSColor.white.withAlphaComponent(0).cgColor] as CFArray, locations: [0, 1])!
  ctx.drawRadialGradient(hl, startCenter: CGPoint(x: center.x - radius * 0.3, y: center.y + radius * 0.4), startRadius: 0,
                         endCenter: CGPoint(x: center.x - radius * 0.3, y: center.y + radius * 0.4), endRadius: radius * 1.1, options: [])
  ctx.restoreGState()
}

// MARK: the mark: a capsule with the orb cut out at its start (one color)

func mark(_ ctx: CGContext, in r: CGRect, color: NSColor) {
  let h = min(r.height, r.width / 2.17)
  let bar = CGRect(x: r.midX - h * 2.17 / 2, y: r.midY - h / 2, width: h * 2.17, height: h)
  let inset = h * 0.17
  let dot = CGRect(x: bar.minX + inset, y: bar.minY + inset, width: h - inset * 2, height: h - inset * 2)
  let path = CGMutablePath()
  path.addPath(capsule(bar))
  path.addEllipse(in: dot.insetBy(dx: -h * 0.07, dy: -h * 0.07))
  ctx.setFillColor(color.cgColor)
  ctx.addPath(path)
  ctx.fillPath(using: .evenOdd)
  ctx.fillEllipse(in: dot)
}

// MARK: the wordmark: "plutobar", with a round "o"

func wordmark(_ ctx: CGContext, w: CGFloat, h: CGFloat, color: NSColor) {
  let size = h * 0.92
  var font = NSFont.systemFont(ofSize: size, weight: .bold)
  if let d = font.fontDescriptor.withDesign(.rounded), let f = NSFont(descriptor: d, size: size) { font = f }
  let text = "plutobar"
  let attr = NSMutableAttributedString(string: text, attributes: [.font: font, .foregroundColor: color, .kern: -size * 0.02])
  let oIndex = 4
  attr.addAttribute(.foregroundColor, value: NSColor.clear, range: NSRange(location: oIndex, length: 1))
  let line = CTLineCreateWithAttributedString(attr)
  let width = CTLineGetTypographicBounds(line, nil, nil, nil)
  let scale = min(1, (w * 0.98) / width)
  ctx.saveGState()
  let baseline = (h - font.capHeight * scale) / 2 - font.descender * 0.15 * scale
  ctx.translateBy(x: (w - width * scale) / 2, y: baseline)
  ctx.scaleBy(x: scale, y: scale)
  ctx.textPosition = .zero
  CTLineDraw(line, ctx)
  let x0 = CTLineGetOffsetForStringIndex(line, oIndex, nil)
  let x1 = CTLineGetOffsetForStringIndex(line, oIndex + 1, nil)
  let d = font.xHeight * 1.06
  ctx.setFillColor(color.cgColor)
  ctx.fillEllipse(in: CGRect(x: (x0 + x1) / 2 - d / 2, y: -font.xHeight * 0.02, width: d, height: d))
  ctx.restoreGState()
}

// MARK: the app icon

func appIcon(_ ctx: CGContext, size s: CGFloat) {
  let k = s / 1024
  let tile = CGRect(x: 100 * k, y: 100 * k, width: 824 * k, height: 824 * k)
  let tilePath = CGPath(roundedRect: tile, cornerWidth: 185 * k, cornerHeight: 185 * k, transform: nil)
  ctx.saveGState()
  ctx.setShadow(offset: CGSize(width: 0, height: -10 * k), blur: 28 * k, color: NSColor.black.withAlphaComponent(0.35).cgColor)
  ctx.addPath(tilePath)
  ctx.setFillColor(NSColor.black.cgColor)
  ctx.fillPath()
  ctx.restoreGState()
  ctx.saveGState()
  ctx.addPath(tilePath)
  ctx.clip()
  let bg = CGGradient(colorsSpace: nil, colors: [NSColor(red: 0.16, green: 0.15, blue: 0.21, alpha: 1).cgColor,
                                                 NSColor(red: 0.04, green: 0.04, blue: 0.07, alpha: 1).cgColor] as CFArray, locations: [0, 1])!
  ctx.drawLinearGradient(bg, start: CGPoint(x: 0, y: tile.maxY), end: CGPoint(x: 0, y: tile.minY), options: [])
  // A faint wash of the glow behind the bar.
  let wash = CGGradient(colorsSpace: nil, colors: [glow[0].withAlphaComponent(0.35).cgColor, glow[0].withAlphaComponent(0).cgColor] as CFArray, locations: [0, 1])!
  ctx.drawRadialGradient(wash, startCenter: CGPoint(x: 512 * k, y: 512 * k), startRadius: 0, endCenter: CGPoint(x: 512 * k, y: 512 * k), endRadius: 420 * k, options: [])

  let bar = CGRect(x: 222 * k, y: 412 * k, width: 580 * k, height: 200 * k)
  // The glow ring around the bar.
  for (width, alpha, blur) in [(26.0, 0.55, 30.0), (6.0, 1.0, 0.0)] {
    ctx.saveGState()
    if blur > 0 { ctx.setShadow(offset: .zero, blur: blur * k, color: glow[2].withAlphaComponent(0.8).cgColor) }
    ctx.addPath(capsule(bar.insetBy(dx: -width * k / 2 + 3 * k, dy: -width * k / 2 + 3 * k)))
    ctx.setLineWidth(width * k)
    ctx.replacePathWithStrokedPath()
    ctx.clip()
    ctx.setAlpha(alpha)
    conic(ctx, center: CGPoint(x: bar.midX, y: bar.midY), radius: 420 * k, start: 0.4)
    ctx.restoreGState()
  }
  // The glass bar.
  ctx.addPath(capsule(bar))
  ctx.setFillColor(NSColor.white.withAlphaComponent(0.11).cgColor)
  ctx.fillPath()
  let sheen = CGGradient(colorsSpace: nil, colors: [NSColor.white.withAlphaComponent(0.18).cgColor, NSColor.white.withAlphaComponent(0).cgColor] as CFArray, locations: [0, 1])!
  ctx.saveGState()
  ctx.addPath(capsule(bar))
  ctx.clip()
  ctx.drawLinearGradient(sheen, start: CGPoint(x: 0, y: bar.maxY), end: CGPoint(x: 0, y: bar.midY), options: [])
  ctx.restoreGState()
  // Pluto, and a line of text.
  orb(ctx, center: CGPoint(x: bar.minX + 100 * k, y: bar.midY), radius: 62 * k)
  ctx.addPath(capsule(CGRect(x: bar.minX + 200 * k, y: bar.midY - 15 * k, width: 270 * k, height: 30 * k)))
  ctx.setFillColor(NSColor.white.withAlphaComponent(0.55).cgColor)
  ctx.fillPath()
  ctx.restoreGState()
}

render("icon-1024.png", 1024, 1024) { appIcon($0, size: 1024) }
for s in [16, 32, 64, 128, 256, 512, 1024] { render("icon_\(s).png", s, s) { appIcon($0, size: CGFloat(s)) } }
render("wordmark-white.png", 638, 133) { wordmark($0, w: 638, h: 133, color: .white) }
render("wordmark-black.png", 638, 133) { wordmark($0, w: 638, h: 133, color: .black) }
render("mark-white-202x97.png", 202, 97) { mark($0, in: CGRect(x: 0, y: 0, width: 202, height: 97), color: .white) }
render("mark-black-202x97.png", 202, 97) { mark($0, in: CGRect(x: 0, y: 0, width: 202, height: 97), color: .black) }
render("mark-light-591.png", 591, 591) { mark($0, in: CGRect(x: 0, y: 160, width: 591, height: 271), color: NSColor(white: 0.95, alpha: 1)) }
render("mark-black-591x282.png", 591, 282) { mark($0, in: CGRect(x: 0, y: 0, width: 591, height: 282), color: .black) }
render("tray.png", 37, 17) { mark($0, in: CGRect(x: 1, y: 1, width: 35, height: 15), color: .black) }
render("tray@2x.png", 74, 35) { mark($0, in: CGRect(x: 2, y: 2, width: 70, height: 31), color: .black) }
print("✓ \(out.path)")

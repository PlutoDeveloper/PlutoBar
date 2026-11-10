// Renders the DMG window's background (660×420 points, 1x and 2x): PlutoBar's
// dark canvas and glow, a gradient arrow from the app to Applications, and the
// one thing a first open may need.
//   swift scripts/brand/render-dmg.swift resources/build
// The icons sit at (180, 205) and (480, 205) (package.json build.dmg.contents).
import AppKit

let out = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".", isDirectory: true)
let size = CGSize(width: 660, height: 420)

// The glow's colors (Sources/PlutoBar/Views.swift PlutoGlow).
let glow: [NSColor] = [
  NSColor(red: 0.74, green: 0.51, blue: 0.95, alpha: 1), NSColor(red: 0.96, green: 0.73, blue: 0.92, alpha: 1),
  NSColor(red: 0.55, green: 0.62, blue: 1.0, alpha: 1), NSColor(red: 1.0, green: 0.40, blue: 0.47, alpha: 1),
  NSColor(red: 1.0, green: 0.73, blue: 0.44, alpha: 1),
]

func render(_ name: String, scale: CGFloat) {
  let w = Int(size.width * scale), h = Int(size.height * scale)
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4,
                             hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  let ctx = NSGraphicsContext.current!.cgContext
  ctx.scaleBy(x: scale, y: scale)
  ctx.setShouldAntialias(true)
  // Flipped: y grows downward, as Finder places icons.
  ctx.translateBy(x: 0, y: size.height)
  ctx.scaleBy(x: 1, y: -1)
  let space = CGColorSpaceCreateDeviceRGB()

  // The canvas: the icon's deep indigo, lighter toward the middle.
  ctx.setFillColor(NSColor(red: 0.075, green: 0.063, blue: 0.11, alpha: 1).cgColor)
  ctx.fill(CGRect(origin: .zero, size: size))
  let middle = CGGradient(colorsSpace: space, colors: [NSColor(red: 0.22, green: 0.16, blue: 0.33, alpha: 1).cgColor,
                                                       NSColor(red: 0.075, green: 0.063, blue: 0.11, alpha: 0).cgColor] as CFArray,
                          locations: [0, 1])!
  ctx.drawRadialGradient(middle, startCenter: CGPoint(x: 330, y: 200), startRadius: 0,
                         endCenter: CGPoint(x: 330, y: 200), endRadius: 360, options: [])
  // Soft glow blobs in the bar's colors.
  for (i, (x, y, r)) in [(150.0, 120.0, 200.0), (520.0, 300.0, 210.0), (340.0, 410.0, 170.0)].enumerated() {
    let c = glow[[0, 2, 3][i]]
    let g = CGGradient(colorsSpace: space, colors: [c.withAlphaComponent(0.22).cgColor, c.withAlphaComponent(0).cgColor] as CFArray,
                       locations: [0, 1])!
    ctx.drawRadialGradient(g, startCenter: CGPoint(x: x, y: y), startRadius: 0, endCenter: CGPoint(x: x, y: y), endRadius: r, options: [])
  }

  // The title.
  func text(_ s: String, _ font: NSFont, _ color: NSColor, y: CGFloat, kern: CGFloat = 0) {
    let style = NSMutableParagraphStyle()
    style.alignment = .center
    let a = NSAttributedString(string: s, attributes: [.font: font, .foregroundColor: color, .paragraphStyle: style, .kern: kern])
    NSGraphicsContext.saveGraphicsState()
    let flipped = NSGraphicsContext(cgContext: ctx, flipped: true)
    NSGraphicsContext.current = flipped
    a.draw(in: CGRect(x: 30, y: y, width: size.width - 60, height: 40))
    NSGraphicsContext.restoreGraphicsState()
  }
  text("Drag PlutoBar into Applications", .systemFont(ofSize: 22, weight: .semibold), NSColor(white: 1, alpha: 0.95), y: 44, kern: -0.2)
  text("Then press ⌥ Space anywhere.", .systemFont(ofSize: 13, weight: .regular), NSColor(white: 1, alpha: 0.6), y: 76)

  // The arrow, in the glow's gradient, between the two icons.
  let shaft = CGMutablePath()
  shaft.move(to: CGPoint(x: 262, y: 205))
  shaft.addCurve(to: CGPoint(x: 392, y: 205), control1: CGPoint(x: 300, y: 182), control2: CGPoint(x: 354, y: 182))
  let head = CGMutablePath()
  head.move(to: CGPoint(x: 380, y: 192))
  head.addLine(to: CGPoint(x: 395, y: 206))
  head.addLine(to: CGPoint(x: 378, y: 216))
  for (path, width) in [(shaft as CGPath, 5.0), (head as CGPath, 5.0)] {
    ctx.saveGState()
    ctx.addPath(path)
    ctx.setLineWidth(width)
    ctx.setLineCap(.round)
    ctx.setLineJoin(.round)
    ctx.replacePathWithStrokedPath()
    ctx.clip()
    let g = CGGradient(colorsSpace: space, colors: [glow[0], glow[1], glow[2], glow[3], glow[4]].map(\.cgColor) as CFArray,
                       locations: [0, 0.3, 0.55, 0.8, 1])!
    ctx.drawLinearGradient(g, start: CGPoint(x: 262, y: 0), end: CGPoint(x: 398, y: 0), options: [])
    ctx.restoreGState()
  }

  // The one step a first open may need (the app isn't notarized by Apple).
  let pill = CGRect(x: 105, y: 326, width: 450, height: 46)
  ctx.addPath(CGPath(roundedRect: pill, cornerWidth: 14, cornerHeight: 14, transform: nil))
  ctx.setFillColor(NSColor(white: 1, alpha: 0.07).cgColor)
  ctx.fillPath()
  ctx.addPath(CGPath(roundedRect: pill.insetBy(dx: 0.5, dy: 0.5), cornerWidth: 14, cornerHeight: 14, transform: nil))
  ctx.setStrokeColor(NSColor(white: 1, alpha: 0.12).cgColor)
  ctx.setLineWidth(1)
  ctx.strokePath()
  text("First open: if macOS asks, go to System Settings → Privacy & Security", .systemFont(ofSize: 11.5, weight: .medium),
       NSColor(white: 1, alpha: 0.78), y: 333)
  text("and click Open Anyway. You'll only do this once.", .systemFont(ofSize: 11.5, weight: .regular),
       NSColor(white: 1, alpha: 0.55), y: 350)

  NSGraphicsContext.restoreGraphicsState()
  try! rep.representation(using: .png, properties: [:])!.write(to: out.appendingPathComponent(name))
}

render("background.png", scale: 1)
render("background@2x.png", scale: 2)
print("✓ \(out.path)/background.png, background@2x.png")

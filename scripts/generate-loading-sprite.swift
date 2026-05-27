import AppKit
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let characterRoot = root.appendingPathComponent("public/characters/ggobuk")
let outputDir = characterRoot.appendingPathComponent("animations", isDirectory: true)
let outputURL = outputDir.appendingPathComponent("report-loading-sprite.png")

try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

let sourceURL = characterRoot.appendingPathComponent("poses/hires/pose_fortune_board@3x.png")
guard let kkobuk = NSImage(contentsOf: sourceURL) else {
  fatalError("Missing image: \(sourceURL.path)")
}

let frameCount = 8
let frameSize: CGFloat = 256
let sheetSize = CGSize(width: frameSize * CGFloat(frameCount), height: frameSize)

let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: Int(sheetSize.width),
  pixelsHigh: Int(sheetSize.height),
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSGraphicsContext.current?.imageInterpolation = .high

func color(_ hex: String, alpha: CGFloat = 1) -> NSColor {
  var value = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
  if value.count == 3 {
    value = value.map { "\($0)\($0)" }.joined()
  }
  var int: UInt64 = 0
  Scanner(string: value).scanHexInt64(&int)
  let r = CGFloat((int >> 16) & 0xff) / 255
  let g = CGFloat((int >> 8) & 0xff) / 255
  let b = CGFloat(int & 0xff) / 255
  return NSColor(calibratedRed: r, green: g, blue: b, alpha: alpha)
}

func roundedRect(_ rect: CGRect, radius: CGFloat, fill: NSColor) {
  fill.setFill()
  NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}

func drawImage(_ image: NSImage, in rect: CGRect, angle: CGFloat) {
  guard let context = NSGraphicsContext.current?.cgContext else { return }
  context.saveGState()
  context.translateBy(x: rect.midX, y: rect.midY)
  context.rotate(by: angle)
  image.draw(
    in: CGRect(x: -rect.width / 2, y: -rect.height / 2, width: rect.width, height: rect.height),
    from: .zero,
    operation: .sourceOver,
    fraction: 1
  )
  context.restoreGState()
}

func drawSpark(_ center: CGPoint, size: CGFloat, alpha: CGFloat) {
  let path = NSBezierPath()
  path.move(to: CGPoint(x: center.x, y: center.y + size))
  path.line(to: CGPoint(x: center.x + size * 0.32, y: center.y + size * 0.32))
  path.line(to: CGPoint(x: center.x + size, y: center.y))
  path.line(to: CGPoint(x: center.x + size * 0.32, y: center.y - size * 0.32))
  path.line(to: CGPoint(x: center.x, y: center.y - size))
  path.line(to: CGPoint(x: center.x - size * 0.32, y: center.y - size * 0.32))
  path.line(to: CGPoint(x: center.x - size, y: center.y))
  path.line(to: CGPoint(x: center.x - size * 0.32, y: center.y + size * 0.32))
  path.close()
  color("#F4D03F", alpha: alpha).setFill()
  path.fill()
}

for frame in 0..<frameCount {
  let originX = CGFloat(frame) * frameSize
  let phase = (CGFloat(frame) / CGFloat(frameCount)) * .pi * 2
  let bob = sin(phase) * 5
  let sway = sin(phase + .pi / 5) * 4
  let angle = sin(phase) * 0.035
  let scale = 1 + cos(phase) * 0.018

  NSColor.clear.setFill()
  CGRect(x: originX, y: 0, width: frameSize, height: frameSize).fill()

  color("#132B3A", alpha: 0.16).setFill()
  NSBezierPath(ovalIn: CGRect(x: originX + 54, y: 27, width: 143, height: 18)).fill()

  let imageWidth = 210 * scale
  let imageHeight = 187 * scale
  drawImage(
    kkobuk,
    in: CGRect(
      x: originX + 23 + sway,
      y: 39 + bob,
      width: imageWidth,
      height: imageHeight
    ),
    angle: angle
  )

  let cardLift = (1 + sin(phase + .pi / 2)) * 0.5
  let cardX = originX + 168 + sin(phase * 1.5) * 4
  let cardY = 166 + cardLift * 12
  roundedRect(
    CGRect(x: cardX, y: cardY, width: 38, height: 26),
    radius: 8,
    fill: color("#FFF9EE", alpha: 0.94)
  )
  color("#4ECDC4", alpha: 0.7).setStroke()
  let line = NSBezierPath()
  line.lineWidth = 3
  line.move(to: CGPoint(x: cardX + 10, y: cardY + 15))
  line.line(to: CGPoint(x: cardX + 28, y: cardY + 15))
  line.stroke()

  drawSpark(
    CGPoint(x: originX + 199 + cos(phase) * 5, y: 213 + sin(phase) * 4),
    size: 9,
    alpha: 0.72
  )
}

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [.compressionFactor: 0.92]) else {
  fatalError("Could not encode \(outputURL.path)")
}
try png.write(to: outputURL)
print("Wrote \(outputURL.path)")

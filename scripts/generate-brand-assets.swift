import AppKit
import CoreText
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let characterRoot = root.appendingPathComponent("public/characters/ggobuk")
let iconDir = root.appendingPathComponent("public/icons", isDirectory: true)
let appStoreDir = root.appendingPathComponent("assets/app-store", isDirectory: true)

try FileManager.default.createDirectory(at: iconDir, withIntermediateDirectories: true)
try FileManager.default.createDirectory(at: appStoreDir, withIntermediateDirectories: true)

let navy = NSColor(hex: "#243344")
let mint = NSColor(hex: "#4ECDC4")
let mintSoft = NSColor(hex: "#D9F2EC")
let ivory = NSColor(hex: "#FFF9EE")
let cream = NSColor(hex: "#FAF6F0")
let gold = NSColor(hex: "#F7D65C")
let red = NSColor(hex: "#E85B55")
let muted = NSColor(hex: "#82786D")

let mainKkobuk = image("characters/hires/main_waving@2x.png")
let friend = image("characters/hires/basic_friend_waving@2x.png")
let dosa = image("characters/hires/saju_master_staff@2x.png")
let mudang = image("characters/hires/direct_shaman_bell@2x.png")
let bosal = image("characters/hires/comfort_bodhisattva_beads@2x.png")
let happy = image("expressions/hires/expr_happy@3x.png")
let relaxed = image("expressions/hires/expr_relaxed@3x.png")
let book = image("poses/hires/pose_reading_book@3x.png")
let board = image("poses/hires/pose_fortune_board@3x.png")
let drink = image("poses/hires/pose_holding_tea@3x.png")

func image(_ relativePath: String) -> NSImage {
  let url = characterRoot.appendingPathComponent(relativePath)
  guard let image = NSImage(contentsOf: url) else {
    fatalError("Missing image: \(url.path)")
  }
  return image
}

func render(size: CGSize, url: URL, draw: (CGRect) -> Void) {
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size.width),
    pixelsHigh: Int(size.height),
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
  draw(CGRect(origin: .zero, size: size))
  NSGraphicsContext.restoreGraphicsState()
  guard let png = rep.representation(using: .png, properties: [.compressionFactor: 0.92]) else {
    fatalError("Could not encode \(url.path)")
  }
  try! png.write(to: url)
}

func topRect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, in canvas: CGRect) -> CGRect {
  CGRect(x: x, y: canvas.height - y - h, width: w, height: h)
}

func fill(_ color: NSColor, _ rect: CGRect) {
  color.setFill()
  rect.fill()
}

func rounded(_ rect: CGRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, line: CGFloat = 1) {
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
  fill.setFill()
  path.fill()
  if let stroke {
    stroke.setStroke()
    path.lineWidth = line
    path.stroke()
  }
}

func drawPattern(_ canvas: CGRect, alpha: CGFloat = 0.09) {
  NSColor.black.withAlphaComponent(alpha).setFill()
  let step: CGFloat = 48
  for x in stride(from: CGFloat(24), through: canvas.width, by: step) {
    for y in stride(from: CGFloat(24), through: canvas.height, by: step) {
      NSBezierPath(ovalIn: CGRect(x: x, y: y, width: 5, height: 5)).fill()
    }
  }
}

func drawImageFit(_ image: NSImage, in rect: CGRect, opacity: CGFloat = 1) {
  let aspect = image.size.width / image.size.height
  var target = rect
  if rect.width / rect.height > aspect {
    target.size.width = rect.height * aspect
    target.origin.x += (rect.width - target.width) / 2
  } else {
    target.size.height = rect.width / aspect
    target.origin.y += (rect.height - target.height) / 2
  }
  image.draw(in: target, from: .zero, operation: .sourceOver, fraction: opacity)
}

func drawImageFill(_ image: NSImage, in rect: CGRect, opacity: CGFloat = 1) {
  let aspect = image.size.width / image.size.height
  var target = rect
  if rect.width / rect.height > aspect {
    target.size.height = rect.width / aspect
    target.origin.y += (rect.height - target.height) / 2
  } else {
    target.size.width = rect.height * aspect
    target.origin.x += (rect.width - target.width) / 2
  }
  image.draw(in: target, from: .zero, operation: .sourceOver, fraction: opacity)
}

func text(
  _ value: String,
  x: CGFloat,
  y: CGFloat,
  width: CGFloat,
  size: CGFloat,
  weight: NSFont.Weight,
  color: NSColor,
  align: NSTextAlignment = .left,
  lineHeight: CGFloat? = nil,
  in canvas: CGRect
) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = align
  paragraph.lineSpacing = 6
  paragraph.minimumLineHeight = lineHeight ?? size * 1.25
  paragraph.maximumLineHeight = lineHeight ?? size * 1.25
  let attrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: size, weight: weight),
    .foregroundColor: color,
    .paragraphStyle: paragraph,
  ]
  let rect = topRect(x, y, width, 600, in: canvas)
  (value as NSString).draw(in: rect, withAttributes: attrs)
}

func centeredText(
  _ value: String,
  y: CGFloat,
  width: CGFloat,
  size: CGFloat,
  weight: NSFont.Weight,
  color: NSColor,
  in canvas: CGRect
) {
  text(value, x: (canvas.width - width) / 2, y: y, width: width, size: size, weight: weight, color: color, align: .center, in: canvas)
}

func iconBackground(_ canvas: CGRect) {
  NSGradient(colors: [NSColor(hex: "#9AE7DE"), mint, NSColor(hex: "#258C89")])!
    .draw(in: canvas, angle: -35)
  NSColor.white.withAlphaComponent(0.32).setFill()
  NSBezierPath(ovalIn: CGRect(x: -230, y: 250, width: 900, height: 900)).fill()
  drawPattern(canvas, alpha: 0.075)
}

func renderIcon(size: CGFloat, safe: Bool = false, url: URL) {
  render(size: CGSize(width: size, height: size), url: url) { canvas in
    iconBackground(canvas)
    NSColor(hex: "#215C60").withAlphaComponent(0.22).setFill()
    NSBezierPath(ovalIn: CGRect(x: size * 0.20, y: size * 0.10, width: size * 0.58, height: size * 0.10)).fill()
    let characterRect = safe
      ? CGRect(x: size * 0.20, y: size * 0.15, width: size * 0.60, height: size * 0.70)
      : CGRect(x: size * 0.08, y: size * 0.08, width: size * 0.78, height: size * 0.82)
    drawImageFit(mainKkobuk, in: characterRect)
    drawCoin(in: CGRect(x: size * 0.70, y: size * 0.70, width: size * 0.18, height: size * 0.18), fontSize: size * 0.105)
  }
}

func drawCoin(in rect: CGRect, fontSize: CGFloat) {
  NSColor.white.withAlphaComponent(0.92).setFill()
  NSBezierPath(ovalIn: rect.insetBy(dx: -rect.width * 0.13, dy: -rect.height * 0.13)).fill()
  gold.setFill()
  NSBezierPath(ovalIn: rect).fill()
  NSColor(hex: "#C9A515").setStroke()
  let ring = NSBezierPath(ovalIn: rect.insetBy(dx: rect.width * 0.08, dy: rect.height * 0.08))
  ring.lineWidth = max(2, rect.width * 0.035)
  ring.stroke()

  let fontName = (NSFont(name: "AppleMyungjo", size: fontSize) != nil ? "AppleMyungjo" : ".AppleSystemUIFont") as CFString
  let font = CTFontCreateWithName(fontName, fontSize, nil)
  let text = NSAttributedString(
    string: "占",
    attributes: [
      kCTFontAttributeName as NSAttributedString.Key: font,
      kCTForegroundColorAttributeName as NSAttributedString.Key: navy.cgColor,
    ]
  )
  let line = CTLineCreateWithAttributedString(text)
  var ascent: CGFloat = 0
  var descent: CGFloat = 0
  var leading: CGFloat = 0
  let width = CGFloat(CTLineGetTypographicBounds(line, &ascent, &descent, &leading))
  guard let context = NSGraphicsContext.current?.cgContext else { return }
  context.saveGState()
  context.textMatrix = .identity
  context.textPosition = CGPoint(x: rect.midX - width / 2, y: rect.midY - (ascent - descent) / 2)
  CTLineDraw(line, context)
  context.restoreGState()
}

func renderFavicon(size: CGFloat, url: URL) {
  render(size: CGSize(width: size, height: size), url: url) { canvas in
    NSGradient(colors: [mintSoft, mint])!.draw(in: canvas, angle: -35)
    let faceRect = CGRect(x: size * 0.08, y: size * 0.08, width: size * 0.84, height: size * 0.84)
    drawImageFit(happy, in: faceRect)
  }
}

func writeICO(entries: [(size: Int, url: URL)], output: URL) {
  var data = Data()
  data.appendLE16(0)
  data.appendLE16(1)
  data.appendLE16(UInt16(entries.count))
  var offset = 6 + entries.count * 16
  let pngs = entries.map { try! Data(contentsOf: $0.url) }
  for (i, entry) in entries.enumerated() {
    data.append(UInt8(entry.size == 256 ? 0 : entry.size))
    data.append(UInt8(entry.size == 256 ? 0 : entry.size))
    data.append(0)
    data.append(0)
    data.appendLE16(1)
    data.appendLE16(32)
    data.appendLE32(UInt32(pngs[i].count))
    data.appendLE32(UInt32(offset))
    offset += pngs[i].count
  }
  for png in pngs { data.append(png) }
  try! data.write(to: output)
}

func promoBackground(_ canvas: CGRect) {
  NSGradient(colors: [cream, ivory, NSColor(hex: "#E5F7F4")])!.draw(in: canvas, angle: -25)
  drawPattern(canvas, alpha: 0.055)
  NSColor.white.withAlphaComponent(0.42).setFill()
  NSBezierPath(ovalIn: topRect(-260, -140, 1040, 1040, in: canvas)).fill()
  NSColor(hex: "#C9F1EB").withAlphaComponent(0.32).setFill()
  NSBezierPath(ovalIn: topRect(620, 1580, 920, 920, in: canvas)).fill()
}

func drawPhoneFrame(_ rect: CGRect) {
  rounded(rect, radius: 76, fill: navy.withAlphaComponent(0.10), stroke: navy.withAlphaComponent(0.10), line: 2)
  let body = rect.insetBy(dx: 22, dy: 22)
  rounded(body, radius: 64, fill: NSColor.white.withAlphaComponent(0.94), stroke: navy.withAlphaComponent(0.16), line: 2)
  let notch = CGRect(x: body.midX - 88, y: body.maxY - 42, width: 176, height: 18)
  rounded(notch, radius: 9, fill: navy.withAlphaComponent(0.16))
}

func drawHomeMockup(in rect: CGRect, canvas: CGRect) {
  drawPhoneFrame(rect)
  let body = rect.insetBy(dx: 70, dy: 110)
  text("정유일 丁酉日", x: body.minX, y: canvas.height - body.maxY, width: body.width, size: 38, weight: .black, color: navy, in: canvas)
  rounded(CGRect(x: body.maxX - 126, y: body.maxY - 58, width: 126, height: 52), radius: 26, fill: mintSoft)
  text("길운 88", x: body.maxX - 104, y: canvas.height - body.maxY + 12, width: 100, size: 24, weight: .black, color: navy, in: canvas)
  let card = CGRect(x: body.minX, y: body.maxY - 575, width: body.width, height: 430)
  rounded(card, radius: 42, fill: NSColor.white, stroke: navy.withAlphaComponent(0.10), line: 2)
  let cardTop = canvas.height - card.maxY
  drawImageFit(happy, in: topRect(card.midX - 165, cardTop + 40, 330, 235, in: canvas))
  text("오늘의 꼬북이 표정", x: card.minX, y: cardTop + 288, width: card.width, size: 24, weight: .bold, color: muted, align: .center, in: canvas)
  text("기분 좋게 풀리는 날", x: card.minX, y: cardTop + 338, width: card.width, size: 36, weight: .black, color: navy, align: .center, in: canvas)
  let note = CGRect(x: body.minX, y: card.minY - 146, width: body.width, height: 108)
  rounded(note, radius: 32, fill: NSColor.white, stroke: navy.withAlphaComponent(0.08), line: 2)
  text("오늘의 한 줄", x: note.minX + 34, y: canvas.height - note.maxY + 26, width: note.width - 68, size: 22, weight: .black, color: muted, in: canvas)
  text("흐름을 천천히 잡으면 좋은 날", x: note.minX + 34, y: canvas.height - note.maxY + 62, width: note.width - 68, size: 28, weight: .black, color: navy, in: canvas)
}

func drawChatMockup(in rect: CGRect, canvas: CGRect) {
  drawPhoneFrame(rect)
  let body = rect.insetBy(dx: 70, dy: 116)
  drawImageFit(dosa, in: CGRect(x: body.minX + 210, y: body.maxY - 300, width: 190, height: 230))
  bubble("제 사주를 깊이 풀어주세요", rect: CGRect(x: body.minX + 82, y: body.maxY - 405, width: body.width - 82, height: 82), fill: mintSoft, alignRight: true, canvas: canvas)
  bubble("허허, 자네의 등껍질에는 기준이 또렷하군. 올해는 무리한 확장보다 단단히 다지는 운이라네.", rect: CGRect(x: body.minX, y: body.maxY - 545, width: body.width - 42, height: 142), fill: NSColor.white, alignRight: false, canvas: canvas)
  bubble("오늘 바로 해볼 일도 알려줘", rect: CGRect(x: body.minX + 136, y: body.maxY - 662, width: body.width - 136, height: 82), fill: mintSoft, alignRight: true, canvas: canvas)
  bubble("오전에는 정리, 오후에는 연락. 작은 약속을 지키는 것이 운을 여는 열쇠라네.", rect: CGRect(x: body.minX, y: body.maxY - 804, width: body.width - 28, height: 142), fill: NSColor.white, alignRight: false, canvas: canvas)
}

func bubble(_ value: String, rect: CGRect, fill: NSColor, alignRight: Bool, canvas: CGRect) {
  rounded(rect, radius: 28, fill: fill, stroke: navy.withAlphaComponent(0.08), line: 1)
  text(value, x: rect.minX + 28, y: canvas.height - rect.maxY + 22, width: rect.width - 56, size: 23, weight: .bold, color: navy, align: alignRight ? .right : .left, in: canvas)
}

func pill(_ value: String, rect: CGRect, fill: NSColor, color: NSColor = navy, size: CGFloat = 26, canvas: CGRect) {
  rounded(rect, radius: rect.height / 2, fill: fill, stroke: navy.withAlphaComponent(0.06), line: 1)
  text(value, x: rect.minX, y: canvas.height - rect.maxY + (rect.height - size * 1.25) / 2, width: rect.width, size: size, weight: .black, color: color, align: .center, in: canvas)
}

func featureRow(label: String, value: String, rect: CGRect, iconColor: NSColor, canvas: CGRect) {
  rounded(rect, radius: 30, fill: NSColor.white.withAlphaComponent(0.92), stroke: navy.withAlphaComponent(0.08), line: 2)
  iconColor.withAlphaComponent(0.82).setFill()
  NSBezierPath(ovalIn: CGRect(x: rect.minX + 28, y: rect.midY - 22, width: 44, height: 44)).fill()
  text(label, x: rect.minX + 92, y: canvas.height - rect.maxY + 24, width: rect.width - 122, size: 24, weight: .black, color: muted, in: canvas)
  text(value, x: rect.minX + 92, y: canvas.height - rect.maxY + 62, width: rect.width - 122, size: 34, weight: .black, color: navy, in: canvas)
}

func drawInputFeature(in canvas: CGRect) {
  drawImageFit(mainKkobuk, in: topRect(95, 690, 610, 760, in: canvas))
  drawCoin(in: topRect(665, 760, 150, 150, in: canvas), fontSize: 86)

  let panel = topRect(520, 910, 600, 810, in: canvas)
  rounded(panel, radius: 58, fill: NSColor.white.withAlphaComponent(0.92), stroke: navy.withAlphaComponent(0.10), line: 2)
  text("사주 입력", x: panel.minX + 52, y: canvas.height - panel.maxY + 58, width: panel.width - 104, size: 42, weight: .black, color: navy, in: canvas)
  pill("양력", rect: CGRect(x: panel.maxX - 216, y: panel.maxY - 114, width: 150, height: 56), fill: mintSoft, size: 25, canvas: canvas)

  featureRow(label: "생년월일", value: "1994.03.18", rect: CGRect(x: panel.minX + 52, y: panel.maxY - 258, width: panel.width - 104, height: 112), iconColor: mint, canvas: canvas)
  featureRow(label: "태어난 시간", value: "오전 8:30", rect: CGRect(x: panel.minX + 52, y: panel.maxY - 400, width: panel.width - 104, height: 112), iconColor: gold, canvas: canvas)
  featureRow(label: "오늘의 풀이", value: "일진 · 길운 · 행동", rect: CGRect(x: panel.minX + 52, y: panel.maxY - 542, width: panel.width - 104, height: 112), iconColor: red, canvas: canvas)

  rounded(CGRect(x: panel.minX + 52, y: panel.minY + 64, width: panel.width - 104, height: 92), radius: 30, fill: mint)
  text("꼬북이가 쉽게 풀어보기", x: panel.minX + 52, y: canvas.height - panel.minY - 138, width: panel.width - 104, size: 32, weight: .black, color: NSColor.white, align: .center, in: canvas)
}

func drawDailyFeature(in canvas: CGRect) {
  let phone = topRect(190, 655, 910, 1500, in: canvas)
  drawHomeMockup(in: phone, canvas: canvas)
  let body = phone.insetBy(dx: 70, dy: 110)
  featureRow(label: "꼬북적 운세 도구", value: "필요한 풀이 바로 열기", rect: topRect(body.minX, 1548, body.width, 118, in: canvas), iconColor: mint, canvas: canvas)
  let miniWidth = (body.width - 24) / 2
  rounded(topRect(body.minX, 1696, miniWidth, 154, in: canvas), radius: 32, fill: mintSoft, stroke: navy.withAlphaComponent(0.08), line: 2)
  rounded(topRect(body.minX + miniWidth + 24, 1696, miniWidth, 154, in: canvas), radius: 32, fill: NSColor(hex: "#FFF1C4"), stroke: navy.withAlphaComponent(0.08), line: 2)
  text("사주", x: body.minX, y: 1742, width: miniWidth, size: 34, weight: .black, color: navy, align: .center, in: canvas)
  text("궁합", x: body.minX + miniWidth + 24, y: 1742, width: miniWidth, size: 34, weight: .black, color: navy, align: .center, in: canvas)
  drawImageFit(relaxed, in: topRect(792, 1855, 310, 282, in: canvas))
  let strip = topRect(142, 2188, 1006, 250, in: canvas)
  rounded(strip, radius: 50, fill: NSColor.white.withAlphaComponent(0.90), stroke: navy.withAlphaComponent(0.08), line: 2)
  pill("행운색 민트", rect: topRect(204, 2250, 260, 74, in: canvas), fill: mintSoft, size: 28, canvas: canvas)
  pill("좋은 시간 오전", rect: topRect(514, 2250, 300, 74, in: canvas), fill: NSColor(hex: "#FFF1C4"), size: 28, canvas: canvas)
  pill("오늘 할 일 정리", rect: topRect(854, 2250, 250, 74, in: canvas), fill: NSColor(hex: "#FFE0DD"), size: 26, canvas: canvas)
}

func drawPersonaFeature(in canvas: CGRect) {
  let cards = [
    (friend, "친구", "편하게 물어보기", mintSoft),
    (dosa, "도사", "깊은 사주 풀이", NSColor(hex: "#FFF1C4")),
    (mudang, "무당", "시원한 직감 상담", NSColor(hex: "#FFE0DD")),
    (bosal, "보살", "차분한 위로", NSColor(hex: "#E9E3FF")),
  ]
  for (i, item) in cards.enumerated() {
    let col = i % 2
    let row = i / 2
    let r = topRect(115 + CGFloat(col) * 535, 730 + CGFloat(row) * 620, 500, 540, in: canvas)
    rounded(r, radius: 52, fill: NSColor.white.withAlphaComponent(0.92), stroke: navy.withAlphaComponent(0.10), line: 2)
    rounded(CGRect(x: r.minX + 32, y: r.maxY - 94, width: 132, height: 50), radius: 25, fill: item.3)
    text(item.1, x: r.minX + 32, y: canvas.height - r.maxY + 18, width: 132, size: 24, weight: .black, color: navy, align: .center, in: canvas)
    drawImageFit(item.0, in: topRect(r.minX + 104, canvas.height - r.maxY + 88, 292, 310, in: canvas))
    text(item.2, x: r.minX + 36, y: canvas.height - r.minY - 104, width: r.width - 72, size: 31, weight: .black, color: navy, align: .center, in: canvas)
  }

  rounded(topRect(188, 2050, 914, 220, in: canvas), radius: 48, fill: navy.withAlphaComponent(0.92))
  text("질문 분위기에 맞춰 꼬북이 말투를 골라요", x: 258, y: 2123, width: 774, size: 38, weight: .black, color: NSColor.white, align: .center, in: canvas)
}

func drawRelationFeature(in canvas: CGRect) {
  drawImageFit(drink, in: topRect(360, 660, 570, 520, in: canvas))
  let panel = topRect(170, 1270, 950, 830, in: canvas)
  rounded(panel, radius: 62, fill: NSColor.white.withAlphaComponent(0.92), stroke: navy.withAlphaComponent(0.10), line: 2)

  navy.withAlphaComponent(0.24).setStroke()
  let path = NSBezierPath()
  path.lineWidth = 9
  path.lineCapStyle = .round
  path.move(to: CGPoint(x: panel.midX, y: panel.midY + 166))
  path.line(to: CGPoint(x: panel.midX - 260, y: panel.midY - 26))
  path.move(to: CGPoint(x: panel.midX, y: panel.midY + 166))
  path.line(to: CGPoint(x: panel.midX + 260, y: panel.midY - 26))
  path.move(to: CGPoint(x: panel.midX, y: panel.midY + 166))
  path.line(to: CGPoint(x: panel.midX, y: panel.midY - 230))
  path.stroke()

  relationNode("나", x: panel.midX - 70, y: panel.midY + 166)
  relationNode("연인", x: panel.midX - 330, y: panel.midY - 96)
  relationNode("친구", x: panel.midX + 190, y: panel.midY - 96)
  relationNode("가족", x: panel.midX - 70, y: panel.midY - 300)

  featureRow(label: "강점", value: "서로의 속도를 맞추는 관계", rect: topRect(200, 2158, 890, 122, in: canvas), iconColor: mint, canvas: canvas)
  featureRow(label: "주의", value: "감정이 앞설 땐 하루 쉬어가기", rect: topRect(200, 2310, 890, 122, in: canvas), iconColor: red, canvas: canvas)
}

func drawTimelineFeature(in canvas: CGRect) {
  drawImageFit(board, in: topRect(405, 655, 480, 430, in: canvas))
  let panel = topRect(150, 1190, 990, 930, in: canvas)
  rounded(panel, radius: 60, fill: NSColor.white.withAlphaComponent(0.92), stroke: navy.withAlphaComponent(0.10), line: 2)
  text("10년 단위 흐름", x: panel.minX + 58, y: canvas.height - panel.maxY + 58, width: panel.width - 116, size: 40, weight: .black, color: navy, in: canvas)

  let labels = ["20대", "30대", "40대", "50대", "60대"]
  let notes = ["기초 다지기", "확장 운", "전환점", "수확기", "정리와 선택"]
  for i in 0..<5 {
    let y = panel.maxY - 190 - CGFloat(i) * 130
    mint.withAlphaComponent(0.28).setStroke()
    let line = NSBezierPath()
    line.lineWidth = 12
    line.lineCapStyle = .round
    line.move(to: CGPoint(x: panel.minX + 178, y: y))
    line.line(to: CGPoint(x: panel.maxX - 86, y: y))
    line.stroke()

    NSColor.white.setFill()
    let dot = NSBezierPath(ovalIn: CGRect(x: panel.minX + 144 + CGFloat(i) * 134, y: y - 37, width: 74, height: 74))
    dot.fill()
    navy.withAlphaComponent(0.18).setStroke()
    dot.lineWidth = 2
    dot.stroke()
    text(labels[i], x: panel.minX + 58, y: canvas.height - y - 18, width: 130, size: 30, weight: .black, color: navy, in: canvas)
    text(notes[i], x: panel.maxX - 276, y: canvas.height - y - 18, width: 220, size: 28, weight: .bold, color: muted, align: .right, in: canvas)
  }

  rounded(topRect(190, 2200, 910, 188, in: canvas), radius: 46, fill: NSColor.white.withAlphaComponent(0.90), stroke: navy.withAlphaComponent(0.08), line: 2)
  text("중요한 풀이를 보관함에 모아두고 다시 확인해요.", x: 250, y: 2256, width: 790, size: 36, weight: .black, color: navy, align: .center, in: canvas)
}

func renderPromo(index: Int, file: String, title: String, subtitle: String, mode: String) {
  let size = CGSize(width: 1290, height: 2796)
  render(size: size, url: appStoreDir.appendingPathComponent(file)) { canvas in
    promoBackground(canvas)
    centeredText("꼬북점", y: 168, width: 840, size: 56, weight: .black, color: mint, in: canvas)
    centeredText(title, y: 270, width: 1060, size: 88, weight: .black, color: navy, in: canvas)
    centeredText(subtitle, y: 486, width: 960, size: 34, weight: .bold, color: muted, in: canvas)

    switch mode {
    case "intro":
      drawInputFeature(in: canvas)
    case "daily":
      drawDailyFeature(in: canvas)
    case "personas":
      drawPersonaFeature(in: canvas)
    case "relation":
      drawRelationFeature(in: canvas)
    default:
      drawTimelineFeature(in: canvas)
    }
  }
}

func relationNode(_ label: String, x: CGFloat, y: CGFloat) {
  let rect = CGRect(x: x, y: y, width: 140, height: 140)
  NSColor.white.setFill()
  NSBezierPath(ovalIn: rect).fill()
  navy.withAlphaComponent(0.16).setStroke()
  let outline = NSBezierPath(ovalIn: rect)
  outline.lineWidth = 3
  outline.stroke()
  let p = NSMutableParagraphStyle()
  p.alignment = .center
  (label as NSString).draw(in: rect.offsetBy(dx: 0, dy: 48), withAttributes: [
    .font: NSFont.systemFont(ofSize: 30, weight: .black),
    .foregroundColor: navy,
    .paragraphStyle: p,
  ])
}

extension NSColor {
  convenience init(hex: String) {
    let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    let value = Int(cleaned, radix: 16)!
    self.init(
      calibratedRed: CGFloat((value >> 16) & 0xff) / 255,
      green: CGFloat((value >> 8) & 0xff) / 255,
      blue: CGFloat(value & 0xff) / 255,
      alpha: 1
    )
  }
}

extension Data {
  mutating func appendLE16(_ value: UInt16) {
    append(UInt8(value & 0xff))
    append(UInt8((value >> 8) & 0xff))
  }

  mutating func appendLE32(_ value: UInt32) {
    append(UInt8(value & 0xff))
    append(UInt8((value >> 8) & 0xff))
    append(UInt8((value >> 16) & 0xff))
    append(UInt8((value >> 24) & 0xff))
  }
}

renderIcon(size: 1024, url: root.appendingPathComponent("assets/icon.png"))
renderIcon(size: 1024, url: iconDir.appendingPathComponent("icon-1024.png"))
renderIcon(size: 1024, url: root.appendingPathComponent("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"))
renderIcon(size: 512, url: iconDir.appendingPathComponent("icon-512.png"))
renderIcon(size: 512, safe: true, url: iconDir.appendingPathComponent("maskable-icon-512.png"))
renderIcon(size: 512, url: root.appendingPathComponent("src/app/icon.png"))
renderIcon(size: 192, url: iconDir.appendingPathComponent("icon-192.png"))
renderIcon(size: 192, safe: true, url: iconDir.appendingPathComponent("maskable-icon-192.png"))
renderIcon(size: 192, url: root.appendingPathComponent("app-shell/icons/icon-192.png"))
renderIcon(size: 180, url: iconDir.appendingPathComponent("apple-touch-icon.png"))
renderIcon(size: 180, url: root.appendingPathComponent("src/app/apple-icon.png"))
renderFavicon(size: 16, url: iconDir.appendingPathComponent("favicon-16.png"))
renderFavicon(size: 32, url: iconDir.appendingPathComponent("favicon-32.png"))
renderFavicon(size: 48, url: iconDir.appendingPathComponent("favicon-48.png"))
writeICO(
  entries: [
    (16, iconDir.appendingPathComponent("favicon-16.png")),
    (32, iconDir.appendingPathComponent("favicon-32.png")),
    (48, iconDir.appendingPathComponent("favicon-48.png")),
  ],
  output: root.appendingPathComponent("src/app/favicon.ico")
)

renderPromo(
  index: 1,
  file: "iphone-67-01-intro.png",
  title: "사주를 쉽게 시작",
  subtitle: "생년월일과 태어난 시간만 넣으면 핵심 흐름을 바로 정리해요.",
  mode: "intro"
)
renderPromo(
  index: 2,
  file: "iphone-67-02-daily.png",
  title: "오늘 운세 한눈에",
  subtitle: "일진, 길운, 행운색과 오늘 할 일을 매일 아침 확인해요.",
  mode: "daily"
)
renderPromo(
  index: 3,
  file: "iphone-67-03-personas.png",
  title: "말투를 고르는 상담",
  subtitle: "친구, 도사, 무당, 보살 톤으로 질문에 맞게 답해요.",
  mode: "personas"
)
renderPromo(
  index: 4,
  file: "iphone-67-04-relations.png",
  title: "궁합과 인연 흐름",
  subtitle: "관계의 강점과 조심할 점을 한눈에 살펴봐요.",
  mode: "relation"
)
renderPromo(
  index: 5,
  file: "iphone-67-05-timeline.png",
  title: "대운과 보관함",
  subtitle: "10년 단위 운의 흐름과 중요한 풀이를 함께 모아봐요.",
  mode: "timeline"
)

print("Generated app icons, favicons, and App Store preview images.")

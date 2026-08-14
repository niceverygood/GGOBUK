from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
BASE_PATH = ROOT / "key-visual-base.png"
OUTPUT_PATH = ROOT / "ggobuk-fortune-printshop-moodboard-v1.png"

INK = "#17140F"
HANJI = "#F0E4CA"
VERMILION = "#D84632"
INDIGO = "#244D91"
OCHRE = "#D1A237"
MASCOT_MINT = "#A8E4DC"

FONT_GOTHIC = "/Library/Fonts/NanumSquareOTFExtraBold.otf"
FONT_SERIF = "/System/Library/Fonts/Supplemental/AppleMyungjo.ttf"
FONT_MONO = "/Library/Fonts/LetterGothicStd-Bold.otf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def centered_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    value: str,
    typeface: ImageFont.FreeTypeFont,
    fill: str,
) -> None:
    left, top, right, bottom = box
    bounds = draw.textbbox((0, 0), value, font=typeface)
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    x = left + (right - left - width) / 2
    y = top + (bottom - top - height) / 2 - bounds[1]
    draw.text((x, y), value, font=typeface, fill=fill)


def enrich_product_cues(base: Image.Image) -> Image.Image:
    """Put precise saju structure into the deliberately blank phone frames."""
    image = base.convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    ui_small = font(FONT_GOTHIC, 22)
    ui_label = font(FONT_GOTHIC, 19)
    ui_score = font(FONT_MONO, 62)
    hanja = font(FONT_SERIF, 28)

    # Replace the largest sun-like circle with a square seal/grid so the board
    # reads as Korean print culture rather than a Japanese modernist poster.
    draw.rectangle((1508, 48, 1664, 236), fill=HANJI)
    for grid_x in range(1518, 1665, 24):
        draw.line((grid_x, 58, grid_x, 226), fill=(23, 20, 15, 80), width=1)
    for grid_y in range(58, 227, 24):
        draw.line((1518, grid_y, 1654, grid_y), fill=(23, 20, 15, 80), width=1)
    draw.rectangle((1542, 83, 1630, 171), fill=VERMILION)
    draw.line((1586, 83, 1586, 171), fill=HANJI, width=4)
    draw.line((1542, 127, 1630, 127), fill=HANJI, width=4)
    draw.rectangle((1534, 75, 1638, 179), outline=VERMILION, width=3)

    # Phone 1 — a daily fortune slip, printed rather than card-based.
    draw.rounded_rectangle(
        (1208, 392, 1392, 630),
        radius=8,
        fill=(240, 228, 202, 238),
        outline=INK,
        width=2,
    )
    centered_text(draw, (1215, 407, 1385, 444), "오늘의 점괘", ui_small, INK)
    draw.line((1232, 452, 1368, 452), fill=VERMILION, width=3)
    centered_text(draw, (1215, 455, 1385, 530), "72", ui_score, INK)
    draw.rounded_rectangle((1253, 545, 1347, 585), radius=20, fill=VERMILION)
    centered_text(draw, (1253, 545, 1347, 585), "순풍", ui_label, HANJI)
    draw.line((1232, 603, 1368, 603), fill=INK, width=1)

    # Phone 2 — four pillars / eight characters, the product's unmistakable core.
    draw.rectangle((1435, 473, 1626, 670), fill=(240, 228, 202, 240))
    centered_text(draw, (1440, 476, 1621, 510), "내 명식", ui_small, INK)
    pillars = [("甲", "子"), ("壬", "辰"), ("戊", "申"), ("丁", "卯")]
    cell_left = 1449
    cell_top = 526
    cell_width = 40
    cell_height = 56
    gap = 5
    accents = [INDIGO, VERMILION, OCHRE, INK]
    for column, ((top_char, bottom_char), accent) in enumerate(zip(pillars, accents)):
        x0 = cell_left + column * (cell_width + gap)
        x1 = x0 + cell_width
        draw.rectangle((x0, cell_top, x1, cell_top + cell_height), fill=HANJI, outline=accent, width=2)
        draw.rectangle(
            (x0, cell_top + cell_height + 5, x1, cell_top + cell_height * 2 + 5),
            fill=HANJI,
            outline=accent,
            width=2,
        )
        centered_text(draw, (x0, cell_top, x1, cell_top + cell_height), top_char, hanja, INK)
        centered_text(
            draw,
            (x0, cell_top + cell_height + 5, x1, cell_top + cell_height * 2 + 5),
            bottom_char,
            hanja,
            INK,
        )

    return Image.alpha_composite(image, overlay).convert("RGB")


def build() -> None:
    base = enrich_product_cues(Image.open(BASE_PATH))

    canvas_width = 2200
    canvas_height = 1550
    header_height = 190
    image_x = 55
    image_y = 220
    image_width = 2090
    image_height = round(image_width * base.height / base.width)

    canvas = Image.new("RGB", (canvas_width, canvas_height), HANJI)
    draw = ImageDraw.Draw(canvas)

    # Editorial masthead.
    draw.rectangle((0, 0, canvas_width, header_height), fill=INK)
    draw.ellipse((58, 46, 142, 130), fill=VERMILION)
    draw.line((100, 28, 100, 150), fill=HANJI, width=2)
    draw.line((39, 88, 161, 88), fill=HANJI, width=2)
    draw.text((178, 29), "꼬북점", font=font(FONT_GOTHIC, 74), fill=HANJI)
    draw.text((184, 121), "부적 인쇄소", font=font(FONT_GOTHIC, 24), fill=OCHRE)
    draw.text((340, 123), "/  FORTUNE PRINT SHOP", font=font(FONT_MONO, 24), fill=OCHRE)
    draw.text((1630, 34), "MOODBOARD / 01", font=font(FONT_MONO, 20), fill=VERMILION)
    draw.multiline_text(
        (1630, 72),
        "꼬북이만 남기고,\n사주의 인상을 다시 찍다.",
        font=font(FONT_GOTHIC, 25),
        fill=HANJI,
        spacing=10,
    )

    # Main generated key visual.
    resized = base.resize((image_width, image_height), Image.Resampling.LANCZOS)
    canvas.paste(resized, (image_x, image_y))
    draw.rectangle(
        (image_x - 5, image_y - 5, image_x + image_width + 5, image_y + image_height + 5),
        outline=INK,
        width=10,
    )
    draw.rectangle((78, 243, 256, 286), fill=INK)
    centered_text(draw, (78, 243, 256, 286), "KEY VISUAL", font(FONT_MONO, 17), OCHRE)

    # Palette legend. Mint is explicitly reserved for the mascot.
    footer_top = image_y + image_height + 24
    draw.line((55, footer_top - 14, 2145, footer_top - 14), fill=INK, width=3)
    palette = [
        ("먹", INK, "#17140F"),
        ("한지", HANJI, "#F0E4CA"),
        ("인주", VERMILION, "#D84632"),
        ("군청", INDIGO, "#244D91"),
        ("황토", OCHRE, "#D1A237"),
        ("꼬북 민트", MASCOT_MINT, "캐릭터 전용"),
    ]
    x = 55
    for label, color, code in palette:
        draw.rectangle((x, footer_top, x + 54, footer_top + 54), fill=color, outline=INK, width=2)
        draw.text((x + 67, footer_top - 1), label, font=font(FONT_GOTHIC, 20), fill=INK)
        code_font = font(FONT_GOTHIC, 14) if code == "캐릭터 전용" else font(FONT_MONO, 14)
        draw.text((x + 67, footer_top + 29), code, font=code_font, fill=INK)
        x += 255

    draw.text((1630, footer_top), "한지 · 활판 · 인주 · 사주 4기둥", font=font(FONT_GOTHIC, 20), fill=INK)
    draw.text((1630, footer_top + 31), "NO GENERIC MYSTIC PURPLE", font=font(FONT_MONO, 15), fill=VERMILION)

    canvas.save(OUTPUT_PATH, optimize=True)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    build()

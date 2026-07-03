from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "deploy" / "line" / "rich-menu" / "amamihome-variants"
WIDTH = 2500
HEIGHT = 1686
COLS = 3
ROWS = 2
HEADER_H = 96


ITEMS = [
    ("home", "家づくり相談", "まずは相談したい"),
    ("model_house", "見学予約", "モデルハウスを見る"),
    ("document", "資料請求", "家づくり資料を受け取る"),
    ("hammer", "施工事例", "建築実例を見たい"),
    ("flag", "イベント情報", "見学会・相談会"),
    ("people", "担当者へ相談", "スタッフに質問"),
]


@dataclass(frozen=True)
class Variant:
    slug: str
    brand: str
    background: tuple[int, int, int]
    card_fill: tuple[int, int, int]
    header_fill: tuple[int, int, int]
    title_fill: tuple[int, int, int]
    subtitle_fill: tuple[int, int, int]
    icon_fill: tuple[int, int, int]
    divider_fill: tuple[int, int, int]
    grid_fill: tuple[int, int, int]
    border_fills: tuple[tuple[int, int, int], ...]


VARIANTS = [
    Variant(
        slug="01-navy-minimal",
        brand="アマミホーム LINEメニュー",
        background=(252, 253, 253),
        card_fill=(255, 255, 255),
        header_fill=(9, 72, 118),
        title_fill=(0, 67, 113),
        subtitle_fill=(88, 103, 118),
        icon_fill=(85, 122, 156),
        divider_fill=(24, 87, 134),
        grid_fill=(226, 234, 240),
        border_fills=(
            (216, 228, 238),
            (232, 220, 202),
            (210, 224, 242),
            (226, 219, 233),
            (221, 232, 210),
            (236, 219, 210),
        ),
    ),
    Variant(
        slug="02-soft-natural",
        brand="アマミホーム LINEメニュー",
        background=(251, 250, 246),
        card_fill=(255, 255, 252),
        header_fill=(47, 101, 86),
        title_fill=(39, 82, 72),
        subtitle_fill=(94, 104, 92),
        icon_fill=(100, 128, 116),
        divider_fill=(86, 116, 92),
        grid_fill=(230, 229, 219),
        border_fills=(
            (220, 233, 225),
            (234, 225, 207),
            (219, 230, 235),
            (231, 221, 228),
            (220, 232, 209),
            (237, 224, 214),
        ),
    ),
    Variant(
        slug="03-clear-premium",
        brand="アマミホーム LINEメニュー",
        background=(247, 250, 253),
        card_fill=(255, 255, 255),
        header_fill=(14, 48, 87),
        title_fill=(2, 57, 105),
        subtitle_fill=(82, 99, 116),
        icon_fill=(82, 111, 143),
        divider_fill=(9, 74, 126),
        grid_fill=(220, 230, 238),
        border_fills=(
            (207, 224, 240),
            (231, 219, 205),
            (200, 217, 240),
            (224, 218, 232),
            (218, 230, 210),
            (235, 218, 209),
        ),
    ),
]


def find_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]

    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)

    return ImageFont.load_default()


def centered_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: tuple[int, int, int],
) -> None:
    left, top, right, bottom = box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = left + ((right - left - text_w) // 2)
    y = top + ((bottom - top - text_h) // 2)
    draw.text((x, y), text, font=font, fill=fill)


def draw_home(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    w = 178
    h = 138
    roof = [(cx - w // 2, cy - 8), (cx, cy - h // 2), (cx + w // 2, cy - 8)]
    body = (cx - 68, cy - 8, cx + 68, cy + 78)
    draw.line(roof, fill=color, width=6, joint="curve")
    draw.line((body[0], body[1], body[0], body[3], body[2], body[3], body[2], body[1]), fill=color, width=6)
    draw.rectangle((cx - 24, cy + 18, cx + 24, cy + 62), outline=color, width=5)
    draw.line((cx, cy + 18, cx, cy + 62), fill=color, width=4)
    draw.line((cx - 24, cy + 40, cx + 24, cy + 40), fill=color, width=4)


def draw_tree(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    draw.ellipse((cx - 22, cy - 56, cx + 22, cy - 12), outline=color, width=5)
    draw.line((cx, cy - 12, cx, cy + 46), fill=color, width=5)
    draw.line((cx - 26, cy + 12, cx, cy - 12, cx + 26, cy + 12), fill=color, width=5)


def draw_model_house(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    draw_home(draw, cx, cy + 2, color)
    draw_tree(draw, cx - 140, cy + 32, color)
    draw_tree(draw, cx + 140, cy + 32, color)


def draw_document(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    left, top = cx - 62, cy - 80
    right, bottom = cx + 62, cy + 82
    fold = 40
    points = [
        (left, top),
        (right - fold, top),
        (right, top + fold),
        (right, bottom),
        (left, bottom),
        (left, top),
    ]
    draw.line(points, fill=color, width=6)
    draw.line((right - fold, top, right - fold, top + fold, right, top + fold), fill=color, width=5)
    for offset in (38, 74, 110):
        draw.line((left + 28, top + offset, right - 28, top + offset), fill=color, width=5)


def draw_hammer(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    draw.line((cx - 72, cy + 84, cx + 34, cy - 22), fill=color, width=14)
    draw.line((cx - 94, cy + 62, cx - 54, cy + 102), fill=color, width=6)
    head = [(cx - 4, cy - 52), (cx + 52, cy - 86), (cx + 94, cy - 44), (cx + 50, cy), (cx + 14, cy - 12)]
    draw.line(head + [head[0]], fill=color, width=6, joint="curve")
    draw.line((cx + 48, cy - 82, cx + 82, cy - 114), fill=color, width=6)


def draw_flag(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    draw.line((cx - 58, cy - 82, cx - 58, cy + 90), fill=color, width=7)
    flag = [(cx - 52, cy - 78), (cx + 72, cy - 52), (cx + 36, cy - 8), (cx - 52, cy - 26)]
    draw.line(flag + [flag[0]], fill=color, width=6, joint="curve")


def draw_people(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    draw.ellipse((cx - 96, cy - 78, cx - 38, cy - 20), outline=color, width=6)
    draw.ellipse((cx + 38, cy - 78, cx + 96, cy - 20), outline=color, width=6)
    draw.arc((cx - 132, cy - 10, cx - 8, cy + 126), 188, 352, fill=color, width=6)
    draw.arc((cx + 8, cy - 10, cx + 132, cy + 126), 188, 352, fill=color, width=6)


def draw_icon(draw: ImageDraw.ImageDraw, name: str, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    if name == "home":
        draw_home(draw, cx, cy, color)
    elif name == "model_house":
        draw_model_house(draw, cx, cy, color)
    elif name == "document":
        draw_document(draw, cx, cy, color)
    elif name == "hammer":
        draw_hammer(draw, cx, cy, color)
    elif name == "flag":
        draw_flag(draw, cx, cy, color)
    elif name == "people":
        draw_people(draw, cx, cy, color)


def draw_variant(variant: Variant) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    image = Image.new("RGB", (WIDTH, HEIGHT), variant.background)
    draw = ImageDraw.Draw(image)

    brand_font = find_font(42)
    title_font = find_font(78)
    subtitle_font = find_font(42)

    cell_w = WIDTH // COLS
    cell_h = HEIGHT // ROWS

    for index, (icon_name, title, subtitle) in enumerate(ITEMS):
        row = index // COLS
        col = index % COLS
        left = col * cell_w
        top = row * cell_h
        right = WIDTH if col == COLS - 1 else (col + 1) * cell_w
        bottom = HEIGHT if row == ROWS - 1 else (row + 1) * cell_h
        content_top = top + HEADER_H if row == 0 else top

        draw.rectangle((left, top, right, bottom), fill=variant.background)
        draw.rectangle(
            (left + 24, content_top + 28, right - 24, bottom - 22),
            outline=variant.border_fills[index],
            width=4,
            fill=variant.card_fill,
        )

        if col > 0:
            draw.line((left, 0, left, HEIGHT), fill=variant.grid_fill, width=2)
        if row > 0:
            draw.line((left, top, right, top), fill=variant.grid_fill, width=2)

        icon_y = content_top + 205
        title_y = content_top + 365
        draw_icon(draw, icon_name, (left + right) // 2, icon_y, variant.icon_fill)
        centered_text(draw, (left, title_y, right, title_y + 112), title, title_font, variant.title_fill)
        draw.line(
            ((left + right) // 2 - 38, title_y + 138, (left + right) // 2 + 38, title_y + 138),
            fill=variant.divider_fill,
            width=5,
        )
        centered_text(draw, (left, title_y + 172, right, title_y + 250), subtitle, subtitle_font, variant.subtitle_fill)

    draw.rectangle((0, 0, WIDTH, HEADER_H), fill=variant.header_fill)
    centered_text(draw, (0, 10, WIDTH, HEADER_H - 8), variant.brand, brand_font, (255, 255, 255))

    output = OUT_DIR / f"rich-menu-{variant.slug}.png"
    image.save(output, optimize=True)
    return output


def main() -> None:
    for variant in VARIANTS:
        output = draw_variant(variant)
        print(f"generated={output.relative_to(ROOT)}")
        print(f"bytes={output.stat().st_size}")


if __name__ == "__main__":
    main()

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "deploy" / "line" / "rich-menu" / "amamihome-default" / "rich-menu.png"
WIDTH = 2500
HEIGHT = 1686
COLS = 3
ROWS = 2


ITEMS = [
    ("家づくり相談", "まずは相談したい"),
    ("見学予約", "モデルハウスを見る"),
    ("資料請求", "家づくり資料を受け取る"),
    ("施工事例", "建築実例を見たい"),
    ("イベント情報", "見学会・相談会"),
    ("担当者へ相談", "スタッフに質問"),
]


def find_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
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
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = left + ((right - left - text_width) // 2)
    y = top + ((bottom - top - text_height) // 2)
    draw.text((x, y), text, font=font, fill=fill)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)

    image = Image.new("RGB", (WIDTH, HEIGHT), (248, 250, 247))
    draw = ImageDraw.Draw(image)

    title_font = find_font(78)
    sub_font = find_font(42)
    brand_font = find_font(40)

    cell_w = WIDTH // COLS
    cell_h = HEIGHT // ROWS
    colors = [
        ((233, 244, 239), (31, 94, 77)),
        ((246, 239, 224), (109, 77, 31)),
        ((231, 240, 249), (34, 84, 126)),
        ((244, 237, 244), (101, 61, 101)),
        ((237, 245, 230), (70, 101, 41)),
        ((249, 238, 235), (125, 67, 52)),
    ]

    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(248, 250, 247))
    draw.rectangle((0, 0, WIDTH, 96), fill=(36, 91, 80))
    centered_text(draw, (0, 10, WIDTH, 88), "アマミホーム LINEメニュー", brand_font, (255, 255, 255))

    for index, (title, subtitle) in enumerate(ITEMS):
        row = index // COLS
        col = index % COLS
        left = col * cell_w
        top = row * cell_h
        right = WIDTH if col == COLS - 1 else (col + 1) * cell_w
        bottom = HEIGHT if row == ROWS - 1 else (row + 1) * cell_h
        bg, fg = colors[index]

        if top == 0:
            content_top = top + 96
        else:
            content_top = top

        draw.rectangle((left + 22, content_top + 22, right - 22, bottom - 22), fill=bg)
        draw.rectangle(
            (left + 58, content_top + 70, right - 58, bottom - 70),
            outline=(222, 228, 220),
            fill=(255, 255, 255),
        )
        draw.line((right - 1, top, right - 1, bottom), fill=(222, 228, 220), width=2)
        draw.line((left, bottom - 1, right, bottom - 1), fill=(222, 228, 220), width=2)

        centered_text(draw, (left, content_top + 185, right, content_top + 300), title, title_font, fg)
        centered_text(draw, (left, content_top + 315, right, content_top + 400), subtitle, sub_font, (89, 99, 105))

    image.save(OUT, optimize=True)
    print(f"generated={OUT.relative_to(ROOT)}")
    print(f"width={WIDTH}")
    print(f"height={HEIGHT}")
    print(f"bytes={OUT.stat().st_size}")


if __name__ == "__main__":
    main()

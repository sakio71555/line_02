from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
RICH_MENU_ROOT = ROOT / "deploy" / "line" / "rich-menu"
DEFAULT_DIR = RICH_MENU_ROOT / "amamihome-default"
WIDTH = 2500
HEIGHT = 1686
COLS = 3
ROWS = 2
HEADER_H = 96


ActionType = Literal["message", "uri"]


@dataclass(frozen=True)
class MenuItem:
    action_key: str
    title: str
    subtitle: str
    icon: str
    action_type: ActionType
    action_value: str


@dataclass(frozen=True)
class LifecycleMenu:
    slug: str
    name: str
    heading: str
    chat_bar_text: str
    items: tuple[MenuItem, ...]


MENUS = [
    LifecycleMenu(
        slug="initial",
        name="Amami Home Initial Menu",
        heading="アマミホーム 初期メニュー",
        chat_bar_text="メニュー",
        items=(
            MenuItem(
                "initial.customer_info_register",
                "お客様情報\n登録",
                "基本情報を入力",
                "form",
                "uri",
                "https://admin.taiyolabel.site/line/customer-registration",
            ),
            MenuItem(
                "initial.model_house_reservation",
                "モデルハウス\n見学予約",
                "予約ページへ",
                "model_house",
                "uri",
                "https://amamihome.net/reservation/",
            ),
            MenuItem(
                "initial.home_building_consultation",
                "家づくり\n相談",
                "相談ページへ",
                "home",
                "uri",
                "https://amamihome.net/consultation/",
            ),
            MenuItem(
                "initial.works",
                "施工事例\nを見る",
                "建築実例を見る",
                "hammer",
                "uri",
                "https://amamihome.net/works/",
            ),
            MenuItem(
                "initial.catalog_request",
                "資料請求",
                "資料を受け取る",
                "document",
                "uri",
                "https://amamihome.net/download/",
            ),
            MenuItem(
                "initial.contact_staff",
                "担当者に\n相談",
                "LINEで質問",
                "people",
                "message",
                "担当者に相談",
            ),
        ),
    ),
    LifecycleMenu(
        slug="negotiation",
        name="Amami Home Negotiation Menu",
        heading="アマミホーム 商談中メニュー",
        chat_bar_text="商談メニュー",
        items=(
            MenuItem("negotiation.meeting_schedule", "打合せ予約・\n変更", "日程を相談", "calendar", "message", "打合せ予約・変更"),
            MenuItem("negotiation.plan_consultation", "プラン・間取り\n相談", "間取りを相談", "home", "message", "プラン・間取り相談"),
            MenuItem("negotiation.estimate_budget", "見積・資金\n計画", "費用を相談", "document", "message", "見積・資金計画"),
            MenuItem("negotiation.land_site", "土地・敷地の\n相談", "土地条件を相談", "flag", "message", "土地・敷地の相談"),
            MenuItem("negotiation.required_documents", "必要書類・\n確認事項", "持ち物を確認", "form", "message", "必要書類・確認事項"),
            MenuItem("negotiation.contact_staff", "担当者に\n相談", "LINEで質問", "people", "message", "担当者に相談"),
        ),
    ),
    LifecycleMenu(
        slug="aftercare",
        name="Amami Home Aftercare Menu",
        heading="アマミホーム アフターメニュー",
        chat_bar_text="アフター",
        items=(
            MenuItem("aftercare.repair_inspection", "修理・点検\n依頼", "状況を相談", "hammer", "message", "修理・点検依頼"),
            MenuItem("aftercare.periodic_inspection", "定期点検\n予約", "点検日を相談", "calendar", "message", "定期点検予約"),
            MenuItem("aftercare.trouble_consultation", "不具合を\n相談", "困りごとを相談", "alert", "message", "不具合を相談"),
            MenuItem("aftercare.warranty_maintenance", "保証・\nメンテナンス", "保証内容を確認", "document", "message", "保証・メンテナンス"),
            MenuItem(
                "aftercare.contact_change",
                "連絡先\n変更",
                "変更内容を入力",
                "form",
                "uri",
                "https://admin.taiyolabel.site/line/customer-registration?mode=contact-change",
            ),
            MenuItem("aftercare.contact_staff", "担当者に\n相談", "LINEで質問", "people", "message", "担当者に相談"),
        ),
    ),
]


BORDER_FILLS = (
    (216, 228, 238),
    (232, 220, 202),
    (210, 224, 242),
    (226, 219, 233),
    (221, 232, 210),
    (236, 219, 210),
)
BACKGROUND = (252, 253, 253)
CARD_FILL = (255, 255, 255)
HEADER_FILL = (9, 72, 118)
TITLE_FILL = (0, 67, 113)
SUBTITLE_FILL = (88, 103, 118)
ICON_FILL = (85, 122, 156)
DIVIDER_FILL = (24, 87, 134)
GRID_FILL = (226, 234, 240)


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
    line_gap: int = 12,
) -> None:
    left, top, right, bottom = box
    lines = text.splitlines() or [text]
    metrics = [draw.textbbox((0, 0), line, font=font) for line in lines]
    widths = [bbox[2] - bbox[0] for bbox in metrics]
    heights = [bbox[3] - bbox[1] for bbox in metrics]
    total_height = sum(heights) + line_gap * (len(lines) - 1)
    y = top + ((bottom - top - total_height) // 2)

    for line, width, height in zip(lines, widths, heights):
        x = left + ((right - left - width) // 2)
        draw.text((x, y), line, font=font, fill=fill)
        y += height + line_gap


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
    points = [(left, top), (right - fold, top), (right, top + fold), (right, bottom), (left, bottom), (left, top)]
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


def draw_form(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    draw_document(draw, cx, cy, color)
    draw.rectangle((cx - 32, cy + 8, cx - 10, cy + 30), outline=color, width=4)
    draw.line((cx + 4, cy + 18, cx + 40, cy + 18), fill=color, width=4)
    draw.rectangle((cx - 32, cy + 48, cx - 10, cy + 70), outline=color, width=4)
    draw.line((cx + 4, cy + 58, cx + 40, cy + 58), fill=color, width=4)


def draw_calendar(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    draw.rectangle((cx - 78, cy - 70, cx + 78, cy + 78), outline=color, width=6)
    draw.line((cx - 78, cy - 32, cx + 78, cy - 32), fill=color, width=6)
    for x in (cx - 38, cx + 38):
        draw.line((x, cy - 92, x, cy - 52), fill=color, width=8)
    for gx in (cx - 42, cx, cx + 42):
        for gy in (cy, cy + 38):
            draw.ellipse((gx - 6, gy - 6, gx + 6, gy + 6), fill=color)


def draw_alert(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    triangle = [(cx, cy - 90), (cx - 90, cy + 80), (cx + 90, cy + 80), (cx, cy - 90)]
    draw.line(triangle, fill=color, width=6, joint="curve")
    draw.line((cx, cy - 34, cx, cy + 22), fill=color, width=8)
    draw.ellipse((cx - 6, cy + 44, cx + 6, cy + 56), fill=color)


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
    elif name == "form":
        draw_form(draw, cx, cy, color)
    elif name == "calendar":
        draw_calendar(draw, cx, cy, color)
    elif name == "alert":
        draw_alert(draw, cx, cy, color)


def make_action(item: MenuItem) -> dict[str, str]:
    if item.action_type == "message":
        return {"type": "message", "label": item.title.replace("\n", ""), "text": item.action_value}
    return {"type": "uri", "label": item.title.replace("\n", ""), "uri": item.action_value}


def rich_menu_definition(menu: LifecycleMenu) -> dict[str, object]:
    cell_w = WIDTH // COLS
    cell_h = HEIGHT // ROWS
    areas = []
    for index, item in enumerate(menu.items):
        row = index // COLS
        col = index % COLS
        x = col * cell_w
        y = row * cell_h
        width = WIDTH - x if col == COLS - 1 else cell_w
        height = HEIGHT - y if row == ROWS - 1 else cell_h
        areas.append(
            {
                "bounds": {"x": x, "y": y, "width": width, "height": height},
                "action": make_action(item),
            }
        )

    return {
        "size": {"width": WIDTH, "height": HEIGHT},
        "selected": True,
        "name": menu.name,
        "chatBarText": menu.chat_bar_text,
        "areas": areas,
    }


def draw_menu(menu: LifecycleMenu) -> Path:
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    brand_font = find_font(42)
    title_font = find_font(66)
    subtitle_font = find_font(40)
    cell_w = WIDTH // COLS
    cell_h = HEIGHT // ROWS

    for index, item in enumerate(menu.items):
        row = index // COLS
        col = index % COLS
        left = col * cell_w
        top = row * cell_h
        right = WIDTH if col == COLS - 1 else (col + 1) * cell_w
        bottom = HEIGHT if row == ROWS - 1 else (row + 1) * cell_h
        content_top = top + HEADER_H if row == 0 else top

        draw.rectangle((left, top, right, bottom), fill=BACKGROUND)
        draw.rectangle(
            (left + 24, content_top + 28, right - 24, bottom - 22),
            outline=BORDER_FILLS[index],
            width=4,
            fill=CARD_FILL,
        )
        if col > 0:
            draw.line((left, 0, left, HEIGHT), fill=GRID_FILL, width=2)
        if row > 0:
            draw.line((left, top, right, top), fill=GRID_FILL, width=2)

        icon_y = content_top + 190
        title_y = content_top + 330
        draw_icon(draw, item.icon, (left + right) // 2, icon_y, ICON_FILL)
        centered_text(draw, (left, title_y, right, title_y + 145), item.title, title_font, TITLE_FILL)
        draw.line(
            ((left + right) // 2 - 38, title_y + 166, (left + right) // 2 + 38, title_y + 166),
            fill=DIVIDER_FILL,
            width=5,
        )
        centered_text(draw, (left, title_y + 200, right, title_y + 278), item.subtitle, subtitle_font, SUBTITLE_FILL)

    draw.rectangle((0, 0, WIDTH, HEADER_H), fill=HEADER_FILL)
    centered_text(draw, (0, 10, WIDTH, HEADER_H - 8), menu.heading, brand_font, (255, 255, 255))

    out_dir = RICH_MENU_ROOT / f"amamihome-{menu.slug}"
    out_dir.mkdir(parents=True, exist_ok=True)
    output = out_dir / "rich-menu.png"
    image.save(output, optimize=True)
    return output


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def action_key_manifest() -> dict[str, object]:
    return {
        "tenant_slug": "amamihome",
        "menus": {
            menu.slug: [
                {
                    "action_key": item.action_key,
                    "label": item.title.replace("\n", ""),
                    "line_action_type": item.action_type,
                    "target_category": "external_url" if item.action_type == "uri" else "line_in_chat",
                }
                for item in menu.items
            ]
            for menu in MENUS
        },
        "notes": [
            "LINE rich menu definitions can only store LINE action payloads.",
            "The action_key values are kept repo-side for routing and future LIFF/form wiring.",
            "Customer registration and contact change require LIFF identity verification before CRM writes.",
        ],
    }


def main() -> None:
    for menu in MENUS:
        image_path = draw_menu(menu)
        definition_path = RICH_MENU_ROOT / f"amamihome-{menu.slug}" / "rich-menu.json"
        write_json(definition_path, rich_menu_definition(menu))
        print(f"generated_image={image_path.relative_to(ROOT)}")
        print(f"generated_definition={definition_path.relative_to(ROOT)}")

    write_json(RICH_MENU_ROOT / "amamihome-lifecycle-actions.json", action_key_manifest())

    initial_dir = RICH_MENU_ROOT / "amamihome-initial"
    DEFAULT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(initial_dir / "rich-menu.png", DEFAULT_DIR / "rich-menu.png")
    shutil.copyfile(initial_dir / "rich-menu.json", DEFAULT_DIR / "rich-menu.json")
    print("default_menu=amamihome-initial")


if __name__ == "__main__":
    main()

import { describe, expect, it } from "vitest";

import { buildCustomerRichMenuSwitchOptions } from "../../apps/admin/src/customer-rich-menu-options";
import {
  createDefaultLineExperienceSettings,
  createLineMenuPublishedSnapshot
} from "@amami-line-crm/domain";

describe("customer rich menu switch options", () => {
  it("uses published snapshots and excludes draft and retired menus", () => {
    const settings = createDefaultLineExperienceSettings();
    const initial = settings.menus[0]!;
    initial.name = "編集中の初期メニュー";
    initial.items[0]!.label = "編集中の項目";

    settings.menus.push(
      {
        menu_type: "published_custom",
        name: "公開後に編集中のメニュー",
        chat_bar_text: "編集中",
        line_rich_menu_id: "richmenu-draft-id",
        items: initial.items,
        publication_status: "published",
        published_snapshot: {
          name: "公開中の追加メニュー",
          chat_bar_text: "公開中",
          line_rich_menu_id: "richmenu-published-id",
          items: initial.items.map((item, index) => ({
            ...item,
            action_key: `published_custom.item_${index + 1}`,
            label: index === 0 ? "公開中の項目" : item.label
          }))
        }
      },
      {
        menu_type: "draft_custom",
        name: "下書きメニュー",
        chat_bar_text: "下書き",
        line_rich_menu_id: "richmenu-draft-custom-id",
        items: initial.items,
        publication_status: "draft",
        published_snapshot: null
      },
      {
        menu_type: "retired_custom",
        name: "公開終了メニュー",
        chat_bar_text: "終了",
        line_rich_menu_id: "richmenu-retired-id",
        items: initial.items,
        publication_status: "retired",
        published_snapshot: createLineMenuPublishedSnapshot({
          ...initial,
          menu_type: "retired_custom",
          name: "公開終了メニュー",
          line_rich_menu_id: "richmenu-retired-id"
        })
      }
    );

    const options = buildCustomerRichMenuSwitchOptions(settings);

    expect(options.map((option) => option.menu_type)).toEqual([
      "initial",
      "negotiation",
      "aftercare",
      "published_custom"
    ]);
    expect(options.at(-1)).toMatchObject({
      name: "公開中の追加メニュー",
      line_rich_menu_id: "richmenu-published-id",
      description: expect.stringContaining("公開中の項目"),
      switch_available: true
    });
    expect(options.at(-1)?.description).not.toContain("編集中の項目");
  });
});

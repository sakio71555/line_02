import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminShellView } from "../../apps/admin/app/_components/admin-shell";

describe("admin mobile navigation shell", () => {
  it("renders beginner-friendly primary navigation with an active page", () => {
    const html = renderToStaticMarkup(
      <AdminShellView pathname="/customers/customer_demo_yamada_taro">
        <main>お客様詳細</main>
      </AdminShellView>
    );

    expect(html).toContain("アマミホーム");
    expect(html).toContain("顧客対応デスク");
    expect(html).toContain("スマートフォン用メニュー");
    expect(html).toContain("受信トレイ");
    expect(html).toContain("顧客");
    expect(html).toContain("タスク");
    expect(html).toContain("案件");
    expect(html).toContain("一斉送信");
    expect(html).toContain("href=\"/customers\"");
    expect(html).toContain("href=\"/inbox\"");
    expect(html).toContain("href=\"/tasks\"");
    expect(html).toContain("href=\"/deals\"");
    expect(html).toContain("href=\"/broadcast\"");
    expect(html).toContain("aria-current=\"page\"");
  });

  it("hides the app navigation on authentication pages", () => {
    const html = renderToStaticMarkup(
      <AdminShellView pathname="/login">
        <main>ログイン</main>
      </AdminShellView>
    );

    expect(html).not.toContain("スマートフォン用メニュー");
    expect(html).not.toContain("管理画面ナビゲーション");
  });
});

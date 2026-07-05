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

    expect(html).toContain("アマミホーム管理画面");
    expect(html).toContain("LINE相談を確認・返信");
    expect(html).toContain("スマートフォン用メニュー");
    expect(html).toContain("お客様");
    expect(html).toContain("未対応");
    expect(html).toContain("会社選択");
    expect(html).toContain("href=\"/customers\"");
    expect(html).toContain("href=\"/alerts\"");
    expect(html).toContain("href=\"/select-tenant\"");
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

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminHomePageView } from "../../apps/admin/app/admin-home-page-view";

describe("admin home page", () => {
  it("renders the daily operations dashboard", () => {
    const html = renderToStaticMarkup(
      <AdminHomePageView data={{ alerts: [], customers: [] }} />
    );

    expect(html).toContain("今日の状況");
    expect(html).toContain("対応が必要な相談を上から順に確認できます");
    expect(html).toContain("受信トレイを開く");
    expect(html).toContain("href=\"/inbox\"");
    expect(html).toContain("未対応");
    expect(html).toContain("要確認のお客様");
    expect(html).toContain("最近のお客様");
    expect(html).toContain("href=\"/customers\"");
    expect(html).toContain("タスクを確認");
    expect(html).toContain("案件の進み具合");
  });
});

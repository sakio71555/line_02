import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminHomePage from "../../apps/admin/app/page";

describe("admin home page", () => {
  it("renders beginner-friendly local demo guidance", () => {
    const html = renderToStaticMarkup(<AdminHomePage />);

    expect(html).toContain("LINE相談の対応状況を確認するデモ管理画面");
    expect(html).toContain("顧客一覧を見る");
    expect(html).toContain("href=\"/customers\"");
    expect(html).toContain("未返信アラートを見る");
    expect(html).toContain("href=\"/alerts\"");
    expect(html).toContain("デモの流れ");
    expect(html).toContain("顧客詳細で相談内容を確認する");
    expect(html).toContain("AI要約・返信文の下書き・ホームページ情報からの回答案を見る");
    expect(html).toContain("本物のLINEには送信されません");
    expect(html).toContain("AIとホームページ回答案もデモ用");
    expect(html).toContain("データは一時保存です");
    expect(html).toContain("ログイン・利用先選択・権限表示");
    expect(html).toContain("本番未接続");
    expect(html).toContain("tenant_amamihome");
    expect(html).toContain("http://localhost:4000");
  });
});

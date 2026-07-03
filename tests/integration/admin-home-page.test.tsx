import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminHomePage from "../../apps/admin/app/page";

describe("admin home page", () => {
  it("renders production operations guidance", () => {
    const html = renderToStaticMarkup(<AdminHomePage />);

    expect(html).toContain("LINE相談の対応状況を管理する画面");
    expect(html).toContain("顧客一覧を見る");
    expect(html).toContain("href=\"/customers\"");
    expect(html).toContain("未返信アラートを見る");
    expect(html).toContain("href=\"/alerts\"");
    expect(html).toContain("運用の流れ");
    expect(html).toContain("顧客詳細で相談内容を確認する");
    expect(html).toContain("AI要約・返信文の下書き・ホームページ情報からの回答案を見る");
    expect(html).toContain("本番運用の入口です");
    expect(html).toContain("AI補助は担当者確認前提です");
    expect(html).toContain("対応履歴を残します");
    expect(html).toContain("ログイン・利用先選択・権限表示");
    expect(html).toContain("権限が必要な操作");
    expect(html).toContain("tenant_amamihome");
    expect(html).toContain("http://localhost:4000");
  });
});

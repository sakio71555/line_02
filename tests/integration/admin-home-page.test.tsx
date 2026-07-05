import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminHomePage from "../../apps/admin/app/page";

describe("admin home page", () => {
  it("renders production operations guidance", () => {
    const html = renderToStaticMarkup(<AdminHomePage />);

    expect(html).toContain("お客様からのLINE相談を確認する画面");
    expect(html).toContain("お客様一覧を見る");
    expect(html).toContain("href=\"/customers\"");
    expect(html).toContain("未対応を見る");
    expect(html).toContain("href=\"/alerts\"");
    expect(html).toContain("運用の流れ");
    expect(html).toContain("LINEのやり取りを見る");
    expect(html).toContain("担当者として返信する");
    expect(html).toContain("実際のお客様対応用");
    expect(html).toContain("LINE履歴を保存");
    expect(html).toContain("1通ずつ確認して送信");
    expect(html).toContain("担当者が確認して返信");
    expect(html).toContain("困ったとき");
    expect(html).toContain("会社を選び直す");
    expect(html).toContain("操作できない場合");
  });
});

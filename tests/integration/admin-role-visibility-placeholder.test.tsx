import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RoleVisibilityNote } from "../../apps/admin/app/role-visibility-note";

describe("admin role visibility placeholder", () => {
  it("renders the general role visibility guidance without exposing controls", () => {
    const html = renderToStaticMarkup(<RoleVisibilityNote />);

    expect(html).toContain("使える操作について");
    expect(html).toContain("ログインした担当者ごとに、使えるボタンが変わります。");
    expect(html).toContain("大事な操作は、画面上でもう一度確認してから進みます。");
    expect(html).toContain("LINEへの送信は、送信前の確認が済んだ時だけ行います。");
    expect(html).not.toContain("<button");
  });

  it("renders customer action role guidance while leaving controls untouched", () => {
    const html = renderToStaticMarkup(<RoleVisibilityNote variant="customer-actions" />);

    expect(html).toContain("返信するときの注意");
    expect(html).toContain("返信文は必ず内容を確認してから保存・送信します。");
    expect(html).toContain("下書きや参考回答は、お客様へ自動送信されません。");
    expect(html).toContain("LINEへ送る場合は、1通ずつ確認して送ります。");
    expect(html).not.toContain("<button");
  });

  it("renders alert action role guidance while leaving controls untouched", () => {
    const html = renderToStaticMarkup(<RoleVisibilityNote variant="alerts" />);

    expect(html).toContain("未対応確認の使い方");
    expect(html).toContain("返せていない相談を探して、お客様ページから内容を確認します。");
    expect(html).toContain("確認済みにすると、担当者が見た記録を残せます。");
    expect(html).toContain("一斉送信や自動送信をする画面ではありません。");
    expect(html).not.toContain("<button");
  });
});

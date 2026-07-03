import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RoleVisibilityNote } from "../../apps/admin/app/role-visibility-note";

describe("admin role visibility placeholder", () => {
  it("renders the general role visibility guidance without exposing controls", () => {
    const html = renderToStaticMarkup(<RoleVisibilityNote />);

    expect(html).toContain("権限に応じた操作範囲");
    expect(html).toContain("ログインしたスタッフの権限");
    expect(html).toContain("管理者、チーム管理者、担当者");
    expect(html).toContain("Admin API側の権限確認");
    expect(html).toContain("LINE実送信などの危険操作");
    expect(html).toContain("権限が足りない場合の案内");
    expect(html).toContain("/permission-denied");
    expect(html).not.toContain("<button");
  });

  it("renders customer action role guidance while leaving controls untouched", () => {
    const html = renderToStaticMarkup(<RoleVisibilityNote variant="customer-actions" />);

    expect(html).toContain("担当者操作の確認範囲");
    expect(html).toContain("管理者、チーム管理者、担当者");
    expect(html).toContain("相談内容のまとめ");
    expect(html).toContain("返信文の下書き");
    expect(html).toContain("ホームページ情報からの回答案");
    expect(html).toContain("LINE実送信はruntime gate");
    expect(html).toContain("AI補助は担当者確認前提");
    expect(html).not.toContain("<button");
  });

  it("renders alert action role guidance while leaving controls untouched", () => {
    const html = renderToStaticMarkup(<RoleVisibilityNote variant="alerts" />);

    expect(html).toContain("アラート操作の確認範囲");
    expect(html).toContain("管理者、チーム管理者、担当者");
    expect(html).toContain("未返信チェックと通知記録");
    expect(html).toContain("担当者は対応が必要な相談の確認から始めます");
    expect(html).toContain("外部通知や一斉送信は、この画面から自動実行しません");
    expect(html).not.toContain("<button");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RoleVisibilityNote } from "../../apps/admin/app/role-visibility-note";

describe("admin role visibility placeholder", () => {
  it("renders the general role visibility placeholder without real role control", () => {
    const html = renderToStaticMarkup(<RoleVisibilityNote />);

    expect(html).toContain("Role visibility placeholder");
    expect(html).toContain("dev_header runtime");
    expect(html).toContain("authenticated_staff runtime");
    expect(html).toContain("owner / manager / staff");
    expect(html).toContain("ボタンはまだ非表示/disabledにしません");
    expect(html).toContain("/permission-denied");
    expect(html).not.toContain("<button");
  });

  it("renders customer action role guidance while leaving controls untouched", () => {
    const html = renderToStaticMarkup(<RoleVisibilityNote variant="customer-actions" />);

    expect(html).toContain("権限ごとの表示制御は準備中です");
    expect(html).toContain("管理者、チーム管理者、担当者");
    expect(html).toContain("相談内容のまとめ");
    expect(html).toContain("返信文の下書き");
    expect(html).toContain("ホームページ情報からの回答案");
    expect(html).toContain("今はデモ確認のため、操作ボタンは従来通り使えます");
    expect(html).toContain("本物の権限判定やボタン非表示はまだ行いません");
    expect(html).not.toContain("<button");
  });

  it("renders alert action role guidance while leaving controls untouched", () => {
    const html = renderToStaticMarkup(<RoleVisibilityNote variant="alerts" />);

    expect(html).toContain("Role visibility placeholder: アラート");
    expect(html).toContain("owner / manager");
    expect(html).toContain("alerts一覧");
    expect(html).toContain("staff");
    expect(html).toContain("未返信チェック / open alert通知mockはmanager以上");
    expect(html).toContain("dev_header runtime");
    expect(html).not.toContain("<button");
  });
});

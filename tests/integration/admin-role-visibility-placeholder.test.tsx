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

    expect(html).toContain("Role visibility placeholder: 顧客アクション");
    expect(html).toContain("owner / manager");
    expect(html).toContain("AI要約");
    expect(html).toContain("staff");
    expect(html).toContain("AI要約保存は将来制限候補");
    expect(html).toContain("担当者返信、AI返信下書き、RAG回答案は許可候補");
    expect(html).toContain("dev_header runtime");
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

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LoginPlaceholderPage from "../../apps/admin/app/login/page";
import PermissionDeniedPlaceholderPage from "../../apps/admin/app/permission-denied/page";
import SelectTenantPlaceholderPage from "../../apps/admin/app/select-tenant/page";
import SessionExpiredPlaceholderPage from "../../apps/admin/app/session-expired/page";

describe("admin auth placeholder pages", () => {
  it("renders the login placeholder without real auth wiring", () => {
    const html = renderToStaticMarkup(<LoginPlaceholderPage />);

    expect(html).toContain("管理画面ログイン");
    expect(html).toContain("Supabase Auth未接続");
    expect(html).toContain("type=\"email\"");
    expect(html).toContain("type=\"password\"");
    expect(html).toContain("<fieldset disabled=\"\"");
    expect(html).toContain("<button type=\"submit\" disabled=\"\"");
    expect(html).toContain("入力内容は送信・保存されません");
    expect(html).not.toContain("action=");
    expect(html).toContain("dev顧客一覧へ進む");
    expect(html).toContain("devアラートへ進む");
  });

  it("renders the tenant selection placeholder without saving tenant state", () => {
    const html = renderToStaticMarkup(<SelectTenantPlaceholderPage />);

    expect(html).toContain("テナント選択");
    expect(html).toContain("tenant_amamihome");
    expect(html).toContain("tenant一覧取得requestは行いません");
    expect(html).toContain("Supabase Auth未接続");
  });

  it("renders the permission denied placeholder without role guard wiring", () => {
    const html = renderToStaticMarkup(<PermissionDeniedPlaceholderPage />);

    expect(html).toContain("権限不足");
    expect(html).toContain("role判定は行いません");
    expect(html).toContain("Admin API側");
    expect(html).toContain("Supabase Auth未接続");
  });

  it("renders the session expired placeholder without session handling", () => {
    const html = renderToStaticMarkup(<SessionExpiredPlaceholderPage />);

    expect(html).toContain("セッション期限切れ");
    expect(html).toContain("session検証");
    expect(html).toContain("logout処理は行いません");
    expect(html).toContain("Supabase Auth未接続");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LoginPlaceholderPage from "../../apps/admin/app/login/page";
import LogoutBoundaryPage from "../../apps/admin/app/logout/page";
import PermissionDeniedPlaceholderPage from "../../apps/admin/app/permission-denied/page";
import { SelectTenantPageView } from "../../apps/admin/app/select-tenant/select-tenant-page-view";
import SessionExpiredPlaceholderPage from "../../apps/admin/app/session-expired/page";

describe("admin auth placeholder pages", () => {
  it("renders the login session boundary without exposing tokens", () => {
    const html = renderToStaticMarkup(<LoginPlaceholderPage />);

    expect(html).toContain("アマミホーム相談管理へログイン");
    expect(html).toContain("本番ログイン接続前の確認画面");
    expect(html).toContain("type=\"email\"");
    expect(html).toContain("type=\"password\"");
    expect(html).toContain("<button type=\"button\" disabled=\"\"");
    expect(html).toContain("ログイン接続待ち");
    expect(html).toContain("セッションの扱い");
    expect(html).toContain("管理APIへの通信にだけ使い");
    expect(html).toContain("localStorageやcookieへ独自保存しません");
    expect(html).not.toContain("action=");
    expect(html).not.toContain("private-admin-session-token");
    expect(html).toContain("ローカルデモとして動作します");
    expect(html).toContain("顧客一覧へ進む");
    expect(html).toContain("未返信アラートへ進む");
    expect(html).toContain("ログアウト境界");
  });

  it("renders the logout session boundary without exposing tokens", () => {
    const html = renderToStaticMarkup(<LogoutBoundaryPage />);

    expect(html).toContain("ログアウト");
    expect(html).toContain("ログアウト後に安全にセッションを消す");
    expect(html).toContain("デモ用のログアウト");
    expect(html).toContain("localStorageやcookieへ独自保存しません");
    expect(html).toContain("本物のログアウト処理はまだ呼びません");
    expect(html).toContain("ログイン境界へ戻る");
    expect(html).not.toContain("private-admin-session-token");
    expect(html).not.toContain("Authorization");
  });

  it("renders the tenant selection page with selector-only persistence guidance", () => {
    const html = renderToStaticMarkup(
      <SelectTenantPageView selectedTenantForm={<SelectedTenantFormFixture />} />
    );

    expect(html).toContain("利用先を選ぶ");
    expect(html).toContain("アマミホーム");
    expect(html).toContain("tenant_amamihome");
    expect(html).toContain("amamihome");
    expect(html).toContain("amamihome.net");
    expect(html).toContain("開発確認用 / 選択保存対応");
    expect(html).toContain("操作対象の利用先を保存する");
    expect(html).toContain("この利用先を保存する");
    expect(html).toContain("選択を解除する");
    expect(html).toContain("amami-line-crm:selectedTenantId");
    expect(html).toContain("amami_line_crm_selected_tenant_id");
    expect(html).toContain("x-selected-tenant-id");
    expect(html).not.toContain("x-tenant-id");
    expect(html).toContain("ログイン情報、APIキー、secret、session値は保存・表示しません");
    expect(html).toContain("利用先の選択は権限そのものではありません");
    expect(html).toContain("利用先一覧API取得はまだ行いません");
    expect(html).toContain("Supabase Auth / JWT");
    expect(html).toContain("ログイン準備画面");
    expect(html).toContain("顧客一覧へ進む");
    expect(html).toContain("未返信アラートへ進む");
    expect(html).not.toContain("Authorization");
  });

  it("renders the permission denied placeholder without role guard wiring", () => {
    const html = renderToStaticMarkup(<PermissionDeniedPlaceholderPage />);

    expect(html).toContain("権限がありません");
    expect(html).toContain("権限判定は行いません");
    expect(html).toContain("Admin API側");
    expect(html).toContain("まだ本番未接続です");
  });

  it("renders the session expired placeholder without session handling", () => {
    const html = renderToStaticMarkup(<SessionExpiredPlaceholderPage />);

    expect(html).toContain("ログインの有効期限が切れました");
    expect(html).toContain("session検証");
    expect(html).toContain("logout処理は行いません");
    expect(html).toContain("Supabase Auth未接続");
  });
});

function SelectedTenantFormFixture() {
  return (
    <div>
      <h3>操作対象の利用先を保存する</h3>
      <button type="submit">この利用先を保存する</button>
      <button type="button">選択を解除する</button>
      <p>amami-line-crm:selectedTenantId</p>
      <p>amami_line_crm_selected_tenant_id</p>
      <p>x-selected-tenant-id</p>
      <p>ログイン情報、APIキー、secret、session値は保存・表示しません</p>
    </div>
  );
}

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
    expect(html).toContain("管理画面を安全に使うためのログイン導線");
    expect(html).toContain("type=\"email\"");
    expect(html).toContain("type=\"password\"");
    expect(html).toContain("<button type=\"button\" disabled=\"\"");
    expect(html).toContain("ログイン");
    expect(html).toContain("セッションの扱い");
    expect(html).toContain("お客様情報を見るための確認にだけ使い");
    expect(html).toContain("ログアウト時はログイン状態を消します");
    expect(html).not.toContain("action=");
    expect(html).not.toContain("private-admin-session-token");
    expect(html).toContain("お客様一覧、未対応一覧、会社選択へ進めます");
    expect(html).toContain("お客様一覧へ進む");
    expect(html).toContain("未対応一覧へ進む");
    expect(html).toContain("ログアウト境界");
  });

  it("renders the logout session boundary without exposing tokens", () => {
    const html = renderToStaticMarkup(<LogoutBoundaryPage />);

    expect(html).toContain("ログアウト");
    expect(html).toContain("ログアウト後に安全にセッションを消す");
    expect(html).toContain("ログイン確認情報が残らないことを確認します");
    expect(html).toContain("会社の選択情報はログイン情報とは別に扱います");
    expect(html).toContain("秘密の値は画面に表示しません");
    expect(html).toContain("ログイン画面へ戻る");
    expect(html).not.toContain("private-admin-session-token");
    expect(html).not.toContain("Authorization");
  });

  it("renders the tenant selection page with selector-only persistence guidance", () => {
    const html = renderToStaticMarkup(
      <SelectTenantPageView selectedTenantForm={<SelectedTenantFormFixture />} />
    );

    expect(html).toContain("会社を選ぶ");
    expect(html).toContain("アマミホーム");
    expect(html).toContain("amamihome.net");
    expect(html).toContain("運用対象 / 選択保存対応");
    expect(html).toContain("操作する会社を保存する");
    expect(html).toContain("この会社を保存する");
    expect(html).toContain("選択を解除する");
    expect(html).not.toContain("x-tenant-id");
    expect(html).toContain("ログイン情報や秘密の値は保存も表示もしません");
    expect(html).toContain("会社の選択は権限そのものではありません");
    expect(html).toContain("お客様一覧、未対応一覧、ログイン関連画面へ進めます");
    expect(html).toContain("ログイン情報は画面に表示せず");
    expect(html).toContain("ログイン");
    expect(html).toContain("お客様一覧へ進む");
    expect(html).toContain("未対応一覧へ進む");
    expect(html).not.toContain("Authorization");
  });

  it("renders the permission denied placeholder without role guard wiring", () => {
    const html = renderToStaticMarkup(<PermissionDeniedPlaceholderPage />);

    expect(html).toContain("権限がありません");
    expect(html).toContain("この画面を開くための権限がない場合");
    expect(html).toContain("お客様情報を表示せずこの画面で止めます");
  });

  it("renders the session expired placeholder without session handling", () => {
    const html = renderToStaticMarkup(<SessionExpiredPlaceholderPage />);

    expect(html).toContain("ログインの有効期限が切れました");
    expect(html).toContain("もう一度ログインが必要です");
    expect(html).toContain("ログイン画面へ戻って");
    expect(html).toContain("ログイン情報の値は画面に表示しません");
  });
});

function SelectedTenantFormFixture() {
  return (
    <div>
      <h3>操作する会社を保存する</h3>
      <button type="submit">この会社を保存する</button>
      <button type="button">選択を解除する</button>
      <p>ログイン情報や秘密の値は保存も表示もしません</p>
    </div>
  );
}

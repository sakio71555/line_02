import React from "react";

import { AuthPlaceholderPage } from "../auth-placeholder-page";

export default function PermissionDeniedPlaceholderPage() {
  return (
    <AuthPlaceholderPage
      eyebrow="権限確認"
      title="権限がありません"
      description="権限や利用先の所属が不足している場合に表示する安全画面です。"
      notes={[
        "管理者、チーム管理者、担当者の権限設計はAPI側の確認と合わせて扱います。",
        "UIの非表示だけでなく、最終的な権限判定はAdmin API側で行う方針です。",
        "権限不足のときは顧客情報へ進まず、この画面で止めます。",
        "実顧客情報を権限不足状態で表示しないsafe stateとして扱います。"
      ]}
      links={[
        { href: "/", label: "トップへ戻る" },
        { href: "/customers", label: "顧客一覧へ進む" },
        { href: "/alerts", label: "未返信アラートへ進む" },
        { href: "/login", label: "ログイン画面" }
      ]}
    />
  );
}

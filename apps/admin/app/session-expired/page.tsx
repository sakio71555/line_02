import React from "react";

import { AuthPlaceholderPage } from "../auth-placeholder-page";

export default function SessionExpiredPlaceholderPage() {
  return (
    <AuthPlaceholderPage
      eyebrow="ログイン期限切れ"
      title="ログインの有効期限が切れました"
      description="JWT/sessionの期限切れや無効化を検知した場合に表示する安全画面です。"
      notes={[
        "session expirationを検知した場合は、再ログインへ誘導します。",
        "cookie削除、logout API呼び出し、session storage削除は安全な境界で扱います。",
        "ログイン画面へ戻り、必要に応じて利用先を選び直します。",
        "tenant_amamihomeの運用導線へ戻る場合も、認証情報の値は表示しません。"
      ]}
      links={[
        { href: "/login", label: "ログイン画面へ" },
        { href: "/customers", label: "顧客一覧へ進む" },
        { href: "/alerts", label: "未返信アラートへ進む" },
        { href: "/", label: "トップへ戻る" }
      ]}
    />
  );
}

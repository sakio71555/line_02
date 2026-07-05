import React from "react";

import { AuthPlaceholderPage } from "../auth-placeholder-page";

export default function SessionExpiredPlaceholderPage() {
  return (
    <AuthPlaceholderPage
      eyebrow="ログイン期限切れ"
      title="ログインの有効期限が切れました"
      description="ログインの有効期限が切れたため、もう一度ログインが必要です。"
      notes={[
        "ログイン画面へ戻って、もう一度ログインしてください。",
        "必要に応じて会社を選び直してください。",
        "ログイン情報の値は画面に表示しません。"
      ]}
      links={[
        { href: "/login", label: "ログイン画面へ" },
        { href: "/customers", label: "お客様一覧へ進む" },
        { href: "/alerts", label: "未対応一覧へ進む" },
        { href: "/", label: "トップへ戻る" }
      ]}
    />
  );
}

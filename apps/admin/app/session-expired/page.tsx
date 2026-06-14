import React from "react";

import { AuthPlaceholderPage } from "../auth-placeholder-page";

export default function SessionExpiredPlaceholderPage() {
  return (
    <AuthPlaceholderPage
      eyebrow="Auth placeholder"
      title="セッション期限切れ"
      description="将来、JWT/sessionの期限切れや無効化を検知した場合に表示するplaceholderです。現時点ではsession検証やlogout処理は行いません。"
      notes={[
        "Supabase Auth未接続のため、session expirationの実判定はありません。",
        "cookie削除、logout API呼び出し、session storage削除は行いません。",
        "将来はlogin placeholderまたは本物のlogin画面へ誘導します。",
        "dev modeでは既存のtenant_amamihome導線でMVP確認を継続できます。"
      ]}
      links={[
        { href: "/login", label: "ログインplaceholderへ" },
        { href: "/customers", label: "dev顧客一覧へ進む" },
        { href: "/alerts", label: "devアラートへ進む" },
        { href: "/", label: "トップへ戻る" }
      ]}
    />
  );
}

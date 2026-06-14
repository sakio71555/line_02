import React from "react";

import { AuthPlaceholderPage } from "../auth-placeholder-page";

export default function LoginPlaceholderPage() {
  return (
    <AuthPlaceholderPage
      eyebrow="Auth placeholder"
      title="管理画面ログイン"
      description="将来の管理画面ログイン導線です。現時点では認証未接続のplaceholderで、ログイン送信処理はありません。"
      notes={[
        "email/password、magic link、Google OAuthなどの実ログイン処理は未実装です。",
        "Supabase Auth未接続のため、auth.users.id と staff_users.auth_user_id の照合は行いません。",
        "cookie、session、localStorage、sessionStorageへの保存は行いません。",
        "dev modeでは既存のtenant_amamihome導線でMVP確認を継続します。"
      ]}
      links={[
        { href: "/customers", label: "dev顧客一覧へ進む" },
        { href: "/alerts", label: "devアラートへ進む" },
        { href: "/select-tenant", label: "テナント選択placeholder" },
        { href: "/session-expired", label: "セッション期限切れplaceholder" }
      ]}
    />
  );
}

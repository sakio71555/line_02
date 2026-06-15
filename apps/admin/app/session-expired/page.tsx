import React from "react";

import { AuthPlaceholderPage } from "../auth-placeholder-page";

export default function SessionExpiredPlaceholderPage() {
  return (
    <AuthPlaceholderPage
      eyebrow="ログイン期限切れ準備中"
      title="ログインの有効期限が切れました"
      description="将来、JWT/sessionの期限切れや無効化を検知した場合に表示する準備画面です。現時点ではsession検証やlogout処理は行いません。"
      notes={[
        "Supabase Auth未接続のため、session expirationの実判定はありません。",
        "cookie削除、logout API呼び出し、session storage削除は行いません。",
        "将来はログイン準備画面または本物のログイン画面へ誘導します。",
        "開発確認用では既存のtenant_amamihome導線でMVP確認を継続できます。"
      ]}
      links={[
        { href: "/login", label: "ログイン準備画面へ" },
        { href: "/customers", label: "顧客一覧へ進む" },
        { href: "/alerts", label: "未返信アラートへ進む" },
        { href: "/", label: "トップへ戻る" }
      ]}
    />
  );
}

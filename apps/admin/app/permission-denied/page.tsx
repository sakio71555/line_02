import React from "react";

import { AuthPlaceholderPage } from "../auth-placeholder-page";

export default function PermissionDeniedPlaceholderPage() {
  return (
    <AuthPlaceholderPage
      eyebrow="権限確認"
      title="権限がありません"
      description="この画面を開くための権限がない場合に表示されます。"
      notes={[
        "権限が足りない場合は、お客様情報を表示せずこの画面で止めます。",
        "必要な場合は管理者に権限の確認を依頼してください。",
        "ログインし直すか、会社を選び直すことで解決する場合があります。"
      ]}
      links={[
        { href: "/", label: "トップへ戻る" },
        { href: "/customers", label: "お客様一覧へ進む" },
        { href: "/alerts", label: "未対応一覧へ進む" },
        { href: "/login", label: "ログイン画面" }
      ]}
    />
  );
}

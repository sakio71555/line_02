import React from "react";

import { AuthPlaceholderPage } from "../auth-placeholder-page";

export default function PermissionDeniedPlaceholderPage() {
  return (
    <AuthPlaceholderPage
      eyebrow="Auth placeholder"
      title="権限不足"
      description="将来、roleやtenant membershipが不足している場合に表示するplaceholderです。現時点では実際のrole判定は行いません。"
      notes={[
        "owner、manager、staffの権限設計は後続LoopでAPI guardと合わせて実装します。",
        "UIの非表示だけでなく、最終的な権限判定はAdmin API側で行う方針です。",
        "この画面はまだ既存routeを保護しません。",
        "実顧客情報を権限不足状態で表示しないsafe stateとして扱います。"
      ]}
      links={[
        { href: "/", label: "トップへ戻る" },
        { href: "/customers", label: "dev顧客一覧へ進む" },
        { href: "/alerts", label: "devアラートへ進む" },
        { href: "/login", label: "ログインplaceholder" }
      ]}
    />
  );
}

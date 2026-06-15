import React from "react";

import { AuthPlaceholderPage } from "../auth-placeholder-page";

export default function PermissionDeniedPlaceholderPage() {
  return (
    <AuthPlaceholderPage
      eyebrow="権限表示準備中"
      title="権限がありません"
      description="将来、権限や利用先の所属が不足している場合に表示する準備画面です。現時点では実際の権限判定は行いません。"
      notes={[
        "管理者、チーム管理者、担当者の権限設計は後続LoopでAPI側の確認と合わせて実装します。",
        "UIの非表示だけでなく、最終的な権限判定はAdmin API側で行う方針です。",
        "この画面はまだ既存routeを保護しません。",
        "実顧客情報を権限不足状態で表示しないsafe stateとして扱います。"
      ]}
      links={[
        { href: "/", label: "トップへ戻る" },
        { href: "/customers", label: "顧客一覧へ進む" },
        { href: "/alerts", label: "未返信アラートへ進む" },
        { href: "/login", label: "ログイン準備画面" }
      ]}
    />
  );
}

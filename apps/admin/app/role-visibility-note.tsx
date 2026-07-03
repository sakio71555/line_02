"use client";

import React from "react";

export type RoleVisibilityNoteVariant = "general" | "customer-actions" | "alerts";

const roleVisibilityNotes: Record<
  RoleVisibilityNoteVariant,
  {
    title: string;
    bullets: string[];
  }
> = {
  general: {
    title: "権限に応じた操作範囲",
    bullets: [
      "ログインしたスタッフの権限に合わせて、操作範囲を確認します。",
      "管理者、チーム管理者、担当者ごとに、使えるボタンや確認できる情報を整理します。",
      "画面表示だけでなく、重要な操作はAdmin API側の権限確認も前提にします。",
      "LINE実送信などの危険操作は、runtime gateと明示確認が揃った場合だけ表示します。"
    ]
  },
  "customer-actions": {
    title: "担当者操作の確認範囲",
    bullets: [
      "管理者、チーム管理者、担当者によって扱う操作を分けます。",
      "担当者返信、相談内容のまとめ、返信文の下書き、ホームページ情報からの回答案を業務範囲ごとに整理します。",
      "LINE実送信はruntime gate、明示確認、1通限定の条件が揃った場合だけ表示します。",
      "AI補助は担当者確認前提で使い、お客様へ自動送信しません。"
    ]
  },
  alerts: {
    title: "アラート操作の確認範囲",
    bullets: [
      "管理者、チーム管理者、担当者によってアラート操作の扱いを分けます。",
      "未返信チェックと通知記録は、管理者またはチーム管理者向けの操作として扱います。",
      "担当者は対応が必要な相談の確認から始めます。",
      "外部通知や一斉送信は、この画面から自動実行しません。"
    ]
  }
};

export function RoleVisibilityNote({
  variant = "general"
}: {
  variant?: RoleVisibilityNoteVariant;
}) {
  const note = roleVisibilityNotes[variant];

  return (
    <aside className="role-visibility-note" aria-label={note.title}>
      <p className="result-label">{note.title}</p>
      <ul>
        {note.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <p className="meta">
        権限が足りない場合の案内は <a href="/permission-denied">/permission-denied</a>{" "}
        で確認できます。重要な操作は画面表示だけに依存せず、API側の判定も併用します。
      </p>
    </aside>
  );
}

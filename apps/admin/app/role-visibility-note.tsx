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
    title: "Role visibility placeholder",
    bullets: [
      "現在はdev_header runtimeのため、UI role制御は未接続です。",
      "将来 authenticated_staff runtime で owner / manager / staff に応じて操作表示を制御します。",
      "この表示は説明のみです。ボタンはまだ非表示/disabledにしません。"
    ]
  },
  "customer-actions": {
    title: "権限ごとの表示制御は準備中です",
    bullets: [
      "将来は管理者、チーム管理者、担当者によって表示される操作が変わります。",
      "担当者返信、相談内容のまとめ、返信文の下書き、ホームページ情報からの回答案を権限ごとに整理する予定です。",
      "今はデモ確認のため、操作ボタンは従来通り使えます。",
      "本物の権限判定やボタン非表示はまだ行いません。"
    ]
  },
  alerts: {
    title: "権限ごとの表示制御は準備中です",
    bullets: [
      "将来は管理者、チーム管理者、担当者によってアラート操作の表示が変わります。",
      "未返信チェックとデモ通知は、管理者またはチーム管理者向けの操作にする予定です。",
      "担当者は対応が必要な相談の確認から始められる想定です。",
      "今はデモ確認のため、操作ボタンは従来通り使えます。"
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
        権限不足時のsafe stateは <a href="/permission-denied">/permission-denied</a>{" "}
        placeholderで確認できます。実際のredirectやrole判定はまだ行いません。
      </p>
    </aside>
  );
}

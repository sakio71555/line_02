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
    title: "Role visibility placeholder: アラート",
    bullets: [
      "owner / manager: alerts一覧、未返信チェック、open alert通知mockを許可予定です。",
      "staff: alerts一覧は閲覧可候補です。",
      "staff: 未返信チェック / open alert通知mockはmanager以上の操作候補です。",
      "現在はdev_header runtimeのため、操作ボタンはまだ非表示/disabledにしません。"
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

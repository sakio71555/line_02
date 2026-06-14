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
    title: "Role visibility placeholder: 顧客アクション",
    bullets: [
      "owner / manager: 担当者返信、AI要約、AI返信下書き、RAG回答案を許可予定です。",
      "staff: 担当者返信、AI返信下書き、RAG回答案は許可候補です。",
      "staff: AI要約保存は将来制限候補です。",
      "現在はdev_header runtimeのため、操作ボタンはまだ非表示/disabledにしません。"
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

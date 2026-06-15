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
    title: "権限ごとの表示制御は準備中です",
    bullets: [
      "将来はログインしたスタッフの権限に合わせて、表示される操作が変わります。",
      "管理者、チーム管理者、担当者ごとに、使えるボタンや確認できる情報を整理する予定です。",
      "今は社内確認版のため、操作ボタンは従来通り使えます。",
      "本番ログイン、JWT/session、実際の権限判定はまだ接続していません。"
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
        権限が足りない場合の準備画面は <a href="/permission-denied">/permission-denied</a>{" "}
        で確認できます。実際の自動移動や本物の権限判定はまだ行いません。
      </p>
    </aside>
  );
}

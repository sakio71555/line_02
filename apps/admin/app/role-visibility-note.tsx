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
    title: "使える操作について",
    bullets: [
      "ログインした担当者ごとに、使えるボタンが変わります。",
      "大事な操作は、画面上でもう一度確認してから進みます。",
      "LINEへの送信は、送信前の確認が済んだ時だけ行います。"
    ]
  },
  "customer-actions": {
    title: "返信するときの注意",
    bullets: [
      "返信文は必ず内容を確認してから保存・送信します。",
      "下書きや参考回答は、お客様へ自動送信されません。",
      "LINEへ送る場合は、1通ずつ確認して送ります。"
    ]
  },
  alerts: {
    title: "未対応確認の使い方",
    bullets: [
      "返せていない相談を探して、お客様ページから内容を確認します。",
      "確認済みにすると、担当者が見た記録を残せます。",
      "一斉送信や自動送信をする画面ではありません。"
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
    </aside>
  );
}

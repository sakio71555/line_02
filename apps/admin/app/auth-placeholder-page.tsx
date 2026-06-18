import React from "react";

export interface AuthPlaceholderLink {
  href: string;
  label: string;
}

export interface AuthPlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  notes: string[];
  links: AuthPlaceholderLink[];
}

export function AuthPlaceholderPage({
  eyebrow,
  title,
  description,
  notes,
  links
}: AuthPlaceholderPageProps) {
  return (
    <main>
      <section className="login-card" aria-labelledby="auth-placeholder-title">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 id="auth-placeholder-title">{title}</h1>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>{description}</p>
        <p className="meta">
          現在は準備中の画面です。Supabase Auth、JWT/session、Admin APIのログイン済みスタッフ確認は
          まだ本番未接続です。
        </p>
      </div>

      <section className="section">
        <h2>未接続の内容</h2>
        <ul>
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>開発確認用の導線</h2>
        <p className="meta">
          既存の開発確認用MVPは引き続きローカルデモとして動作します。本物の認証処理、
          cookie保存、session保存は行いません。
        </p>
        <ul className="auth-page-links">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </section>
      </section>
    </main>
  );
}

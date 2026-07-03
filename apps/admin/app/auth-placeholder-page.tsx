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
          認証情報やsession値を画面に表示せず、管理操作は安全な状態で案内します。
        </p>
      </div>

      <section className="section">
        <h2>安全確認の内容</h2>
        <ul>
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>運用導線</h2>
        <p className="meta">
          顧客一覧、未返信アラート、利用先選択へ戻って、現在の対応状況を確認できます。
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

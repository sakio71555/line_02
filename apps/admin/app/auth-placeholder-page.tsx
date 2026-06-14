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
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>{description}</p>
        <p className="meta">
          現在はplaceholderです。Supabase Auth未接続、JWT/session未接続、Admin API
          authenticated_staff guard未接続です。
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
        <h2>開発用導線</h2>
        <p className="meta">
          既存のdev-only MVP確認は引き続き <span className="mono">x-tenant-id</span>{" "}
          経由で動作します。本物の認証処理、cookie保存、session保存は行いません。
        </p>
        <ul className="nav-links">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

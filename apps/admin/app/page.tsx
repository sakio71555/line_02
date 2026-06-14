import Link from "next/link";

import { getAdminApiConfig } from "../src/admin-api";
import { RoleVisibilityNote } from "./role-visibility-note";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  const config = getAdminApiConfig();

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Read-only development UI</p>
          <h1>Amami LINE CRM Admin</h1>
        </div>
      </div>

      <div className="notice">
        <p>この管理画面は開発用の読み取り専用UIです。</p>
        <p className="meta">
          tenant: <span className="mono">{config.tenantId}</span> / API:{" "}
          <span className="mono">{config.apiBaseUrl}</span>
        </p>
      </div>

      <RoleVisibilityNote />

      <section className="section">
        <h2>Navigation</h2>
        <ul className="nav-links">
          <li>
            <Link href="/customers">顧客一覧</Link>
          </li>
          <li>
            <Link href="/alerts">アラート</Link>
          </li>
        </ul>
      </section>

      <section className="section">
        <h2>Auth placeholder</h2>
        <div className="notice">
          <p>認証UIはまだplaceholderです。Supabase Auth、JWT/session、Admin API authenticated_staff guardには接続していません。</p>
          <p className="meta">
            既存のdev-only MVP確認導線は引き続き <span className="mono">x-tenant-id</span>{" "}
            を使います。
          </p>
        </div>
        <ul className="nav-links">
          <li>
            <Link href="/login">ログイン画面placeholder</Link>
          </li>
          <li>
            <Link href="/select-tenant">テナント選択placeholder</Link>
          </li>
          <li>
            <Link href="/permission-denied">権限不足placeholder</Link>
          </li>
          <li>
            <Link href="/session-expired">セッション期限切れplaceholder</Link>
          </li>
        </ul>
      </section>
    </main>
  );
}

import Link from "next/link";

import { getAdminApiConfig } from "../src/admin-api";

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

      <section className="section">
        <h2>Navigation</h2>
        <ul className="nav-links">
          <li>
            <Link href="/customers">顧客一覧</Link>
          </li>
        </ul>
      </section>
    </main>
  );
}

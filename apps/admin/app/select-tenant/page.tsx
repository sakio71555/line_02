import React from "react";

export default function SelectTenantPlaceholderPage() {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Auth placeholder</p>
          <h1>テナント選択</h1>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          将来、staffが複数tenantに所属する場合に操作対象tenantを選択する画面です。
          現在はSupabase Auth未接続、membership lookup未接続のため、
          tenant一覧取得も選択保存も行いません。
        </p>
        <p className="meta">
          dev MVPでは <span className="mono">tenant_amamihome</span> を使って確認中です。
          選択済みtenantとして扱う処理、cookie、session、localStorage、sessionStorageへの保存は未実装です。
        </p>
      </div>

      <section className="section">
        <h2>候補tenant placeholder</h2>
        <div className="action-panel">
          <h3>アマミホーム</h3>
          <dl className="compact-detail">
            <dt>tenant_id</dt>
            <dd className="mono">tenant_amamihome</dd>
            <dt>slug</dt>
            <dd className="mono">amamihome</dd>
            <dt>domain</dt>
            <dd className="mono">amamihome.net</dd>
            <dt>status</dt>
            <dd>dev placeholder / 未接続</dd>
          </dl>
          <p className="meta">
            後続Loopでは、authenticated staff contextから取得したactive membershipで
            selected tenantを再検証してから採用します。
          </p>
          <button type="button" disabled>
            選択機能は未接続
          </button>
        </div>
      </section>

      <section className="section">
        <h2>未接続の内容</h2>
        <ul>
          <li>Supabase Auth / JWT / session検証にはまだ接続していません。</li>
          <li>Admin APIへのtenant一覧取得requestは行いません。</li>
          <li>tenant選択結果は保存しないため、選択済みとは扱いません。</li>
          <li>Admin API authenticated_staff guardにはまだ接続していません。</li>
        </ul>
      </section>

      <section className="section">
        <h2>開発用導線</h2>
        <p className="meta">
          既存のdev-only MVP確認は引き続き <span className="mono">x-tenant-id</span>{" "}
          経由で動作します。本物の認証処理、tenant保存、API取得は行いません。
        </p>
        <ul className="nav-links">
          <li>
            <a href="/login">ログインplaceholder</a>
          </li>
          <li>
            <a href="/customers">dev顧客一覧へ進む</a>
          </li>
          <li>
            <a href="/alerts">devアラートへ進む</a>
          </li>
          <li>
            <a href="/permission-denied">権限不足placeholder</a>
          </li>
          <li>
            <a href="/session-expired">セッション期限切れplaceholder</a>
          </li>
          <li>
            <a href="/">トップへ戻る</a>
          </li>
        </ul>
      </section>
    </main>
  );
}

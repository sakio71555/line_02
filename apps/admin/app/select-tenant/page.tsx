import React from "react";

export default function SelectTenantPlaceholderPage() {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">利用先選択準備中</p>
          <h1>利用先を選ぶ</h1>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          将来、スタッフが複数の利用先に所属する場合に操作対象の利用先を選択する画面です。
          現在はSupabase Auth未接続、membership lookup未接続のため、
          利用先一覧取得も選択保存も行いません。
        </p>
        <p className="meta">
          開発確認用MVPでは <span className="mono">tenant_amamihome</span> を使って確認中です。
          選択済み利用先として扱う処理、cookie、session、localStorage、sessionStorageへの保存は未実装です。
        </p>
      </div>

      <section className="section">
        <h2>利用先候補の準備画面</h2>
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
            <dd>開発確認用 / 未接続</dd>
          </dl>
          <p className="meta">
            後続Loopでは、authenticated staff contextから取得したactive membershipで
            選択した利用先を再検証してから採用します。
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
          <li>Admin APIへの利用先一覧取得requestは行いません。</li>
          <li>利用先選択結果は保存しないため、選択済みとは扱いません。</li>
          <li>Admin APIのログイン済みスタッフ確認にはまだ接続していません。</li>
        </ul>
      </section>

      <section className="section">
        <h2>開発確認用の導線</h2>
        <p className="meta">
          既存の開発確認用MVPは引き続き <span className="mono">x-tenant-id</span>{" "}
          経由で動作します。本物の認証処理、利用先保存、API取得は行いません。
        </p>
        <ul className="nav-links">
          <li>
            <a href="/login">ログイン準備画面</a>
          </li>
          <li>
            <a href="/customers">顧客一覧へ進む</a>
          </li>
          <li>
            <a href="/alerts">未返信アラートへ進む</a>
          </li>
          <li>
            <a href="/permission-denied">権限不足準備画面</a>
          </li>
          <li>
            <a href="/session-expired">ログイン期限切れ準備画面</a>
          </li>
          <li>
            <a href="/">トップへ戻る</a>
          </li>
        </ul>
      </section>
    </main>
  );
}

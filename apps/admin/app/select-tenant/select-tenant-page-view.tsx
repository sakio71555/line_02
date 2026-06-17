import React from "react";

import { SelectedTenantForm } from "./selected-tenant-form";

export function SelectTenantPageView({
  selectedTenantForm = <SelectedTenantForm />
}: {
  selectedTenantForm?: React.ReactNode;
}) {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">利用先選択</p>
          <h1>利用先を選ぶ</h1>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          スタッフが複数の利用先に所属する場合に、操作対象の利用先を選ぶための画面です。
          今回は選択したtenant selectorを保存し、Admin APIへ
          <span className="mono"> x-selected-tenant-id </span>
          として渡せるようにします。
        </p>
        <p className="meta">
          選択値は権限ではありません。API側でauthenticated staffのactive membershipを再検証し、
          検証済みtenantだけをrepositoryへ渡す前提です。
        </p>
      </div>

      <section className="section">
        <h2>利用先候補</h2>
        <div className="action-grid">
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
              <dd>開発確認用 / 選択保存対応</dd>
            </dl>
            <p className="meta">
              開発確認ではこのtenantを選びます。将来はAPIから所属利用先一覧を取得する想定です。
            </p>
          </div>
          {selectedTenantForm}
        </div>
      </section>

      <section className="section">
        <h2>保存ルール</h2>
        <ul>
          <li>
            保存するのは <span className="mono">selectedTenantId</span> だけです。
          </li>
          <li>Bearer token、APIキー、Supabase secret、session値は保存・表示しません。</li>
          <li>
            <span className="mono">localStorage</span> は画面表示用、
            <span className="mono"> cookie</span> はServer ActionからAdmin APIへ渡すために使います。
          </li>
          <li>
            <span className="mono">x-selected-tenant-id</span> はselectorで、
            開発用 <span className="mono">x-tenant-id</span> とは別物です。
          </li>
          <li>Supabase Auth / JWTのproduction本接続はまだ未完了です。</li>
        </ul>
      </section>

      <section className="section">
        <h2>開発確認用の導線</h2>
        <p className="meta">
          既存の開発確認用MVPは引き続き <span className="mono">x-tenant-id</span>{" "}
          経由でも動作します。本物の認証処理と利用先一覧API取得はまだ行いません。
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

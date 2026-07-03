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
          <p className="meta">担当者が見る会社・店舗を切り替えるための画面です。</p>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          スタッフが複数の利用先に所属する場合に、操作対象の利用先を選びます。
          アマミホームを選ぶと、顧客一覧や未返信アラートの操作対象に反映されます。
        </p>
        <p className="meta">
          保存するのは利用先の選択情報だけです。ログイン情報、APIキー、パスワードは保存しません。
        </p>
      </div>

      <section className="section">
        <h2>利用先候補</h2>
        <div className="action-grid">
          <div className="tenant-card">
            <h3>アマミホーム</h3>
            <div className="status-pill-list">
              <span className="status-pill">現在の運用利用先</span>
              <span className="status-pill status-pill-muted">選択保存</span>
            </div>
            <dl className="compact-detail">
              <dt>利用先ID</dt>
              <dd className="mono">tenant_amamihome</dd>
              <dt>短い名前</dt>
              <dd className="mono">amamihome</dd>
              <dt>公式サイト</dt>
              <dd className="mono">amamihome.net</dd>
              <dt>状態</dt>
              <dd>運用対象 / 選択保存対応</dd>
            </dl>
            <p className="meta">
              この利用先を選ぶと、管理画面の操作対象として保存されます。
            </p>
          </div>
          {selectedTenantForm}
        </div>
      </section>

      <section className="section">
        <h2>保存ルール</h2>
        <ul>
          <li>
            保存するのは利用先を示すIDだけです。
          </li>
          <li>ログイン情報、APIキー、secret、session値は保存・表示しません。</li>
          <li>
            画面表示とサーバー側の操作で、同じ利用先IDを使います。
          </li>
          <li>
            利用先の選択は権限そのものではありません。権限確認はAPI側で行う方針です。
          </li>
          <li>認証情報やsession値は画面に表示せず、利用先選択とは分けて扱います。</li>
        </ul>
      </section>

      <section className="section">
        <h2>運用導線</h2>
        <p className="meta">
          顧客一覧、未返信アラート、ログイン関連画面へ進めます。
        </p>
        <ul className="nav-links">
          <li>
            <a href="/login">ログイン画面</a>
          </li>
          <li>
            <a href="/customers">顧客一覧へ進む</a>
          </li>
          <li>
            <a href="/alerts">未返信アラートへ進む</a>
          </li>
          <li>
            <a href="/permission-denied">権限不足画面</a>
          </li>
          <li>
            <a href="/session-expired">ログイン期限切れ画面</a>
          </li>
          <li>
            <a href="/">トップへ戻る</a>
          </li>
        </ul>
      </section>
    </main>
  );
}

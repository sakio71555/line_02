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
          <p className="eyebrow">会社選択</p>
          <h1>会社を選ぶ</h1>
          <p className="meta">担当者が見る会社・店舗を切り替えるための画面です。</p>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          スタッフが複数の会社に所属する場合に、操作する会社を選びます。
          アマミホームを選ぶと、お客様一覧や未対応一覧に反映されます。
        </p>
        <p className="meta">
          保存するのは会社の選択情報だけです。ログイン情報やパスワードは保存しません。
        </p>
      </div>

      <section className="section">
        <h2>会社候補</h2>
        <div className="action-grid">
          <div className="tenant-card">
            <h3>アマミホーム</h3>
            <div className="status-pill-list">
              <span className="status-pill">現在の運用会社</span>
              <span className="status-pill status-pill-muted">選択保存</span>
            </div>
            <dl className="compact-detail">
              <dt>会社名</dt>
              <dd>アマミホーム</dd>
              <dt>公式サイト</dt>
              <dd>amamihome.net</dd>
              <dt>状態</dt>
              <dd>運用対象 / 選択保存対応</dd>
            </dl>
            <p className="meta">
              この会社を選ぶと、管理画面の操作対象として保存されます。
            </p>
          </div>
          {selectedTenantForm}
        </div>
      </section>

      <section className="section">
        <h2>保存ルール</h2>
        <ul>
          <li>
            保存するのは会社の選択情報だけです。
          </li>
          <li>ログイン情報や秘密の値は保存・表示しません。</li>
          <li>
            画面表示と返信操作で、同じ会社を使います。
          </li>
          <li>
            会社の選択は権限そのものではありません。操作権限は別に確認します。
          </li>
          <li>ログイン情報は画面に表示せず、会社選択とは分けて扱います。</li>
        </ul>
      </section>

      <section className="section">
        <h2>運用導線</h2>
        <p className="meta">
          お客様一覧、未対応一覧、ログイン関連画面へ進めます。
        </p>
        <ul className="nav-links">
          <li>
            <a href="/login">ログイン画面</a>
          </li>
          <li>
            <a href="/customers">お客様一覧へ進む</a>
          </li>
          <li>
            <a href="/alerts">未対応一覧へ進む</a>
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

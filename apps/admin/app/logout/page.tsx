import React from "react";

export default function LogoutBoundaryPage() {
  return (
    <main>
      <section className="login-card" aria-labelledby="admin-logout-title">
      <div className="page-header">
        <div>
          <p className="eyebrow">ログアウト準備中</p>
          <h1 id="admin-logout-title">ログアウト</h1>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          ログアウト後に安全にセッションを消すための準備画面です。本番接続は後続Loopで行います。
        </p>
        <p className="meta">
          access tokenは画面表示せず、localStorageやcookieへ独自保存しません。
        </p>
      </div>

      <section className="section">
        <h2>ログアウトの扱い</h2>
        <ul>
          <li>デモ用のログアウトでは、ログイン確認情報が残らないことを確認します。</li>
          <li>利用先の選択情報はログイン情報とは別に扱います。</li>
          <li>本物のログアウト処理はまだ呼びません。</li>
        </ul>
      </section>

      <section className="section">
        <h2>導線</h2>
        <ul className="nav-links">
          <li>
            <a href="/login">ログイン境界へ戻る</a>
          </li>
          <li>
            <a href="/select-tenant">利用先を選ぶ</a>
          </li>
          <li>
            <a href="/customers">顧客一覧へ進む</a>
          </li>
        </ul>
      </section>
      </section>
    </main>
  );
}

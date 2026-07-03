import React from "react";

export default function LoginPlaceholderPage() {
  return (
    <main>
      <section className="login-card" aria-labelledby="admin-login-title">
      <div className="page-header">
        <div>
          <p className="eyebrow">ログイン</p>
          <h1 id="admin-login-title">アマミホーム相談管理へログイン</h1>
          <p className="meta">管理画面を安全に使うためのログイン導線です。</p>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          ログイン情報は画面に表示せず、管理APIへの通信にだけ使う前提で扱います。
        </p>
        <p className="meta">
          パスワードやaccess tokenは画面に表示せず、localStorageやcookieへ独自保存しません。
        </p>
      </div>

      <section className="section">
        <h2>ログインフォーム</h2>
        <form className="login-form" aria-label="管理画面ログインフォーム">
          <fieldset>
            <label htmlFor="admin-login-email">メールアドレス</label>
            <input
              id="admin-login-email"
              type="email"
              autoComplete="email"
              placeholder="staff@example.com"
            />

            <label htmlFor="admin-login-password">パスワード</label>
            <input
              id="admin-login-password"
              type="password"
              autoComplete="current-password"
              placeholder="パスワード"
            />

            <button type="button" disabled>
              ログイン
            </button>
          </fieldset>
        </form>
        <p className="meta">
          この画面では認証情報を画面へ保存・表示しません。
        </p>
      </section>

      <section className="section">
        <h2>セッションの扱い</h2>
        <ul>
          <li>ログイン後の確認情報は、必要なときだけ安全に読み取ります。</li>
          <li>管理APIへの通信にだけ使い、画面には表示しません。</li>
          <li>利用先の選択情報はログイン情報とは別に扱います。</li>
          <li>ログアウト時はログイン状態を消し、独自token保存は残しません。</li>
        </ul>
      </section>

      <section className="section">
        <h2>安全確認の内容</h2>
        <ul>
          <li>認証情報やaccess tokenを画面に表示しません。</li>
          <li>refresh timer、password reset、OAuthなどの追加導線は別の安全確認で扱います。</li>
          <li>実Bearer tokenの値は記録しません。</li>
        </ul>
      </section>

      <section className="section">
        <h2>運用導線</h2>
        <p className="meta">
          顧客一覧、未返信アラート、利用先選択へ進めます。
        </p>
        <ul className="nav-links">
          <li>
            <a href="/customers">顧客一覧へ進む</a>
          </li>
          <li>
            <a href="/alerts">未返信アラートへ進む</a>
          </li>
          <li>
            <a href="/select-tenant">利用先を選ぶ</a>
          </li>
          <li>
            <a href="/logout">ログアウト境界</a>
          </li>
          <li>
            <a href="/session-expired">ログイン期限切れ画面</a>
          </li>
        </ul>
      </section>
      </section>
    </main>
  );
}

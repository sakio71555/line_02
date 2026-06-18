import React from "react";

export default function LoginPlaceholderPage() {
  return (
    <main>
      <section className="login-card" aria-labelledby="admin-login-title">
      <div className="page-header">
        <div>
          <p className="eyebrow">ログイン準備中</p>
          <h1 id="admin-login-title">アマミホーム相談管理へログイン</h1>
          <p className="meta">本番ログイン接続前の確認画面です。</p>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          ログインの入力欄と安全な表示だけを確認できます。本番ログイン接続は後続Loopで行います。
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
              placeholder="未接続"
            />

            <button type="button" disabled>
              ログイン接続待ち
            </button>
          </fieldset>
        </form>
        <p className="meta">
          この画面ではまだ本物のログインAPIへ接続しません。入力しても外部サービスへ送信されません。
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
        <h2>未接続の内容</h2>
        <ul>
          <li>この画面から本物のSupabase Auth APIはまだ呼びません。</li>
          <li>実Auth client注入、refresh timer、password reset、OAuthは後続Loopです。</li>
          <li>本番deploy、production smoke、実Bearer token取得はまだ行いません。</li>
        </ul>
      </section>

      <section className="section">
        <h2>開発確認用の導線</h2>
        <p className="meta">
          既存の開発確認用MVPは引き続きローカルデモとして動作します。
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
            <a href="/session-expired">ログイン期限切れ準備画面</a>
          </li>
        </ul>
      </section>
      </section>
    </main>
  );
}

import React from "react";

export default function LoginPlaceholderPage() {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">ログイン境界</p>
          <h1>管理画面ログイン</h1>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          Supabase Auth sessionを扱うための最小境界を追加済みです。実際のAuth client注入と
          本番ログイン接続は後続Loopで行います。
        </p>
        <p className="meta">
          access tokenは画面に表示せず、localStorageやcookieへ独自保存しません。Admin APIへは
          token providerから都度渡します。
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
              Auth client接続待ち
            </button>
          </fieldset>
        </form>
        <p className="meta">
          この画面ではまだ本物のSupabase Authへ接続しません。email/password
          sign-in、refresh、logoutの境界はfake clientで検証済みです。
        </p>
      </section>

      <section className="section">
        <h2>session境界</h2>
        <ul>
          <li>sign-in後のaccess tokenはAuth client側のsessionから都度取得します。</li>
          <li>Admin API helperのAuthorization headerへだけ渡します。</li>
          <li>selectedTenantIdは利用先selectorとして分離し、tokenとは別に扱います。</li>
          <li>logout時はAuth clientのsessionをclearし、独自token保存は残しません。</li>
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
          既存の開発確認用MVPは引き続き <span className="mono">x-tenant-id</span>{" "}
          経由で動作します。
        </p>
        <ul className="nav-links">
          <li>
            <a href="/customers">顧客一覧へ進む</a>
          </li>
          <li>
            <a href="/alerts">未返信アラートへ進む</a>
          </li>
          <li>
            <a href="/select-tenant">利用先を選ぶ準備画面</a>
          </li>
          <li>
            <a href="/logout">ログアウト境界</a>
          </li>
          <li>
            <a href="/session-expired">ログイン期限切れ準備画面</a>
          </li>
        </ul>
      </section>
    </main>
  );
}

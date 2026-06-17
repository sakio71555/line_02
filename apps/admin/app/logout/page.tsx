import React from "react";

export default function LogoutBoundaryPage() {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">ログアウト境界</p>
          <h1>ログアウト</h1>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          Supabase Auth sessionのlogout境界を追加済みです。実Auth client注入と本番接続は
          後続Loopで行います。
        </p>
        <p className="meta">
          logout後はAuth client側のsessionをclearします。access tokenは画面表示せず、
          localStorageやcookieへ独自保存しません。
        </p>
      </div>

      <section className="section">
        <h2>logoutの扱い</h2>
        <ul>
          <li>fake Auth clientではsignOut後にtoken providerがnullを返すことを確認します。</li>
          <li>selectedTenantIdは利用先selectorなので、tokenとは別に扱います。</li>
          <li>本物のSupabase Auth signOutはまだ呼びません。</li>
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
    </main>
  );
}

import React from "react";

export default function LoginPlaceholderPage() {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">ログイン準備中</p>
          <h1>管理画面ログイン</h1>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          将来の管理画面ログイン導線です。現在はSupabase Auth未接続のため、
          ログイン送信処理はありません。
        </p>
        <p className="meta">
          入力内容は送信・保存されません。session、cookie、localStorage、
          sessionStorageも使用しません。
        </p>
      </div>

      <section className="section">
        <h2>ログインフォーム準備中</h2>
        <form className="login-form" aria-label="管理画面ログイン準備中フォーム">
          <fieldset disabled>
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

            <button type="submit" disabled>
              Supabase Auth未接続
            </button>
          </fieldset>
        </form>
        <p className="meta">
          本物の認証処理、email/password sign-in、magic link、OAuth、JWT/session検証は
          まだ実装していません。
        </p>
      </section>

      <section className="section">
        <h2>未接続の内容</h2>
        <ul>
          <li>Supabase Auth APIは呼びません。</li>
          <li>auth.users.id と staff_users.auth_user_id の照合はまだ行いません。</li>
          <li>Admin APIのログイン済みスタッフ確認にはまだ接続していません。</li>
          <li>開発確認用では既存のtenant_amamihome導線でMVP確認を継続します。</li>
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
            <a href="/session-expired">ログイン期限切れ準備画面</a>
          </li>
        </ul>
      </section>
    </main>
  );
}

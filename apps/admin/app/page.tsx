import React from "react";

export const dynamic = "force-dynamic";

const operationSteps = [
  "お客様一覧を開く",
  "LINEのやり取りを見る",
  "相談内容を確認する",
  "担当者として返信する",
  "まだ返せていない相談を見る"
] as const;

const operationStatusLabels = [
  "実際のお客様対応用",
  "LINE履歴を保存",
  "1通ずつ確認して送信",
  "担当者が確認して返信"
] as const;

export default function AdminHomePage() {
  return (
    <main>
      <section className="home-hero" aria-labelledby="admin-home-title">
        <p className="eyebrow">管理画面</p>
        <h1 id="admin-home-title">お客様からのLINE相談を確認する画面</h1>
        <p className="lead-text">
          お客様から届いた内容を見て、必要な対応を進める入口です。
          まずはお客様一覧から相談中のお客様を開いてください。
        </p>
        <div className="home-actions" aria-label="最初に押す導線">
          <a className="button-link button-link-primary" href="/customers">
            お客様一覧を見る
          </a>
          <a className="button-link" href="/alerts">
            未対応を見る
          </a>
        </div>
        <div className="status-pill-list" aria-label="現在の接続状態">
          {operationStatusLabels.map((label) => (
            <span className="status-pill" key={label}>
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="home-note-grid" aria-label="本番運用の注意点">
        <article className="home-note">
          <h2>お客様ごとに確認できます</h2>
          <p>
            お客様情報、LINEのやり取り、対応状況を1つの画面で確認できます。
          </p>
        </article>
        <article className="home-note">
          <h2>返信前に確認できます</h2>
          <p>
            LINEへ送る前に内容を確認してから、担当者として返信できます。
          </p>
        </article>
        <article className="home-note">
          <h2>履歴が残ります</h2>
          <p>
            お客様とのやり取りは履歴として残るので、あとから見返せます。
          </p>
        </article>
      </section>

      <section className="section">
        <h2>運用の流れ</h2>
        <ol className="home-step-list">
          {operationSteps.map((step, index) => (
            <li key={step}>
              <span className="step-number">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <h2>よく使う入口</h2>
        <div className="home-link-grid">
          <a className="home-link-card home-link-card-primary" href="/customers">
            <span>お客様一覧を見る</span>
            <small>相談内容とLINE履歴を確認します。</small>
          </a>
          <a className="home-link-card" href="/alerts">
            <span>未対応を見る</span>
            <small>まだ返せていない相談を確認します。</small>
          </a>
        </div>
      </section>

      <section className="section">
        <h2>困ったとき</h2>
        <div className="notice">
          <p>
            画面に入れない、会社を選び直したい、ログインし直したい場合はこちらから操作します。
          </p>
      </div>
        <ul className="nav-links">
          <li>
            <a href="/login">ログイン</a>
          </li>
          <li>
            <a href="/select-tenant">会社を選び直す</a>
          </li>
          <li>
            <a href="/permission-denied">操作できない場合</a>
          </li>
          <li>
            <a href="/session-expired">ログインし直す</a>
          </li>
        </ul>
      </section>
    </main>
  );
}

import React from "react";

import { getAdminApiConfig } from "../src/admin-api";
import { RoleVisibilityNote } from "./role-visibility-note";

export const dynamic = "force-dynamic";

const demoSteps = [
  "顧客一覧を見る",
  "顧客詳細で相談内容を確認する",
  "AI要約・返信文の下書き・ホームページ情報からの回答案を見る",
  "担当者として返信する",
  "未返信アラートを確認する"
] as const;

const demoStatusLabels = ["デモ用", "一時保存", "本番LINE未送信", "本番AI未接続"] as const;

export default function AdminHomePage() {
  const config = getAdminApiConfig();

  return (
    <main>
      <section className="home-hero" aria-labelledby="admin-home-title">
        <p className="eyebrow">ローカルデモ管理画面</p>
        <h1 id="admin-home-title">LINE相談の対応状況を確認するデモ管理画面</h1>
        <p className="lead-text">
          お客様からの相談を見て、返信やAI下書きを確認する入口です。まずは顧客一覧から
          デモ顧客を開いて、相談内容と対応の流れを確認します。
        </p>
        <div className="home-actions" aria-label="最初に押す導線">
          <a className="button-link button-link-primary" href="/customers">
            顧客一覧を見る
          </a>
          <a className="button-link" href="/alerts">
            未返信アラートを見る
          </a>
        </div>
        <div className="status-pill-list" aria-label="現在の接続状態">
          {demoStatusLabels.map((label) => (
            <span className="status-pill" key={label}>
              {label}
            </span>
          ))}
        </div>
        <p className="meta">
          利用先ID: <span className="mono">{config.tenantId}</span> / API:{" "}
          <span className="mono">{config.apiBaseUrl}</span>
        </p>
      </section>

      <section className="home-note-grid" aria-label="ローカルデモの注意点">
        <article className="home-note">
          <h2>今はデモ用です</h2>
          <p>
            本物のLINEには送信されません。担当者返信と通知はデモ用の境界で確認します。
          </p>
        </article>
        <article className="home-note">
          <h2>AIとホームページ回答案もデモ用</h2>
          <p>
            AI要約、返信文の下書き、ホームページ情報からの回答案はデモ用で確認できます。
          </p>
        </article>
        <article className="home-note">
          <h2>データは一時保存です</h2>
          <p>
            APIを再起動するとデモデータは消えます。空の場合はdemo seedを入れ直してください。
          </p>
        </article>
      </section>

      <RoleVisibilityNote />

      <section className="section">
        <h2>デモの流れ</h2>
        <ol className="home-step-list">
          {demoSteps.map((step, index) => (
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
            <span>顧客一覧を見る</span>
            <small>相談内容、タイムライン、AI下書きを確認します。</small>
          </a>
          <a className="home-link-card" href="/alerts">
            <span>未返信アラートを見る</span>
            <small>未返信チェックと担当者通知のデモを確認します。</small>
          </a>
        </div>
      </section>

      <section className="section">
        <h2>準備中の画面</h2>
        <div className="notice">
          <p>
            ログイン・利用先選択・権限表示は、今後の本番化に向けた準備画面です。
            現在のローカルデモでは開発用の確認モードで動きます。
          </p>
        <p className="meta">
            Supabase Auth、JWT/session、Admin APIのログイン済みスタッフ確認はまだ本番未接続です。
        </p>
      </div>
        <ul className="nav-links">
          <li>
            <a href="/login">ログイン準備中</a>
          </li>
          <li>
            <a href="/select-tenant">利用先を選ぶ画面</a>
          </li>
          <li>
            <a href="/permission-denied">権限がありません</a>
          </li>
          <li>
            <a href="/session-expired">ログインの有効期限切れ</a>
          </li>
        </ul>
      </section>
    </main>
  );
}

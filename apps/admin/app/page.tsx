import React from "react";

import { getAdminApiConfig } from "../src/admin-api";
import { RoleVisibilityNote } from "./role-visibility-note";

export const dynamic = "force-dynamic";

const operationSteps = [
  "顧客一覧を見る",
  "顧客詳細で相談内容を確認する",
  "AI要約・返信文の下書き・ホームページ情報からの回答案を見る",
  "担当者として返信する",
  "未返信アラートを確認する"
] as const;

const operationStatusLabels = [
  "本番運用",
  "タイムライン保存",
  "LINE送信は明示承認制",
  "AI補助は担当者確認前提"
] as const;

export default function AdminHomePage() {
  const config = getAdminApiConfig();

  return (
    <main>
      <section className="home-hero" aria-labelledby="admin-home-title">
        <p className="eyebrow">本番管理画面</p>
        <h1 id="admin-home-title">LINE相談の対応状況を管理する画面</h1>
        <p className="lead-text">
          お客様からの相談を確認し、AI補助と担当者返信を使って対応する入口です。
          まずは顧客一覧から相談中のお客様を開いて、対応状況を確認します。
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
          {operationStatusLabels.map((label) => (
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

      <section className="home-note-grid" aria-label="本番運用の注意点">
        <article className="home-note">
          <h2>本番運用の入口です</h2>
          <p>
            顧客一覧、会話履歴、未返信アラートから、日々の対応状況を確認します。
          </p>
        </article>
        <article className="home-note">
          <h2>AI補助は担当者確認前提です</h2>
          <p>
            AI要約、返信文の下書き、ホームページ情報からの回答案は、担当者が確認してから使います。
          </p>
        </article>
        <article className="home-note">
          <h2>対応履歴を残します</h2>
          <p>
            担当者返信やAI要約は、顧客ごとのタイムラインに保存して後から確認できます。
          </p>
        </article>
      </section>

      <RoleVisibilityNote />

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
            <span>顧客一覧を見る</span>
            <small>相談内容、タイムライン、AI下書きを確認します。</small>
          </a>
          <a className="home-link-card" href="/alerts">
            <span>未返信アラートを見る</span>
            <small>未返信チェックと担当者への通知記録を確認します。</small>
          </a>
        </div>
      </section>

      <section className="section">
        <h2>運用管理の画面</h2>
        <div className="notice">
          <p>
            ログイン・利用先選択・権限表示は、管理画面を安全に使うための導線です。
            現在の運用runtimeで利用できる範囲を表示します。
          </p>
        <p className="meta">
            権限が必要な操作は、Admin API側の確認と画面上の安全ゲートを組み合わせて扱います。
        </p>
      </div>
        <ul className="nav-links">
          <li>
            <a href="/login">ログイン</a>
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

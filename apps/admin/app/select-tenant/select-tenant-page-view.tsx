import React from "react";

import { Building2, ShieldCheck, UsersRound } from "lucide-react";

import { PageTitle } from "../_components/ui";
import { SelectedTenantForm } from "./selected-tenant-form";

export function SelectTenantPageView({
  selectedTenantForm = <SelectedTenantForm />
}: {
  selectedTenantForm?: React.ReactNode;
}) {
  return (
    <main>
      <PageTitle
        eyebrow="利用する会社"
        title="会社を選ぶ"
        description="担当者が見るお客様と対応情報を、会社ごとに切り替えます。"
        actions={<a className="secondary-action" href="/settings">初期設定へ戻る</a>}
      />

      <section className="settings-intro" aria-label="会社選択の安全性">
        <div>
          <Building2 aria-hidden="true" size={20} />
          <span><strong>登録済み会社</strong><small>運用対象だけを選択</small></span>
        </div>
        <div>
          <UsersRound aria-hidden="true" size={20} />
          <span><strong>担当者ごと</strong><small>所属権限を確認</small></span>
        </div>
        <div>
          <ShieldCheck aria-hidden="true" size={20} />
          <span><strong>安全</strong><small>秘密情報は保存しません</small></span>
        </div>
      </section>

      <section className="workspace-section">
        <header className="section-header">
          <div><p className="eyebrow">操作対象</p><h2>登録済みの会社</h2></div>
        </header>
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

      <section className="workspace-section compact-guidance">
        <h2>選択後にできること</h2>
        <p>ホーム、受信トレイ、顧客一覧、返信操作が同じ会社へ切り替わります。所属していない会社はAPI側でも表示・操作できません。</p>
        <a className="secondary-action" href="/">ホームへ戻る</a>
      </section>
    </main>
  );
}

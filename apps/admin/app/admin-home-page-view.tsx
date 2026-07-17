import { ArrowRight, Clock3, MessageSquareText, UserRoundCheck } from "lucide-react";
import React from "react";

import { EmptyState, Metric, PageTitle, SectionHeader, StatusBadge } from "./_components/ui";
import type { AdminAlertListItem, AdminCustomerListItem } from "../src/admin-api";
import {
  formatCompactDateTime,
  getAlertPriorityLabel,
  getAlertTone,
  getCustomerDisplayName,
  getCustomerResponseLabel,
  getCustomerResponseTone
} from "../src/admin-display";

export interface DashboardData {
  alerts: AdminAlertListItem[];
  customers: AdminCustomerListItem[];
  error?: string;
}

export function AdminHomePageView({ data }: { data: DashboardData }) {
  const openAlerts = data.alerts.filter((alert) => alert.status === "open");
  const activeCustomers = data.customers.filter((customer) => customer.status !== "archived");
  const humanRequired = data.customers.filter((customer) =>
    ["human_required", "emergency"].includes(customer.response_mode)
  );
  const inProgress = data.customers.filter((customer) => customer.response_mode === "human_active");

  return (
    <main>
      <PageTitle
        eyebrow="今日の状況"
        title="ホーム"
        description="対応が必要な相談を上から順に確認できます。"
        actions={
          <a className="button-link button-link-primary" href="/inbox">
            受信トレイを開く
            <ArrowRight aria-hidden="true" size={17} />
          </a>
        }
      />

      {data.error ? <div className="inline-error">一部の情報を読み込めませんでした。</div> : null}

      <section className="metric-grid" aria-label="対応状況">
        <Metric label="未対応" tone={openAlerts.length > 0 ? "attention" : "success"} value={openAlerts.length} />
        <Metric label="要確認のお客様" tone={humanRequired.length > 0 ? "danger" : "default"} value={humanRequired.length} />
        <Metric label="対応中" value={inProgress.length} />
        <Metric label="運用中のお客様" value={activeCustomers.length} />
      </section>

      <div className="dashboard-grid">
        <section className="workspace-section">
          <SectionHeader title="優先して対応" description="未対応の相談を優先度順に表示しています。" action={<a href="/inbox">すべて見る</a>} />
          {openAlerts.length === 0 ? (
            <EmptyState title="未対応の相談はありません"><p>新しい相談が入ると、ここに表示されます。</p></EmptyState>
          ) : (
            <ul className="work-list">
              {openAlerts.slice(0, 6).map((alert) => (
                <li key={alert.id}>
                  <a href={`/customers/${encodeURIComponent(alert.customer_id)}`}>
                    <span className="work-list-icon work-list-icon-alert"><MessageSquareText aria-hidden="true" size={18} /></span>
                    <span className="work-list-content"><strong>{alert.message}</strong><small>{formatCompactDateTime(alert.created_at)}</small></span>
                    <StatusBadge tone={getAlertTone(alert.severity)}>{getAlertPriorityLabel(alert.severity)}</StatusBadge>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="workspace-section">
          <SectionHeader title="最近のお客様" description="新しいLINE更新があった順です。" action={<a href="/customers">顧客一覧</a>} />
          {data.customers.length === 0 ? (
            <EmptyState title="お客様はまだいません" />
          ) : (
            <ul className="work-list">
              {data.customers.slice(0, 6).map((customer) => (
                <li key={customer.id}>
                  <a href={`/customers/${encodeURIComponent(customer.id)}`}>
                    <span className="work-list-icon"><UserRoundCheck aria-hidden="true" size={18} /></span>
                    <span className="work-list-content">
                      <strong>{getCustomerDisplayName(customer)}</strong>
                      <small className="truncate-text">{customer.last_message_body || "メッセージはまだありません"}</small>
                    </span>
                    <StatusBadge tone={getCustomerResponseTone(customer.response_mode)}>{getCustomerResponseLabel(customer.response_mode)}</StatusBadge>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="quick-actions" aria-label="よく使う操作">
        <a href="/tasks"><Clock3 aria-hidden="true" size={20} /><span><strong>タスクを確認</strong><small>期限と優先度で整理</small></span><ArrowRight aria-hidden="true" size={17} /></a>
        <a href="/deals"><UserRoundCheck aria-hidden="true" size={20} /><span><strong>案件の進み具合</strong><small>対応中のお客様を確認</small></span><ArrowRight aria-hidden="true" size={17} /></a>
      </section>
    </main>
  );
}

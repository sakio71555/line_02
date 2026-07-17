import { ArrowRight, BellRing, RotateCw } from "lucide-react";
import React from "react";

import { EmptyState, PageTitle, StatusBadge } from "../_components/ui";
import { AlertActionPanel } from "./alert-actions";
import type { AdminAlertListItem, AdminCustomerListItem } from "../../src/admin-api";
import {
  formatCompactDateTime,
  getAlertPresentation,
  getAlertPriorityLabel,
  getAlertTone,
  isLikelyTestAlert
} from "../../src/admin-display";

export type AlertsPageLoadResult =
  | { status: "ok"; alerts: AdminAlertListItem[] }
  | { status: "error"; message: string };

export function AlertsPageView({
  actionPanel,
  alerts,
  customers = []
}: {
  actionPanel?: React.ReactNode;
  alerts: AlertsPageLoadResult;
  customers?: AdminCustomerListItem[];
}) {
  const allAlertItems = alerts.status === "ok" ? alerts.alerts : [];
  const alertItems = allAlertItems.filter((alert) => !isLikelyTestAlert(alert));
  const testAlertItems = allAlertItems.filter(isLikelyTestAlert);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const openCount = alertItems.filter((alert) => alert.status === "open").length;

  return (
    <main>
      <PageTitle
        eyebrow="対応キュー"
        title="受信トレイ"
        description={`${openCount}件の相談が対応を待っています。`}
      />

      <details className="utility-details">
        <summary>
          <RotateCw aria-hidden="true" size={18} />
          受信状況を更新
        </summary>
        <div className="utility-details-body">
          {actionPanel ?? <AlertActionPanel />}
        </div>
      </details>

      {alerts.status === "error" ? (
        <div className="inline-error">
          <strong>受信トレイを読み込めませんでした。</strong>
          <span>時間を置いて再度お試しください。</span>
        </div>
      ) : alertItems.length === 0 ? (
        <EmptyState title="まだ対応が必要な相談はありません">
          <p>新しい相談が入ると、自動でここに表示されます。</p>
        </EmptyState>
      ) : (
        <AlertCardList alerts={alertItems} customerMap={customerMap} />
      )}

      {testAlertItems.length > 0 ? (
        <details className="completed-details task-test-details">
          <summary>確認用データ ({testAlertItems.length})</summary>
          <div className="task-test-note">
            動作確認で作られた通知です。実際の対応件数には含めていません。
          </div>
          <AlertCardList alerts={testAlertItems} customerMap={customerMap} />
        </details>
      ) : null}
    </main>
  );
}

function AlertCardList({
  alerts,
  customerMap
}: {
  alerts: AdminAlertListItem[];
  customerMap: Map<string, AdminCustomerListItem>;
}) {
  return (
    <ul className="alert-card-list inbox-list" aria-label="未対応カード">
      {alerts.map((alert) => {
        const presentation = getAlertPresentation(alert, customerMap.get(alert.customer_id));
        return (
          <li className="alert-card" key={alert.id}>
            <a href={`/customers/${encodeURIComponent(alert.customer_id)}`}>
              <span className="inbox-icon" aria-hidden="true">
                <BellRing size={19} />
              </span>
              <span className="inbox-main">
                <span className="inbox-kind">{formatAlertType(alert.type)}</span>
                <span className="inbox-title-row">
                  <strong>{presentation.title}</strong>
                  <StatusBadge tone={getAlertTone(alert.severity)}>
                    {getAlertPriorityLabel(alert.severity)}
                  </StatusBadge>
                </span>
                <span className="inbox-message">{presentation.detail}</span>
                <small>受付 {formatCompactDateTime(alert.created_at)}</small>
              </span>
              <span className="inbox-state">
                <strong>{presentation.actionLabel}</strong>
                <small>{formatAlertStatus(alert.status)}</small>
              </span>
              <ArrowRight aria-hidden="true" className="row-arrow" size={18} />
              <span className="sr-only">お客様ページを開く</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function formatAlertStatus(status: AdminAlertListItem["status"]): string {
  const labels: Record<AdminAlertListItem["status"], string> = {
    open: "未対応",
    notified: "確認済み",
    resolved: "対応済み",
    dismissed: "非表示"
  };
  return labels[status];
}

export function formatAlertSeverity(severity: AdminAlertListItem["severity"]): string {
  return getAlertPriorityLabel(severity);
}

export function formatAlertType(type: AdminAlertListItem["type"]): string {
  const labels: Record<AdminAlertListItem["type"], string> = {
    unreplied: "未返信の相談",
    unreplied_customer_message: "未返信の相談",
    stale: "長時間未対応",
    emergency: "至急対応",
    ai_risk: "内容の確認が必要"
  };
  return labels[type];
}

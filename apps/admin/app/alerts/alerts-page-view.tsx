import { ArrowRight, BellRing, RotateCw } from "lucide-react";
import React from "react";

import { EmptyState, PageTitle, StatusBadge } from "../_components/ui";
import { AlertActionPanel } from "./alert-actions";
import type { AdminAlertListItem } from "../../src/admin-api";
import {
  formatCompactDateTime,
  getAlertPriorityLabel,
  getAlertTone
} from "../../src/admin-display";

export type AlertsPageLoadResult =
  | { status: "ok"; alerts: AdminAlertListItem[] }
  | { status: "error"; message: string };

export function AlertsPageView({
  actionPanel,
  alerts
}: {
  actionPanel?: React.ReactNode;
  alerts: AlertsPageLoadResult;
}) {
  const alertItems = alerts.status === "ok" ? alerts.alerts : [];
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
        <ul className="alert-card-list inbox-list" aria-label="未対応カード">
          {alertItems.map((alert) => (
            <li className="alert-card" key={alert.id}>
              <a href={`/customers/${encodeURIComponent(alert.customer_id)}`}>
                <span className="inbox-icon" aria-hidden="true">
                  <BellRing size={19} />
                </span>
                <span className="inbox-main">
                  <span className="inbox-title-row">
                    <strong>{formatAlertType(alert.type)}</strong>
                    <StatusBadge tone={getAlertTone(alert.severity)}>
                      {getAlertPriorityLabel(alert.severity)}
                    </StatusBadge>
                  </span>
                  <span className="inbox-message">{alert.message}</span>
                  <small>{formatCompactDateTime(alert.created_at)}</small>
                </span>
                <span className="inbox-state">{formatAlertStatus(alert.status)}</span>
                <ArrowRight aria-hidden="true" className="row-arrow" size={18} />
                <span className="sr-only">お客様ページを開く</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
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

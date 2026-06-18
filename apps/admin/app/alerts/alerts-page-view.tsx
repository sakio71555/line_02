import React from "react";

import { AlertActionPanel } from "./alert-actions";
import type { AdminApiConfig, AdminAlertListItem } from "../../src/admin-api";

export type AlertsPageLoadResult =
  | { status: "ok"; alerts: AdminAlertListItem[] }
  | { status: "error"; message: string };

export function AlertsPageView({
  actionPanel,
  alerts,
  config
}: {
  actionPanel?: React.ReactNode;
  alerts: AlertsPageLoadResult;
  config: AdminApiConfig;
}) {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">ローカルデモ未返信アラート</p>
          <h1>対応が必要な相談を確認する</h1>
          <p className="meta">
            利用先: <span className="mono">{config.tenantId}</span>
          </p>
          <p className="meta">
            選択中の利用先:{" "}
            <span className="mono">{config.selectedTenantId ?? "未選択"}</span>
          </p>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <section className="home-hero">
        <p className="eyebrow">未返信アラート</p>
        <h2>未返信のままになっている相談を見つけます</h2>
        <p className="lead-text">
          お客様からの相談にまだ担当者返信がないものを、ローカルデモ用に確認できます。
          まずは「未返信チェックを実行する」を押してください。
        </p>
        <div className="status-pill-list" aria-label="alerts page safety labels">
          <span className="status-pill">デモ用</span>
          <span className="status-pill">手動チェック</span>
          <span className="status-pill">本物通知なし</span>
          <span className="status-pill">scheduler未接続</span>
          <span className="status-pill">デモ用通知</span>
        </div>
        <p className="meta">
          本物のLINE、Slack、メールには通知されません。Supabase永続化もまだ未接続です。
        </p>
        <p className="meta">
          選択中の利用先は、保存済みの利用先情報としてAPI側で確認されます。
        </p>
      </section>

      {actionPanel ?? <AlertActionPanel />}

      <section className="section">
        <h2>状態の見方</h2>
        <div className="home-note-grid">
          <div className="home-note">
            <h2>対応待ち</h2>
            <p>
              まだ担当者対応が必要な未返信アラートです。デモ通知の対象になります。
            </p>
          </div>
          <div className="home-note">
            <h2>デモ通知済み</h2>
            <p>
              デモ用の通知処理を通した状態です。本物の通知は送っていません。
            </p>
          </div>
          <div className="home-note">
            <h2>対応済み / 非表示</h2>
            <p>
              後続Loopで本格運用を設計する状態です。今回は新しい状態は増やしません。
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>未返信アラート一覧</h2>
        {alerts.status === "error" ? (
          <div className="error">
            <strong>APIエラー</strong>
            <pre>{alerts.message}</pre>
          </div>
        ) : alerts.alerts.length === 0 ? (
          <p className="empty">
            まだ対応が必要な相談は表示されていません。デモ顧客を入れたあと、
            「未返信チェックを実行する」を押してください。
          </p>
        ) : (
          <ul className="alert-card-list" aria-label="アラートカード">
            {alerts.alerts.map((alert) => (
              <li className="alert-card" key={alert.id}>
                <div className="alert-card-header">
                  <div>
                    <p className="eyebrow">{formatAlertType(alert.type)}</p>
                    <h3 className="alert-card-title">{formatAlertStatus(alert.status)}</h3>
                    <small className="mono">{alert.id}</small>
                  </div>
                  <span className={getAlertSeverityBadgeClass(alert.severity)}>
                    {formatAlertSeverity(alert.severity)}
                  </span>
                </div>
                <p className="alert-card-message">{alert.message}</p>
                <div className="alert-card-meta">
                  <span className={getAlertStatusBadgeClass(alert.status)}>
                    {formatAlertStatus(alert.status)}
                  </span>
                  <span className="status-pill status-pill-muted">作成 {alert.created_at}</span>
                  <span className="status-pill status-pill-muted">
                    デモ通知 {formatNullable(alert.notified_at)}
                  </span>
                </div>
                <a
                  className="card-action-link"
                  href={`/customers/${encodeURIComponent(alert.customer_id)}`}
                >
                  お客様詳細を見る
                </a>
                <p className="meta mono">customer_id: {alert.customer_id}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function formatNullable(value: string | null): string {
  return value ?? "-";
}

export function formatAlertStatus(status: AdminAlertListItem["status"]): string {
  const labels: Record<AdminAlertListItem["status"], string> = {
    open: "対応待ち",
    notified: "デモ通知済み",
    resolved: "対応済み",
    dismissed: "非表示"
  };

  return labels[status];
}

export function formatAlertSeverity(severity: AdminAlertListItem["severity"]): string {
  const labels: Record<AdminAlertListItem["severity"], string> = {
    low: "低",
    medium: "中",
    high: "高",
    critical: "至急"
  };

  return labels[severity];
}

export function formatAlertType(type: AdminAlertListItem["type"]): string {
  const labels: Record<AdminAlertListItem["type"], string> = {
    unreplied: "未返信",
    unreplied_customer_message: "未返信の相談",
    stale: "長時間未対応",
    emergency: "至急対応",
    ai_risk: "AI確認注意"
  };

  return labels[type];
}

function getAlertStatusBadgeClass(status: AdminAlertListItem["status"]): string {
  if (status === "open") {
    return "status-pill status-pill-warning";
  }

  if (status === "notified") {
    return "status-pill";
  }

  return "status-pill status-pill-muted";
}

function getAlertSeverityBadgeClass(severity: AdminAlertListItem["severity"]): string {
  if (severity === "critical") {
    return "status-pill status-pill-danger";
  }

  if (severity === "high" || severity === "medium") {
    return "status-pill status-pill-warning";
  }

  return "status-pill status-pill-muted";
}

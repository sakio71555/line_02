import React from "react";

import { AlertActionPanel } from "./alert-actions";
import type { AdminAlertListItem } from "../../src/admin-api";

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
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">未対応</p>
          <h1>返せていない相談を確認する</h1>
          <p className="meta">対応が必要なお客様を見つける画面です。</p>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <section className="home-hero">
        <p className="eyebrow">確認</p>
        <h2>まだ返せていない相談を見つけます</h2>
        <p className="lead-text">
          お客様からの相談にまだ担当者返信がないものを確認します。
          まずは「未対応を確認する」を押してください。
        </p>
        <div className="status-pill-list" aria-label="alerts page safety labels">
          <span className="status-pill">手動確認</span>
          <span className="status-pill">対応待ちを整理</span>
          <span className="status-pill">お客様ページへ移動</span>
        </div>
        <p className="meta">
          見つかった相談は、お客様ページを開いて内容を確認できます。
        </p>
      </section>

      {actionPanel ?? <AlertActionPanel />}

      <section className="section">
        <h2>状態の見方</h2>
        <div className="home-note-grid">
          <div className="home-note">
            <h2>対応待ち</h2>
            <p>
              まだ担当者の確認や返信が必要な相談です。
            </p>
          </div>
          <div className="home-note">
            <h2>確認済み</h2>
            <p>
              担当者が確認した記録が残っている状態です。
            </p>
          </div>
          <div className="home-note">
            <h2>対応済み</h2>
            <p>
              返信や確認が終わった相談です。
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>未対応一覧</h2>
        {alerts.status === "error" ? (
          <div className="error">
            <strong>読み込みエラー</strong>
            <pre>{alerts.message}</pre>
          </div>
        ) : alerts.alerts.length === 0 ? (
          <p className="empty">
            まだ対応が必要な相談は表示されていません。問い合わせが入ったあと、
            「未対応を確認する」を押してください。
          </p>
        ) : (
          <ul className="alert-card-list" aria-label="未対応カード">
            {alerts.alerts.map((alert) => (
              <li className="alert-card" key={alert.id}>
                <div className="alert-card-header">
                  <div>
                    <p className="eyebrow">{formatAlertType(alert.type)}</p>
                    <h3 className="alert-card-title">{formatAlertStatus(alert.status)}</h3>
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
                    通知記録 {formatNullable(alert.notified_at)}
                  </span>
                </div>
                <a
                  className="card-action-link"
                  href={`/customers/${encodeURIComponent(alert.customer_id)}`}
                >
                  お客様ページを開く
                </a>
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
    notified: "通知記録済み",
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
    ai_risk: "確認注意"
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

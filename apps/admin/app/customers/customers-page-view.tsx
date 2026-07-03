import React from "react";

import type { AdminApiConfig, AdminCustomerListItem } from "../../src/admin-api";

export type CustomersPageLoadResult =
  | { status: "ok"; customers: AdminCustomerListItem[] }
  | { status: "error"; message: string };

export function CustomersPageView({
  config,
  result
}: {
  config: AdminApiConfig;
  result: CustomersPageLoadResult;
}) {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">顧客一覧</p>
          <h1>相談中のお客様</h1>
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

      <div className="notice">
        <p>
          スマートフォンでも確認しやすいよう、対応状況と最新メッセージをカードで表示します。
        </p>
        <p className="meta">
          現在のAPI runtimeに保存されている顧客情報を表示します。空の場合はLINE webhook受信や
          運用データの投入状況を確認してください。
        </p>
        <p className="meta">
          LINE送信は、実送信ゲートが開いていて担当者が明示確認した場合だけ実行されます。
        </p>
        <p className="meta">選択中の利用先は、保存済みの利用先情報としてAPIに渡されます。</p>
      </div>

      {result.status === "error" ? (
        <div className="error">
          <strong>APIエラー</strong>
          <pre>{result.message}</pre>
        </div>
      ) : result.customers.length === 0 ? (
        <div className="empty">
          <strong>まだ顧客データがありません</strong>
          <p>
            LINEからの問い合わせや運用データが入ると、ここにお客様が表示されます。
          </p>
        </div>
      ) : (
        <ul className="customer-card-list" aria-label="顧客一覧カード">
          {result.customers.map((customer) => (
            <li className="customer-card" key={customer.id}>
              <div className="customer-card-header">
                <div>
                  <p className="eyebrow">{formatCustomerStatus(customer.status)}</p>
                  <h2 className="customer-card-title">{getCustomerName(customer)}</h2>
                  <small className="mono">{customer.id}</small>
                </div>
                <span className={getResponseModeBadgeClass(customer.response_mode)}>
                  {formatResponseMode(customer.response_mode)}
                </span>
              </div>
              <p className="customer-card-message">
                {formatValue(customer.last_message_body) === "-"
                  ? "最新メッセージはまだありません。"
                  : formatValue(customer.last_message_body)}
              </p>
              <div className="customer-card-meta">
                <span className="status-pill status-pill-muted">
                  最終更新 {formatValue(customer.last_message_at)}
                </span>
                <span className="status-pill status-pill-muted">
                  お客様発言 {formatValue(customer.last_customer_message_at)}
                </span>
              </div>
              <div className="detail-chip-list">
                {customer.last_staff_reply_at ? (
                  <span className="status-pill">担当者返信あり</span>
                ) : (
                  <span className="status-pill status-pill-warning">担当者返信待ち</span>
                )}
                {customer.display_name ? (
                  <span className="status-pill status-pill-muted">
                    LINE表示名 {customer.display_name}
                  </span>
                ) : null}
              </div>
              <a className="card-action-link" href={`/customers/${encodeURIComponent(customer.id)}`}>
                詳細を見る
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function getCustomerName(customer: AdminCustomerListItem): string {
  return customer.display_name || customer.name || customer.id;
}

function formatCustomerStatus(status: string): string {
  const labels: Record<string, string> = {
    active: "対応中",
    closed: "対応完了"
  };

  return labels[status] ?? status;
}

function formatResponseMode(mode: string): string {
  const labels: Record<string, string> = {
    bot_auto: "自動対応中",
    human_required: "担当者の確認が必要",
    human_active: "担当者が対応中",
    emergency: "至急対応",
    closed: "対応完了"
  };

  return labels[mode] ?? mode;
}

function getResponseModeBadgeClass(mode: string): string {
  if (mode === "human_required" || mode === "human_active") {
    return "status-pill status-pill-warning";
  }

  if (mode === "emergency") {
    return "status-pill status-pill-danger";
  }

  if (mode === "closed") {
    return "status-pill status-pill-muted";
  }

  return "status-pill";
}

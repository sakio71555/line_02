import React from "react";

import type { AdminCustomerListItem } from "../../src/admin-api";

export type CustomersPageLoadResult =
  | { status: "ok"; customers: AdminCustomerListItem[] }
  | { status: "error"; message: string };

export function CustomersPageView({ result }: { result: CustomersPageLoadResult }) {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">お客様一覧</p>
          <h1>対応するお客様を選ぶ</h1>
          <p className="meta">新しい相談や登録が入ると、この一覧に表示されます。</p>
        </div>
        <a href="/">トップへ戻る</a>
      </div>

      <div className="notice">
        <p>
          お客様の名前、最新のLINE内容、対応状況をカードで表示します。
          詳しく見る場合は「お客様ページを開く」を押してください。
        </p>
        <p className="meta">
          LINEへ返信する時は、お客様ページで内容を確認してから1通ずつ送ります。
        </p>
      </div>

      {result.status === "error" ? (
        <div className="error">
          <strong>読み込みエラー</strong>
          <pre>{result.message}</pre>
        </div>
      ) : result.customers.length === 0 ? (
        <div className="empty">
          <strong>まだお客様が表示されていません</strong>
          <p>
            LINEから問い合わせや登録が入ると、ここに表示されます。
          </p>
        </div>
      ) : (
        <ul className="customer-card-list" aria-label="お客様一覧カード">
          {result.customers.map((customer) => (
            <li className="customer-card" key={customer.id}>
              <div className="customer-card-header">
                <div>
                  <p className="eyebrow">{formatCustomerStatus(customer.status)}</p>
                  <h2 className="customer-card-title">{getCustomerName(customer)}</h2>
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
                    LINE名 {customer.display_name}
                  </span>
                ) : null}
              </div>
              <a className="card-action-link" href={`/customers/${encodeURIComponent(customer.id)}`}>
                お客様ページを開く
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

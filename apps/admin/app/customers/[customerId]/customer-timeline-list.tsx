"use client";

import type { AdminCustomerTimelineResponse } from "../../../src/admin-api";
import { formatAdminDateTime } from "../../../src/customer-timeline-display";

type AdminTimelineMessage = AdminCustomerTimelineResponse["messages"][number];

export function CustomerTimelineList({
  messages
}: {
  messages: AdminTimelineMessage[];
}) {
  return (
    <ol
      aria-label="LINEトーク履歴"
      className="timeline-list timeline-list-line-log"
    >
      {messages.map((message) => (
        <li className={`timeline-item ${getTimelineItemClass(message)}`} key={message.id}>
          <div className="timeline-meta">
            <span className={getTimelineRoleBadgeClass(message.role)}>
              {formatMessageRole(message.role)}
            </span>
            <span className="status-pill status-pill-muted">
              {formatMessageType(message.message_type)}
            </span>
            <span className="meta">{formatAdminDateTime(message.created_at)}</span>
          </div>
          <p className="timeline-body">{message.body ?? ""}</p>
          {message.source_url ? (
            <div className="timeline-meta">
              <a href={message.source_url}>参考URL</a>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function formatMessageRole(role: string): string {
  const labels: Record<string, string> = {
    customer: "お客様",
    bot: "自動応答",
    staff: "担当者"
  };

  return labels[role] ?? role;
}

function formatMessageType(type: string): string {
  const labels: Record<string, string> = {
    text: "テキスト",
    image: "画像",
    file: "ファイル",
    form: "フォーム",
    reservation: "予約",
    alert: "アラート",
    summary: "要約"
  };

  return labels[type] ?? type;
}

function getTimelineRoleBadgeClass(role: string): string {
  if (role === "customer") {
    return "status-pill status-pill-warning";
  }

  if (role === "bot") {
    return "status-pill status-pill-muted";
  }

  return "status-pill";
}

function getTimelineItemClass(message: AdminTimelineMessage): string {
  if (message.role === "customer") {
    return "timeline-item-customer";
  }

  if (message.role === "bot") {
    return "timeline-item-bot";
  }

  if (message.role === "staff") {
    return "timeline-item-staff";
  }

  return "";
}

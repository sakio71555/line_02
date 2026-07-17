"use client";

import { useEffect, useState } from "react";

import type { AdminCustomerTimelineResponse } from "../../../src/admin-api";
import { formatAdminDateTime } from "../../../src/customer-timeline-display";

type AdminTimelineMessage = AdminCustomerTimelineResponse["messages"][number];

export function CustomerTimelineList({
  customerId,
  messages
}: {
  customerId: string;
  messages: AdminTimelineMessage[];
}) {
  const [filter, setFilter] = useState<"all" | "attachments">("all");
  const attachmentCount = messages.filter((message) => message.attachment_available).length;
  const visibleMessages = filter === "attachments"
    ? messages.filter((message) => message.attachment_available)
    : messages;

  return (
    <>
      <div className="timeline-filter" aria-label="LINEトークの表示切替">
        <button
          aria-pressed={filter === "all"}
          className={filter === "all" ? "is-active" : ""}
          onClick={() => setFilter("all")}
          type="button"
        >
          すべて <span>{messages.length}</span>
        </button>
        <button
          aria-pressed={filter === "attachments"}
          className={filter === "attachments" ? "is-active" : ""}
          disabled={attachmentCount === 0}
          onClick={() => setFilter("attachments")}
          type="button"
        >
          画像・ファイル <span>{attachmentCount}</span>
        </button>
      </div>
      {visibleMessages.length === 0 ? (
        <p className="empty">画像・ファイル付きのメッセージはありません。</p>
      ) : (
        <ol
          aria-label="LINEトーク履歴"
          className="timeline-list timeline-list-line-log"
        >
      {visibleMessages.map((message) => (
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
          {message.attachment_available ? (
            <PrivateTimelineAttachment
              customerId={customerId}
              messageId={message.id}
              messageType={message.message_type}
            />
          ) : null}
          {message.source_url ? (
            <div className="timeline-meta">
              <a href={message.source_url} rel="noreferrer" target="_blank">
                参考URL
              </a>
            </div>
          ) : null}
        </li>
      ))}
        </ol>
      )}
    </>
  );
}

function PrivateTimelineAttachment({
  customerId,
  messageId,
  messageType
}: {
  customerId: string;
  messageId: string;
  messageType: string;
}) {
  const [attachment, setAttachment] = useState<{
    objectUrl: string;
    contentType: string;
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    return () => {
      if (attachment) {
        URL.revokeObjectURL(attachment.objectUrl);
      }
    };
  }, [attachment]);

  async function loadAttachment() {
    setStatus("loading");

    try {
      const response = await fetch(
        `/api/customers/${encodeURIComponent(customerId)}/messages/${encodeURIComponent(messageId)}/attachment`,
        {
          cache: "no-store",
          headers: {
            accept: "*/*"
          }
        }
      );

      if (!response.ok) {
        throw new Error("attachment_fetch_failed");
      }

      const blob = await response.blob();
      setAttachment({
        contentType: response.headers.get("content-type") ?? blob.type,
        objectUrl: URL.createObjectURL(blob)
      });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  if (attachment) {
    return (
      <div className="timeline-attachment">
        <TimelineAttachmentPreview
          contentType={attachment.contentType}
          messageType={messageType}
          objectUrl={attachment.objectUrl}
        />
        <button
          className="button-link timeline-attachment-button"
          onClick={() => setAttachment(null)}
          type="button"
        >
          閉じる
        </button>
      </div>
    );
  }

  return (
    <div className="timeline-attachment">
      <button
        className="button-link timeline-attachment-button"
        disabled={status === "loading"}
        onClick={loadAttachment}
        type="button"
      >
        {status === "loading"
          ? "読み込み中..."
          : messageType === "image"
            ? "画像を表示"
            : "添付ファイルを表示"}
      </button>
      {status === "error" ? (
        <p className="timeline-attachment-error" role="alert">
          添付を表示できませんでした。
        </p>
      ) : null}
    </div>
  );
}

function TimelineAttachmentPreview({
  contentType,
  messageType,
  objectUrl
}: {
  contentType: string;
  messageType: string;
  objectUrl: string;
}) {
  if (contentType.startsWith("image/") || messageType === "image") {
    return (
      <img
        alt="LINEで受信した画像"
        className="timeline-attachment-image"
        src={objectUrl}
      />
    );
  }

  if (contentType.startsWith("video/")) {
    return (
      <video className="timeline-attachment-video" controls preload="metadata">
        <source src={objectUrl} type={contentType} />
      </video>
    );
  }

  if (contentType.startsWith("audio/")) {
    return (
      <audio className="timeline-attachment-audio" controls preload="metadata">
        <source src={objectUrl} type={contentType} />
      </audio>
    );
  }

  return (
    <a className="timeline-attachment-link" download href={objectUrl}>
      添付ファイルを開く
    </a>
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
    alert: "通知",
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

import Link from "next/link";

import {
  getAdminCustomerDetail,
  getAdminCustomerTimeline,
  getAdminLineRealSendCapability,
  type AdminApiRequestOptions,
  type AdminCustomerDetailResponse
} from "../../../src/admin-api";
import {
  formatAdminDateTime,
  toLineConversationTimelineMessages
} from "../../../src/customer-timeline-display";
import { getServerAdminApiRequestOptions } from "../../admin-api-request-options";
import { CustomerActionPanel, CustomerRichMenuSwitch } from "./customer-actions";
import { CustomerTimelineList } from "./customer-timeline-list";

export const dynamic = "force-dynamic";

type AdminCustomerDetail = AdminCustomerDetailResponse["customer"];

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const requestOptions = await getServerAdminApiRequestOptions();
  const detail = await loadCustomerDetail(customerId, requestOptions);
  const timeline = await loadCustomerTimeline(customerId, requestOptions);
  const timelineMessages =
    timeline.status === "ok" ? toLineConversationTimelineMessages(timeline.messages) : [];
  const lineRealSendCapability = await loadLineRealSendCapability(requestOptions);

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">お客様対応</p>
          <h1>お客様ページ</h1>
          <p className="meta">お客様情報、LINE履歴、返信操作を確認します。</p>
        </div>
        <Link href="/customers">一覧へ戻る</Link>
      </div>

      <div className="notice">
        <p>
          この画面では、お客様情報、LINEトーク履歴、担当者返信をまとめて確認します。
        </p>
        <p className="meta">
          LINEトーク履歴には、実機のLINE画面と同じやり取りを新しい順で表示します。
        </p>
        <p className="meta">
          返信するときは、内容を確認してから保存または送信します。
        </p>
      </div>

      {detail.status === "error" ? (
        <section className="section">
          <div className="error">
            <strong>読み込みエラー</strong>
            <pre>{detail.message}</pre>
          </div>
        </section>
      ) : (
        <>
          <section className="customer-hero" aria-labelledby="customer-detail-title">
            <div className="customer-hero-title">
              <div>
                <p className="eyebrow">お客様詳細</p>
                <h1 id="customer-detail-title">{getCustomerRecipientLabel(detail.customer)}</h1>
              </div>
              <span className={getResponseModeBadgeClass(detail.customer.response_mode)}>
                {formatResponseMode(detail.customer.response_mode)}
              </span>
            </div>
            <div className="detail-chip-list" aria-label="お客様の状態">
              <span className="status-pill">{formatCustomerStatus(detail.customer.status)}</span>
              <span className="status-pill status-pill-muted">
                最終お客様発言 {formatAdminDateTime(detail.customer.last_customer_message_at)}
              </span>
              <span className="status-pill status-pill-muted">
                最終担当者返信 {formatAdminDateTime(detail.customer.last_staff_reply_at)}
              </span>
            </div>
            <div className="detail-chip-list" aria-label="タグ">
              {detail.customer.tags.length > 0 ? (
                detail.customer.tags.map((tag) => (
                  <span className="status-pill status-pill-muted" key={tag}>
                    {tag}
                  </span>
                ))
              ) : (
                <span className="status-pill status-pill-muted">タグなし</span>
              )}
            </div>
            <CustomerRichMenuSwitch
              customerAvailable={Boolean(detail.customer.line_user_id)}
              customerId={customerId}
            />
          </section>

          <section className="section">
            <h2>お客様情報</h2>
            <div className="customer-key-grid">
              {customerDetailEntries(detail.customer).map(([label, value]) => (
                <dl className="admin-card customer-key-card" key={label}>
                  <dt>{label}</dt>
                  <dd>{formatCustomerDetailValue(label, value)}</dd>
                </dl>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="section">
        <h2>LINEトーク履歴</h2>
        <p className="meta">
          実機のLINE画面に表示されるお客様発言・自動応答・担当者返信だけを、新しいものが上になる順で表示します。
          分類ツリーや受付済みなどのCRM内部記録はこの枠には表示しません。
        </p>
        {timeline.status === "error" ? (
          <div className="error">
            <strong>読み込みエラー</strong>
            <pre>{timeline.message}</pre>
          </div>
        ) : timelineMessages.length === 0 ? (
          <p className="empty">表示できるメッセージはまだありません。</p>
        ) : (
          <CustomerTimelineList customerId={customerId} messages={timelineMessages} />
        )}
      </section>

      {detail.status === "error" ? null : (
        <CustomerActionPanel
          customerId={customerId}
          lineRealSendCustomerAvailable={Boolean(detail.customer.line_user_id)}
          lineRealSendWindowOpen={lineRealSendCapability.lineRealSendWindowOpen}
          recipientLabel={getCustomerRecipientLabel(detail.customer)}
        />
      )}
    </main>
  );
}

async function loadLineRealSendCapability(options: AdminApiRequestOptions) {
  try {
    const capability = await getAdminLineRealSendCapability(options);

    return {
      status: "ok" as const,
      lineRealSendWindowOpen: capability.line_real_send_window_open === true
    };
  } catch {
    return {
      status: "error" as const,
      lineRealSendWindowOpen: false
    };
  }
}

async function loadCustomerDetail(customerId: string, options: AdminApiRequestOptions) {
  try {
    const response = await getAdminCustomerDetail(customerId, options);
    return {
      status: "ok" as const,
      customer: response.customer
    };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

async function loadCustomerTimeline(customerId: string, options: AdminApiRequestOptions) {
  try {
    const response = await getAdminCustomerTimeline(customerId, options);
    return {
      status: "ok" as const,
      messages: response.messages
    };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function customerDetailEntries(customer: AdminCustomerDetail) {
  return [
    ["情報登録", customer.information_registered ? "登録済み" : "未登録"],
    ["LINE表示名", customer.line_display_name],
    ["お名前", customer.name],
    ["電話番号", customer.phone],
    ["メール", customer.email],
    ["郵便番号", customer.postal_code],
    ["住所エリア", customer.address_area],
    ["計画エリア", customer.planned_area],
    ["土地の有無", customer.has_land],
    ["希望時期", customer.desired_timing],
    ["対応状況", formatCustomerStatus(customer.status)],
    ["対応の必要度", formatResponseMode(customer.response_mode)],
    ["相談の温度感", customer.temperature_score],
    ["タグ", customer.tags],
    ["最後のお客様メッセージ", customer.last_customer_message_at],
    ["最後の担当者返信", customer.last_staff_reply_at],
    ["登録日時", customer.created_at],
    ["更新日時", customer.updated_at],
    ["管理番号", customer.id]
  ] as const;
}

function getCustomerRecipientLabel(
  customer: AdminCustomerDetail
): string {
  return customer.line_display_name || customer.name || customer.id;
}

function formatDetailValue(value: string | number | boolean | string[] | null | undefined): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function formatCustomerDetailValue(
  label: string,
  value: string | number | boolean | string[] | null | undefined
): string {
  if (isCustomerDateTimeLabel(label) && typeof value === "string") {
    return formatAdminDateTime(value);
  }

  return formatDetailValue(value);
}

function isCustomerDateTimeLabel(label: string): boolean {
  return ["最後のお客様メッセージ", "最後の担当者返信", "登録日時", "更新日時"].includes(
    label
  );
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
    bot_auto: "自動返信中",
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

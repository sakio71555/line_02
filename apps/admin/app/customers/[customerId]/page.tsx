import Link from "next/link";

import {
  getAdminApiConfig,
  getAdminCustomerDetail,
  getAdminCustomerTimeline,
  getAdminLineRealSendCapability,
  type AdminApiRequestOptions,
  type AdminCustomerDetailResponse,
  type AdminCustomerTimelineResponse
} from "../../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../../admin-api-request-options";
import { CustomerActionPanel } from "./customer-actions";

export const dynamic = "force-dynamic";

type AdminCustomerDetail = AdminCustomerDetailResponse["customer"];
type AdminTimelineMessage = AdminCustomerTimelineResponse["messages"][number];

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const requestOptions = await getServerAdminApiRequestOptions();
  const config = requestOptions.config ?? getAdminApiConfig();
  const detail = await loadCustomerDetail(customerId, requestOptions);
  const timeline = await loadCustomerTimeline(customerId, requestOptions);
  const lineRealSendCapability = await loadLineRealSendCapability(requestOptions);

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">顧客対応</p>
          <h1>顧客詳細</h1>
          <p className="meta">
            利用先: <span className="mono">{config.tenantId}</span> / お客様ID:{" "}
            <span className="mono">{customerId}</span>
          </p>
          <p className="meta">
            選択中の利用先:{" "}
            <span className="mono">{config.selectedTenantId ?? "未選択"}</span>
          </p>
        </div>
        <Link href="/customers">一覧へ戻る</Link>
      </div>

      <div className="notice">
        <p>
          この画面では、お客様情報、相談の流れ、AIの下書き、担当者返信をまとめて確認します。
        </p>
        <p className="meta">
          AIでまとめた内容はタイムラインへ保存されます。返信文の下書きとホームページ情報からの回答案は
          担当者確認用で、LINE送信も保存もしません。
        </p>
        <p className="meta">
          選択中の利用先は、保存済みの利用先情報としてAPIに渡されます。
        </p>
      </div>

      {detail.status === "error" ? (
        <section className="section">
          <div className="error">
            <strong>APIエラー</strong>
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
                <p className="meta mono">{detail.customer.id}</p>
              </div>
              <span className={getResponseModeBadgeClass(detail.customer.response_mode)}>
                {formatResponseMode(detail.customer.response_mode)}
              </span>
            </div>
            <div className="detail-chip-list" aria-label="お客様の状態">
              <span className="status-pill">{formatCustomerStatus(detail.customer.status)}</span>
              <span className="status-pill status-pill-muted">
                最終お客様発言 {formatDetailValue(detail.customer.last_customer_message_at)}
              </span>
              <span className="status-pill status-pill-muted">
                最終担当者返信 {formatDetailValue(detail.customer.last_staff_reply_at)}
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
          </section>

          <section className="section">
            <h2>お客様情報</h2>
            <div className="customer-key-grid">
              {customerDetailEntries(detail.customer).map(([label, value]) => (
                <dl className="admin-card customer-key-card" key={label}>
                  <dt>{label}</dt>
                  <dd>{formatDetailValue(value)}</dd>
                </dl>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="section">
        <h2>相談の流れ / タイムライン</h2>
        {timeline.status === "error" ? (
          <div className="error">
            <strong>APIエラー</strong>
            <pre>{timeline.message}</pre>
          </div>
        ) : timeline.messages.length === 0 ? (
          <p className="empty">表示できるメッセージはまだありません。</p>
        ) : (
          <ol className="timeline-list" aria-label="相談タイムライン">
            {timeline.messages.map((message) => (
              <li className={`timeline-item ${getTimelineItemClass(message)}`} key={message.id}>
                <div className="timeline-meta">
                  <span className={getTimelineRoleBadgeClass(message.role)}>
                    {formatMessageRole(message.role)}
                  </span>
                  <span className="status-pill status-pill-muted">
                    {formatMessageType(message.message_type)}
                  </span>
                  <span className="meta">{message.created_at}</span>
                </div>
                <p className="timeline-body">{formatDetailValue(message.body)}</p>
                {message.line_message_id || message.source_url ? (
                  <div className="timeline-meta">
                    {message.line_message_id ? (
                      <span className="meta mono">LINE ID: {message.line_message_id}</span>
                    ) : null}
                    {message.source_url ? (
                      <a href={message.source_url}>参考URL</a>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {detail.status === "error" ? null : (
        <CustomerActionPanel
          customerId={customerId}
          lineRealSendActionVisible={
            lineRealSendCapability.realSendActionVisible && Boolean(detail.customer.line_user_id)
          }
          recipientLabel={getCustomerRecipientLabel(detail.customer)}
          tenantId={config.selectedTenantId ?? config.tenantId}
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
      realSendActionVisible: capability.real_send_action_visible === true
    };
  } catch {
    return {
      status: "error" as const,
      realSendActionVisible: false
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
    ["お客様ID", customer.id],
    ["利用先ID", customer.tenant_id],
    ["LINE連携ID", customer.line_user_id],
    ["LINE表示名", customer.line_display_name],
    ["お名前", customer.name],
    ["電話番号", customer.phone],
    ["メール", customer.email],
    ["顧客状態", formatCustomerStatus(customer.status)],
    ["対応モード", formatResponseMode(customer.response_mode)],
    ["担当者ID", customer.assigned_staff_id],
    ["住所エリア", customer.address_area],
    ["計画エリア", customer.planned_area],
    ["土地の有無", customer.has_land],
    ["希望時期", customer.desired_timing],
    ["温度感スコア", customer.temperature_score],
    ["タグ", customer.tags],
    ["最後のお客様メッセージ", customer.last_customer_message_at],
    ["最後の担当者返信", customer.last_staff_reply_at],
    ["作成日時", customer.created_at],
    ["更新日時", customer.updated_at]
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

function formatMessageRole(role: string): string {
  const labels: Record<string, string> = {
    customer: "お客様",
    bot: "自動応答",
    staff: "担当者",
    system: "システム",
    ai: "AI要約"
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

function getTimelineRoleBadgeClass(role: string): string {
  if (role === "customer") {
    return "status-pill status-pill-warning";
  }

  if (role === "staff") {
    return "status-pill";
  }

  if (role === "ai" || role === "system") {
    return "status-pill status-pill-muted";
  }

  return "status-pill";
}

function getTimelineItemClass(message: AdminTimelineMessage): string {
  if (message.role === "customer") {
    return "timeline-item-customer";
  }

  if (message.role === "staff") {
    return "timeline-item-staff";
  }

  if (message.role === "ai") {
    return "timeline-item-ai";
  }

  if (message.role === "system") {
    return "timeline-item-system";
  }

  return "";
}

import { ArrowLeft, Mail, MapPin, Phone, UserRound } from "lucide-react";
import Link from "next/link";

import {
  getAdminCustomerDetail,
  getAdminCustomerTimeline,
  getAdminInternalNotes,
  getAdminLineRealSendCapability,
  getAdminOperationsBoard,
  getAdminReplyTemplates,
  getAdminWorkspaceSettings,
  type AdminApiRequestOptions,
  type AdminCustomerDetailResponse,
  type AdminOperationsBoardResponse
} from "../../../src/admin-api";
import {
  createDefaultLineExperienceSettings,
  type WorkspaceSettings
} from "@amami-line-crm/domain";
import {
  formatAdminDateTime,
  toLineConversationTimelineMessages
} from "../../../src/customer-timeline-display";
import { getServerAdminApiRequestOptions } from "../../admin-api-request-options";
import { PageTitle, SectionHeader, StatusBadge } from "../../_components/ui";
import {
  CustomerActionPanel,
  CustomerArchiveControl,
  CustomerRichMenuSwitch
} from "./customer-actions";
import { CustomerTimelineList } from "./customer-timeline-list";
import { CustomerOperationsPanel } from "./customer-operations";
import { OperationsTaskCard } from "../../tasks/operations-board";

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
  const [timeline, operations] = await Promise.all([
    loadCustomerTimeline(customerId, requestOptions),
    loadCustomerOperations(customerId, requestOptions)
  ]);
  const timelineMessages =
    timeline.status === "ok" ? toLineConversationTimelineMessages(timeline.messages) : [];
  const lineRealSendCapability = await loadLineRealSendCapability(requestOptions);
  const isArchived = detail.status === "ok" && detail.customer.status === "archived";

  return (
    <main>
      {detail.status === "error" ? (
        <>
          <PageTitle
            eyebrow="お客様対応"
            title="お客様を読み込めませんでした"
            actions={<Link className="button-link" href="/customers"><ArrowLeft size={17} />顧客一覧</Link>}
          />
          <div className="inline-error">時間を置いて再度お試しください。</div>
        </>
      ) : (
        <>
          <PageTitle
            eyebrow="お客様対応"
            title={getCustomerRecipientLabel(detail.customer)}
            description={`最終更新 ${formatAdminDateTime(detail.customer.updated_at)}`}
            actions={<Link className="button-link" href="/customers"><ArrowLeft size={17} />顧客一覧</Link>}
          />

          <div className="customer-overview" aria-label="お客様の対応状況">
            <div className="customer-overview-avatar"><UserRound aria-hidden="true" size={26} /></div>
            <div className="customer-overview-state">
              <StatusBadge tone={getResponseModeTone(detail.customer.response_mode)}>
                {formatResponseMode(detail.customer.response_mode)}
              </StatusBadge>
              <span>{formatCustomerStatus(detail.customer.status)}</span>
            </div>
            <div className="customer-overview-times">
              <span><small>お客様から</small>{formatAdminDateTime(detail.customer.last_customer_message_at)}</span>
              <span><small>担当者返信</small>{formatAdminDateTime(detail.customer.last_staff_reply_at)}</span>
            </div>
          </div>

          <div className="customer-workspace">
            <div className="customer-conversation-column">
              {isArchived ? (
                <div className="customer-archived-notice">
                  このお客様は削除済みです。履歴の確認はできますが、返信やLINEメニュー変更はできません。
                </div>
              ) : null}
              <section className="workspace-section customer-conversation">
                <SectionHeader
                  title="LINEトーク"
                  description="実機のLINEと同じ会話だけを、新しい順で表示します。"
                />
                {timeline.status === "error" ? (
                  <div className="inline-error">LINEトークを読み込めませんでした。</div>
                ) : timelineMessages.length === 0 ? (
                  <p className="empty">表示できるメッセージはまだありません。</p>
                ) : (
                  <CustomerTimelineList customerId={customerId} messages={timelineMessages} />
                )}
              </section>

              {!isArchived ? (
                <CustomerActionPanel
                  customerId={customerId}
                  lineRealSendCustomerAvailable={Boolean(detail.customer.line_user_id)}
                  lineRealSendWindowOpen={lineRealSendCapability.lineRealSendWindowOpen}
                  recipientLabel={getCustomerRecipientLabel(detail.customer)}
                  replyTemplates={operations.replyTemplates}
                />
              ) : null}

              {operations.tasks.length > 0 ? (
                <section className="workspace-section customer-task-section">
                  <SectionHeader
                    title="このお客様の対応タスク"
                    description="担当者、期限、進み具合をここで更新できます。"
                  />
                  <div className="customer-task-list">
                    {operations.tasks.map((task) => (
                      <OperationsTaskCard key={task.id} staff={operations.staff} task={task} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="customer-sidebar">
              <section className="workspace-section customer-contact-section">
                <SectionHeader title="お客様情報" />
                <dl className="customer-contact-list">
                  <div><dt><Phone aria-hidden="true" size={17} />電話</dt><dd>{formatDetailValue(detail.customer.phone)}</dd></div>
                  <div><dt><Mail aria-hidden="true" size={17} />メール</dt><dd>{formatDetailValue(detail.customer.email)}</dd></div>
                  <div><dt><MapPin aria-hidden="true" size={17} />住所・エリア</dt><dd>{formatDetailValue(detail.customer.address_area || detail.customer.planned_area)}</dd></div>
                </dl>
                {detail.customer.tags.length > 0 ? (
                  <div className="detail-chip-list" aria-label="お客様タグ">
                    {detail.customer.tags.map((tag) => <span className="status-pill status-pill-muted" key={tag}>{tag}</span>)}
                  </div>
                ) : null}
              </section>

              {!isArchived ? (
                <section className="workspace-section customer-operations-section">
                  <SectionHeader title="対応・引継ぎ" />
                  <CustomerOperationsPanel
                    customerAvailable={Boolean(detail.customer.line_user_id)}
                    customerId={customerId}
                    currentStage={getCustomerStage(detail.customer.tags)}
                    notes={operations.notes}
                    settings={operations.settings}
                    staff={operations.staff}
                  />
                </section>
              ) : null}

              {!isArchived ? (
                <section className="workspace-section customer-menu-section">
                  <CustomerRichMenuSwitch
                    customerAvailable={Boolean(detail.customer.line_user_id)}
                    customerId={customerId}
                    menus={operations.settings.line_experience.menus.map((menu) => ({
                      menu_type: menu.menu_type,
                      name: menu.name,
                      line_rich_menu_id: menu.line_rich_menu_id,
                      description: `${menu.items
                        .slice(0, 2)
                        .map((item) => item.label)
                        .join("・")} など6つのメニュー`,
                      switch_available:
                        Boolean(menu.line_rich_menu_id?.trim()) ||
                        ["initial", "negotiation", "aftercare"].includes(menu.menu_type)
                    }))}
                  />
                </section>
              ) : null}

              <details className="customer-all-details">
                <summary>すべてのお客様情報</summary>
                <dl>
                  {customerDetailEntries(detail.customer).map(([label, value]) => (
                    <div key={label}><dt>{label}</dt><dd>{formatCustomerDetailValue(label, value)}</dd></div>
                  ))}
                </dl>
              </details>

              <CustomerArchiveControl
                customerId={customerId}
                customerName={getCustomerRecipientLabel(detail.customer)}
                isArchived={isArchived}
              />
            </aside>
          </div>
        </>
      )}
    </main>
  );
}

async function loadCustomerOperations(
  customerId: string,
  options: AdminApiRequestOptions
) {
  const [notesResult, boardResult, templatesResult, settingsResult] = await Promise.allSettled([
    getAdminInternalNotes(customerId, options),
    getAdminOperationsBoard(options),
    getAdminReplyTemplates(options),
    getAdminWorkspaceSettings(options)
  ]);
  const board: AdminOperationsBoardResponse | null =
    boardResult.status === "fulfilled" ? boardResult.value : null;

  return {
    notes: notesResult.status === "fulfilled" ? notesResult.value.notes : [],
    replyTemplates:
      templatesResult.status === "fulfilled"
        ? templatesResult.value.templates.filter((template) => template.is_active)
        : [],
    settings:
      settingsResult.status === "fulfilled"
        ? settingsResult.value.settings
        : defaultWorkspaceSettings(),
    staff: board?.staff ?? [],
    tasks: (board?.tasks ?? []).filter((task) => task.customer_id === customerId)
  };
}

function defaultWorkspaceSettings(): WorkspaceSettings {
  return {
    tenant_id: "",
    company_name: "",
    product_name: "LINE CRM",
    accent_preset: "forest",
    sla_minutes: 1440,
    rich_menu_auto_switch_enabled: false,
    customer_status_notifications_enabled: false,
    line_experience: createDefaultLineExperienceSettings(),
    setup_completed: false,
    created_at: "",
    updated_at: ""
  };
}

function getCustomerStage(
  tags: string[]
): "initial" | "negotiation" | "aftercare" {
  const stage = tags.find((tag) => tag.startsWith("crm_stage:"))?.split(":")[1]
    ?? tags.find((tag) => tag.startsWith("rich_menu:"))?.split(":")[1];

  if (stage === "negotiation" || stage === "aftercare") return stage;
  return "initial";
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
    archived: "削除済み",
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

function getResponseModeTone(
  mode: string
): "neutral" | "info" | "attention" | "danger" | "success" {
  if (mode === "emergency") return "danger";
  if (mode === "human_required") return "attention";
  if (mode === "human_active") return "info";
  if (mode === "closed") return "neutral";
  return "success";
}

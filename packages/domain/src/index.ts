import {
  INITIAL_OFFICIAL_DOMAIN,
  INITIAL_TENANT_ID,
  INITIAL_TENANT_SLUG,
  type TenantScoped,
  type Timestamped
} from "@amami-line-crm/shared";
import { z } from "zod";

export * from "./auth-context";
export * from "./admin-permissions";

export interface Tenant extends Timestamped {
  id: string;
  slug: string;
  name: string;
  official_domain: string;
  status: "active" | "paused";
}

export const initialTenant: Tenant = {
  id: INITIAL_TENANT_ID,
  slug: INITIAL_TENANT_SLUG,
  name: "アマミホーム",
  official_domain: INITIAL_OFFICIAL_DOMAIN,
  status: "active",
  created_at: "2026-06-13T00:00:00.000Z",
  updated_at: "2026-06-13T00:00:00.000Z"
};

export const responseModes = [
  "bot_auto",
  "human_required",
  "human_active",
  "emergency",
  "closed"
] as const;

export type ResponseMode = (typeof responseModes)[number];

export const messageRoles = ["customer", "bot", "staff", "system", "ai"] as const;

export type MessageRole = (typeof messageRoles)[number];

export const messageTypes = [
  "text",
  "image",
  "file",
  "form",
  "reservation",
  "alert",
  "summary"
] as const;

export type MessageType = (typeof messageTypes)[number];

export const alertStatuses = ["open", "notified", "resolved", "dismissed"] as const;

export type AlertStatus = (typeof alertStatuses)[number];

export const alertSeverities = ["low", "medium", "high", "critical"] as const;

export type AlertSeverity = (typeof alertSeverities)[number];

export type TenantStatus = "active" | "paused";
export const staffRoles = ["owner", "manager", "staff"] as const;

export type StaffRole = (typeof staffRoles)[number];

export const staffStatuses = ["active", "disabled", "archived"] as const;

export type StaffStatus = (typeof staffStatuses)[number];

export const staffMembershipStatuses = ["invited", "active", "disabled", "archived"] as const;

export type StaffMembershipStatus = (typeof staffMembershipStatuses)[number];
export type CustomerStatus = "new" | "active" | "archived";
export type ConsultationCategory =
  | "new_build"
  | "land"
  | "built_house"
  | "reservation"
  | "after_support"
  | "document_request"
  | "other";
export type ConsultationStatus = "open" | "waiting_customer" | "waiting_staff" | "closed";
export type AlertType =
  | "unreplied"
  | "unreplied_customer_message"
  | "stale"
  | "emergency"
  | "ai_risk";
export const knowledgeSourceTypes = ["official_site", "faq", "manual", "campaign"] as const;

export type KnowledgeSourceType = (typeof knowledgeSourceTypes)[number];
export type ReservationType =
  | "model_home"
  | "online_consultation"
  | "office_visit"
  | "after_support";
export type ReservationStatus = "requested" | "confirmed" | "cancelled" | "completed";

export interface StaffUser extends TenantScoped, Timestamped {
  id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string;
  role: StaffRole;
  status: StaffStatus;
  line_user_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  disabled_at: string | null;
  archived_at: string | null;
}

export interface StaffTenantMembership extends TenantScoped, Timestamped {
  id: string;
  staff_user_id: string;
  role: StaffRole;
  status: StaffMembershipStatus;
  invited_at: string | null;
  accepted_at: string | null;
  disabled_at: string | null;
  archived_at: string | null;
}

export interface Customer extends TenantScoped, Timestamped {
  id: string;
  line_user_id: string | null;
  display_name: string | null;
  picture_url: string | null;
  phone: string | null;
  email: string | null;
  postal_code: string | null;
  address: string | null;
  interest_tags: string[];
  response_mode: ResponseMode;
  status: CustomerStatus;
  last_message_at: string | null;
  last_customer_message_at: string | null;
  last_staff_reply_at: string | null;
}

export interface Consultation extends TenantScoped, Timestamped {
  id: string;
  customer_id: string;
  subject: string;
  category: ConsultationCategory;
  status: ConsultationStatus;
  assigned_staff_user_id: string | null;
  priority: number;
  summary: string | null;
  next_action: string | null;
  closed_at: string | null;
}

export interface Message extends TenantScoped {
  id: string;
  customer_id: string;
  consultation_id: string | null;
  line_message_id: string | null;
  role: MessageRole;
  message_type: MessageType;
  body: string | null;
  media_storage_path: string | null;
  staff_user_id: string | null;
  ai_generated: boolean;
  sent_to_line_at: string | null;
  created_at: string;
}

export interface Alert extends TenantScoped, Timestamped {
  id: string;
  customer_id: string;
  consultation_id: string | null;
  alert_type: AlertType;
  status: AlertStatus;
  severity: AlertSeverity;
  message: string;
  triggered_at: string;
  notified_at: string | null;
  resolved_at: string | null;
}

export interface KnowledgePage extends TenantScoped, Timestamped {
  id: string;
  url: string;
  category: string;
  source_type: KnowledgeSourceType;
  title: string;
  content: string;
  checksum: string | null;
  allowed_for_ai: boolean;
  last_crawled_at: string | null;
}

export interface ConstructionCase extends TenantScoped, Timestamped {
  id: string;
  source_url: string;
  title: string;
  description: string | null;
  style_tags: string[];
  family_tags: string[];
  price_band_label: string | null;
  area_label: string | null;
  thumbnail_storage_path: string | null;
  published_at: string | null;
  allowed_for_recommendation: boolean;
}

export interface Reservation extends TenantScoped, Timestamped {
  id: string;
  customer_id: string;
  consultation_id: string | null;
  reservation_type: ReservationType;
  preferred_dates: unknown[];
  confirmed_start_at: string | null;
  confirmed_end_at: string | null;
  status: ReservationStatus;
  staff_user_id: string | null;
  notes: string | null;
}

export function assertTenantScoped(record: TenantScoped, tenantId: string): void {
  if (record.tenant_id !== tenantId) {
    throw new Error(`Tenant scope mismatch: expected ${tenantId}, received ${record.tenant_id}`);
  }
}

export const tenantIdSchema = z.string().min(1).regex(/^tenant_[a-z0-9_]+$/);
export const responseModeSchema = z.enum(responseModes);
export const messageRoleSchema = z.enum(messageRoles);
export const messageTypeSchema = z.enum(messageTypes);
export const alertStatusSchema = z.enum(alertStatuses);
export const alertSeveritySchema = z.enum(alertSeverities);
export const knowledgeSourceTypeSchema = z.enum(knowledgeSourceTypes);
export const staffRoleSchema = z.enum(staffRoles);
export const staffStatusSchema = z.enum(staffStatuses);
export const staffMembershipStatusSchema = z.enum(staffMembershipStatuses);

export const customerCreateSchema = z.object({
  tenant_id: tenantIdSchema,
  line_user_id: z.string().min(1).nullable().optional(),
  display_name: z.string().min(1).nullable().optional(),
  picture_url: z.string().url().nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
  email: z.string().email().nullable().optional(),
  postal_code: z.string().min(1).nullable().optional(),
  address: z.string().min(1).nullable().optional(),
  interest_tags: z.array(z.string().min(1)).default([]),
  response_mode: responseModeSchema.default("bot_auto"),
  status: z.enum(["new", "active", "archived"]).default("new")
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export const messageCreateSchema = z.object({
  tenant_id: tenantIdSchema,
  customer_id: z.string().min(1),
  consultation_id: z.string().min(1).nullable().optional(),
  line_message_id: z.string().min(1).nullable().optional(),
  role: messageRoleSchema,
  message_type: messageTypeSchema.default("text"),
  body: z.string().nullable().optional(),
  media_storage_path: z.string().min(1).nullable().optional(),
  staff_user_id: z.string().min(1).nullable().optional(),
  ai_generated: z.boolean().default(false),
  sent_to_line_at: z.string().datetime().nullable().optional()
});

export type MessageCreateInput = z.infer<typeof messageCreateSchema>;

export const alertCreateSchema = z.object({
  tenant_id: tenantIdSchema,
  customer_id: z.string().min(1),
  consultation_id: z.string().min(1).nullable().optional(),
  alert_type: z.enum(["unreplied", "unreplied_customer_message", "stale", "emergency", "ai_risk"]),
  status: alertStatusSchema.default("open"),
  severity: alertSeveritySchema.default("medium"),
  message: z.string().min(1),
  triggered_at: z.string().datetime().optional()
});

export type AlertCreateInput = z.infer<typeof alertCreateSchema>;

export const knowledgePageSchema = z.object({
  tenant_id: tenantIdSchema,
  url: z.string().min(1),
  category: z.string().min(1),
  source_type: knowledgeSourceTypeSchema,
  title: z.string().min(1),
  content: z.string().min(1),
  checksum: z.string().min(1).nullable().optional(),
  allowed_for_ai: z.boolean().default(false),
  last_crawled_at: z.string().datetime().nullable().optional()
});

export type KnowledgePageInput = z.infer<typeof knowledgePageSchema>;

export interface CustomerRepository {
  findByIdForTenant(tenantId: string, customerId: string): Promise<Customer | null>;
  findByTenantAndLineUserId(tenantId: string, lineUserId: string): Promise<Customer | null>;
  listByTenant(tenantId: string): Promise<Customer[]>;
  save(customer: Customer): Promise<Customer>;
}

export interface MessageRepository {
  insert(message: Message): Promise<Message>;
  findLatestByCustomerIds(tenantId: string, customerIds: string[]): Promise<Map<string, Message>>;
  listByCustomer(tenantId: string, customerId: string): Promise<Message[]>;
}

export interface AlertRepository {
  create(alert: Alert): Promise<Alert>;
  listByTenant(tenantId: string): Promise<Alert[]>;
  listOpenByTenant(tenantId: string): Promise<Alert[]>;
  findActiveByCustomerAndType(
    tenantId: string,
    customerId: string,
    alertType: AlertType
  ): Promise<Alert | null>;
  updateStatus(input: {
    tenant_id: string;
    alert_id: string;
    status: AlertStatus;
    severity?: AlertSeverity;
    message?: string;
    notified_at?: string | null;
    resolved_at?: string | null;
    updated_at: string;
  }): Promise<Alert | null>;
}

export interface StaffNotificationPayload extends TenantScoped {
  alert_id: string;
  customer_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  admin_url: string;
}

export interface StaffNotifier {
  notify(payload: StaffNotificationPayload): Promise<void>;
}

export interface CustomerListItem {
  id: string;
  tenant_id: string;
  line_user_id: string | null;
  display_name: string | null;
  response_mode: ResponseMode;
  status: CustomerStatus;
  last_message_body: string | null;
  last_message_at: string | null;
  last_customer_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerDetail {
  id: string;
  tenant_id: string;
  line_user_id: string | null;
  line_display_name: string | null;
  information_registered: boolean;
  name: string | null;
  phone: string | null;
  email: string | null;
  postal_code: string | null;
  status: CustomerStatus;
  response_mode: ResponseMode;
  assigned_staff_id: string | null;
  address_area: string | null;
  planned_area: string | null;
  has_land: boolean | null;
  desired_timing: string | null;
  temperature_score: number | null;
  tags: string[];
  last_customer_message_at: string | null;
  last_staff_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerTimelineMessage {
  id: string;
  tenant_id: string;
  customer_id: string;
  role: MessageRole;
  message_type: MessageType;
  body: string | null;
  line_message_id: string | null;
  source_url: string | null;
  created_at: string;
}

export interface UpsertLineCustomerInput {
  tenant_id: string;
  line_user_id: string;
  display_name?: string | null;
  last_customer_message_at?: string | null;
  response_mode?: ResponseMode;
}

export interface InsertLineTextMessageInput {
  tenant_id: string;
  customer_id: string;
  line_message_id: string;
  body: string | null;
  created_at: string;
}

export interface RecordStaffTextReplyInput {
  tenant_id: string;
  customer: Customer;
  body: string;
  staff_user_id?: string | null;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  createId?: () => string;
  now?: () => string;
}

export interface RecordStaffTextReplyResult {
  customer: Customer;
  message: Message;
}

export interface RecordAiSummaryMessageInput {
  tenant_id: string;
  customer: Customer;
  body: string;
  messageRepository: MessageRepository;
  createId?: () => string;
  now?: () => string;
}

export interface CheckUnrepliedAlertsInput {
  tenant_id: string;
  customerRepository: CustomerRepository;
  alertRepository: AlertRepository;
  createId?: () => string;
  now?: () => string;
}

export interface CheckUnrepliedAlertsResult {
  tenant_id: string;
  checked_customers: number;
  alerts_created: number;
  alerts: Alert[];
}

export interface EnsureOpenUnrepliedCustomerMessageAlertInput {
  tenant_id: string;
  customer: Customer;
  alertRepository: AlertRepository;
  message?: string;
  severity?: AlertSeverity;
  createId?: () => string;
  now?: () => string;
}

export interface EnsureOpenUnrepliedCustomerMessageAlertResult {
  alert: Alert | null;
  created: boolean;
  notification_required: boolean;
  reopened: boolean;
}

export interface NotifyOpenAlertsInput {
  tenant_id: string;
  alertRepository: AlertRepository;
  customerRepository?: CustomerRepository;
  staffNotifier: StaffNotifier;
  adminBaseUrl?: string;
  now?: () => string;
}

export interface NotifyOpenAlertsResult {
  tenant_id: string;
  notified: number;
  failed: number;
  skipped: number;
  notified_alerts: Alert[];
  failed_alerts: Alert[];
}

export interface MessageLoggingLineEvent {
  type: string;
  timestamp: number | null;
  reply_token?: string | null;
  source_user_id: string | null;
  message_id: string | null;
  message_type: string | null;
  text: string | null;
}

export interface LogLineWebhookEventsInput {
  tenant_id: string;
  events: MessageLoggingLineEvent[];
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  alertRepository?: AlertRepository;
  getLineDisplayName?: (lineUserId: string) => Promise<string | null>;
  createId?: () => string;
  now?: () => string;
}

export interface LogLineWebhookEventsResult {
  customers_upserted: number;
  messages_inserted: number;
  alerts_created: number;
  alerts_notification_required: number;
  rich_menu_guides_logged: number;
  contact_staff_flows_logged: number;
  contact_staff_alerts_created: number;
  contact_staff_alerts_notification_required: number;
  structured_consultation_flows_logged: number;
  structured_consultation_alerts_created: number;
  structured_consultation_alerts_notification_required: number;
  unsupported_events: number;
  line_reply_instructions: LineReplyInstruction[];
  staff_notification_alerts: Alert[];
  staff_notification_events: CustomerLineStaffNotificationEvent[];
}

export interface LineReplyInstruction {
  reply_token: string | null;
  text: string;
  quick_reply_texts?: string[];
}

export interface CustomerLineStaffNotificationEvent extends TenantScoped {
  customer_id: string;
  customer_display_name: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  action_label: string;
  detail_text?: string | null;
  occurred_at: string;
}

export interface CustomerRichMenuGuideAction {
  action_key: string;
  trigger_text: string;
  timeline_body: string;
  reply_text: string;
  target_url: string;
  message_type: MessageType;
}

export const customerRichMenuTypes = ["initial", "negotiation", "aftercare"] as const;

export type CustomerRichMenuType = (typeof customerRichMenuTypes)[number];

const customerRichMenuTypeLabels: Record<CustomerRichMenuType, string> = {
  initial: "初期メニュー",
  negotiation: "商談中メニュー",
  aftercare: "アフターメニュー"
};

export function isCustomerRichMenuType(value: string): value is CustomerRichMenuType {
  return (customerRichMenuTypes as readonly string[]).includes(value);
}

export function formatCustomerRichMenuTypeLabel(type: CustomerRichMenuType): string {
  return customerRichMenuTypeLabels[type];
}

export const customerRichMenuGuideActions = [
  {
    action_key: "initial.model_house_reservation",
    trigger_text: "モデルハウス見学予約",
    timeline_body: "モデルハウス見学予約ページ案内済み",
    reply_text: [
      "モデルハウス見学のご予約はこちらからお願いいたします。",
      "ご希望日時を入力して送信してください。",
      "",
      "https://amamihome.net/reservation/"
    ].join("\n"),
    target_url: "https://amamihome.net/reservation/",
    message_type: "reservation"
  },
  {
    action_key: "initial.home_building_consultation",
    trigger_text: "家づくり相談",
    timeline_body: "家づくり相談ページ案内済み",
    reply_text: [
      "家づくり相談はこちらからお願いいたします。",
      "ご相談内容を入力して送信してください。",
      "",
      "https://amamihome.net/consultation/"
    ].join("\n"),
    target_url: "https://amamihome.net/consultation/",
    message_type: "text"
  },
  {
    action_key: "initial.works",
    trigger_text: "施工事例を見る",
    timeline_body: "施工事例ページ案内済み",
    reply_text: [
      "施工事例はこちらからご覧いただけます。",
      "気になる施工事例があれば、そのままLINEでお知らせください。",
      "",
      "https://amamihome.net/works/"
    ].join("\n"),
    target_url: "https://amamihome.net/works/",
    message_type: "text"
  },
  {
    action_key: "initial.catalog_request",
    trigger_text: "資料請求",
    timeline_body: "資料請求ページ案内済み",
    reply_text: [
      "資料請求はこちらからお願いいたします。",
      "家づくり資料のご請求内容を入力して送信してください。",
      "",
      "https://amamihome.net/download/"
    ].join("\n"),
    target_url: "https://amamihome.net/download/",
    message_type: "text"
  }
] as const satisfies readonly CustomerRichMenuGuideAction[];

export function resolveCustomerRichMenuGuideAction(
  text: string | null
): CustomerRichMenuGuideAction | null {
  const normalized = text?.trim();

  if (!normalized) {
    return null;
  }

  return (
    customerRichMenuGuideActions.find((action) => action.trigger_text === normalized) ?? null
  );
}

export const customerContactStaffTriggerText = "担当者に相談";
export const customerContactStaffCategories = [
  "家づくりについて",
  "モデルハウス見学について",
  "資料請求について",
  "費用・ローンについて",
  "その他"
] as const;

export const customerContactStaffPriorityOptions = [
  { label: "はやく返事が欲しい", severity: "high" },
  { label: "通常でよい", severity: "medium" },
  { label: "急ぎではない", severity: "low" }
] as const satisfies readonly { label: string; severity: AlertSeverity }[];

const contactStaffCategoryPromptTimelineBody = "担当者相談カテゴリ選択案内済み";
const contactStaffCategoryTimelinePrefix = "担当者相談カテゴリ: ";
const contactStaffPriorityPromptTimelineBody = "担当者相談優先度選択案内済み";
const contactStaffPriorityTimelinePrefix = "担当者相談優先度: ";
const contactStaffContactPromptTimelineBody = "担当者相談連絡先確認案内済み";
const contactStaffContactConfirmedTimelineBody = "担当者相談連絡先確認済み";
const contactStaffContentPromptTimelineBody = "担当者相談内容入力案内済み";
const contactStaffAcceptedTimelineBody = "担当者相談受付済み";
const contactStaffStartActivityLabel = "担当者相談を開始";

type StructuredConsultationOption = {
  label: string;
  value: string;
  notification_label?: string;
};

type StructuredConsultationValues = Record<string, string>;

type StructuredConsultationStepBase = {
  key: string;
  prompt_timeline_body: string;
  value_timeline_prefix: string;
  prompt_reply: string;
  retry_reply: string;
  is_applicable?: (values: StructuredConsultationValues) => boolean;
};

type StructuredConsultationStep =
  | (StructuredConsultationStepBase & {
      kind: "choice";
      options: readonly StructuredConsultationOption[];
    })
  | (StructuredConsultationStepBase & {
      kind: "text";
    });

type StructuredConsultationFlowConfig = {
  flow_key: string;
  trigger_text: string;
  title: string;
  start_activity_label: string;
  category: string;
  assigned_role: string;
  secondary_role?: string;
  default_severity: AlertSeverity;
  default_priority: "normal" | "high";
  ai_auto_reply: boolean;
  requires_staff_confirmation: boolean;
  steps: readonly StructuredConsultationStep[];
};

function isMeetingScheduleBookingRequest(values: StructuredConsultationValues): boolean {
  return (
    values.sub_category === "新しく打合せを予約したい" ||
    values.sub_category === "日時を変更したい"
  );
}

function isMeetingScheduleCancelRequest(values: StructuredConsultationValues): boolean {
  return values.sub_category === "キャンセルしたい";
}

function isMeetingScheduleConfirmRequest(values: StructuredConsultationValues): boolean {
  return values.sub_category === "打合せ内容を確認したい";
}

function isPlanConsultationInteriorTargetRequest(values: StructuredConsultationValues): boolean {
  return Boolean(
    values.sub_category &&
      values.sub_category !== "外観デザインについて" &&
      values.sub_category !== "その他"
  );
}

function isPlanConsultationExteriorTargetRequest(values: StructuredConsultationValues): boolean {
  return values.sub_category === "外観デザインについて";
}

function isLandStatusQuestionNeeded(values: StructuredConsultationValues): boolean {
  return Boolean(
    values.sub_category &&
      values.sub_category !== "土地を探している" &&
      values.sub_category !== "候補地について相談したい" &&
      values.sub_category !== "所有地について相談したい"
  );
}

function isDocumentStageQuestionNeeded(values: StructuredConsultationValues): boolean {
  return values.sub_category !== "契約前の確認";
}

const structuredConsultationFlowConfigs = [
  {
    flow_key: "negotiation.meeting_schedule",
    trigger_text: "打合せ予約・変更",
    title: "打合せ予約・変更",
    start_activity_label: "打合せ予約・変更を開始",
    category: "meeting",
    assigned_role: "sales",
    default_severity: "medium",
    default_priority: "normal",
    ai_auto_reply: false,
    requires_staff_confirmation: true,
    steps: [
      {
        key: "sub_category",
        kind: "choice",
        prompt_timeline_body: "打合せ予約・変更 用件選択案内済み",
        value_timeline_prefix: "打合せ予約・変更 用件: ",
        prompt_reply: "打合せ予約・変更ですね。用件を次から選んで送ってください。",
        retry_reply: "用件を次から選んで送ってください。",
        options: [
          { label: "新しく打合せを予約したい", value: "new_schedule", notification_label: "新規予約" },
          { label: "日時を変更したい", value: "reschedule", notification_label: "日時変更" },
          { label: "キャンセルしたい", value: "cancel", notification_label: "キャンセル" },
          { label: "打合せ内容を確認したい", value: "confirm", notification_label: "内容確認" }
        ]
      },
      {
        key: "method",
        kind: "choice",
        prompt_timeline_body: "打合せ予約・変更 希望方法選択案内済み",
        value_timeline_prefix: "打合せ予約・変更 希望方法: ",
        prompt_reply: "希望方法を次から選んで送ってください。",
        retry_reply: "希望方法を次から選んで送ってください。",
        is_applicable: isMeetingScheduleBookingRequest,
        options: [
          { label: "来店", value: "office" },
          { label: "モデルハウス", value: "model_house" },
          { label: "現地", value: "site" },
          { label: "オンライン", value: "online" },
          { label: "電話", value: "phone" }
        ]
      },
      {
        key: "desired_datetime",
        kind: "text",
        prompt_timeline_body: "打合せ予約・変更 希望日時入力案内済み",
        value_timeline_prefix: "打合せ予約・変更 希望日時: ",
        prompt_reply: [
          "希望日時を入力してください。",
          "第1希望・第2希望・第3希望があれば、まとめて送ってください。"
        ].join("\n"),
        retry_reply: "希望日時を入力して送ってください。",
        is_applicable: isMeetingScheduleBookingRequest
      },
      {
        key: "cancel_meeting_datetime",
        kind: "text",
        prompt_timeline_body: "打合せ予約・変更 キャンセル対象日時入力案内済み",
        value_timeline_prefix: "打合せ予約・変更 キャンセル対象日時: ",
        prompt_reply: "キャンセルしたい打合せの日時を入力してください。分かる範囲で大丈夫です。",
        retry_reply: "キャンセルしたい打合せの日時を入力して送ってください。",
        is_applicable: isMeetingScheduleCancelRequest
      },
      {
        key: "confirm_meeting_datetime",
        kind: "text",
        prompt_timeline_body: "打合せ予約・変更 確認対象入力案内済み",
        value_timeline_prefix: "打合せ予約・変更 確認対象: ",
        prompt_reply: "確認したい打合せの日時や内容を入力してください。分かる範囲で大丈夫です。",
        retry_reply: "確認したい打合せの日時や内容を入力して送ってください。",
        is_applicable: isMeetingScheduleConfirmRequest
      },
      {
        key: "meeting_topic",
        kind: "choice",
        prompt_timeline_body: "打合せ予約・変更 打合せ内容選択案内済み",
        value_timeline_prefix: "打合せ予約・変更 打合せ内容: ",
        prompt_reply: "打合せしたい内容を次から選んで送ってください。",
        retry_reply: "打合せしたい内容を次から選んで送ってください。",
        is_applicable: isMeetingScheduleBookingRequest,
        options: [
          { label: "プラン", value: "plan" },
          { label: "見積", value: "estimate" },
          { label: "土地", value: "land" },
          { label: "ローン", value: "loan" },
          { label: "契約前確認", value: "pre_contract" },
          { label: "その他", value: "other" }
        ]
      },
      {
        key: "body",
        kind: "text",
        prompt_timeline_body: "打合せ予約・変更 補足入力案内済み",
        value_timeline_prefix: "打合せ予約・変更 補足: ",
        prompt_reply: "補足や担当者への連絡事項があれば入力してください。なければ「なし」と送ってください。",
        retry_reply: "補足を入力して送ってください。"
      }
    ]
  },
  {
    flow_key: "negotiation.plan_consultation",
    trigger_text: "プラン・間取り相談",
    title: "プラン・間取り相談",
    start_activity_label: "プラン・間取り相談を開始",
    category: "plan_design",
    assigned_role: "designer",
    secondary_role: "estimator",
    default_severity: "medium",
    default_priority: "normal",
    ai_auto_reply: false,
    requires_staff_confirmation: true,
    steps: [
      {
        key: "sub_category",
        kind: "choice",
        prompt_timeline_body: "プラン・間取り相談 内容選択案内済み",
        value_timeline_prefix: "プラン・間取り相談 内容: ",
        prompt_reply: "相談したい内容を次から選んで送ってください。",
        retry_reply: "相談したい内容を次から選んで送ってください。",
        options: [
          { label: "間取りについて", value: "layout", notification_label: "間取り" },
          { label: "外観デザインについて", value: "exterior", notification_label: "外観デザイン" },
          { label: "内装デザインについて", value: "interior", notification_label: "内装デザイン" },
          { label: "収納について", value: "storage", notification_label: "収納" },
          { label: "家事動線について", value: "flow", notification_label: "家事動線" },
          { label: "採光・風通しについて", value: "lighting", notification_label: "採光・風通し" },
          { label: "要望を変更したい", value: "requirement_change", notification_label: "要望変更" },
          { label: "その他", value: "other", notification_label: "その他" }
        ]
      },
      {
        key: "target_area",
        kind: "choice",
        prompt_timeline_body: "プラン・間取り相談 対象場所選択案内済み",
        value_timeline_prefix: "プラン・間取り相談 対象場所: ",
        prompt_reply: "対象の場所を次から選んで送ってください。",
        retry_reply: "対象の場所を次から選んで送ってください。",
        is_applicable: isPlanConsultationInteriorTargetRequest,
        options: [
          { label: "LDK", value: "ldk" },
          { label: "キッチン", value: "kitchen" },
          { label: "洗面脱衣", value: "washroom" },
          { label: "浴室", value: "bathroom" },
          { label: "トイレ", value: "toilet" },
          { label: "寝室", value: "bedroom" },
          { label: "子ども部屋", value: "kids_room" },
          { label: "玄関", value: "entrance" },
          { label: "収納", value: "storage_area" },
          { label: "外観", value: "exterior_area" },
          { label: "その他", value: "other" }
        ]
      },
      {
        key: "exterior_target_area",
        kind: "choice",
        prompt_timeline_body: "プラン・間取り相談 外観対象選択案内済み",
        value_timeline_prefix: "プラン・間取り相談 外観対象: ",
        prompt_reply: "外観で相談したい箇所を次から選んで送ってください。",
        retry_reply: "外観で相談したい箇所を次から選んで送ってください。",
        is_applicable: isPlanConsultationExteriorTargetRequest,
        options: [
          { label: "外観全体", value: "overall_exterior" },
          { label: "屋根", value: "roof" },
          { label: "外壁", value: "wall" },
          { label: "玄関まわり", value: "entrance_exterior" },
          { label: "窓まわり", value: "window_exterior" },
          { label: "外構", value: "exterior_site" },
          { label: "その他", value: "other" }
        ]
      },
      {
        key: "body",
        kind: "text",
        prompt_timeline_body: "プラン・間取り相談 内容入力案内済み",
        value_timeline_prefix: "プラン・間取り相談 相談内容: ",
        prompt_reply: [
          "具体的な相談内容を入力してください。",
          "参考画像や手書きメモがあれば、このあとLINEで送ってください。"
        ].join("\n"),
        retry_reply: "具体的な相談内容を入力して送ってください。"
      },
      {
        key: "request_priority",
        kind: "choice",
        prompt_timeline_body: "プラン・間取り相談 希望優先度選択案内済み",
        value_timeline_prefix: "プラン・間取り相談 希望優先度: ",
        prompt_reply: "希望の優先度を次から選んで送ってください。",
        retry_reply: "希望の優先度を次から選んで送ってください。",
        options: [
          { label: "必ず反映したい", value: "must_have" },
          { label: "できれば反映したい", value: "nice_to_have" },
          { label: "相談して決めたい", value: "consult" }
        ]
      }
    ]
  },
  {
    flow_key: "negotiation.estimate_budget",
    trigger_text: "見積・資金計画",
    title: "見積・資金計画",
    start_activity_label: "見積・資金計画を開始",
    category: "estimate_budget",
    assigned_role: "sales",
    secondary_role: "estimator",
    default_severity: "medium",
    default_priority: "normal",
    ai_auto_reply: false,
    requires_staff_confirmation: true,
    steps: [
      {
        key: "sub_category",
        kind: "choice",
        prompt_timeline_body: "見積・資金計画 内容選択案内済み",
        value_timeline_prefix: "見積・資金計画 内容: ",
        prompt_reply: "相談内容を次から選んで送ってください。",
        retry_reply: "相談内容を次から選んで送ってください。",
        options: [
          { label: "見積について確認したい", value: "estimate", notification_label: "見積" },
          { label: "予算について相談したい", value: "budget", notification_label: "予算" },
          { label: "住宅ローンについて相談したい", value: "loan", notification_label: "住宅ローン" },
          { label: "補助金について相談したい", value: "subsidy", notification_label: "補助金" },
          { label: "追加費用について確認したい", value: "additional_cost", notification_label: "追加費用" },
          { label: "減額案を相談したい", value: "cost_reduction", notification_label: "減額案" },
          { label: "その他", value: "other", notification_label: "その他" }
        ]
      },
      {
        key: "current_status",
        kind: "choice",
        prompt_timeline_body: "見積・資金計画 現在状況選択案内済み",
        value_timeline_prefix: "見積・資金計画 現在状況: ",
        prompt_reply: "現在の状況を次から選んで送ってください。",
        retry_reply: "現在の状況を次から選んで送ってください。",
        options: [
          { label: "初回見積前", value: "before_first_estimate" },
          { label: "見積確認中", value: "reviewing_estimate" },
          { label: "プラン変更後", value: "after_plan_change" },
          { label: "契約前", value: "pre_contract" },
          { label: "ローン相談中", value: "loan_consulting" },
          { label: "その他", value: "other" }
        ]
      },
      {
        key: "body",
        kind: "text",
        prompt_timeline_body: "見積・資金計画 内容入力案内済み",
        value_timeline_prefix: "見積・資金計画 気になる内容: ",
        prompt_reply: "気になっている内容を入力してください。",
        retry_reply: "気になっている内容を入力して送ってください。"
      },
      {
        key: "desired_response",
        kind: "choice",
        prompt_timeline_body: "見積・資金計画 希望対応選択案内済み",
        value_timeline_prefix: "見積・資金計画 希望対応: ",
        prompt_reply: "希望する対応を次から選んで送ってください。",
        retry_reply: "希望する対応を次から選んで送ってください。",
        options: [
          { label: "説明してほしい", value: "explain" },
          { label: "見直し案がほしい", value: "revision_proposal" },
          { label: "金額を確認したい", value: "confirm_amount" },
          { label: "次回打合せで相談したい", value: "next_meeting" }
        ]
      }
    ]
  },
  {
    flow_key: "negotiation.land_site",
    trigger_text: "土地・敷地の相談",
    title: "土地・敷地の相談",
    start_activity_label: "土地・敷地の相談を開始",
    category: "land_site",
    assigned_role: "sales",
    secondary_role: "designer_or_site_staff",
    default_severity: "medium",
    default_priority: "normal",
    ai_auto_reply: false,
    requires_staff_confirmation: true,
    steps: [
      {
        key: "sub_category",
        kind: "choice",
        prompt_timeline_body: "土地・敷地の相談 内容選択案内済み",
        value_timeline_prefix: "土地・敷地の相談 内容: ",
        prompt_reply: "相談内容を次から選んで送ってください。",
        retry_reply: "相談内容を次から選んで送ってください。",
        options: [
          { label: "土地を探している", value: "land_search", notification_label: "土地探し" },
          { label: "候補地について相談したい", value: "candidate_land", notification_label: "候補地あり" },
          { label: "所有地について相談したい", value: "owned_land", notification_label: "所有地あり" },
          { label: "敷地調査をお願いしたい", value: "site_survey", notification_label: "敷地調査" },
          { label: "造成・外構について相談したい", value: "development_exterior", notification_label: "造成・外構" },
          { label: "その他", value: "other", notification_label: "その他" }
        ]
      },
      {
        key: "land_status",
        kind: "choice",
        prompt_timeline_body: "土地・敷地の相談 土地状況選択案内済み",
        value_timeline_prefix: "土地・敷地の相談 土地状況: ",
        prompt_reply: "土地の状況を次から選んで送ってください。",
        retry_reply: "土地の状況を次から選んで送ってください。",
        is_applicable: isLandStatusQuestionNeeded,
        options: [
          { label: "まだ土地なし", value: "no_land" },
          { label: "候補地あり", value: "candidate_land" },
          { label: "所有地あり", value: "owned_land" },
          { label: "契約予定", value: "planned_contract" },
          { label: "不明", value: "unknown" }
        ]
      },
      {
        key: "area",
        kind: "text",
        prompt_timeline_body: "土地・敷地の相談 エリア入力案内済み",
        value_timeline_prefix: "土地・敷地の相談 住所またはエリア: ",
        prompt_reply: "住所またはエリアを入力してください。",
        retry_reply: "住所またはエリアを入力して送ってください。"
      },
      {
        key: "body",
        kind: "text",
        prompt_timeline_body: "土地・敷地の相談 内容入力案内済み",
        value_timeline_prefix: "土地・敷地の相談 確認内容: ",
        prompt_reply: [
          "確認したい内容を入力してください。",
          "資料や写真があれば、このあとLINEで送ってください。"
        ].join("\n"),
        retry_reply: "確認したい内容を入力して送ってください。"
      }
    ]
  },
  {
    flow_key: "negotiation.required_documents",
    trigger_text: "必要書類・確認事項",
    title: "必要書類・確認事項",
    start_activity_label: "必要書類・確認事項を開始",
    category: "documents",
    assigned_role: "sales_admin",
    secondary_role: "sales",
    default_severity: "medium",
    default_priority: "normal",
    ai_auto_reply: false,
    requires_staff_confirmation: true,
    steps: [
      {
        key: "sub_category",
        kind: "choice",
        prompt_timeline_body: "必要書類・確認事項 内容選択案内済み",
        value_timeline_prefix: "必要書類・確認事項 内容: ",
        prompt_reply: "確認したい内容を次から選んで送ってください。",
        retry_reply: "確認したい内容を次から選んで送ってください。",
        options: [
          { label: "必要書類を知りたい", value: "required_docs", notification_label: "必要書類" },
          { label: "提出済み書類を確認したい", value: "submitted_docs", notification_label: "提出済み書類" },
          { label: "これから提出する書類について", value: "future_submission", notification_label: "これから提出する書類" },
          { label: "契約前の確認", value: "pre_contract", notification_label: "契約前確認" },
          { label: "ローン関連書類", value: "loan_docs", notification_label: "ローン関連書類" },
          { label: "補助金関連書類", value: "subsidy_docs", notification_label: "補助金関連書類" },
          { label: "その他", value: "other", notification_label: "その他" }
        ]
      },
      {
        key: "current_stage",
        kind: "choice",
        prompt_timeline_body: "必要書類・確認事項 現在段階選択案内済み",
        value_timeline_prefix: "必要書類・確認事項 現在段階: ",
        prompt_reply: "現在の段階を次から選んで送ってください。",
        retry_reply: "現在の段階を次から選んで送ってください。",
        is_applicable: isDocumentStageQuestionNeeded,
        options: [
          { label: "初回相談", value: "first_consultation" },
          { label: "プラン提案中", value: "plan_proposal" },
          { label: "見積確認中", value: "estimate_review" },
          { label: "契約前", value: "pre_contract" },
          { label: "ローン審査中", value: "loan_review" },
          { label: "その他", value: "other" }
        ]
      },
      {
        key: "body",
        kind: "text",
        prompt_timeline_body: "必要書類・確認事項 内容入力案内済み",
        value_timeline_prefix: "必要書類・確認事項 具体内容: ",
        prompt_reply: [
          "具体的な内容を入力してください。",
          "書類画像があれば、このあとLINEで送ってください。"
        ].join("\n"),
        retry_reply: "具体的な内容を入力して送ってください。"
      }
    ]
  }
] as const satisfies readonly StructuredConsultationFlowConfig[];

const structuredConsultationStartTimelinePrefix = "相談フロー開始: ";
const structuredConsultationAcceptedTimelinePrefix = "相談フロー受付済み: ";

export function resolveCustomerContactStaffCategory(text: string | null): string | null {
  const normalized = text?.trim();

  if (!normalized) {
    return null;
  }

  return customerContactStaffCategories.find((category) => category === normalized) ?? null;
}

function resolveCustomerContactStaffPriority(
  text: string | null
): (typeof customerContactStaffPriorityOptions)[number] | null {
  const normalized = text?.trim();

  if (!normalized) {
    return null;
  }

  return customerContactStaffPriorityOptions.find((option) => option.label === normalized) ?? null;
}

function resolveStructuredConsultationFlowTrigger(
  text: string | null
): StructuredConsultationFlowConfig | null {
  const normalized = text?.trim();

  if (!normalized) {
    return null;
  }

  return (
    structuredConsultationFlowConfigs.find((config) => config.trigger_text === normalized) ?? null
  );
}

function resolveStructuredConsultationOption(
  step: StructuredConsultationStep,
  text: string | null
): StructuredConsultationOption | null {
  const normalized = text?.trim();

  if (!normalized || step.kind !== "choice") {
    return null;
  }

  return step.options.find((option) => option.label === normalized) ?? null;
}

export async function upsertLineCustomer(
  repository: CustomerRepository,
  input: UpsertLineCustomerInput,
  options: { createId?: () => string; now?: () => string } = {}
): Promise<Customer> {
  const parsed = customerCreateSchema.parse({
    tenant_id: input.tenant_id,
    line_user_id: input.line_user_id,
    display_name: input.display_name ?? null,
    response_mode: "bot_auto",
    status: "new"
  });
  const now = options.now?.() ?? new Date().toISOString();
  const existing = await repository.findByTenantAndLineUserId(
    parsed.tenant_id,
    input.line_user_id
  );

  if (existing) {
    const updated: Customer = {
      ...existing,
      display_name: parsed.display_name ?? existing.display_name,
      response_mode: resolveNextCustomerResponseMode(existing, input.response_mode),
      last_message_at: input.last_customer_message_at ?? existing.last_message_at,
      last_customer_message_at:
        input.last_customer_message_at ?? existing.last_customer_message_at,
      updated_at: now
    };

    return repository.save(updated);
  }

  const customer: Customer = {
    id: options.createId?.() ?? createDefaultId(),
    tenant_id: parsed.tenant_id,
    line_user_id: input.line_user_id,
    display_name: parsed.display_name ?? null,
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: parsed.interest_tags,
    response_mode: input.response_mode ?? parsed.response_mode,
    status: parsed.status,
    last_message_at: input.last_customer_message_at ?? null,
    last_customer_message_at: input.last_customer_message_at ?? null,
    last_staff_reply_at: null,
    created_at: now,
    updated_at: now
  };

  return repository.save(customer);
}

export async function ensureOpenUnrepliedCustomerMessageAlert(
  input: EnsureOpenUnrepliedCustomerMessageAlertInput
): Promise<EnsureOpenUnrepliedCustomerMessageAlertResult> {
  assertTenantScoped(input.customer, input.tenant_id);

  const existingAlert = await input.alertRepository.findActiveByCustomerAndType(
    input.tenant_id,
    input.customer.id,
    "unreplied_customer_message"
  );

  if (existingAlert) {
    const now = input.now?.() ?? new Date().toISOString();
    const refreshedAlert = await input.alertRepository.updateStatus({
      tenant_id: input.tenant_id,
      alert_id: existingAlert.id,
      status: "open",
      ...(input.severity ? { severity: input.severity } : {}),
      ...(input.message ? { message: input.message } : {}),
      notified_at: null,
      updated_at: now
    });

    return {
      alert: refreshedAlert ?? existingAlert,
      created: false,
      notification_required: Boolean(refreshedAlert),
      reopened: existingAlert.status === "notified" && Boolean(refreshedAlert)
    };
  }

  const now = input.now?.() ?? new Date().toISOString();
  const alert = createUnrepliedAlert({
    tenant_id: input.tenant_id,
    customer: input.customer,
    ...(input.message !== undefined ? { message: input.message } : {}),
    ...(input.severity ? { severity: input.severity } : {}),
    now,
    ...(input.createId ? { createId: input.createId } : {})
  });

  return {
    alert: await input.alertRepository.create(alert),
    created: true,
    notification_required: true,
    reopened: false
  };
}

export async function insertLineTextMessage(
  repository: MessageRepository,
  input: InsertLineTextMessageInput,
  options: { createId?: () => string } = {}
): Promise<Message> {
  const parsed = messageCreateSchema.parse({
    tenant_id: input.tenant_id,
    customer_id: input.customer_id,
    line_message_id: input.line_message_id,
    role: "customer",
    message_type: "text",
    body: input.body
  });
  const message: Message = {
    id: options.createId?.() ?? createDefaultId(),
    tenant_id: parsed.tenant_id,
    customer_id: parsed.customer_id,
    consultation_id: null,
    line_message_id: input.line_message_id,
    role: parsed.role,
    message_type: parsed.message_type,
    body: parsed.body ?? null,
    media_storage_path: null,
    staff_user_id: null,
    ai_generated: parsed.ai_generated,
    sent_to_line_at: null,
    created_at: input.created_at
  };

  return repository.insert(message);
}

export async function insertRichMenuGuideTimelineMessage(
  repository: MessageRepository,
  input: {
    tenant_id: string;
    customer_id: string;
    action: CustomerRichMenuGuideAction;
    created_at: string;
  },
  options: { createId?: () => string } = {}
): Promise<Message> {
  const parsed = messageCreateSchema.parse({
    tenant_id: input.tenant_id,
    customer_id: input.customer_id,
    line_message_id: null,
    role: "system",
    message_type: input.action.message_type,
    body: input.action.timeline_body,
    media_storage_path: input.action.target_url
  });
  const message: Message = {
    id: options.createId?.() ?? createDefaultId(),
    tenant_id: parsed.tenant_id,
    customer_id: parsed.customer_id,
    consultation_id: parsed.consultation_id ?? null,
    line_message_id: parsed.line_message_id ?? null,
    role: parsed.role,
    message_type: parsed.message_type,
    body: parsed.body ?? null,
    media_storage_path: parsed.media_storage_path ?? null,
    staff_user_id: parsed.staff_user_id ?? null,
    ai_generated: parsed.ai_generated,
    sent_to_line_at: null,
    created_at: input.created_at
  };

  return repository.insert(message);
}

async function insertSystemTextTimelineMessage(
  repository: MessageRepository,
  input: {
    tenant_id: string;
    customer_id: string;
    body: string;
    created_at: string;
  },
  options: { createId?: () => string } = {}
): Promise<Message> {
  const parsed = messageCreateSchema.parse({
    tenant_id: input.tenant_id,
    customer_id: input.customer_id,
    line_message_id: null,
    role: "system",
    message_type: "text",
    body: input.body
  });
  const message: Message = {
    id: options.createId?.() ?? createDefaultId(),
    tenant_id: parsed.tenant_id,
    customer_id: parsed.customer_id,
    consultation_id: parsed.consultation_id ?? null,
    line_message_id: parsed.line_message_id ?? null,
    role: parsed.role,
    message_type: parsed.message_type,
    body: parsed.body ?? null,
    media_storage_path: null,
    staff_user_id: parsed.staff_user_id ?? null,
    ai_generated: parsed.ai_generated,
    sent_to_line_at: null,
    created_at: input.created_at
  };

  return repository.insert(message);
}

export async function recordCustomerRichMenuSwitchMessage(
  repository: MessageRepository,
  input: {
    tenant_id: string;
    customer_id: string;
    menu_type: CustomerRichMenuType;
    created_at: string;
  },
  options: { createId?: () => string } = {}
): Promise<Message> {
  return insertSystemTextTimelineMessage(
    repository,
    {
      tenant_id: input.tenant_id,
      customer_id: input.customer_id,
      body: `LINEリッチメニューを${formatCustomerRichMenuTypeLabel(
        input.menu_type
      )}へ切り替えました。`,
      created_at: input.created_at
    },
    options
  );
}

export async function recordStaffTextReply(
  input: RecordStaffTextReplyInput
): Promise<RecordStaffTextReplyResult> {
  assertTenantScoped(input.customer, input.tenant_id);

  const now = input.now?.() ?? new Date().toISOString();
  const parsed = messageCreateSchema.parse({
    tenant_id: input.tenant_id,
    customer_id: input.customer.id,
    line_message_id: null,
    role: "staff",
    message_type: "text",
    body: input.body,
    staff_user_id: input.staff_user_id ?? null,
    sent_to_line_at: now
  });
  const message: Message = {
    id: input.createId?.() ?? createDefaultId(),
    tenant_id: parsed.tenant_id,
    customer_id: parsed.customer_id,
    consultation_id: parsed.consultation_id ?? null,
    line_message_id: parsed.line_message_id ?? null,
    role: parsed.role,
    message_type: parsed.message_type,
    body: parsed.body ?? null,
    media_storage_path: parsed.media_storage_path ?? null,
    staff_user_id: parsed.staff_user_id ?? null,
    ai_generated: parsed.ai_generated,
    sent_to_line_at: parsed.sent_to_line_at ?? null,
    created_at: now
  };
  const updatedCustomer: Customer = {
    ...input.customer,
    response_mode: "human_active",
    last_staff_reply_at: now,
    updated_at: now
  };

  const savedMessage = await input.messageRepository.insert(message);
  const savedCustomer = await input.customerRepository.save(updatedCustomer);

  return {
    customer: savedCustomer,
    message: savedMessage
  };
}

export async function recordAiSummaryMessage(input: RecordAiSummaryMessageInput): Promise<Message> {
  assertTenantScoped(input.customer, input.tenant_id);

  const now = input.now?.() ?? new Date().toISOString();
  const parsed = messageCreateSchema.parse({
    tenant_id: input.tenant_id,
    customer_id: input.customer.id,
    line_message_id: null,
    role: "ai",
    message_type: "summary",
    body: input.body,
    ai_generated: true,
    sent_to_line_at: null
  });
  const message: Message = {
    id: input.createId?.() ?? createDefaultId(),
    tenant_id: parsed.tenant_id,
    customer_id: parsed.customer_id,
    consultation_id: parsed.consultation_id ?? null,
    line_message_id: parsed.line_message_id ?? null,
    role: parsed.role,
    message_type: parsed.message_type,
    body: parsed.body ?? null,
    media_storage_path: parsed.media_storage_path ?? null,
    staff_user_id: parsed.staff_user_id ?? null,
    ai_generated: parsed.ai_generated,
    sent_to_line_at: parsed.sent_to_line_at ?? null,
    created_at: now
  };

  return input.messageRepository.insert(message);
}

export async function checkUnrepliedAlerts(
  input: CheckUnrepliedAlertsInput
): Promise<CheckUnrepliedAlertsResult> {
  const now = input.now?.() ?? new Date().toISOString();
  const nowTime = Date.parse(now);
  const customers = await input.customerRepository.listByTenant(input.tenant_id);
  const alerts: Alert[] = [];

  for (const customer of customers) {
    if (!shouldCreateUnrepliedAlert(customer, nowTime)) {
      continue;
    }

    const existingAlert = await input.alertRepository.findActiveByCustomerAndType(
      input.tenant_id,
      customer.id,
      "unreplied_customer_message"
    );

    if (existingAlert) {
      continue;
    }

    const alert = createUnrepliedAlert({
      tenant_id: input.tenant_id,
      customer,
      now,
      ...(input.createId ? { createId: input.createId } : {})
    });

    alerts.push(await input.alertRepository.create(alert));
  }

  return {
    tenant_id: input.tenant_id,
    checked_customers: customers.length,
    alerts_created: alerts.length,
    alerts
  };
}

export async function notifyOpenAlerts(
  input: NotifyOpenAlertsInput
): Promise<NotifyOpenAlertsResult> {
  const now = input.now?.() ?? new Date().toISOString();
  const tenantAlerts = await input.alertRepository.listByTenant(input.tenant_id);
  const openAlerts = await input.alertRepository.listOpenByTenant(input.tenant_id);
  const notifiedAlerts: Alert[] = [];
  const failedAlerts: Alert[] = [];

  for (const alert of openAlerts) {
    const customer = input.customerRepository
      ? await input.customerRepository.findByIdForTenant(alert.tenant_id, alert.customer_id)
      : null;
    const payload = buildStaffNotificationPayload(alert, {
      ...(input.adminBaseUrl ? { adminBaseUrl: input.adminBaseUrl } : {}),
      customer
    });

    try {
      await input.staffNotifier.notify(payload);
    } catch {
      failedAlerts.push(alert);
      continue;
    }

    const updated = await input.alertRepository.updateStatus({
      tenant_id: input.tenant_id,
      alert_id: alert.id,
      status: "notified",
      notified_at: now,
      updated_at: now
    });

    if (updated) {
      notifiedAlerts.push(updated);
    }
  }

  return {
    tenant_id: input.tenant_id,
    notified: notifiedAlerts.length,
    failed: failedAlerts.length,
    skipped: tenantAlerts.length - openAlerts.length,
    notified_alerts: notifiedAlerts,
    failed_alerts: failedAlerts
  };
}

export async function logLineWebhookEvents(
  input: LogLineWebhookEventsInput
): Promise<LogLineWebhookEventsResult> {
  let customersUpserted = 0;
  let messagesInserted = 0;
  let alertsCreated = 0;
  let alertsNotificationRequired = 0;
  let richMenuGuidesLogged = 0;
  let contactStaffFlowsLogged = 0;
  let contactStaffAlertsCreated = 0;
  let contactStaffAlertsNotificationRequired = 0;
  let structuredConsultationFlowsLogged = 0;
  let structuredConsultationAlertsCreated = 0;
  let structuredConsultationAlertsNotificationRequired = 0;
  let unsupportedEvents = 0;
  const lineReplyInstructions: LineReplyInstruction[] = [];
  const staffNotificationAlerts: Alert[] = [];
  const staffNotificationEvents: CustomerLineStaffNotificationEvent[] = [];
  const serviceOptions = createMessageLoggingServiceOptions(input);
  const lineDisplayNameCache = new Map<string, string | null>();

  for (const event of input.events) {
    const eventTime = lineEventTimestampToIsoString(event.timestamp, input.now);

    if (event.type === "follow" && event.source_user_id) {
      const displayName = await resolveLineDisplayName(
        input,
        event.source_user_id,
        lineDisplayNameCache
      );

      await upsertLineCustomer(
        input.customerRepository,
        {
          tenant_id: input.tenant_id,
          line_user_id: event.source_user_id,
          display_name: displayName
        },
        serviceOptions
      );
      customersUpserted += 1;
      continue;
    }

    if (
      event.type === "message" &&
      event.message_type === "text" &&
      event.source_user_id &&
      event.message_id
    ) {
      const displayName = await resolveLineDisplayName(
        input,
        event.source_user_id,
        lineDisplayNameCache
      );
      const guideAction = resolveCustomerRichMenuGuideAction(event.text);

      if (guideAction) {
        const customer = await upsertLineCustomer(
          input.customerRepository,
          {
            tenant_id: input.tenant_id,
            line_user_id: event.source_user_id,
            display_name: displayName
          },
          serviceOptions
        );
        await insertRichMenuGuideTimelineMessage(
          input.messageRepository,
          {
            tenant_id: input.tenant_id,
            customer_id: customer.id,
            action: guideAction,
            created_at: eventTime
          },
          serviceOptions
        );
        customersUpserted += 1;
        messagesInserted += 1;
        richMenuGuidesLogged += 1;
        staffNotificationEvents.push({
          tenant_id: input.tenant_id,
          customer_id: customer.id,
          customer_display_name: customer.display_name,
          customer_phone: customer.phone,
          customer_email: customer.email,
          customer_address: customer.address,
          action_label: guideAction.timeline_body,
          occurred_at: eventTime
        });
        continue;
      }

      const structuredConsultationTrigger = resolveStructuredConsultationFlowTrigger(event.text);

      if (structuredConsultationTrigger) {
        const customer = await upsertLineCustomer(
          input.customerRepository,
          {
            tenant_id: input.tenant_id,
            line_user_id: event.source_user_id,
            display_name: displayName
          },
          serviceOptions
        );
        const structuredConsultationFlow = await startStructuredConsultationFlow({
          tenant_id: input.tenant_id,
          customer,
          config: structuredConsultationTrigger,
          event_time: eventTime,
          reply_token: event.reply_token ?? null,
          messageRepository: input.messageRepository,
          serviceOptions
        });

        customersUpserted += 1;
        messagesInserted += structuredConsultationFlow.messages_inserted;
        structuredConsultationFlowsLogged += 1;
        if (structuredConsultationFlow.staff_notification_event) {
          staffNotificationEvents.push(structuredConsultationFlow.staff_notification_event);
        }
        if (structuredConsultationFlow.reply) {
          lineReplyInstructions.push(structuredConsultationFlow.reply);
        }
        continue;
      }

      if (event.text?.trim() === customerContactStaffTriggerText) {
        const customer = await upsertLineCustomer(
          input.customerRepository,
          {
            tenant_id: input.tenant_id,
            line_user_id: event.source_user_id,
            display_name: displayName
          },
          serviceOptions
        );
        await insertSystemTextTimelineMessage(
          input.messageRepository,
          {
            tenant_id: input.tenant_id,
            customer_id: customer.id,
            body: contactStaffCategoryPromptTimelineBody,
            created_at: eventTime
          },
          serviceOptions
        );
        lineReplyInstructions.push({
          reply_token: event.reply_token ?? null,
          text: buildContactStaffCategoryPromptReply(),
          quick_reply_texts: [...customerContactStaffCategories]
        });
        staffNotificationEvents.push({
          tenant_id: input.tenant_id,
          customer_id: customer.id,
          customer_display_name: customer.display_name,
          customer_phone: customer.phone,
          customer_email: customer.email,
          customer_address: customer.address,
          action_label: contactStaffStartActivityLabel,
          occurred_at: eventTime
        });
        customersUpserted += 1;
        messagesInserted += 1;
        contactStaffFlowsLogged += 1;
        continue;
      }

      const customer = await upsertLineCustomer(
        input.customerRepository,
        {
          tenant_id: input.tenant_id,
          line_user_id: event.source_user_id,
          display_name: displayName
        },
        serviceOptions
      );
      const structuredConsultationFlow = await handleStructuredConsultationFlowMessage({
        tenant_id: input.tenant_id,
        customer,
        text: event.text,
        line_message_id: event.message_id,
        event_time: eventTime,
        reply_token: event.reply_token ?? null,
        customerRepository: input.customerRepository,
        messageRepository: input.messageRepository,
        alertRepository: input.alertRepository,
        createId: input.createId,
        serviceOptions
      });

      if (structuredConsultationFlow.handled) {
        customersUpserted += 1;
        messagesInserted += structuredConsultationFlow.messages_inserted;
        alertsCreated += structuredConsultationFlow.alert_created ? 1 : 0;
        alertsNotificationRequired += structuredConsultationFlow.alert_notification_required
          ? 1
          : 0;
        structuredConsultationAlertsCreated += structuredConsultationFlow.alert_created ? 1 : 0;
        structuredConsultationAlertsNotificationRequired +=
          structuredConsultationFlow.alert_notification_required ? 1 : 0;
        if (
          structuredConsultationFlow.alert_notification_required &&
          structuredConsultationFlow.alert
        ) {
          staffNotificationAlerts.push(structuredConsultationFlow.alert);
        }
        if (structuredConsultationFlow.staff_notification_event) {
          staffNotificationEvents.push(structuredConsultationFlow.staff_notification_event);
        }
        structuredConsultationFlowsLogged += 1;
        if (structuredConsultationFlow.reply) {
          lineReplyInstructions.push(structuredConsultationFlow.reply);
        }
        continue;
      }

      const contactStaffFlow = await handleContactStaffFlowMessage({
        tenant_id: input.tenant_id,
        customer,
        text: event.text,
        line_message_id: event.message_id,
        event_time: eventTime,
        reply_token: event.reply_token ?? null,
        customerRepository: input.customerRepository,
        messageRepository: input.messageRepository,
        alertRepository: input.alertRepository,
        createId: input.createId,
        serviceOptions
      });

      if (contactStaffFlow.handled) {
        customersUpserted += 1;
        messagesInserted += contactStaffFlow.messages_inserted;
        alertsCreated += contactStaffFlow.alert_created ? 1 : 0;
        alertsNotificationRequired += contactStaffFlow.alert_notification_required ? 1 : 0;
        contactStaffAlertsCreated += contactStaffFlow.alert_created ? 1 : 0;
        contactStaffAlertsNotificationRequired += contactStaffFlow.alert_notification_required
          ? 1
          : 0;
        if (contactStaffFlow.alert_notification_required && contactStaffFlow.alert) {
          staffNotificationAlerts.push(contactStaffFlow.alert);
        }
        if (contactStaffFlow.staff_notification_event) {
          staffNotificationEvents.push(contactStaffFlow.staff_notification_event);
        }
        contactStaffFlowsLogged += 1;
        if (contactStaffFlow.reply) {
          lineReplyInstructions.push(contactStaffFlow.reply);
        }
        continue;
      }

      const updatedCustomer = await upsertLineCustomer(
        input.customerRepository,
        {
          tenant_id: input.tenant_id,
          line_user_id: event.source_user_id,
          display_name: displayName,
          response_mode: "human_required",
          last_customer_message_at: eventTime
        },
        serviceOptions
      );
      await insertLineTextMessage(
        input.messageRepository,
        {
          tenant_id: input.tenant_id,
          customer_id: updatedCustomer.id,
          line_message_id: event.message_id,
          body: event.text,
          created_at: eventTime
        },
        serviceOptions
      );
      if (input.alertRepository) {
        const alertResult = await ensureOpenUnrepliedCustomerMessageAlert({
          tenant_id: input.tenant_id,
          customer: updatedCustomer,
          alertRepository: input.alertRepository,
          ...(event.text ? { message: event.text } : {}),
          ...(input.createId ? { createId: input.createId } : {}),
          now: () => eventTime
        });

        if (alertResult.created) {
          alertsCreated += 1;
        }
        if (alertResult.notification_required) {
          alertsNotificationRequired += 1;
          if (alertResult.alert) {
            staffNotificationAlerts.push(alertResult.alert);
          }
        }
      }
      customersUpserted += 1;
      messagesInserted += 1;
      continue;
    }

    unsupportedEvents += 1;
  }

  return {
    customers_upserted: customersUpserted,
    messages_inserted: messagesInserted,
    alerts_created: alertsCreated,
    alerts_notification_required: alertsNotificationRequired,
    rich_menu_guides_logged: richMenuGuidesLogged,
    contact_staff_flows_logged: contactStaffFlowsLogged,
    contact_staff_alerts_created: contactStaffAlertsCreated,
    contact_staff_alerts_notification_required: contactStaffAlertsNotificationRequired,
    structured_consultation_flows_logged: structuredConsultationFlowsLogged,
    structured_consultation_alerts_created: structuredConsultationAlertsCreated,
    structured_consultation_alerts_notification_required:
      structuredConsultationAlertsNotificationRequired,
    unsupported_events: unsupportedEvents,
    line_reply_instructions: lineReplyInstructions,
    staff_notification_alerts: staffNotificationAlerts,
    staff_notification_events: staffNotificationEvents
  };
}

type StructuredConsultationFlowResult = {
  handled: boolean;
  messages_inserted: number;
  alert_created: boolean;
  alert_notification_required: boolean;
  alert: Alert | null;
  staff_notification_event: CustomerLineStaffNotificationEvent | null;
  reply: LineReplyInstruction | null;
};

type StructuredConsultationFlowState =
  | { stage: "none" }
  | {
      stage: "awaiting_step";
      config: StructuredConsultationFlowConfig;
      step: StructuredConsultationStep;
      step_index: number;
      values: Record<string, string>;
    };

async function startStructuredConsultationFlow(input: {
  tenant_id: string;
  customer: Customer;
  config: StructuredConsultationFlowConfig;
  event_time: string;
  reply_token: string | null;
  messageRepository: MessageRepository;
  serviceOptions: { createId?: () => string; now?: () => string };
}): Promise<StructuredConsultationFlowResult> {
  const firstStepState = resolveNextStructuredConsultationStep(input.config, {});
  const firstStep = firstStepState?.step;

  if (!firstStep) {
    return createUnhandledStructuredConsultationFlowResult();
  }

  await insertSystemTextTimelineMessage(
    input.messageRepository,
    {
      tenant_id: input.tenant_id,
      customer_id: input.customer.id,
      body: buildStructuredConsultationStartTimelineBody(input.config),
      created_at: input.event_time
    },
    input.serviceOptions
  );
  await insertSystemTextTimelineMessage(
    input.messageRepository,
    {
      tenant_id: input.tenant_id,
      customer_id: input.customer.id,
      body: firstStep.prompt_timeline_body,
      created_at: input.event_time
    },
    input.serviceOptions
  );

  return {
    handled: true,
    messages_inserted: 2,
    alert_created: false,
    alert_notification_required: false,
    alert: null,
    staff_notification_event: {
      tenant_id: input.tenant_id,
      customer_id: input.customer.id,
      customer_display_name: input.customer.display_name,
      customer_phone: input.customer.phone,
      customer_email: input.customer.email,
      customer_address: input.customer.address,
      action_label: input.config.start_activity_label,
      occurred_at: input.event_time
    },
    reply: buildStructuredConsultationStepReply(input.reply_token, firstStep)
  };
}

async function handleStructuredConsultationFlowMessage(input: {
  tenant_id: string;
  customer: Customer;
  text: string | null;
  line_message_id: string | null;
  event_time: string;
  reply_token: string | null;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  alertRepository: AlertRepository | undefined;
  createId: (() => string) | undefined;
  serviceOptions: { createId?: () => string; now?: () => string };
}): Promise<StructuredConsultationFlowResult> {
  const timeline = await input.messageRepository.listByCustomer(input.tenant_id, input.customer.id);
  const flowState = resolveStructuredConsultationFlowState(timeline);

  if (flowState.stage === "none") {
    return createUnhandledStructuredConsultationFlowResult();
  }

  const resolvedValue = resolveStructuredConsultationStepInput(flowState.step, input.text);

  if (!resolvedValue) {
    return {
      handled: true,
      messages_inserted: 0,
      alert_created: false,
      alert_notification_required: false,
      alert: null,
      staff_notification_event: null,
      reply: buildStructuredConsultationStepRetryReply(input.reply_token, flowState.step)
    };
  }

  let messagesInserted = 0;
  if (flowState.step.kind === "text") {
    await insertLineTextMessage(
      input.messageRepository,
      {
        tenant_id: input.tenant_id,
        customer_id: input.customer.id,
        line_message_id: input.line_message_id ?? createDefaultId(),
        body: resolvedValue.label,
        created_at: input.event_time
      },
      input.serviceOptions
    );
    messagesInserted += 1;
  }
  await insertSystemTextTimelineMessage(
    input.messageRepository,
    {
      tenant_id: input.tenant_id,
      customer_id: input.customer.id,
      body: `${flowState.step.value_timeline_prefix}${resolvedValue.label}`,
      created_at: input.event_time
    },
    input.serviceOptions
  );
  messagesInserted += 1;

  const values = {
    ...flowState.values,
    [flowState.step.key]: resolvedValue.label
  };
  const nextStepState = resolveNextStructuredConsultationStep(
    flowState.config,
    values,
    flowState.step_index
  );
  const nextStep = nextStepState?.step;

  if (nextStep) {
    await insertSystemTextTimelineMessage(
      input.messageRepository,
      {
        tenant_id: input.tenant_id,
        customer_id: input.customer.id,
        body: nextStep.prompt_timeline_body,
        created_at: input.event_time
      },
      input.serviceOptions
    );
    messagesInserted += 1;

    return {
      handled: true,
      messages_inserted: messagesInserted,
      alert_created: false,
      alert_notification_required: false,
      alert: null,
      staff_notification_event: {
        tenant_id: input.tenant_id,
        customer_id: input.customer.id,
        customer_display_name: input.customer.display_name,
        customer_phone: input.customer.phone,
        customer_email: input.customer.email,
        customer_address: input.customer.address,
        action_label: `${flowState.step.value_timeline_prefix}${resolvedValue.label}`,
        occurred_at: input.event_time
      },
      reply: buildStructuredConsultationStepReply(input.reply_token, nextStep)
    };
  }

  const updatedCustomer = await input.customerRepository.save({
    ...input.customer,
    response_mode: resolveNextCustomerResponseMode(input.customer, "human_required"),
    last_message_at: input.event_time,
    last_customer_message_at: input.event_time,
    updated_at: input.event_time
  });
  await insertSystemTextTimelineMessage(
    input.messageRepository,
    {
      tenant_id: input.tenant_id,
      customer_id: updatedCustomer.id,
      body: buildStructuredConsultationAcceptedTimelineBody(flowState.config),
      created_at: input.event_time
    },
    input.serviceOptions
  );
  messagesInserted += 1;

  let alertCreated = false;
  let alertNotificationRequired = false;
  let alert: Alert | null = null;
  if (input.alertRepository) {
    const alertResult = await ensureOpenUnrepliedCustomerMessageAlert({
      tenant_id: input.tenant_id,
      customer: updatedCustomer,
      alertRepository: input.alertRepository,
      message: buildStructuredConsultationAlertMessage(flowState.config, values),
      severity: resolveStructuredConsultationAlertSeverity(flowState.config, values),
      ...(input.createId ? { createId: input.createId } : {}),
      now: () => input.event_time
    });
    alertCreated = alertResult.created;
    alertNotificationRequired = alertResult.notification_required;
    alert = alertResult.alert;
  }

  return {
    handled: true,
    messages_inserted: messagesInserted,
    alert_created: alertCreated,
    alert_notification_required: alertNotificationRequired,
    alert,
    staff_notification_event: null,
    reply: {
      reply_token: input.reply_token,
      text: buildStructuredConsultationAcceptedReply(flowState.config)
    }
  };
}

function createUnhandledStructuredConsultationFlowResult(): StructuredConsultationFlowResult {
  return {
    handled: false,
    messages_inserted: 0,
    alert_created: false,
    alert_notification_required: false,
    alert: null,
    staff_notification_event: null,
    reply: null
  };
}

function buildStructuredConsultationStartTimelineBody(
  config: StructuredConsultationFlowConfig
): string {
  return `${structuredConsultationStartTimelinePrefix}${config.flow_key}`;
}

function buildStructuredConsultationAcceptedTimelineBody(
  config: StructuredConsultationFlowConfig
): string {
  return `${structuredConsultationAcceptedTimelinePrefix}${config.flow_key}`;
}

function resolveStructuredConsultationFlowState(messages: Message[]): StructuredConsultationFlowState {
  let latest:
    | {
        start_index: number;
        config: StructuredConsultationFlowConfig;
        step: StructuredConsultationStep;
        step_index: number;
        values: StructuredConsultationValues;
      }
    | null = null;

  for (const config of structuredConsultationFlowConfigs) {
    const lastAcceptedIndex = findLastMessageIndex(
      messages,
      (message) =>
        message.role === "system" &&
        message.body === buildStructuredConsultationAcceptedTimelineBody(config)
    );
    const activeMessages = messages.slice(lastAcceptedIndex + 1);
    const startIndex = findLastMessageIndex(
      activeMessages,
      (message) =>
        message.role === "system" &&
        message.body === buildStructuredConsultationStartTimelineBody(config)
    );

    if (startIndex < 0) {
      continue;
    }

    const flowMessages = activeMessages.slice(startIndex);
    const values: StructuredConsultationValues = {};
    for (const step of config.steps) {
      const valueMessage = findLastMessage(flowMessages, (message) =>
        Boolean(message.role === "system" && message.body?.startsWith(step.value_timeline_prefix))
      );
      const value = valueMessage?.body?.slice(step.value_timeline_prefix.length).trim();

      if (value) {
        values[step.key] = value;
      }
    }

    const stepState = resolveNextStructuredConsultationStep(config, values);
    const stepIndex = stepState?.step_index ?? -1;
    const step = stepState?.step;

    if (stepIndex < 0 || !step) {
      continue;
    }

    const absoluteStartIndex = lastAcceptedIndex + 1 + startIndex;
    if (!latest || absoluteStartIndex > latest.start_index) {
      latest = {
        start_index: absoluteStartIndex,
        config,
        step,
        step_index: stepIndex,
        values
      };
    }
  }

  if (!latest) {
    return { stage: "none" };
  }

  return {
    stage: "awaiting_step",
    config: latest.config,
    step: latest.step,
    step_index: latest.step_index,
    values: latest.values
  };
}

function resolveNextStructuredConsultationStep(
  config: StructuredConsultationFlowConfig,
  values: StructuredConsultationValues,
  afterStepIndex = -1
): { step: StructuredConsultationStep; step_index: number } | null {
  for (let index = afterStepIndex + 1; index < config.steps.length; index += 1) {
    const step = config.steps[index];

    if (!step) {
      continue;
    }

    if (values[step.key]) {
      continue;
    }

    if (step.is_applicable && !step.is_applicable(values)) {
      continue;
    }

    return { step, step_index: index };
  }

  return null;
}

function resolveStructuredConsultationStepInput(
  step: StructuredConsultationStep,
  text: string | null
): { label: string; value: string } | null {
  const normalized = sanitizeStructuredConsultationFieldValue(text ?? "");

  if (!normalized) {
    return null;
  }

  if (step.kind === "choice") {
    const option = resolveStructuredConsultationOption(step, normalized);
    return option ? { label: option.label, value: option.value } : null;
  }

  return { label: normalized, value: normalized };
}

function buildStructuredConsultationStepReply(
  replyToken: string | null,
  step: StructuredConsultationStep
): LineReplyInstruction {
  return {
    reply_token: replyToken,
    text: [
      step.prompt_reply,
      step.kind === "choice" ? "" : null,
      ...(step.kind === "choice" ? step.options.map((option) => `・${option.label}`) : [])
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    ...(step.kind === "choice"
      ? { quick_reply_texts: step.options.map((option) => option.label) }
      : {})
  };
}

function buildStructuredConsultationStepRetryReply(
  replyToken: string | null,
  step: StructuredConsultationStep
): LineReplyInstruction {
  return {
    reply_token: replyToken,
    text: [
      step.retry_reply,
      step.kind === "choice" ? "" : null,
      ...(step.kind === "choice" ? step.options.map((option) => `・${option.label}`) : [])
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    ...(step.kind === "choice"
      ? { quick_reply_texts: step.options.map((option) => option.label) }
      : {})
  };
}

function buildStructuredConsultationAcceptedReply(config: StructuredConsultationFlowConfig): string {
  return [
    `${config.title}の内容を受け付けました。`,
    "担当者が確認して、管理画面から返信します。"
  ].join("\n");
}

function buildStructuredConsultationAlertMessage(
  config: StructuredConsultationFlowConfig,
  values: Record<string, string>
): string {
  const lines = [
    `structured_consultation_flow=${config.flow_key}`,
    `title=${config.title}`,
    `category=${config.category}`,
    `assigned_role=${config.assigned_role}`,
    config.secondary_role ? `secondary_role=${config.secondary_role}` : null,
    `priority=${config.default_priority}`,
    `ai_auto_reply=${String(config.ai_auto_reply)}`,
    `requires_staff_confirmation=${String(config.requires_staff_confirmation)}`
  ];

  for (const step of config.steps) {
    const label = sanitizeStructuredConsultationFieldValue(values[step.key] ?? "");
    if (!label) {
      continue;
    }

    lines.push(`${step.key}=${resolveStructuredConsultationStoredValue(step, label)}`);
    lines.push(`${step.key}_label=${label}`);
    if (step.kind === "text") {
      lines.push(`${step.key}_present=true`);
    }
  }

  if (config.category === "plan_design") {
    lines.push("estimate_impact_possible=true");
    lines.push("notify_estimator=true");
    lines.push("attachment_guidance=sent");
  }

  if (config.category === "estimate_budget") {
    lines.push("requires_staff_confirmation=true");
    lines.push("ai_auto_reply=false");
  }

  if (config.category === "land_site") {
    lines.push("attachment_guidance=sent");
  }

  if (config.category === "documents") {
    lines.push("document_image_guidance=sent");
  }

  return lines.filter((line): line is string => line !== null).join("\n");
}

function resolveStructuredConsultationStoredValue(
  step: StructuredConsultationStep,
  label: string
): string {
  if (step.kind !== "choice") {
    return label;
  }

  return step.options.find((option) => option.label === label)?.value ?? label;
}

function resolveStructuredConsultationAlertSeverity(
  config: StructuredConsultationFlowConfig,
  values: Record<string, string>
): AlertSeverity {
  if (config.category === "estimate_budget") {
    const subCategory = values.sub_category;
    if (
      subCategory === "住宅ローンについて相談したい" ||
      subCategory === "補助金について相談したい" ||
      subCategory === "追加費用について確認したい" ||
      subCategory === "減額案を相談したい"
    ) {
      return "high";
    }
  }

  return config.default_severity;
}

function sanitizeStructuredConsultationFieldValue(value: string): string {
  return value.trim().replace(/\s+/gu, " ").slice(0, 1000);
}

async function handleContactStaffFlowMessage(input: {
  tenant_id: string;
  customer: Customer;
  text: string | null;
  line_message_id: string | null;
  event_time: string;
  reply_token: string | null;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  alertRepository: AlertRepository | undefined;
  createId: (() => string) | undefined;
  serviceOptions: { createId?: () => string; now?: () => string };
}): Promise<{
  handled: boolean;
  messages_inserted: number;
  alert_created: boolean;
  alert_notification_required: boolean;
  alert: Alert | null;
  staff_notification_event: CustomerLineStaffNotificationEvent | null;
  reply: LineReplyInstruction | null;
}> {
  const category = resolveCustomerContactStaffCategory(input.text);
  const priority = resolveCustomerContactStaffPriority(input.text);
  const timeline = await input.messageRepository.listByCustomer(input.tenant_id, input.customer.id);
  const flowState = resolveContactStaffFlowState(timeline);

  if (category && flowState.stage === "awaiting_category") {
    await insertSystemTextTimelineMessage(
      input.messageRepository,
      {
        tenant_id: input.tenant_id,
        customer_id: input.customer.id,
        body: `${contactStaffCategoryTimelinePrefix}${category}`,
        created_at: input.event_time
      },
      input.serviceOptions
    );
    await insertSystemTextTimelineMessage(
      input.messageRepository,
      {
        tenant_id: input.tenant_id,
        customer_id: input.customer.id,
        body: contactStaffPriorityPromptTimelineBody,
        created_at: input.event_time
      },
      input.serviceOptions
    );

    return {
      handled: true,
      messages_inserted: 2,
      alert_created: false,
      alert_notification_required: false,
      alert: null,
      staff_notification_event: {
        tenant_id: input.tenant_id,
        customer_id: input.customer.id,
        customer_display_name: input.customer.display_name,
        customer_phone: input.customer.phone,
        customer_email: input.customer.email,
        customer_address: input.customer.address,
        action_label: `${contactStaffCategoryTimelinePrefix}${category}`,
        occurred_at: input.event_time
      },
      reply: {
        reply_token: input.reply_token,
        text: buildContactStaffPriorityPromptReply(category),
        quick_reply_texts: customerContactStaffPriorityOptions.map((option) => option.label)
      }
    };
  }

  if (flowState.stage === "awaiting_priority") {
    if (!priority) {
      return {
        handled: true,
        messages_inserted: 0,
        alert_created: false,
        alert_notification_required: false,
        alert: null,
        staff_notification_event: null,
        reply: {
          reply_token: input.reply_token,
          text: buildContactStaffPriorityRetryReply(flowState.category),
          quick_reply_texts: customerContactStaffPriorityOptions.map((option) => option.label)
        }
      };
    }

    await insertSystemTextTimelineMessage(
      input.messageRepository,
      {
        tenant_id: input.tenant_id,
        customer_id: input.customer.id,
        body: `${contactStaffPriorityTimelinePrefix}${priority.label}`,
        created_at: input.event_time
      },
      input.serviceOptions
    );

    if (isCustomerInformationRegistered(input.customer)) {
      await insertSystemTextTimelineMessage(
        input.messageRepository,
        {
          tenant_id: input.tenant_id,
          customer_id: input.customer.id,
          body: contactStaffContentPromptTimelineBody,
          created_at: input.event_time
        },
        input.serviceOptions
      );

      return {
        handled: true,
        messages_inserted: 2,
        alert_created: false,
        alert_notification_required: false,
        alert: null,
        staff_notification_event: {
          tenant_id: input.tenant_id,
          customer_id: input.customer.id,
          customer_display_name: input.customer.display_name,
          customer_phone: input.customer.phone,
          customer_email: input.customer.email,
          customer_address: input.customer.address,
          action_label: `${contactStaffPriorityTimelinePrefix}${priority.label}`,
          occurred_at: input.event_time
        },
        reply: {
          reply_token: input.reply_token,
          text: buildContactStaffContentPromptReply(flowState.category, priority.label)
        }
      };
    }

    await insertSystemTextTimelineMessage(
      input.messageRepository,
      {
        tenant_id: input.tenant_id,
        customer_id: input.customer.id,
        body: contactStaffContactPromptTimelineBody,
        created_at: input.event_time
      },
      input.serviceOptions
    );

    return {
      handled: true,
      messages_inserted: 2,
      alert_created: false,
      alert_notification_required: false,
      alert: null,
      staff_notification_event: {
        tenant_id: input.tenant_id,
        customer_id: input.customer.id,
        customer_display_name: input.customer.display_name,
        customer_phone: input.customer.phone,
        customer_email: input.customer.email,
        customer_address: input.customer.address,
        action_label: `${contactStaffPriorityTimelinePrefix}${priority.label}`,
        occurred_at: input.event_time
      },
      reply: {
        reply_token: input.reply_token,
        text: buildContactStaffContactPromptReply(flowState.category, priority.label)
      }
    };
  }

  if (flowState.stage === "awaiting_contact_info") {
    const contactInfo = parseContactStaffContactInfo(input.text);

    if (!contactInfo) {
      return {
        handled: true,
        messages_inserted: 0,
        alert_created: false,
        alert_notification_required: false,
        alert: null,
        staff_notification_event: null,
        reply: {
          reply_token: input.reply_token,
          text: buildContactStaffContactInfoRetryReply(flowState.category, flowState.priority?.label)
        }
      };
    }

    const updatedCustomer = await input.customerRepository.save({
      ...input.customer,
      display_name: contactInfo.name,
      phone: contactInfo.phone,
      interest_tags: mergeContactStaffInterestTag(input.customer.interest_tags),
      updated_at: input.event_time
    });
    await insertSystemTextTimelineMessage(
      input.messageRepository,
      {
        tenant_id: input.tenant_id,
        customer_id: updatedCustomer.id,
        body: contactStaffContactConfirmedTimelineBody,
        created_at: input.event_time
      },
      input.serviceOptions
    );
    await insertSystemTextTimelineMessage(
      input.messageRepository,
      {
        tenant_id: input.tenant_id,
        customer_id: updatedCustomer.id,
        body: contactStaffContentPromptTimelineBody,
        created_at: input.event_time
      },
      input.serviceOptions
    );

    return {
      handled: true,
      messages_inserted: 2,
      alert_created: false,
      alert_notification_required: false,
      alert: null,
      staff_notification_event: {
        tenant_id: input.tenant_id,
        customer_id: updatedCustomer.id,
        customer_display_name: updatedCustomer.display_name,
        customer_phone: updatedCustomer.phone,
        customer_email: updatedCustomer.email,
        customer_address: updatedCustomer.address,
        action_label: contactStaffContactConfirmedTimelineBody,
        occurred_at: input.event_time
      },
      reply: {
        reply_token: input.reply_token,
        text: buildContactStaffContentPromptReply(flowState.category, flowState.priority?.label)
      }
    };
  }

  if (flowState.stage === "awaiting_consultation_body") {
    const body = input.text?.trim();

    if (!body) {
      return {
        handled: true,
        messages_inserted: 0,
        alert_created: false,
        alert_notification_required: false,
        alert: null,
        staff_notification_event: null,
        reply: {
          reply_token: input.reply_token,
          text: buildContactStaffContentRetryReply(flowState.category, flowState.priority?.label)
        }
      };
    }

    const updatedCustomer = await upsertLineCustomer(
      input.customerRepository,
      {
        tenant_id: input.tenant_id,
        line_user_id: input.customer.line_user_id ?? "",
        display_name: input.customer.display_name,
        response_mode: "human_required",
        last_customer_message_at: input.event_time
      },
      input.serviceOptions
    );
    await insertLineTextMessage(
      input.messageRepository,
      {
        tenant_id: input.tenant_id,
        customer_id: updatedCustomer.id,
        line_message_id: input.line_message_id ?? createDefaultId(),
        body,
        created_at: input.event_time
      },
      input.serviceOptions
    );
    await insertSystemTextTimelineMessage(
      input.messageRepository,
      {
        tenant_id: input.tenant_id,
        customer_id: updatedCustomer.id,
        body: contactStaffAcceptedTimelineBody,
        created_at: input.event_time
      },
      input.serviceOptions
    );

    let alertCreated = false;
    let alertNotificationRequired = false;
    let alert: Alert | null = null;
    if (input.alertRepository) {
      const alertResult = await ensureOpenUnrepliedCustomerMessageAlert({
        tenant_id: input.tenant_id,
        customer: updatedCustomer,
        alertRepository: input.alertRepository,
        message: buildContactStaffAlertMessage(
          flowState.category,
          body,
          flowState.priority?.label ?? null
        ),
        severity: flowState.priority?.severity ?? "high",
        ...(input.createId ? { createId: input.createId } : {}),
        now: () => input.event_time
      });
      alertCreated = alertResult.created;
      alertNotificationRequired = alertResult.notification_required;
      alert = alertResult.alert;
    }

    return {
      handled: true,
      messages_inserted: 2,
      alert_created: alertCreated,
      alert_notification_required: alertNotificationRequired,
      alert,
      staff_notification_event: null,
      reply: {
        reply_token: input.reply_token,
        text: buildContactStaffAcceptedReply()
      }
    };
  }

  return {
    handled: false,
    messages_inserted: 0,
    alert_created: false,
    alert_notification_required: false,
    alert: null,
    staff_notification_event: null,
    reply: null
  };
}

function resolveContactStaffFlowState(messages: Message[]): {
  stage:
    | "none"
    | "awaiting_category"
    | "awaiting_priority"
    | "awaiting_contact_info"
    | "awaiting_consultation_body";
  category: string | null;
  priority: (typeof customerContactStaffPriorityOptions)[number] | null;
} {
  const lastAcceptedIndex = findLastMessageIndex(
    messages,
    (message) => message.role === "system" && message.body === contactStaffAcceptedTimelineBody
  );
  const activeMessages = messages.slice(lastAcceptedIndex + 1);
  const categoryPromptIndex = findLastMessageIndex(
    activeMessages,
    (message) => message.role === "system" && message.body === contactStaffCategoryPromptTimelineBody
  );

  if (categoryPromptIndex < 0) {
    return { stage: "none", category: null, priority: null };
  }

  const flowMessages = activeMessages.slice(categoryPromptIndex);
  const categoryMessage = findLastMessage(flowMessages, (message) =>
    Boolean(
      message.role === "system" && message.body?.startsWith(contactStaffCategoryTimelinePrefix)
    )
  );
  const category =
    categoryMessage?.body?.slice(contactStaffCategoryTimelinePrefix.length).trim() ?? null;

  if (!category) {
    return { stage: "awaiting_category", category: null, priority: null };
  }

  const priorityPromptIndex = findLastMessageIndex(
    flowMessages,
    (message) => message.role === "system" && message.body === contactStaffPriorityPromptTimelineBody
  );
  const priorityMessage = findLastMessage(flowMessages, (message) =>
    Boolean(
      message.role === "system" && message.body?.startsWith(contactStaffPriorityTimelinePrefix)
    )
  );
  const priorityLabel =
    priorityMessage?.body?.slice(contactStaffPriorityTimelinePrefix.length).trim() ?? null;
  const priority = resolveCustomerContactStaffPriority(priorityLabel);
  const contactPromptIndex = findLastMessageIndex(
    flowMessages,
    (message) => message.role === "system" && message.body === contactStaffContactPromptTimelineBody
  );
  const contactConfirmedIndex = findLastMessageIndex(
    flowMessages,
    (message) =>
      message.role === "system" && message.body === contactStaffContactConfirmedTimelineBody
  );
  const contentPromptIndex = findLastMessageIndex(
    flowMessages,
    (message) => message.role === "system" && message.body === contactStaffContentPromptTimelineBody
  );

  if (contactPromptIndex >= 0 && contactConfirmedIndex < contactPromptIndex) {
    return { stage: "awaiting_contact_info", category, priority };
  }

  if (contentPromptIndex >= 0) {
    return { stage: "awaiting_consultation_body", category, priority };
  }

  if (priorityPromptIndex >= 0 && !priority) {
    return { stage: "awaiting_priority", category, priority: null };
  }

  return { stage: "none", category: null, priority: null };
}

function findLastMessage(
  messages: Message[],
  predicate: (message: Message) => boolean
): Message | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message && predicate(message)) {
      return message;
    }
  }

  return null;
}

function findLastMessageIndex(
  messages: Message[],
  predicate: (message: Message) => boolean
): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message && predicate(message)) {
      return index;
    }
  }

  return -1;
}

function isCustomerInformationRegistered(customer: Customer): boolean {
  return customer.interest_tags.includes("情報登録済み");
}

function mergeContactStaffInterestTag(existingTags: string[]): string[] {
  return Array.from(new Set([...existingTags, "担当者相談連絡先確認済み"])).slice(0, 20);
}

function parseContactStaffContactInfo(
  text: string | null
): { name: string; phone: string } | null {
  const normalized = text?.trim().replace(/\s+/gu, " ");

  if (!normalized) {
    return null;
  }

  const phoneMatch = normalized.match(/(?:\+?81[-\s]?)?0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/u);
  const phone = phoneMatch?.[0]?.trim() ?? "";
  const name = normalized
    .replace(phone, "")
    .replace(/[／/,，、:：-]+/gu, " ")
    .trim();

  if (!name || !phone) {
    return null;
  }

  return {
    name: name.slice(0, 100),
    phone: phone.slice(0, 50)
  };
}

function buildContactStaffCategoryPromptReply(): string {
  return [
    "担当者に相談ですね。",
    "相談カテゴリを次から選んで、そのままLINEで送ってください。",
    "",
    ...customerContactStaffCategories.map((category) => `・${category}`)
  ].join("\n");
}

function buildContactStaffPriorityPromptReply(category: string | null): string {
  return [
    category ? `カテゴリ「${category}」で受け付けます。` : "カテゴリを受け付けました。",
    "返信の優先度を次から選んで、そのままLINEで送ってください。",
    "",
    ...customerContactStaffPriorityOptions.map((option) => `・${option.label}`)
  ].join("\n");
}

function buildContactStaffPriorityRetryReply(category: string | null): string {
  return [
    category ? `カテゴリ「${category}」で受け付けています。` : "担当者相談を受け付けています。",
    "返信の優先度を次から選んで送ってください。",
    "",
    ...customerContactStaffPriorityOptions.map((option) => `・${option.label}`)
  ].join("\n");
}

function buildContactStaffContactPromptReply(
  category: string | null,
  priorityLabel: string | null = null
): string {
  return [
    category ? `カテゴリ「${category}」で受け付けます。` : "カテゴリを受け付けました。",
    priorityLabel ? `優先度「${priorityLabel}」で受け付けます。` : null,
    "ご本人確認のため、お名前と電話番号を次の形式で送ってください。",
    "",
    "例：山田太郎 / 090-0000-0000"
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function buildContactStaffContactInfoRetryReply(
  category: string | null,
  priorityLabel: string | null = null
): string {
  return [
    category ? `カテゴリ「${category}」で受け付けています。` : "担当者相談を受け付けています。",
    priorityLabel ? `優先度「${priorityLabel}」で受け付けています。` : null,
    "お名前と電話番号を確認できませんでした。",
    "次の形式で送ってください。",
    "",
    "例：山田太郎 / 090-0000-0000"
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function buildContactStaffContentPromptReply(
  category: string | null,
  priorityLabel: string | null = null
): string {
  return [
    category ? `カテゴリ「${category}」で受け付けます。` : "担当者相談を受け付けます。",
    priorityLabel ? `優先度「${priorityLabel}」で受け付けます。` : null,
    "相談内容をこのままLINEで送ってください。",
    "担当者がAdmin画面で確認して返信します。"
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function buildContactStaffContentRetryReply(
  category: string | null,
  priorityLabel: string | null = null
): string {
  return [
    category ? `カテゴリ「${category}」で受け付けています。` : "担当者相談を受け付けています。",
    priorityLabel ? `優先度「${priorityLabel}」で受け付けています。` : null,
    "相談内容を入力して送ってください。"
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function buildContactStaffAcceptedReply(): string {
  return [
    "相談内容を受け付けました。",
    "担当者が確認して、管理画面から返信します。"
  ].join("\n");
}

function resolveNextCustomerResponseMode(
  existing: Customer,
  requested: ResponseMode | undefined
): ResponseMode {
  if (!requested) {
    return existing.response_mode;
  }

  if (existing.response_mode === "emergency" || existing.response_mode === "human_active") {
    return existing.response_mode;
  }

  return requested;
}

async function resolveLineDisplayName(
  input: LogLineWebhookEventsInput,
  lineUserId: string,
  cache: Map<string, string | null>
): Promise<string | null> {
  if (cache.has(lineUserId)) {
    return cache.get(lineUserId) ?? null;
  }

  if (!input.getLineDisplayName) {
    cache.set(lineUserId, null);
    return null;
  }

  try {
    const displayName = await input.getLineDisplayName(lineUserId);
    const normalized = displayName?.trim() ? displayName.trim() : null;
    cache.set(lineUserId, normalized);
    return normalized;
  } catch {
    cache.set(lineUserId, null);
    return null;
  }
}

export async function listCustomerListItems(input: {
  tenant_id: string;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
}): Promise<CustomerListItem[]> {
  const customers = await input.customerRepository.listByTenant(input.tenant_id);
  const latestMessages = await input.messageRepository.findLatestByCustomerIds(
    input.tenant_id,
    customers.map((customer) => customer.id)
  );

  return customers
    .map((customer) => {
      const latestMessage = latestMessages.get(customer.id);

      return {
        id: customer.id,
        tenant_id: customer.tenant_id,
        line_user_id: customer.line_user_id,
        display_name: customer.display_name,
        response_mode: customer.response_mode,
        status: customer.status,
        last_message_body: latestMessage?.body ?? null,
        last_message_at: latestMessage?.created_at ?? customer.last_message_at,
        last_customer_message_at: customer.last_customer_message_at,
        created_at: customer.created_at,
        updated_at: customer.updated_at
      };
    })
    .sort(compareCustomerListItems);
}

export async function getCustomerDetail(input: {
  tenant_id: string;
  customer_id: string;
  customerRepository: CustomerRepository;
}): Promise<CustomerDetail | null> {
  const customer = await input.customerRepository.findByIdForTenant(
    input.tenant_id,
    input.customer_id
  );

  return customer ? toCustomerDetail(customer) : null;
}

export async function listCustomerTimeline(input: {
  tenant_id: string;
  customer_id: string;
  messageRepository: MessageRepository;
}): Promise<CustomerTimelineMessage[]> {
  const messages = await input.messageRepository.listByCustomer(input.tenant_id, input.customer_id);

  return messages.map(toCustomerTimelineMessage);
}

function compareCustomerListItems(a: CustomerListItem, b: CustomerListItem): number {
  const aTime = a.last_message_at ?? a.created_at;
  const bTime = b.last_message_at ?? b.created_at;

  return bTime.localeCompare(aTime);
}

function toCustomerDetail(customer: Customer): CustomerDetail {
  return {
    id: customer.id,
    tenant_id: customer.tenant_id,
    line_user_id: customer.line_user_id,
    line_display_name: customer.display_name,
    information_registered: customer.interest_tags.includes("情報登録済み"),
    name: null,
    phone: customer.phone,
    email: customer.email,
    postal_code: customer.postal_code,
    status: customer.status,
    response_mode: customer.response_mode,
    assigned_staff_id: null,
    address_area: customer.address,
    planned_area: null,
    has_land: null,
    desired_timing: null,
    temperature_score: null,
    tags: customer.interest_tags,
    last_customer_message_at: customer.last_customer_message_at,
    last_staff_reply_at: customer.last_staff_reply_at,
    created_at: customer.created_at,
    updated_at: customer.updated_at
  };
}

function toCustomerTimelineMessage(message: Message): CustomerTimelineMessage {
  return {
    id: message.id,
    tenant_id: message.tenant_id,
    customer_id: message.customer_id,
    role: message.role,
    message_type: message.message_type,
    body: message.body,
    line_message_id: message.line_message_id,
    source_url: message.media_storage_path,
    created_at: message.created_at
  };
}

function shouldCreateUnrepliedAlert(customer: Customer, nowTime: number): boolean {
  if (!isHumanResponseMode(customer.response_mode) || !customer.last_customer_message_at) {
    return false;
  }

  if (
    customer.last_staff_reply_at &&
    customer.last_staff_reply_at >= customer.last_customer_message_at
  ) {
    return false;
  }

  const lastCustomerMessageTime = Date.parse(customer.last_customer_message_at);
  const thresholdMinutes = customer.response_mode === "emergency" ? 0 : 30;

  return nowTime - lastCustomerMessageTime >= thresholdMinutes * 60 * 1000;
}

function isHumanResponseMode(responseMode: ResponseMode): boolean {
  return (
    responseMode === "human_required" ||
    responseMode === "human_active" ||
    responseMode === "emergency"
  );
}

function createUnrepliedAlert(input: {
  tenant_id: string;
  customer: Customer;
  message?: string;
  severity?: AlertSeverity;
  now: string;
  createId?: () => string;
}): Alert {
  const severity: AlertSeverity =
    input.severity ?? (input.customer.response_mode === "emergency" ? "critical" : "high");
  const message =
    input.message?.trim() ||
    `customer ${input.customer.id} is unreplied in response_mode ${input.customer.response_mode}.`;
  const parsed = alertCreateSchema.parse({
    tenant_id: input.tenant_id,
    customer_id: input.customer.id,
    consultation_id: null,
    alert_type: "unreplied_customer_message",
    status: "open",
    severity,
    message,
    triggered_at: input.now
  });

  return {
    id: input.createId?.() ?? createDefaultId(),
    tenant_id: parsed.tenant_id,
    customer_id: parsed.customer_id,
    consultation_id: parsed.consultation_id ?? null,
    alert_type: parsed.alert_type,
    status: parsed.status,
    severity: parsed.severity,
    message: parsed.message,
    triggered_at: parsed.triggered_at ?? input.now,
    notified_at: null,
    resolved_at: null,
    created_at: input.now,
    updated_at: input.now
  };
}

export function buildStaffNotificationPayload(
  alert: Alert,
  options: {
    adminBaseUrl?: string;
    customer?: Customer | null;
    customerDisplayName?: string | null;
  } = {}
): StaffNotificationPayload {
  const adminBaseUrl = normalizeAdminBaseUrl(options.adminBaseUrl);
  const adminUrl = `${adminBaseUrl}/customers/${encodeURIComponent(alert.customer_id)}`;
  const customerLabel = formatCustomerLabelForStaffNotification(
    options.customer?.display_name ?? options.customerDisplayName ?? null,
    alert.customer_id
  );
  const contactLines = formatStaffNotificationContactLines(options.customer ?? null);
  const headline = formatStaffNotificationHeadline(alert.message);
  const detailLines = formatStaffNotificationDetailLines(alert.message);

  return {
    tenant_id: alert.tenant_id,
    alert_id: alert.id,
    customer_id: alert.customer_id,
    alert_type: alert.alert_type,
    severity: alert.severity,
    message: [
      "LINEの更新が届きました。",
      headline,
      "",
      `種別：${formatAlertTypeForStaffNotification(alert.alert_type, alert.message)}`,
      `緊急度：${formatAlertSeverityForStaffNotification(alert.severity)}`,
      `顧客：${customerLabel}`,
      ...contactLines,
      `日時：${alert.updated_at}`,
      "内容：LINEからの相談・更新",
      ...detailLines,
      "対応状況：未対応",
      "",
      "管理画面で確認してください。",
      "顧客詳細で確認してください。",
      adminUrl
    ].join("\n"),
    admin_url: adminUrl
  };
}

export function buildCustomerActivityStaffNotificationPayload(
  event: CustomerLineStaffNotificationEvent,
  options: { adminBaseUrl?: string } = {}
): StaffNotificationPayload {
  const adminBaseUrl = normalizeAdminBaseUrl(options.adminBaseUrl);
  const adminUrl = `${adminBaseUrl}/customers/${encodeURIComponent(event.customer_id)}`;
  const customerLabel = formatCustomerLabelForStaffNotification(
    event.customer_display_name,
    event.customer_id
  );
  const contactLines = formatStaffNotificationContactLines({
    phone: event.customer_phone ?? null,
    email: event.customer_email ?? null,
    address: event.customer_address ?? null
  });
  const detailLines = formatStaffNotificationDetailLines(event.detail_text ?? null);

  return {
    tenant_id: event.tenant_id,
    alert_id: `customer_activity:${event.customer_id}:${event.occurred_at}`,
    customer_id: event.customer_id,
    alert_type: "unreplied_customer_message",
    severity: "low",
    message: [
      "LINEの更新が届きました。",
      "",
      `種別：LINEメニュー操作（${event.action_label}）`,
      "緊急度：通常",
      `顧客：${customerLabel}`,
      ...contactLines,
      `日時：${event.occurred_at}`,
      `内容：${event.action_label}`,
      ...detailLines,
      "",
      "顧客詳細で確認してください。",
      adminUrl
    ].join("\n"),
    admin_url: adminUrl
  };
}

function formatStaffNotificationHeadline(detail: string | null): string {
  const structuredDetail = detail ? parseStructuredConsultationAlertDetail(detail.trim()) : null;

  if (structuredDetail) {
    return `${structuredDetail.config.title}の相談が届きました。`;
  }

  return "新しい相談が届きました。";
}

function formatStaffNotificationContactLines(
  customer: Pick<Customer, "phone" | "email" | "address"> | null
): string[] {
  if (!customer) {
    return [];
  }

  return [
    customer.phone?.trim() ? `電話：${customer.phone.trim()}` : null,
    customer.email?.trim() ? `メール：${customer.email.trim()}` : null,
    customer.address?.trim() ? `住所：${customer.address.trim()}` : null
  ].filter((line): line is string => Boolean(line));
}

function formatStaffNotificationDetailLines(detail: string | null): string[] {
  const normalizedDetail = detail?.trim();

  if (!normalizedDetail || isGenericUnrepliedAlertMessage(normalizedDetail)) {
    return [];
  }

  const structuredConsultationDetail = parseStructuredConsultationAlertDetail(normalizedDetail);
  if (structuredConsultationDetail) {
    return formatStructuredConsultationDetailLines(structuredConsultationDetail);
  }

  const contactStaffDetail = parseContactStaffAlertDetail(normalizedDetail);
  const detailText = contactStaffDetail?.body ?? normalizedDetail;

  return [
    contactStaffDetail?.priority_label ? `優先度：${contactStaffDetail.priority_label}` : null,
    "相談内容：",
    detailText.slice(0, 1000)
  ].filter((line): line is string => line !== null);
}

function isGenericUnrepliedAlertMessage(message: string): boolean {
  return /^customer .+ is unreplied in response_mode .+\.$/u.test(message);
}

function buildContactStaffAlertMessage(
  category: string | null,
  body: string,
  priorityLabel: string | null = null
): string {
  const normalizedCategory = category?.trim();
  const normalizedPriority = priorityLabel?.trim();

  return [
    normalizedCategory ? `${contactStaffCategoryTimelinePrefix}${normalizedCategory}` : null,
    normalizedPriority ? `${contactStaffPriorityTimelinePrefix}${normalizedPriority}` : null,
    body.trim()
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function parseContactStaffAlertDetail(
  message: string
): { category: string; priority_label: string | null; body: string } | null {
  const [firstLine, secondLine, ...remainingLines] = message.split(/\r?\n/u);
  const category = firstLine?.startsWith(contactStaffCategoryTimelinePrefix)
    ? firstLine.slice(contactStaffCategoryTimelinePrefix.length).trim()
    : "";

  if (!category) {
    return null;
  }

  const priorityLabel = secondLine?.startsWith(contactStaffPriorityTimelinePrefix)
    ? secondLine.slice(contactStaffPriorityTimelinePrefix.length).trim()
    : null;

  return {
    category,
    priority_label: priorityLabel,
    body: (priorityLabel ? remainingLines : [secondLine, ...remainingLines]).join("\n").trim()
  };
}

function parseStructuredConsultationAlertDetail(message: string):
  | {
      config: StructuredConsultationFlowConfig;
      fields: Record<string, string>;
    }
  | null {
  const fields: Record<string, string> = {};

  for (const line of message.split(/\r?\n/u)) {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    fields[line.slice(0, separatorIndex)] = line.slice(separatorIndex + 1);
  }

  const config =
    structuredConsultationFlowConfigs.find(
      (candidate) => candidate.flow_key === fields.structured_consultation_flow
    ) ?? null;

  return config ? { config, fields } : null;
}

function formatStructuredConsultationDetailLines(input: {
  config: StructuredConsultationFlowConfig;
  fields: Record<string, string>;
}): string[] {
  const body = input.fields.body_label?.trim();
  const bodyLines = body ? ["相談内容：", body.slice(0, 1000)] : [];
  const subCategoryLabel = formatStructuredConsultationChoiceLabel(input, "sub_category");
  const planTargetLabel =
    input.fields.target_area_label?.trim() ??
    input.fields.exterior_target_area_label?.trim() ??
    "指定なし";
  const landStatusLabel = resolveLandStatusLabelForStaffNotification(input.fields);
  const documentStageLabel = resolveDocumentStageLabelForStaffNotification(input.fields);

  switch (input.config.category) {
    case "meeting":
      return [
        input.fields.method_label ? `希望方法：${input.fields.method_label}` : null,
        input.fields.desired_datetime_present === "true" ? "希望日時：入力あり" : null,
        input.fields.cancel_meeting_datetime_present === "true"
          ? "キャンセル対象日時：入力あり"
          : null,
        input.fields.confirm_meeting_datetime_present === "true" ? "確認対象：入力あり" : null,
        input.fields.meeting_topic_label ? `打合せ内容：${input.fields.meeting_topic_label}` : null,
        "担当：営業",
        ...bodyLines
      ].filter((line): line is string => line !== null);
    case "plan_design":
      return [
        `対象：${planTargetLabel}`,
        `内容：${subCategoryLabel ?? "未入力"}`,
        `希望優先度：${input.fields.request_priority_label ?? "未入力"}`,
        `見積影響：${input.fields.estimate_impact_possible === "true" ? "可能性あり" : "未判定"}`,
        "担当：設計",
        ...bodyLines
      ];
    case "estimate_budget":
      return [
        `現在の状況：${input.fields.current_status_label ?? "未入力"}`,
        `希望対応：${input.fields.desired_response_label ?? "未入力"}`,
        "AI自動返信：不可",
        "担当確認：必要",
        "担当：営業 / 積算",
        ...bodyLines
      ];
    case "land_site":
      return [
        `土地状況：${landStatusLabel}`,
        `エリア：${input.fields.area_present === "true" ? "入力あり" : "未入力"}`,
        "資料添付：案内済み",
        "担当：営業",
        ...bodyLines
      ];
    case "documents":
      return [
        `現在の段階：${documentStageLabel}`,
        "書類画像：添付案内済み",
        "担当：営業事務 / 営業",
        ...bodyLines
      ];
    default:
      return bodyLines;
  }
}

function resolveLandStatusLabelForStaffNotification(fields: Record<string, string>): string {
  const explicitLabel = fields.land_status_label?.trim();
  if (explicitLabel) {
    return explicitLabel;
  }

  switch (fields.sub_category) {
    case "land_search":
      return "土地探し中";
    case "candidate_land":
      return "候補地あり";
    case "owned_land":
      return "所有地あり";
    default:
      return "未入力";
  }
}

function resolveDocumentStageLabelForStaffNotification(fields: Record<string, string>): string {
  const explicitLabel = fields.current_stage_label?.trim();
  if (explicitLabel) {
    return explicitLabel;
  }

  if (fields.sub_category === "pre_contract") {
    return "契約前確認";
  }

  return "未入力";
}

function formatStructuredConsultationChoiceLabel(input: {
  config: StructuredConsultationFlowConfig;
  fields: Record<string, string>;
}, key: string): string | null {
  const storedValue = input.fields[key]?.trim();
  const storedLabel = input.fields[`${key}_label`]?.trim();
  const step = input.config.steps.find(
    (candidate): candidate is Extract<StructuredConsultationStep, { kind: "choice" }> =>
      candidate.kind === "choice" && candidate.key === key
  );
  const option = step?.options.find(
    (candidate) => candidate.value === storedValue || candidate.label === storedLabel
  );

  return option?.notification_label ?? storedLabel ?? storedValue ?? null;
}

function formatCustomerLabelForStaffNotification(
  displayName: string | null,
  _customerId: string
): string {
  const normalizedDisplayName = displayName?.trim();

  if (normalizedDisplayName) {
    return normalizedDisplayName;
  }

  return "未登録顧客";
}

function normalizeAdminBaseUrl(adminBaseUrl: string | undefined): string {
  const normalized = adminBaseUrl?.trim().replace(/\/+$/u, "");
  return normalized || "https://admin.example.local";
}

function formatAlertTypeForStaffNotification(alertType: AlertType, detail: string | null): string {
  const structuredDetail = detail ? parseStructuredConsultationAlertDetail(detail.trim()) : null;
  if (structuredDetail) {
    return (
      formatStructuredConsultationChoiceLabel(structuredDetail, "sub_category") ??
      structuredDetail.config.title
    );
  }

  const contactStaffDetail = detail ? parseContactStaffAlertDetail(detail.trim()) : null;

  if (contactStaffDetail) {
    return `担当者に相談（${contactStaffDetail.category}）`;
  }

  switch (alertType) {
    case "unreplied":
    case "unreplied_customer_message":
      return "未返信の相談";
    case "stale":
      return "対応停滞";
    case "emergency":
      return "緊急相談";
    case "ai_risk":
      return "AI確認要";
  }
}

function formatAlertSeverityForStaffNotification(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "緊急";
    case "high":
      return "高";
    case "medium":
      return "通常";
    case "low":
      return "低";
  }
}

export class MockStaffNotifier implements StaffNotifier {
  readonly notifications: StaffNotificationPayload[] = [];

  async notify(payload: StaffNotificationPayload): Promise<void> {
    this.notifications.push(payload);
  }
}

function createMessageLoggingServiceOptions(
  input: Pick<LogLineWebhookEventsInput, "createId" | "now">
): { createId?: () => string; now?: () => string } {
  const options: { createId?: () => string; now?: () => string } = {};

  if (input.createId) {
    options.createId = input.createId;
  }

  if (input.now) {
    options.now = input.now;
  }

  return options;
}

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly customersById = new Map<string, Customer>();

  async findByIdForTenant(tenantId: string, customerId: string): Promise<Customer | null> {
    const customer = this.customersById.get(customerId);

    if (!customer || customer.tenant_id !== tenantId) {
      return null;
    }

    return customer;
  }

  async findByTenantAndLineUserId(tenantId: string, lineUserId: string): Promise<Customer | null> {
    return (
      this.list().find(
        (customer) => customer.tenant_id === tenantId && customer.line_user_id === lineUserId
      ) ?? null
    );
  }

  async listByTenant(tenantId: string): Promise<Customer[]> {
    return this.list().filter((customer) => customer.tenant_id === tenantId);
  }

  async save(customer: Customer): Promise<Customer> {
    this.customersById.set(customer.id, customer);
    return customer;
  }

  list(): Customer[] {
    return Array.from(this.customersById.values());
  }

  clear(): void {
    this.customersById.clear();
  }
}

export class InMemoryMessageRepository implements MessageRepository {
  private readonly messagesById = new Map<string, Message>();

  async insert(message: Message): Promise<Message> {
    this.messagesById.set(message.id, message);
    return message;
  }

  async findLatestByCustomerIds(tenantId: string, customerIds: string[]): Promise<Map<string, Message>> {
    const customerIdSet = new Set(customerIds);
    const latestByCustomerId = new Map<string, Message>();

    for (const message of this.list()) {
      if (message.tenant_id !== tenantId || !customerIdSet.has(message.customer_id)) {
        continue;
      }

      const current = latestByCustomerId.get(message.customer_id);

      if (!current || message.created_at > current.created_at) {
        latestByCustomerId.set(message.customer_id, message);
      }
    }

    return latestByCustomerId;
  }

  async listByCustomer(tenantId: string, customerId: string): Promise<Message[]> {
    return this.list()
      .filter((message) => message.tenant_id === tenantId && message.customer_id === customerId)
      .sort(compareMessagesByCreatedAtAsc);
  }

  list(): Message[] {
    return Array.from(this.messagesById.values());
  }

  clear(): void {
    this.messagesById.clear();
  }
}

export class InMemoryAlertRepository implements AlertRepository {
  private readonly alertsById = new Map<string, Alert>();

  async create(alert: Alert): Promise<Alert> {
    this.alertsById.set(alert.id, alert);
    return alert;
  }

  async listByTenant(tenantId: string): Promise<Alert[]> {
    return this.list().filter((alert) => alert.tenant_id === tenantId);
  }

  async listOpenByTenant(tenantId: string): Promise<Alert[]> {
    return this.list().filter((alert) => alert.tenant_id === tenantId && alert.status === "open");
  }

  async findActiveByCustomerAndType(
    tenantId: string,
    customerId: string,
    alertType: AlertType
  ): Promise<Alert | null> {
    return (
      this.list().find(
        (alert) =>
          alert.tenant_id === tenantId &&
          alert.customer_id === customerId &&
          alert.alert_type === alertType &&
          (alert.status === "open" || alert.status === "notified")
      ) ?? null
    );
  }

  async updateStatus(input: {
    tenant_id: string;
    alert_id: string;
    status: AlertStatus;
    severity?: AlertSeverity;
    message?: string;
    notified_at?: string | null;
    resolved_at?: string | null;
    updated_at: string;
  }): Promise<Alert | null> {
    const existing = this.alertsById.get(input.alert_id);

    if (!existing || existing.tenant_id !== input.tenant_id) {
      return null;
    }

    const updated: Alert = {
      ...existing,
      status: input.status,
      severity: input.severity !== undefined ? input.severity : existing.severity,
      message: input.message !== undefined ? input.message : existing.message,
      notified_at: input.notified_at !== undefined ? input.notified_at : existing.notified_at,
      resolved_at: input.resolved_at !== undefined ? input.resolved_at : existing.resolved_at,
      updated_at: input.updated_at
    };

    this.alertsById.set(updated.id, updated);
    return updated;
  }

  list(): Alert[] {
    return Array.from(this.alertsById.values());
  }

  clear(): void {
    this.alertsById.clear();
  }
}

function compareMessagesByCreatedAtAsc(a: Message, b: Message): number {
  return a.created_at.localeCompare(b.created_at);
}

function lineEventTimestampToIsoString(
  timestamp: number | null,
  now: (() => string) | undefined
): string {
  if (timestamp !== null) {
    return new Date(timestamp).toISOString();
  }

  return now?.() ?? new Date().toISOString();
}

function createDefaultId(): string {
  return globalThis.crypto.randomUUID();
}

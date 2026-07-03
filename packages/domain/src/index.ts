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
  createId?: () => string;
  now?: () => string;
}

export interface EnsureOpenUnrepliedCustomerMessageAlertResult {
  alert: Alert | null;
  created: boolean;
}

export interface NotifyOpenAlertsInput {
  tenant_id: string;
  alertRepository: AlertRepository;
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
  rich_menu_guides_logged: number;
  contact_staff_flows_logged: number;
  contact_staff_alerts_created: number;
  unsupported_events: number;
  line_reply_instructions: LineReplyInstruction[];
}

export interface LineReplyInstruction {
  reply_token: string | null;
  text: string;
  quick_reply_texts?: string[];
}

export interface CustomerRichMenuGuideAction {
  action_key: string;
  trigger_text: string;
  timeline_body: string;
  reply_text: string;
  target_url: string;
  message_type: MessageType;
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

const contactStaffCategoryPromptTimelineBody = "担当者相談カテゴリ選択案内済み";
const contactStaffCategoryTimelinePrefix = "担当者相談カテゴリ: ";
const contactStaffContactPromptTimelineBody = "担当者相談連絡先確認案内済み";
const contactStaffContactConfirmedTimelineBody = "担当者相談連絡先確認済み";
const contactStaffContentPromptTimelineBody = "担当者相談内容入力案内済み";
const contactStaffAcceptedTimelineBody = "担当者相談受付済み";

export function resolveCustomerContactStaffCategory(text: string | null): string | null {
  const normalized = text?.trim();

  if (!normalized) {
    return null;
  }

  return customerContactStaffCategories.find((category) => category === normalized) ?? null;
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
    return {
      alert: existingAlert,
      created: false
    };
  }

  const now = input.now?.() ?? new Date().toISOString();
  const alert = createUnrepliedAlert({
    tenant_id: input.tenant_id,
    customer: input.customer,
    now,
    ...(input.createId ? { createId: input.createId } : {})
  });

  return {
    alert: await input.alertRepository.create(alert),
    created: true
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
    const payload = buildStaffNotificationPayload(alert, {
      ...(input.adminBaseUrl ? { adminBaseUrl: input.adminBaseUrl } : {})
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
  let richMenuGuidesLogged = 0;
  let contactStaffFlowsLogged = 0;
  let contactStaffAlertsCreated = 0;
  let unsupportedEvents = 0;
  const lineReplyInstructions: LineReplyInstruction[] = [];
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
        contactStaffAlertsCreated += contactStaffFlow.alert_created ? 1 : 0;
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
          ...(input.createId ? { createId: input.createId } : {}),
          now: () => eventTime
        });

        if (alertResult.created) {
          alertsCreated += 1;
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
    rich_menu_guides_logged: richMenuGuidesLogged,
    contact_staff_flows_logged: contactStaffFlowsLogged,
    contact_staff_alerts_created: contactStaffAlertsCreated,
    unsupported_events: unsupportedEvents,
    line_reply_instructions: lineReplyInstructions
  };
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
  reply: LineReplyInstruction | null;
}> {
  const category = resolveCustomerContactStaffCategory(input.text);
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
        reply: {
          reply_token: input.reply_token,
          text: buildContactStaffContentPromptReply(category)
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
      reply: {
        reply_token: input.reply_token,
        text: buildContactStaffContactPromptReply(category)
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
        reply: {
          reply_token: input.reply_token,
          text: buildContactStaffContactInfoRetryReply(flowState.category)
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
      reply: {
        reply_token: input.reply_token,
        text: buildContactStaffContentPromptReply(flowState.category)
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
        reply: {
          reply_token: input.reply_token,
          text: buildContactStaffContentRetryReply(flowState.category)
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
    if (input.alertRepository) {
      const alertResult = await ensureOpenUnrepliedCustomerMessageAlert({
        tenant_id: input.tenant_id,
        customer: updatedCustomer,
        alertRepository: input.alertRepository,
        ...(input.createId ? { createId: input.createId } : {}),
        now: () => input.event_time
      });
      alertCreated = alertResult.created;
    }

    return {
      handled: true,
      messages_inserted: 2,
      alert_created: alertCreated,
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
    reply: null
  };
}

function resolveContactStaffFlowState(messages: Message[]): {
  stage: "none" | "awaiting_category" | "awaiting_contact_info" | "awaiting_consultation_body";
  category: string | null;
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
    return { stage: "none", category: null };
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
    return { stage: "awaiting_category", category: null };
  }

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
    return { stage: "awaiting_contact_info", category };
  }

  if (contentPromptIndex >= 0) {
    return { stage: "awaiting_consultation_body", category };
  }

  return { stage: "none", category: null };
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

function buildContactStaffContactPromptReply(category: string | null): string {
  return [
    category ? `カテゴリ「${category}」で受け付けます。` : "カテゴリを受け付けました。",
    "ご本人確認のため、お名前と電話番号を次の形式で送ってください。",
    "",
    "例：山田太郎 / 090-0000-0000"
  ].join("\n");
}

function buildContactStaffContactInfoRetryReply(category: string | null): string {
  return [
    category ? `カテゴリ「${category}」で受け付けています。` : "担当者相談を受け付けています。",
    "お名前と電話番号を確認できませんでした。",
    "次の形式で送ってください。",
    "",
    "例：山田太郎 / 090-0000-0000"
  ].join("\n");
}

function buildContactStaffContentPromptReply(category: string | null): string {
  return [
    category ? `カテゴリ「${category}」で受け付けます。` : "担当者相談を受け付けます。",
    "相談内容をこのままLINEで送ってください。",
    "担当者がAdmin画面で確認して返信します。"
  ].join("\n");
}

function buildContactStaffContentRetryReply(category: string | null): string {
  return [
    category ? `カテゴリ「${category}」で受け付けています。` : "担当者相談を受け付けています。",
    "相談内容を入力して送ってください。"
  ].join("\n");
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
  now: string;
  createId?: () => string;
}): Alert {
  const severity: AlertSeverity =
    input.customer.response_mode === "emergency" ? "critical" : "high";
  const parsed = alertCreateSchema.parse({
    tenant_id: input.tenant_id,
    customer_id: input.customer.id,
    consultation_id: null,
    alert_type: "unreplied_customer_message",
    status: "open",
    severity,
    message: `customer ${input.customer.id} is unreplied in response_mode ${input.customer.response_mode}.`,
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
  options: { adminBaseUrl?: string } = {}
): StaffNotificationPayload {
  const adminBaseUrl = normalizeAdminBaseUrl(options.adminBaseUrl);
  const adminUrl = `${adminBaseUrl}/customers/${encodeURIComponent(alert.customer_id)}`;

  return {
    tenant_id: alert.tenant_id,
    alert_id: alert.id,
    customer_id: alert.customer_id,
    alert_type: alert.alert_type,
    severity: alert.severity,
    message: [
      "新しい相談が届きました。",
      "",
      `種別：${formatAlertTypeForStaffNotification(alert.alert_type)}`,
      `緊急度：${formatAlertSeverityForStaffNotification(alert.severity)}`,
      "対応状況：未対応",
      "",
      "管理画面で確認してください。",
      adminUrl
    ].join("\n"),
    admin_url: adminUrl
  };
}

function normalizeAdminBaseUrl(adminBaseUrl: string | undefined): string {
  const normalized = adminBaseUrl?.trim().replace(/\/+$/u, "");
  return normalized || "https://admin.example.local";
}

function formatAlertTypeForStaffNotification(alertType: AlertType): string {
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
      notified_at: input.notified_at ?? existing.notified_at,
      resolved_at: input.resolved_at ?? existing.resolved_at,
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

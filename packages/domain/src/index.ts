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
  name: string | null;
  phone: string | null;
  email: string | null;
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

export interface NotifyOpenAlertsInput {
  tenant_id: string;
  alertRepository: AlertRepository;
  staffNotifier: StaffNotifier;
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
  getLineDisplayName?: (lineUserId: string) => Promise<string | null>;
  createId?: () => string;
  now?: () => string;
}

export interface LogLineWebhookEventsResult {
  customers_upserted: number;
  messages_inserted: number;
  unsupported_events: number;
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
    response_mode: parsed.response_mode,
    status: parsed.status,
    last_message_at: input.last_customer_message_at ?? null,
    last_customer_message_at: input.last_customer_message_at ?? null,
    last_staff_reply_at: null,
    created_at: now,
    updated_at: now
  };

  return repository.save(customer);
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
    const payload = buildStaffNotificationPayload(alert);

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
  let unsupportedEvents = 0;
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
      const customer = await upsertLineCustomer(
        input.customerRepository,
        {
          tenant_id: input.tenant_id,
          line_user_id: event.source_user_id,
          display_name: displayName,
          last_customer_message_at: eventTime
        },
        serviceOptions
      );
      await insertLineTextMessage(
        input.messageRepository,
        {
          tenant_id: input.tenant_id,
          customer_id: customer.id,
          line_message_id: event.message_id,
          body: event.text,
          created_at: eventTime
        },
        serviceOptions
      );
      customersUpserted += 1;
      messagesInserted += 1;
      continue;
    }

    unsupportedEvents += 1;
  }

  return {
    customers_upserted: customersUpserted,
    messages_inserted: messagesInserted,
    unsupported_events: unsupportedEvents
  };
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
    name: null,
    phone: customer.phone,
    email: customer.email,
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

export function buildStaffNotificationPayload(alert: Alert): StaffNotificationPayload {
  return {
    tenant_id: alert.tenant_id,
    alert_id: alert.id,
    customer_id: alert.customer_id,
    alert_type: alert.alert_type,
    severity: alert.severity,
    message: [
      `Alert type: ${alert.alert_type}`,
      `Severity: ${alert.severity}`,
      `Customer: ${alert.customer_id}`,
      `Message: ${alert.message}`,
      `Admin URL: https://admin.example.local/customers/${alert.customer_id}`
    ].join("\n"),
    admin_url: `https://admin.example.local/customers/${alert.customer_id}`
  };
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

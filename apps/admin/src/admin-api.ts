import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  CustomerDetail,
  CustomerListItem as DomainCustomerListItem,
  CustomerRichMenuType,
  CustomerTimelineMessage,
  ResponseMode
} from "@amami-line-crm/domain";

import {
  createBearerAuthorizationHeader,
  readAdminAccessToken,
  type AdminAccessTokenProvider
} from "./admin-auth-token";
import { formatAdminApiErrorCodeForUi, validateSelectedTenantId } from "./selected-tenant";

export const DEFAULT_API_BASE_URL = "http://localhost:4000";
export const DEFAULT_TENANT_ID = "tenant_amamihome";
export const DEFAULT_STAFF_ID = "dev_staff";
export const ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE = "CONFIRM_REAL_LINE_PUSH";
export const ADMIN_BROADCAST_CONFIRMATION_VALUE = "一斉送信を実行";

export interface AdminApiConfig {
  apiBaseUrl: string;
  tenantId: string;
  staffId?: string;
  selectedTenantId?: string | null;
  includeDevTenantHeader?: boolean;
}

export interface AdminCustomerListItem extends DomainCustomerListItem {
  name?: string | null;
  last_staff_reply_at?: string | null;
}

export interface AdminCustomersResponse {
  ok: true;
  tenant_id: string;
  customers: AdminCustomerListItem[];
}

export interface AdminCustomerDetailResponse {
  ok: true;
  tenant_id: string;
  customer: CustomerDetail;
}

export interface AdminCustomerArchiveResponse {
  ok: true;
  tenant_id: string;
  customer_id: string;
  status: "active" | "archived";
}

export interface AdminBroadcastPreviewResponse {
  ok: true;
  tenant_id: string;
  total_customers: number;
  eligible_recipients: number;
  excluded_archived: number;
  excluded_without_line: number;
  excluded_duplicate_line: number;
  broadcast_enabled: boolean;
  max_recipients: number;
}

export interface AdminBroadcastSendResponse {
  ok: true;
  tenant_id: string;
  intended_recipients: number;
  sent_count: number;
  failed_count: number;
  history_record_failed_count: number;
  retry_allowed: false;
}

export interface AdminCustomerTimelineResponse {
  ok: true;
  tenant_id: string;
  customer_id: string;
  messages: CustomerTimelineMessage[];
}

export interface AdminAiSummary {
  summary: string;
  next_actions: string[];
  risk_flags: string[];
  recommended_response_mode: ResponseMode;
  provider: "mock" | "openai";
}

export interface AdminAiSummaryResponse {
  ok: true;
  tenant_id: string;
  customer_id: string;
  summary: AdminAiSummary;
  message: CustomerTimelineMessage;
}

export interface AdminAiReplyDraftResponse {
  ok: true;
  tenant_id: string;
  customer_id: string;
  draft_body: string;
  next_questions: string[];
  risk_flags: string[];
  recommended_response_mode: ResponseMode;
  should_handoff: boolean;
  provider: "mock" | "openai";
}

export interface AdminRagAnswerSource {
  id: string;
  title: string;
  url: string;
  category: string;
  source_type: string;
  excerpt: string;
  score: number;
}

export interface AdminRagAnswerDraftResponse {
  ok: true;
  tenant_id: string;
  query: string;
  can_answer: boolean;
  answer_body: string;
  sources: AdminRagAnswerSource[];
  risk_flags: string[];
  handoff_required: boolean;
  recommended_response_mode: ResponseMode;
  provider?: "mock" | "openai";
}

export interface AdminLineRealSendCapabilityResponse {
  ok: true;
  tenant_id: string;
  line_real_send_window_open: boolean;
  real_send_action_visible: boolean;
  delivery_mode_required: "real_line_push";
  explicit_confirmation_required: boolean;
  single_send_only: boolean;
  retry_allowed: boolean;
  bulk_multicast_broadcast_allowed: boolean;
}

export interface AdminStaffReplyResponse {
  ok: true;
  tenant_id: string;
  customer_id: string;
  message: CustomerTimelineMessage;
  customer: {
    id: string;
    tenant_id: string;
    response_mode: ResponseMode;
    last_staff_reply_at: string | null;
  };
}

export type AdminCustomerRichMenuType = CustomerRichMenuType;

export interface AdminCustomerRichMenuSwitchResponse {
  ok: true;
  tenant_id: string;
  customer_id: string;
  menu_type: AdminCustomerRichMenuType;
  menu_label: string;
  rich_menu_linked: true;
  line_message_sent: false;
  rich_menu_id_recorded: false;
  message: CustomerTimelineMessage;
}

export interface AdminAlertListItem {
  id: string;
  tenant_id: string;
  customer_id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  notified_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AdminAlertsResponse {
  ok: true;
  tenant_id: string;
  alerts: AdminAlertListItem[];
}

export interface AdminCheckUnrepliedAlertsResponse {
  ok: true;
  tenant_id: string;
  checked_customers: number;
  alerts_created: number;
  alerts: AdminAlertListItem[];
}

export interface AdminNotifyOpenAlertsResponse {
  ok: true;
  tenant_id: string;
  notified: number;
  failed: number;
  skipped: number;
  notified_alerts: unknown[];
  failed_alerts: unknown[];
}

export interface AdminApiRequestOptions {
  config?: AdminApiConfig;
  fetchFn?: AdminApiFetch;
  accessTokenProvider?: AdminAccessTokenProvider;
}

type AdminApiFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function getAdminApiConfig(env: NodeJS.ProcessEnv = process.env): AdminApiConfig {
  const explicitStaffId = env.STAFF_ID?.trim();
  const isProduction = env.APP_ENV === "production" || env.NODE_ENV === "production";
  const config: AdminApiConfig = {
    apiBaseUrl: env.API_BASE_URL ?? DEFAULT_API_BASE_URL,
    tenantId: env.TENANT_ID ?? DEFAULT_TENANT_ID,
    includeDevTenantHeader: shouldIncludeDevTenantHeader(env)
  };

  if (explicitStaffId) {
    config.staffId = explicitStaffId;
  } else if (!isProduction) {
    config.staffId = DEFAULT_STAFF_ID;
  }

  return config;
}

export function createAdminApiUrl(path: string, config: AdminApiConfig = getAdminApiConfig()): string {
  const baseUrl = config.apiBaseUrl.endsWith("/") ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, "");

  return new URL(normalizedPath, baseUrl).toString();
}

export async function adminApiFetch<T>(
  path: string,
  init: RequestInit = {},
  options: AdminApiRequestOptions = {}
): Promise<T> {
  const response = await adminApiFetchResponse(path, init, options);

  return response.json() as Promise<T>;
}

export async function adminApiFetchResponse(
  path: string,
  init: RequestInit = {},
  options: AdminApiRequestOptions = {}
): Promise<Response> {
  const config = options.config ?? getAdminApiConfig();
  const fetchFn = options.fetchFn ?? fetch;
  const headers = new Headers(init.headers);
  const method = init.method?.toUpperCase() ?? "GET";
  const selectedTenantId = validateSelectedTenantId(config.selectedTenantId);

  if (!selectedTenantId.ok) {
    throw new Error(formatAdminApiKnownError("invalid_selected_tenant_id"));
  }

  if (config.includeDevTenantHeader !== false) {
    headers.set("x-tenant-id", config.tenantId);
  }

  if (selectedTenantId.selectedTenantId) {
    headers.set("x-selected-tenant-id", selectedTenantId.selectedTenantId);
  }

  const accessToken = await readAdminAccessToken(options.accessTokenProvider);
  const authorizationHeader = accessToken ? createBearerAuthorizationHeader(accessToken) : null;

  if (authorizationHeader && !headers.has("authorization")) {
    headers.set("authorization", authorizationHeader);
  }

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const requestInit: RequestInit = {
    ...init,
    headers
  };

  if (init.cache || method === "GET" || method === "HEAD") {
    requestInit.cache = init.cache ?? "no-store";
  }

  const response = await fetchFn(createAdminApiUrl(path, config), requestInit);

  if (!response.ok) {
    const responseBody = await response.text();
    const knownError = extractAdminApiErrorCode(responseBody);
    const details = knownError ? formatAdminApiKnownError(knownError) : responseBody;

    throw new Error(
      `Admin API request failed: ${response.status} ${response.statusText || ""} ${details}`.trim()
    );
  }

  return response;
}

export function extractAdminApiErrorCode(responseBody: string): string | null {
  try {
    const parsed = JSON.parse(responseBody) as { error?: unknown };

    return typeof parsed.error === "string" ? parsed.error : null;
  } catch {
    return null;
  }
}

export function formatAdminApiKnownError(errorCode: string): string {
  const message = formatAdminApiErrorCodeForUi(errorCode);

  return message ? `${message} (${errorCode})` : errorCode;
}

export function shouldIncludeDevTenantHeader(env: NodeJS.ProcessEnv = process.env): boolean {
  const explicit = env.ADMIN_API_INCLUDE_DEV_TENANT_HEADER?.trim().toLowerCase();

  if (explicit === "true") {
    return true;
  }

  if (explicit === "false") {
    return false;
  }

  return env.APP_ENV !== "production" && env.NODE_ENV !== "production";
}

export function adminCustomerDetailPath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}`;
}

export function adminCustomerTimelinePath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/timeline`;
}

export function adminCustomerMessageAttachmentPath(
  customerId: string,
  messageId: string
): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/messages/${encodeURIComponent(messageId)}/attachment`;
}

export function adminCustomerAiSummaryPath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/ai-summary`;
}

export function adminCustomerAiReplyDraftPath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/ai-reply-draft`;
}

export function adminCustomerReplyPath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/reply`;
}

export function adminCustomerRichMenuPath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/rich-menu`;
}

export function adminCustomerArchivePath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/archive`;
}

export function adminCustomerRestorePath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/restore`;
}

export function adminLineRealSendCapabilityPath(): string {
  return "/api/admin/runtime/line-real-send-capability";
}

export async function getAdminCustomers(
  options: AdminApiRequestOptions = {}
): Promise<AdminCustomersResponse> {
  return adminApiFetch<AdminCustomersResponse>("/api/admin/customers", {}, options);
}

export async function getAdminCustomerDetail(
  customerId: string,
  options: AdminApiRequestOptions = {}
): Promise<AdminCustomerDetailResponse> {
  return adminApiFetch<AdminCustomerDetailResponse>(
    adminCustomerDetailPath(customerId),
    {},
    options
  );
}

export async function getAdminCustomerTimeline(
  customerId: string,
  options: AdminApiRequestOptions = {}
): Promise<AdminCustomerTimelineResponse> {
  return adminApiFetch<AdminCustomerTimelineResponse>(
    adminCustomerTimelinePath(customerId),
    {},
    options
  );
}

export async function archiveAdminCustomer(
  customerId: string,
  options: AdminApiRequestOptions = {}
): Promise<AdminCustomerArchiveResponse> {
  return adminApiFetch<AdminCustomerArchiveResponse>(
    adminCustomerArchivePath(customerId),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmed: true })
    },
    options
  );
}

export async function restoreAdminCustomer(
  customerId: string,
  options: AdminApiRequestOptions = {}
): Promise<AdminCustomerArchiveResponse> {
  return adminApiFetch<AdminCustomerArchiveResponse>(
    adminCustomerRestorePath(customerId),
    { method: "POST" },
    options
  );
}

export async function getAdminBroadcastPreview(
  options: AdminApiRequestOptions = {}
): Promise<AdminBroadcastPreviewResponse> {
  return adminApiFetch<AdminBroadcastPreviewResponse>(
    "/api/admin/broadcast/preview",
    {},
    options
  );
}

export async function sendAdminBroadcast(
  input: {
    body: string;
    confirmed: boolean;
    confirmation: string;
    idempotencyKey: string;
  },
  options: AdminApiRequestOptions = {}
): Promise<AdminBroadcastSendResponse> {
  return adminApiFetch<AdminBroadcastSendResponse>(
    "/api/admin/broadcast/send",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        body: input.body,
        confirmed: input.confirmed,
        confirmation: input.confirmation,
        idempotency_key: input.idempotencyKey
      })
    },
    options
  );
}

export async function getAdminCustomerMessageAttachment(
  customerId: string,
  messageId: string,
  options: AdminApiRequestOptions = {}
): Promise<{
  body: ReadableStream<Uint8Array> | null;
  contentDisposition: string | null;
  contentLength: string | null;
  contentType: string | null;
}> {
  const response = await adminApiFetchResponse(
    adminCustomerMessageAttachmentPath(customerId, messageId),
    {
      headers: {
        accept: "*/*"
      }
    },
    options
  );

  return {
    body: response.body,
    contentDisposition: response.headers.get("content-disposition"),
    contentLength: response.headers.get("content-length"),
    contentType: response.headers.get("content-type")
  };
}

export async function getAdminLineRealSendCapability(
  options: AdminApiRequestOptions = {}
): Promise<AdminLineRealSendCapabilityResponse> {
  return adminApiFetch<AdminLineRealSendCapabilityResponse>(
    adminLineRealSendCapabilityPath(),
    {},
    options
  );
}

export async function listAlerts(
  status?: AlertStatus,
  options: AdminApiRequestOptions = {}
): Promise<AdminAlertsResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";

  return adminApiFetch<AdminAlertsResponse>(`/api/admin/alerts${query}`, {}, options);
}

export async function checkUnrepliedAlerts(
  options: AdminApiRequestOptions = {}
): Promise<AdminCheckUnrepliedAlertsResponse> {
  return adminApiFetch<AdminCheckUnrepliedAlertsResponse>(
    "/api/admin/alerts/check-unreplied",
    {
      method: "POST"
    },
    options
  );
}

export async function notifyOpenAlerts(
  options: AdminApiRequestOptions = {}
): Promise<AdminNotifyOpenAlertsResponse> {
  return adminApiFetch<AdminNotifyOpenAlertsResponse>(
    "/api/admin/alerts/notify-open",
    {
      method: "POST"
    },
    options
  );
}

export async function createAiSummary(
  customerId: string,
  options: AdminApiRequestOptions = {}
): Promise<AdminAiSummaryResponse> {
  return adminApiFetch<AdminAiSummaryResponse>(
    adminCustomerAiSummaryPath(customerId),
    {
      method: "POST"
    },
    options
  );
}

export async function createAiReplyDraft(
  customerId: string,
  options: AdminApiRequestOptions = {}
): Promise<AdminAiReplyDraftResponse> {
  return adminApiFetch<AdminAiReplyDraftResponse>(
    adminCustomerAiReplyDraftPath(customerId),
    {
      method: "POST"
    },
    options
  );
}

export async function createRagAnswerDraft(
  input: { query: string; limit?: number },
  options: AdminApiRequestOptions = {}
): Promise<AdminRagAnswerDraftResponse> {
  return adminApiFetch<AdminRagAnswerDraftResponse>(
    "/api/admin/rag/answer-draft",
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        query: input.query,
        limit: input.limit ?? 5
      })
    },
    options
  );
}

export async function sendStaffReply(
  input: {
    customerId: string;
    body: string;
    deliveryMode?: "demo_save" | "real_line_push";
    realLinePushConfirmed?: boolean;
    linePushConfirmation?: string;
    idempotencyKey?: string;
  },
  options: AdminApiRequestOptions = {}
): Promise<AdminStaffReplyResponse> {
  const config = options.config ?? getAdminApiConfig();
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  const staffId = config.staffId?.trim();
  const requestBody: {
    body: string;
    delivery_mode?: "demo_save" | "real_line_push";
    real_line_push_confirmed?: boolean;
    line_push_confirmation?: string;
    idempotency_key?: string;
  } = {
    body: input.body
  };

  if (input.deliveryMode !== undefined) {
    requestBody.delivery_mode = input.deliveryMode;
  }

  if (input.realLinePushConfirmed !== undefined) {
    requestBody.real_line_push_confirmed = input.realLinePushConfirmed;
  }

  if (input.linePushConfirmation !== undefined) {
    requestBody.line_push_confirmation = input.linePushConfirmation;
  }

  if (input.idempotencyKey !== undefined) {
    requestBody.idempotency_key = input.idempotencyKey;
  }

  if (staffId) {
    headers["x-staff-id"] = staffId;
  }

  return adminApiFetch<AdminStaffReplyResponse>(
    adminCustomerReplyPath(input.customerId),
    {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    },
    {
      ...options,
      config
    }
  );
}

export async function switchAdminCustomerRichMenu(
  input: {
    customerId: string;
    menuType: AdminCustomerRichMenuType;
  },
  options: AdminApiRequestOptions = {}
): Promise<AdminCustomerRichMenuSwitchResponse> {
  const config = options.config ?? getAdminApiConfig();
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  const staffId = config.staffId?.trim();

  if (staffId) {
    headers["x-staff-id"] = staffId;
  }

  return adminApiFetch<AdminCustomerRichMenuSwitchResponse>(
    adminCustomerRichMenuPath(input.customerId),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        menu_type: input.menuType
      })
    },
    {
      ...options,
      config
    }
  );
}

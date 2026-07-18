import type {
  AlertWorkflowStatus,
  AlertSeverity,
  AlertStatus,
  AlertType,
  AdminStaffMember,
  AuditEvent,
  Customer,
  CustomerDetail,
  CustomerListItem as DomainCustomerListItem,
  CustomerRichMenuType,
  CustomerTimelineMessage,
  InternalNote,
  Message,
  OperationsStaffMember,
  ReplyTemplate,
  Reservation,
  ReservationStatus,
  ReservationType,
  ResponseMode,
  WorkspaceSettings
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
export const ADMIN_API_PUBLIC_ERROR_MESSAGE =
  "処理を完了できませんでした。画面を再読み込みして、もう一度お試しください。";

export class AdminApiError extends Error {
  public readonly publicMessage: string;
  public readonly status: number;
  public readonly statusText: string;
  public readonly errorCode: string | null;

  constructor(input: {
    status: number;
    statusText?: string;
    errorCode?: string | null;
    publicMessage?: string;
  }) {
    const statusText = input.statusText?.trim() ?? "";
    const errorCode = input.errorCode ?? null;
    const publicMessage = input.publicMessage ?? ADMIN_API_PUBLIC_ERROR_MESSAGE;
    super(
      `Admin API request failed: ${input.status}${statusText ? ` ${statusText}` : ""}${errorCode ? ` (${errorCode})` : ""}: ${publicMessage}`
    );
    this.name = "AdminApiError";
    this.status = input.status;
    this.statusText = statusText;
    this.errorCode = errorCode;
    this.publicMessage = publicMessage;
  }
}

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
  delivery_status:
    | "completed"
    | "completed_with_delivery_failures"
    | "completed_with_history_finalize_failures"
    | "completed_with_customer_sync_failures";
  intended_recipients: number;
  sent_count: number;
  failed_count: number;
  history_prepare_failed_count: number;
  history_finalize_failed_count: number;
  customer_sync_failed_count: number;
  history_record_failed_count: number;
  retry_allowed: false;
}

export type AdminOutboundMediaPurpose = "staff_reply" | "broadcast";
export type AdminOutboundMediaType = "image" | "video";
export type AdminOutboundMediaContentType = "image/jpeg" | "image/png" | "video/mp4";
export type AdminOutboundMediaPreviewContentType = "image/jpeg" | "image/png";

export interface AdminOutboundMediaReference {
  purpose: AdminOutboundMediaPurpose;
  media_id: string;
  media_type: AdminOutboundMediaType;
  content_type: AdminOutboundMediaContentType;
  media_size: number;
  preview_content_type: AdminOutboundMediaPreviewContentType;
  preview_size: number;
}

export interface AdminOutboundMediaPrepareResponse {
  ok: true;
  tenant_id: string;
  media: AdminOutboundMediaReference;
  media_upload_url: string;
  preview_upload_url: string;
}

export interface AdminOutboundMediaDiscardResponse {
  ok: true;
  tenant_id: string;
  discarded: true;
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
  delivery_status:
    | "saved_as_internal_note"
    | "saved_as_internal_note_audit_failed"
    | "saved"
    | "sent_and_recorded"
    | "sent_history_finalize_failed"
    | "saved_customer_sync_failed"
    | "sent_and_recorded_customer_sync_failed";
  history_recorded: boolean;
  customer_updated: boolean;
  audit_recorded?: boolean;
  retry_allowed: false;
  message?: CustomerTimelineMessage;
  messages?: CustomerTimelineMessage[];
  customer?: {
    id: string;
    tenant_id: string;
    response_mode: ResponseMode;
    last_staff_reply_at: string | null;
  };
  internal_note?: InternalNote;
}

export interface AdminCustomerStatusNotificationResponse {
  ok: true;
  tenant_id: string;
  customer_id: string;
  message: CustomerTimelineMessage;
  retry_allowed: false;
}

export type AdminCustomerRichMenuType = string;
export type AdminCustomerStage = CustomerRichMenuType;

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

export interface AdminOperationsTask extends AdminAlertListItem {
  workflow_status: AlertWorkflowStatus;
  assigned_staff_user_id: string | null;
  due_at: string | null;
  completed_at: string | null;
  is_overdue: boolean;
  customer: {
    id: string;
    name: string | null;
    display_name: string | null;
    phone: string | null;
    email: string | null;
    last_message_at: string | null;
    last_message_body: string | null;
  } | null;
}

export interface AdminOperationsBoardResponse {
  ok: true;
  tenant_id: string;
  tasks: AdminOperationsTask[];
  staff: OperationsStaffMember[];
  summary: {
    total: number;
    open: number;
    in_progress: number;
    waiting_customer: number;
    overdue: number;
    completed: number;
    high_priority: number;
  };
}

export interface AdminStaffDirectoryResponse {
  ok: true;
  tenant_id: string;
  staff: AdminStaffMember[];
}

export interface AdminStaffMemberMutationResponse {
  ok: true;
  tenant_id: string;
  staff_member: AdminStaffMember;
  invitation_status?: "sent" | "reconciled" | "not_required" | "pending" | "failed";
}

export interface AdminInternalNotesResponse {
  ok: true;
  tenant_id: string;
  customer_id: string;
  notes: InternalNote[];
}

export interface AdminReplyTemplatesResponse {
  ok: true;
  tenant_id: string;
  templates: ReplyTemplate[];
}

export interface AdminReservationsResponse {
  ok: true;
  tenant_id: string;
  reservations: Reservation[];
}

export interface AdminWorkspaceSearchResponse {
  ok: true;
  tenant_id: string;
  query: string;
  customers: Customer[];
  messages: Array<{ customer_id: string; message: Message }>;
  notes: Array<{ customer_id: string; note: InternalNote }>;
  alerts: AdminAlertListItem[];
}

export interface AdminWorkspaceSettingsResponse {
  ok: true;
  tenant_id: string;
  settings: WorkspaceSettings;
  settings_version: string | null;
}

export interface AdminAuditEventsResponse {
  ok: true;
  tenant_id: string;
  events: AuditEvent[];
}

export interface AdminOperationsReport {
  customers: { total: number; active: number; new: number; registered: number };
  tasks: { total: number; open: number; completed: number; overdue: number; completion_rate: number };
  reservations: { total: number; upcoming: number; completed: number; cancelled: number };
}

export interface AdminOperationsReportResponse {
  ok: true;
  tenant_id: string;
  report: AdminOperationsReport;
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
    throw new AdminApiError({
      status: 400,
      errorCode: "invalid_selected_tenant_id",
      publicMessage: formatAdminApiKnownError("invalid_selected_tenant_id")
    });
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
    const responseError = extractAdminApiErrorCode(responseBody);
    const knownMessage = responseError ? formatAdminApiErrorCodeForUi(responseError) : null;
    const knownError = knownMessage ? responseError : null;

    throw new AdminApiError({
      status: response.status,
      statusText: response.statusText,
      errorCode: knownError,
      publicMessage: knownMessage ?? ADMIN_API_PUBLIC_ERROR_MESSAGE
    });
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

export async function prepareAdminOutboundMediaUpload(
  media: Omit<AdminOutboundMediaReference, "media_id">,
  options: AdminApiRequestOptions = {}
): Promise<AdminOutboundMediaPrepareResponse> {
  return adminApiFetch<AdminOutboundMediaPrepareResponse>(
    "/api/admin/outbound-media/uploads/prepare",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(media)
    },
    options
  );
}

export async function discardAdminOutboundMediaUpload(
  media: AdminOutboundMediaReference,
  options: AdminApiRequestOptions = {}
): Promise<AdminOutboundMediaDiscardResponse> {
  return adminApiFetch<AdminOutboundMediaDiscardResponse>(
    "/api/admin/outbound-media/uploads/discard",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ media })
    },
    options
  );
}

export async function sendAdminBroadcast(
  input: {
    body: string;
    confirmed: boolean;
    confirmation: string;
    idempotencyKey: string;
    media?: AdminOutboundMediaReference;
  },
  options: AdminApiRequestOptions = {}
): Promise<AdminBroadcastSendResponse> {
  const requestBody: {
    body: string;
    confirmed: boolean;
    confirmation: string;
    idempotency_key: string;
    media?: AdminOutboundMediaReference;
  } = {
    body: input.body,
    confirmed: input.confirmed,
    confirmation: input.confirmation,
    idempotency_key: input.idempotencyKey
  };

  if (input.media !== undefined) {
    requestBody.media = input.media;
  }

  return adminApiFetch<AdminBroadcastSendResponse>(
    "/api/admin/broadcast/send",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody)
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
    media?: AdminOutboundMediaReference;
  },
  options: AdminApiRequestOptions = {}
): Promise<AdminStaffReplyResponse> {
  const config = options.config ?? getAdminApiConfig();
  const headers: Record<string, string> = {};
  const staffId = config.staffId?.trim();
  const requestBody: {
    body: string;
    delivery_mode?: "demo_save" | "real_line_push";
    real_line_push_confirmed?: boolean;
    line_push_confirmation?: string;
    idempotency_key?: string;
    media?: AdminOutboundMediaReference;
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

  if (input.media !== undefined) {
    requestBody.media = input.media;
  }

  if (staffId) {
    headers["x-staff-id"] = staffId;
  }

  headers["content-type"] = "application/json";

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

export async function getAdminOperationsBoard(
  options: AdminApiRequestOptions = {}
): Promise<AdminOperationsBoardResponse> {
  return adminApiFetch<AdminOperationsBoardResponse>("/api/admin/operations/board", {}, options);
}

export async function getAdminStaffDirectory(
  options: AdminApiRequestOptions = {}
): Promise<AdminStaffDirectoryResponse> {
  return adminApiFetch("/api/admin/staff", {}, options);
}

export async function createAdminStaffMember(
  input: {
    display_name: string;
    email: string;
    role: AdminStaffMember["role"];
  },
  options: AdminApiRequestOptions = {}
): Promise<AdminStaffMemberMutationResponse> {
  return adminApiFetch(
    "/api/admin/staff",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    },
    options
  );
}

export async function updateAdminStaffMember(
  staffId: string,
  input: {
    display_name?: string;
    role?: AdminStaffMember["role"];
    is_active?: boolean;
  },
  options: AdminApiRequestOptions = {}
): Promise<AdminStaffMemberMutationResponse> {
  return adminApiFetch(
    `/api/admin/staff/${encodeURIComponent(staffId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    },
    options
  );
}

export async function resendAdminStaffInvitation(
  staffId: string,
  options: AdminApiRequestOptions = {}
): Promise<AdminStaffMemberMutationResponse> {
  return adminApiFetch(
    `/api/admin/staff/${encodeURIComponent(staffId)}/invite`,
    { method: "POST" },
    options
  );
}

export async function updateAdminOperationsTask(
  alertId: string,
  input: {
    workflow_status?: AlertWorkflowStatus;
    assigned_staff_user_id?: string | null;
    due_at?: string | null;
    severity?: AlertSeverity;
  },
  options: AdminApiRequestOptions = {}
): Promise<{ ok: true; tenant_id: string; task: AdminOperationsTask }> {
  return adminApiFetch(
    `/api/admin/operations/tasks/${encodeURIComponent(alertId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    },
    options
  );
}

export async function getAdminInternalNotes(
  customerId: string,
  options: AdminApiRequestOptions = {}
): Promise<AdminInternalNotesResponse> {
  return adminApiFetch(
    `/api/admin/customers/${encodeURIComponent(customerId)}/internal-notes`,
    {},
    options
  );
}

export async function createAdminInternalNote(
  customerId: string,
  input: { body: string; alert_id?: string | null; mention_staff_user_ids?: string[] },
  options: AdminApiRequestOptions = {}
): Promise<{ ok: true; tenant_id: string; note: InternalNote }> {
  return adminApiFetch(
    `/api/admin/customers/${encodeURIComponent(customerId)}/internal-notes`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    },
    options
  );
}

export async function getAdminReplyTemplates(
  options: AdminApiRequestOptions = {}
): Promise<AdminReplyTemplatesResponse> {
  return adminApiFetch("/api/admin/reply-templates", {}, options);
}

export async function saveAdminReplyTemplate(
  input: {
    id?: string;
    title: string;
    category: string;
    body: string;
    is_active: boolean;
  },
  options: AdminApiRequestOptions = {}
): Promise<{ ok: true; tenant_id: string; template: ReplyTemplate }> {
  return adminApiFetch(
    "/api/admin/reply-templates",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    },
    options
  );
}

export async function getAdminReservations(
  options: AdminApiRequestOptions = {}
): Promise<AdminReservationsResponse> {
  return adminApiFetch("/api/admin/reservations", {}, options);
}

export async function saveAdminReservation(
  input: {
    id?: string;
    customer_id: string;
    reservation_type: ReservationType;
    preferred_dates: unknown[];
    confirmed_start_at: string | null;
    confirmed_end_at: string | null;
    status: ReservationStatus;
    staff_user_id: string | null;
    notes: string | null;
  },
  options: AdminApiRequestOptions = {}
): Promise<{ ok: true; tenant_id: string; reservation: Reservation }> {
  return adminApiFetch(
    "/api/admin/reservations",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    },
    options
  );
}

export async function searchAdminWorkspace(
  query: string,
  options: AdminApiRequestOptions = {}
): Promise<AdminWorkspaceSearchResponse> {
  return adminApiFetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {}, options);
}

export async function getAdminWorkspaceSettings(
  options: AdminApiRequestOptions = {}
): Promise<AdminWorkspaceSettingsResponse> {
  return adminApiFetch("/api/admin/workspace-settings", {}, options);
}

export async function saveAdminWorkspaceSettings(
  input: Omit<WorkspaceSettings, "tenant_id" | "created_at" | "updated_at"> & {
    expected_updated_at: string | null;
  },
  options: AdminApiRequestOptions = {}
): Promise<AdminWorkspaceSettingsResponse> {
  return adminApiFetch(
    "/api/admin/workspace-settings",
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    },
    options
  );
}

export async function getAdminAuditEvents(
  limit = 100,
  options: AdminApiRequestOptions = {}
): Promise<AdminAuditEventsResponse> {
  return adminApiFetch(`/api/admin/audit-events?limit=${limit}`, {}, options);
}

export async function getAdminOperationsReport(
  options: AdminApiRequestOptions = {}
): Promise<AdminOperationsReportResponse> {
  return adminApiFetch("/api/admin/reports/overview", {}, options);
}

export async function updateAdminCustomerStage(
  customerId: string,
  input: { stage: AdminCustomerStage; apply_rich_menu: boolean },
  options: AdminApiRequestOptions = {}
): Promise<{
  ok: true;
  tenant_id: string;
  customer_id: string;
  stage: AdminCustomerStage;
  rich_menu_linked: boolean;
  customer: Customer;
}> {
  return adminApiFetch(
    `/api/admin/customers/${encodeURIComponent(customerId)}/stage`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    },
    options
  );
}

export async function sendAdminCustomerStatusNotification(
  customerId: string,
  input: {
    body: string;
    confirmed: boolean;
    confirmation: string;
    idempotency_key: string;
  },
  options: AdminApiRequestOptions = {}
): Promise<AdminCustomerStatusNotificationResponse> {
  return adminApiFetch(
    `/api/admin/customers/${encodeURIComponent(customerId)}/status-notification`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    },
    options
  );
}

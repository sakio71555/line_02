import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  CustomerDetail,
  CustomerListItem as DomainCustomerListItem,
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
  return {
    apiBaseUrl: env.API_BASE_URL ?? DEFAULT_API_BASE_URL,
    tenantId: env.TENANT_ID ?? DEFAULT_TENANT_ID,
    staffId: env.STAFF_ID ?? DEFAULT_STAFF_ID,
    includeDevTenantHeader: shouldIncludeDevTenantHeader(env)
  };
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

  return response.json() as Promise<T>;
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

export function adminCustomerAiSummaryPath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/ai-summary`;
}

export function adminCustomerAiReplyDraftPath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/ai-reply-draft`;
}

export function adminCustomerReplyPath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/reply`;
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
  input: { customerId: string; body: string },
  options: AdminApiRequestOptions = {}
): Promise<AdminStaffReplyResponse> {
  const config = options.config ?? getAdminApiConfig();

  return adminApiFetch<AdminStaffReplyResponse>(
    adminCustomerReplyPath(input.customerId),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-staff-id": config.staffId ?? DEFAULT_STAFF_ID
      },
      body: JSON.stringify({
        body: input.body
      })
    },
    {
      ...options,
      config
    }
  );
}

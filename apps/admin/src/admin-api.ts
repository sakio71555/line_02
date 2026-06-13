import type {
  CustomerDetail,
  CustomerListItem as DomainCustomerListItem,
  CustomerTimelineMessage
} from "@amami-line-crm/domain";

export const DEFAULT_API_BASE_URL = "http://localhost:4000";
export const DEFAULT_TENANT_ID = "tenant_amamihome";

export interface AdminApiConfig {
  apiBaseUrl: string;
  tenantId: string;
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

type AdminApiFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function getAdminApiConfig(env: NodeJS.ProcessEnv = process.env): AdminApiConfig {
  return {
    apiBaseUrl: env.API_BASE_URL ?? DEFAULT_API_BASE_URL,
    tenantId: env.TENANT_ID ?? DEFAULT_TENANT_ID
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
  options: {
    config?: AdminApiConfig;
    fetchFn?: AdminApiFetch;
  } = {}
): Promise<T> {
  const config = options.config ?? getAdminApiConfig();
  const fetchFn = options.fetchFn ?? fetch;
  const headers = new Headers(init.headers);

  headers.set("x-tenant-id", config.tenantId);

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const response = await fetchFn(createAdminApiUrl(path, config), {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `Admin API request failed: ${response.status} ${response.statusText || ""} ${responseBody}`.trim()
    );
  }

  return response.json() as Promise<T>;
}

export function adminCustomerDetailPath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}`;
}

export function adminCustomerTimelinePath(customerId: string): string {
  return `/api/admin/customers/${encodeURIComponent(customerId)}/timeline`;
}

export async function getAdminCustomers(): Promise<AdminCustomersResponse> {
  return adminApiFetch<AdminCustomersResponse>("/api/admin/customers");
}

export async function getAdminCustomerDetail(
  customerId: string
): Promise<AdminCustomerDetailResponse> {
  return adminApiFetch<AdminCustomerDetailResponse>(adminCustomerDetailPath(customerId));
}

export async function getAdminCustomerTimeline(
  customerId: string
): Promise<AdminCustomerTimelineResponse> {
  return adminApiFetch<AdminCustomerTimelineResponse>(adminCustomerTimelinePath(customerId));
}

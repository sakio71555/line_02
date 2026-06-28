import { pathToFileURL } from "node:url";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8788";
const DEFAULT_TENANT_ID = "tenant_amamihome";
const DEFAULT_RECENT_WINDOW_MINUTES = 180;

export interface LineRealPushTargetPreflightInput {
  apiBaseUrl?: string;
  tenantId?: string;
  recentWindowMinutes?: number;
  now?: Date;
  fetch?: typeof fetch;
}

export type LineRealPushTargetPreflightStatus = "success" | "failed";

export interface LineRealPushTargetPreflightResult {
  status: LineRealPushTargetPreflightStatus;
  mode: "dry_run";
  targetUserSelected: boolean;
  distinctTargetCount: number;
  targetUserIdRecorded: false;
  targetMessageBodyRecorded: false;
  outgoingMessageBodyRecorded: false;
  wouldSend: false;
  lineSendAttemptedOnce: false;
  lineRealPushEnabledRequired: true;
  executeModeImplemented: false;
  reason?: string;
}

interface CustomerListResponse {
  customers?: unknown;
}

interface CustomerListItemLike {
  id: string;
  tenant_id: string;
  line_user_id: string | null;
  last_customer_message_at: string | null;
}

export async function runLineRealPushTargetPreflight(
  input: LineRealPushTargetPreflightInput = {}
): Promise<LineRealPushTargetPreflightResult> {
  const apiBaseUrl = normalizeApiBaseUrl(input.apiBaseUrl ?? DEFAULT_API_BASE_URL);
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const recentWindowMinutes = input.recentWindowMinutes ?? DEFAULT_RECENT_WINDOW_MINUTES;
  const fetchImplementation = input.fetch ?? fetch;

  if (!Number.isFinite(recentWindowMinutes) || recentWindowMinutes <= 0) {
    return failed("invalid_recent_window_minutes");
  }

  try {
    const response = await fetchImplementation(`${apiBaseUrl}/api/admin/customers`, {
      headers: {
        "x-tenant-id": tenantId
      }
    });

    if (!response.ok) {
      return failed("customer_list_fetch_failed");
    }

    const payload = (await response.json()) as CustomerListResponse;
    const customers = Array.isArray(payload.customers) ? payload.customers : [];
    const recentTargets = selectRecentTargets({
      customers,
      tenantId,
      now: input.now ?? new Date(),
      recentWindowMinutes
    });
    const distinctTargetCount = new Set(recentTargets.map((customer) => customer.id)).size;

    return {
      status: "success",
      mode: "dry_run",
      targetUserSelected: distinctTargetCount === 1,
      distinctTargetCount,
      targetUserIdRecorded: false,
      targetMessageBodyRecorded: false,
      outgoingMessageBodyRecorded: false,
      wouldSend: false,
      lineSendAttemptedOnce: false,
      lineRealPushEnabledRequired: true,
      executeModeImplemented: false,
      ...(distinctTargetCount === 1 ? {} : { reason: "no_unique_fresh_test_target" })
    };
  } catch {
    return failed("customer_list_fetch_failed");
  }
}

export function formatLineRealPushTargetPreflightResult(
  result: LineRealPushTargetPreflightResult
): string {
  return [
    `line_push_smoke_mode=${result.mode}`,
    `target_user_selected=${String(result.targetUserSelected)}`,
    `distinct_target_count=${formatDistinctTargetCount(result.distinctTargetCount)}`,
    "target_user_id_recorded=false",
    "target_message_body_recorded=false",
    "outgoing_message_body_recorded=false",
    "would_send=false",
    "line_send_attempted_once=false",
    "line_real_push_enabled_required=true",
    "internal_cli_execute_mode_implemented=false",
    ...(result.reason ? [`reason=${result.reason}`] : [])
  ].join("\n") + "\n";
}

async function main(): Promise<void> {
  const result = await runLineRealPushTargetPreflight({
    apiBaseUrl: readArgValue("--api-base-url") ?? process.env.API_BASE_URL,
    tenantId: readArgValue("--tenant-id") ?? process.env.TENANT_ID,
    recentWindowMinutes: readNumberArgValue("--recent-minutes")
  });

  process.stdout.write(formatLineRealPushTargetPreflightResult(result));
  process.exitCode = result.status === "success" ? 0 : 1;
}

function selectRecentTargets(input: {
  customers: unknown[];
  tenantId: string;
  now: Date;
  recentWindowMinutes: number;
}): CustomerListItemLike[] {
  const nowMs = input.now.getTime();
  const windowMs = input.recentWindowMinutes * 60 * 1000;

  return input.customers.flatMap((customer) => {
    const parsed = toCustomerListItemLike(customer);

    if (!parsed) {
      return [];
    }

    if (parsed.tenant_id !== input.tenantId) {
      return [];
    }

    if (!parsed.line_user_id) {
      return [];
    }

    if (!parsed.last_customer_message_at) {
      return [];
    }

    const lastCustomerMessageAt = Date.parse(parsed.last_customer_message_at);

    if (!Number.isFinite(lastCustomerMessageAt)) {
      return [];
    }

    if (nowMs - lastCustomerMessageAt > windowMs) {
      return [];
    }

    return [parsed];
  });
}

function toCustomerListItemLike(value: unknown): CustomerListItemLike | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const tenantId = readString(value.tenant_id);
  const lineUserId = readNullableString(value.line_user_id);
  const lastCustomerMessageAt = readNullableString(value.last_customer_message_at);

  if (!id || !tenantId) {
    return null;
  }

  return {
    id,
    tenant_id: tenantId,
    line_user_id: lineUserId,
    last_customer_message_at: lastCustomerMessageAt
  };
}

function normalizeApiBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function formatDistinctTargetCount(count: number): string {
  return count > 1 ? "multiple" : String(count);
}

function failed(reason: string): LineRealPushTargetPreflightResult {
  return {
    status: "failed",
    mode: "dry_run",
    targetUserSelected: false,
    distinctTargetCount: 0,
    targetUserIdRecorded: false,
    targetMessageBodyRecorded: false,
    outgoingMessageBodyRecorded: false,
    wouldSend: false,
    lineSendAttemptedOnce: false,
    lineRealPushEnabledRequired: true,
    executeModeImplemented: false,
    reason
  };
}

function readArgValue(name: string): string | undefined {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));

  return value ? value.slice(prefix.length).trim() : undefined;
}

function readNumberArgValue(name: string): number | undefined {
  const value = readArgValue(name);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(() => {
    process.stdout.write(formatLineRealPushTargetPreflightResult(failed("unhandled_preflight_error")));
    process.exitCode = 1;
  });
}

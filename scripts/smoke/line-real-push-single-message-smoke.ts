import { access, chmod, mkdir, open } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  FetchLineMessagingTransport,
  RealLineClient,
  type LineClient
} from "@amami-line-crm/line";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8788";
const DEFAULT_TENANT_ID = "tenant_amamihome";
const DEFAULT_RECENT_WINDOW_MINUTES = 180;
const DEFAULT_LOCK_DIR = "/var/lib/amami-line-crm/smoke/line-real-single-message/loop173";
const LOCK_FILE_NAME = "send-attempted.lock";

export interface LineRealPushSingleMessageSmokeInput {
  args?: string[];
  env?: NodeJS.ProcessEnv;
  apiBaseUrl?: string;
  tenantId?: string;
  recentWindowMinutes?: number;
  now?: Date;
  fetch?: typeof fetch;
  lineClient?: LineClient;
  lockStore?: OneSendLockStore;
}

export interface OneSendLockStore {
  exists(): Promise<boolean>;
  create(): Promise<void>;
}

export type LineRealPushSingleMessageSmokeStatus = "success" | "failed";
export type LineRealPushSingleMessageSmokeMode = "dry_run" | "execute";
export type LineRealPushSingleMessageSendResult =
  | "success"
  | "failed"
  | "unknown"
  | "not_performed";

export interface LineRealPushSingleMessageSmokeResult {
  status: LineRealPushSingleMessageSmokeStatus;
  mode: LineRealPushSingleMessageSmokeMode;
  targetUserSelected: boolean;
  distinctTargetCount: number;
  targetUserIdRecorded: false;
  targetMessageBodyRecorded: false;
  outgoingMessageBodyRecorded: false;
  wouldSend: boolean;
  lineSendAttemptedOnce: boolean;
  lineSendResult: LineRealPushSingleMessageSendResult;
  retryPerformed: false;
  bulkMulticastBroadcastGroupRoom: false;
  sendAttemptLockPresent: boolean;
  sendAttemptCount: 0 | 1;
  duplicateSendDetected: false | "unknown";
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

interface TargetSelection {
  target: CustomerListItemLike | null;
  distinctTargetCount: number;
}

export class FileOneSendLockStore implements OneSendLockStore {
  private readonly lockDir: string;
  private readonly now: () => Date;

  constructor(input: { lockDir?: string; now?: () => Date } = {}) {
    this.lockDir = input.lockDir ?? DEFAULT_LOCK_DIR;
    this.now = input.now ?? (() => new Date());
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.lockFilePath);
      return true;
    } catch {
      return false;
    }
  }

  async create(): Promise<void> {
    await mkdir(this.lockDir, { recursive: true });
    await chmod(this.lockDir, 0o700);

    const file = await open(this.lockFilePath, "wx", 0o600);

    try {
      await file.writeFile(`${this.now().toISOString()}\n`);
    } finally {
      await file.close();
    }
  }

  private get lockFilePath(): string {
    return join(this.lockDir, LOCK_FILE_NAME);
  }
}

export async function runLineRealPushSingleMessageSmoke(
  input: LineRealPushSingleMessageSmokeInput = {}
): Promise<LineRealPushSingleMessageSmokeResult> {
  const args = input.args ?? [];
  const env = input.env ?? process.env;
  const mode = args.includes("--execute") ? "execute" : "dry_run";
  const apiBaseUrl = normalizeApiBaseUrl(
    input.apiBaseUrl ?? readArgValue(args, "--api-base-url") ?? env.API_BASE_URL ?? DEFAULT_API_BASE_URL
  );
  const tenantId = input.tenantId ?? readArgValue(args, "--tenant-id") ?? env.TENANT_ID ?? DEFAULT_TENANT_ID;
  const recentWindowMinutes =
    input.recentWindowMinutes ??
    readNumberArgValue(args, "--recent-minutes") ??
    DEFAULT_RECENT_WINDOW_MINUTES;
  const now = input.now ?? new Date();
  const fetchImplementation = input.fetch ?? fetch;
  const lockStore =
    input.lockStore ??
    new FileOneSendLockStore({
      lockDir: readArgValue(args, "--lock-dir") ?? env.LINE_SMOKE_LOCK_DIR,
      now: () => now
    });

  if (!Number.isFinite(recentWindowMinutes) || recentWindowMinutes <= 0) {
    return failed({ mode, reason: "invalid_recent_window_minutes" });
  }

  const targetSelection = await selectTargetFromApi({
    apiBaseUrl,
    tenantId,
    now,
    recentWindowMinutes,
    fetchImplementation
  });

  if (!targetSelection) {
    return failed({ mode, reason: "customer_list_fetch_failed" });
  }

  const targetUserSelected = targetSelection.distinctTargetCount === 1 && targetSelection.target !== null;

  if (mode === "dry_run") {
    return {
      status: targetUserSelected ? "success" : "failed",
      mode,
      targetUserSelected,
      distinctTargetCount: targetSelection.distinctTargetCount,
      targetUserIdRecorded: false,
      targetMessageBodyRecorded: false,
      outgoingMessageBodyRecorded: false,
      wouldSend: false,
      lineSendAttemptedOnce: false,
      lineSendResult: "not_performed",
      retryPerformed: false,
      bulkMulticastBroadcastGroupRoom: false,
      sendAttemptLockPresent: await lockStore.exists(),
      sendAttemptCount: 0,
      duplicateSendDetected: false,
      ...(targetUserSelected ? {} : { reason: "no_unique_fresh_test_target" })
    };
  }

  const executeGateFailure = readExecuteGateFailure(env);

  if (executeGateFailure) {
    return failed({
      mode,
      reason: executeGateFailure,
      distinctTargetCount: targetSelection.distinctTargetCount,
      targetUserSelected
    });
  }

  if (!targetUserSelected || !targetSelection.target) {
    return failed({
      mode,
      reason: "no_unique_fresh_test_target",
      distinctTargetCount: targetSelection.distinctTargetCount,
      targetUserSelected
    });
  }

  if (await lockStore.exists()) {
    return failed({
      mode,
      reason: "send_attempt_lock_exists",
      distinctTargetCount: targetSelection.distinctTargetCount,
      targetUserSelected,
      sendAttemptLockPresent: true,
      duplicateSendDetected: "unknown"
    });
  }

  try {
    await lockStore.create();
  } catch {
    return failed({
      mode,
      reason: "send_attempt_lock_create_failed",
      distinctTargetCount: targetSelection.distinctTargetCount,
      targetUserSelected,
      sendAttemptLockPresent: true,
      duplicateSendDetected: "unknown"
    });
  }

  const lineClient = input.lineClient ?? createRealLineClientFromEnv(env);

  try {
    await lineClient.pushMessage(targetSelection.target.line_user_id, [
      {
        type: "text",
        text: createSmokeMessageText(now)
      }
    ]);

    return {
      status: "success",
      mode,
      targetUserSelected: true,
      distinctTargetCount: 1,
      targetUserIdRecorded: false,
      targetMessageBodyRecorded: false,
      outgoingMessageBodyRecorded: false,
      wouldSend: true,
      lineSendAttemptedOnce: true,
      lineSendResult: "success",
      retryPerformed: false,
      bulkMulticastBroadcastGroupRoom: false,
      sendAttemptLockPresent: true,
      sendAttemptCount: 1,
      duplicateSendDetected: false
    };
  } catch {
    return {
      status: "failed",
      mode,
      targetUserSelected: true,
      distinctTargetCount: 1,
      targetUserIdRecorded: false,
      targetMessageBodyRecorded: false,
      outgoingMessageBodyRecorded: false,
      wouldSend: true,
      lineSendAttemptedOnce: true,
      lineSendResult: "failed",
      retryPerformed: false,
      bulkMulticastBroadcastGroupRoom: false,
      sendAttemptLockPresent: true,
      sendAttemptCount: 1,
      duplicateSendDetected: "unknown",
      reason: "line_send_failed"
    };
  }
}

export function formatLineRealPushSingleMessageSmokeResult(
  result: LineRealPushSingleMessageSmokeResult
): string {
  return [
    `line_push_smoke_mode=${result.mode}`,
    `target_user_selected=${String(result.targetUserSelected)}`,
    `distinct_target_count=${formatDistinctTargetCount(result.distinctTargetCount)}`,
    "target_user_id_recorded=false",
    "target_message_body_recorded=false",
    "outgoing_message_body=fixed non-personal smoke text; value not recorded",
    "outgoing_message_body_recorded=false",
    `would_send=${String(result.wouldSend)}`,
    `line_send_attempted_once=${String(result.lineSendAttemptedOnce)}`,
    `line_send_result=${result.lineSendResult}`,
    "retry_performed=false",
    "bulk_multicast_broadcast_group_room=false",
    `send_attempt_lock_present=${String(result.sendAttemptLockPresent)}`,
    `send_attempt_count=${String(result.sendAttemptCount)}`,
    `duplicate_send_detected=${String(result.duplicateSendDetected)}`,
    ...(result.reason ? [`reason=${result.reason}`] : [])
  ].join("\n") + "\n";
}

async function main(): Promise<void> {
  const result = await runLineRealPushSingleMessageSmoke({
    args: process.argv.slice(2)
  });

  process.stdout.write(formatLineRealPushSingleMessageSmokeResult(result));
  process.exitCode = result.status === "success" ? 0 : 1;
}

async function selectTargetFromApi(input: {
  apiBaseUrl: string;
  tenantId: string;
  now: Date;
  recentWindowMinutes: number;
  fetchImplementation: typeof fetch;
}): Promise<TargetSelection | null> {
  try {
    const response = await input.fetchImplementation(`${input.apiBaseUrl}/api/admin/customers`, {
      headers: {
        "x-tenant-id": input.tenantId
      }
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as CustomerListResponse;
    const customers = Array.isArray(payload.customers) ? payload.customers : [];
    const recentTargets = selectRecentTargets({
      customers,
      tenantId: input.tenantId,
      now: input.now,
      recentWindowMinutes: input.recentWindowMinutes
    });
    const distinctTargetCount = new Set(recentTargets.map((customer) => customer.line_user_id)).size;

    return {
      target: distinctTargetCount === 1 ? recentTargets[0] ?? null : null,
      distinctTargetCount
    };
  } catch {
    return null;
  }
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

function createRealLineClientFromEnv(env: NodeJS.ProcessEnv): LineClient {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  if (!token) {
    throw new Error("LINE channel access token is required.");
  }

  return new RealLineClient({
    channelAccessToken: token,
    transport: new FetchLineMessagingTransport()
  });
}

function createSmokeMessageText(now: Date): string {
  return `LINE controlled smoke ${now.toISOString()}`;
}

function readExecuteGateFailure(env: NodeJS.ProcessEnv): string | null {
  if (env.LINE_REAL_ONE_MESSAGE_SMOKE_APPROVED !== "YES") {
    return "approval_missing";
  }

  if (env.NO_RETRY_NO_BULK_NO_BROADCAST_ACK !== "YES") {
    return "no_retry_no_bulk_ack_missing";
  }

  if (env.ONE_SEND_LOCK_READY !== "YES") {
    return "one_send_lock_ready_missing";
  }

  if (env.LINE_REAL_PUSH_ENABLED !== "true") {
    return "line_real_push_not_enabled";
  }

  return null;
}

function failed(input: {
  mode: LineRealPushSingleMessageSmokeMode;
  reason: string;
  distinctTargetCount?: number;
  targetUserSelected?: boolean;
  sendAttemptLockPresent?: boolean;
  duplicateSendDetected?: false | "unknown";
}): LineRealPushSingleMessageSmokeResult {
  return {
    status: "failed",
    mode: input.mode,
    targetUserSelected: input.targetUserSelected ?? false,
    distinctTargetCount: input.distinctTargetCount ?? 0,
    targetUserIdRecorded: false,
    targetMessageBodyRecorded: false,
    outgoingMessageBodyRecorded: false,
    wouldSend: false,
    lineSendAttemptedOnce: false,
    lineSendResult: "not_performed",
    retryPerformed: false,
    bulkMulticastBroadcastGroupRoom: false,
    sendAttemptLockPresent: input.sendAttemptLockPresent ?? false,
    sendAttemptCount: 0,
    duplicateSendDetected: input.duplicateSendDetected ?? false,
    reason: input.reason
  };
}

function normalizeApiBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function formatDistinctTargetCount(count: number): string {
  return count > 1 ? "multiple" : String(count);
}

function readArgValue(args: string[], name: string): string | undefined {
  const prefix = `${name}=`;
  const value = args.find((arg) => arg.startsWith(prefix));

  return value ? value.slice(prefix.length).trim() : undefined;
}

function readNumberArgValue(args: string[], name: string): number | undefined {
  const value = readArgValue(args, name);

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
    process.stdout.write(
      formatLineRealPushSingleMessageSmokeResult(
        failed({ mode: "dry_run", reason: "unhandled_line_push_smoke_error" })
      )
    );
    process.exitCode = 1;
  });
}

import { isLineRealPushAdminContextAllowed } from "./line-real-push-gate.js";
import type { LineClientMode } from "./line-real-push-gate.js";
import type { AdminTenantContext } from "./tenant-context.js";

export const ADMIN_BROADCAST_CONFIRMATION_VALUE = "一斉送信を実行";
export const DEFAULT_ADMIN_BROADCAST_MAX_RECIPIENTS = 500;

type BroadcastGateInput = {
  lineClientMode: LineClientMode;
  env: NodeJS.ProcessEnv;
  tenantContext: AdminTenantContext;
  selectedTenantId: string | null;
  recipientCount?: number;
  body?: string;
  confirmed?: boolean;
  confirmation?: string;
  idempotencyKey?: string;
};

export function resolveAdminBroadcastMaxRecipients(
  env: NodeJS.ProcessEnv
): number {
  const parsed = Number.parseInt(env.LINE_BROADCAST_MAX_RECIPIENTS ?? "", 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return DEFAULT_ADMIN_BROADCAST_MAX_RECIPIENTS;
  }

  return Math.min(parsed, 5_000);
}

export function isAdminBroadcastAvailable(
  input: Omit<
    BroadcastGateInput,
    "recipientCount" | "body" | "confirmed" | "confirmation" | "idempotencyKey"
  >
): boolean {
  return (
    input.lineClientMode === "real" &&
    input.env.LINE_MESSAGING_ENABLED === "true" &&
    input.env.LINE_REAL_PUSH_ENABLED === "true" &&
    input.env.LINE_BROADCAST_ENABLED === "true" &&
    (input.tenantContext.source === "dev_header" || Boolean(input.selectedTenantId)) &&
    isLineRealPushAdminContextAllowed({
      tenantContext: input.tenantContext,
      env: input.env
    })
  );
}

export function evaluateAdminBroadcastGate(input: BroadcastGateInput):
  | { ok: true; maxRecipients: number }
  | { ok: false; status: 400 | 401 | 409; error: string } {
  if (!isAdminBroadcastAvailable(input)) {
    if (
      !isLineRealPushAdminContextAllowed({
        tenantContext: input.tenantContext,
        env: input.env
      })
    ) {
      return { ok: false, status: 401, error: "authenticated_staff_required" };
    }

    return { ok: false, status: 409, error: "broadcast_disabled" };
  }

  const body = input.body?.trim() ?? "";
  if (body.length < 1 || body.length > 5_000) {
    return { ok: false, status: 400, error: "invalid_broadcast_body" };
  }
  if (!input.confirmed || input.confirmation !== ADMIN_BROADCAST_CONFIRMATION_VALUE) {
    return { ok: false, status: 400, error: "broadcast_confirmation_required" };
  }
  const idempotencyKey = input.idempotencyKey?.trim() ?? "";
  if (
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 160 ||
    !/^[A-Za-z0-9_-]+$/u.test(idempotencyKey)
  ) {
    return { ok: false, status: 400, error: "broadcast_idempotency_required" };
  }

  const recipientCount = input.recipientCount ?? 0;
  if (recipientCount < 1) {
    return { ok: false, status: 409, error: "broadcast_no_recipients" };
  }

  const maxRecipients = resolveAdminBroadcastMaxRecipients(input.env);
  if (recipientCount > maxRecipients) {
    return { ok: false, status: 409, error: "broadcast_recipient_limit_exceeded" };
  }

  return { ok: true, maxRecipients };
}

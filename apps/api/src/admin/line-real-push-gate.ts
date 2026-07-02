import type { Customer } from "@amami-line-crm/domain";

import type { AdminTenantContext } from "./tenant-context";

export const REAL_LINE_PUSH_CONFIRMATION_VALUE = "CONFIRM_REAL_LINE_PUSH";

export type LineClientMode = "mock" | "real";

export interface StaffReplyLinePushRequest {
  body: string;
  deliveryMode: "demo_save" | "real_line_push";
  realLinePushConfirmed: boolean;
  linePushConfirmation: string | null;
  idempotencyKey: string | null;
}

export interface StaffReplyLinePushGateInput {
  env: NodeJS.ProcessEnv;
  lineClientMode: LineClientMode;
  tenantContext: AdminTenantContext;
  selectedTenantId: string | null;
  customer: Customer;
  request: StaffReplyLinePushRequest;
}

export type StaffReplyLinePushGateResult =
  | {
      ok: true;
      deliveryMode: "mock" | "real";
      idempotencyScope: string | null;
    }
  | {
      ok: false;
      status: 401 | 404 | 409;
      error:
        | "authenticated_staff_required"
        | "customer_not_found"
        | "real_push_disabled"
        | "real_push_selected_tenant_required"
        | "real_push_confirmation_required"
        | "real_push_idempotency_required";
    };

export interface LinePushIdempotencyStore {
  reserve(scope: string): boolean;
  release(scope: string): void;
}

export class InMemoryLinePushIdempotencyStore implements LinePushIdempotencyStore {
  private readonly reservedScopes = new Set<string>();

  reserve(scope: string): boolean {
    if (this.reservedScopes.has(scope)) {
      return false;
    }

    this.reservedScopes.add(scope);
    return true;
  }

  release(scope: string): void {
    this.reservedScopes.delete(scope);
  }
}

export function inferLineClientMode(env: NodeJS.ProcessEnv): LineClientMode {
  if ("LINE_MESSAGING_ENABLED" in env || "LINE_REAL_PUSH_ENABLED" in env) {
    return "real";
  }

  return "mock";
}

export function evaluateStaffReplyLinePushGate(
  input: StaffReplyLinePushGateInput
): StaffReplyLinePushGateResult {
  if (input.lineClientMode !== "real") {
    return {
      ok: true,
      deliveryMode: "mock",
      idempotencyScope: null
    };
  }

  if (!isEnabledFlag(input.env.LINE_MESSAGING_ENABLED) || !isEnabledFlag(input.env.LINE_REAL_PUSH_ENABLED)) {
    return linePushGateFailure(409, "real_push_disabled");
  }

  if (input.tenantContext.source !== "authenticated_staff") {
    return linePushGateFailure(401, "authenticated_staff_required");
  }

  if (!input.selectedTenantId) {
    return linePushGateFailure(409, "real_push_selected_tenant_required");
  }

  if (input.customer.tenant_id !== input.tenantContext.tenantId) {
    return linePushGateFailure(404, "customer_not_found");
  }

  if (
    !input.request.realLinePushConfirmed ||
    input.request.linePushConfirmation !== REAL_LINE_PUSH_CONFIRMATION_VALUE
  ) {
    return linePushGateFailure(409, "real_push_confirmation_required");
  }

  if (!input.request.idempotencyKey) {
    return linePushGateFailure(409, "real_push_idempotency_required");
  }

  return {
    ok: true,
    deliveryMode: "real",
    idempotencyScope: createLinePushIdempotencyScope({
      tenantId: input.tenantContext.tenantId,
      customerId: input.customer.id,
      idempotencyKey: input.request.idempotencyKey
    })
  };
}

function isEnabledFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function createLinePushIdempotencyScope(input: {
  tenantId: string;
  customerId: string;
  idempotencyKey: string;
}): string {
  return `${input.tenantId}:${input.customerId}:${input.idempotencyKey}`;
}

function linePushGateFailure(
  status: StaffReplyLinePushGateResult extends infer Result
    ? Result extends { ok: false; status: infer Status }
      ? Status
      : never
    : never,
  error: Extract<StaffReplyLinePushGateResult, { ok: false }>["error"]
): StaffReplyLinePushGateResult {
  return {
    ok: false,
    status,
    error
  };
}

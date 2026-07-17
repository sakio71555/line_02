import { describe, expect, it } from "vitest";

import {
  ADMIN_BROADCAST_CONFIRMATION_VALUE,
  evaluateAdminBroadcastGate,
  isAdminBroadcastAvailable,
  resolveAdminBroadcastMaxRecipients
} from "../../apps/api/src/admin/broadcast-gate";

const authenticatedContext = {
  tenantId: "tenant_amamihome",
  source: "authenticated_staff" as const,
  staffUserId: "staff_001",
  role: "manager" as const
};

const enabledEnv = {
  LINE_MESSAGING_ENABLED: "true",
  LINE_REAL_PUSH_ENABLED: "true",
  LINE_BROADCAST_ENABLED: "true"
};

describe("admin broadcast gate", () => {
  it("is disabled unless every real-send flag is explicitly enabled", () => {
    expect(
      isAdminBroadcastAvailable({
        env: enabledEnv,
        lineClientMode: "real",
        tenantContext: authenticatedContext,
        selectedTenantId: "tenant_amamihome"
      })
    ).toBe(true);

    expect(
      isAdminBroadcastAvailable({
        env: { ...enabledEnv, LINE_BROADCAST_ENABLED: "false" },
        lineClientMode: "real",
        tenantContext: authenticatedContext,
        selectedTenantId: "tenant_amamihome"
      })
    ).toBe(false);
  });

  it("requires exact confirmation and a constrained idempotency key", () => {
    const base = {
      env: enabledEnv,
      lineClientMode: "real" as const,
      tenantContext: authenticatedContext,
      selectedTenantId: "tenant_amamihome",
      recipientCount: 1,
      body: "お知らせです。",
      confirmed: true,
      confirmation: ADMIN_BROADCAST_CONFIRMATION_VALUE
    };

    expect(evaluateAdminBroadcastGate({ ...base, idempotencyKey: "short" })).toEqual({
      ok: false,
      status: 400,
      error: "broadcast_idempotency_required"
    });
    expect(
      evaluateAdminBroadcastGate({ ...base, idempotencyKey: "invalid key with spaces" })
    ).toEqual({
      ok: false,
      status: 400,
      error: "broadcast_idempotency_required"
    });
    expect(
      evaluateAdminBroadcastGate({
        ...base,
        confirmation: "送信します",
        idempotencyKey: "admin-broadcast-valid-key"
      })
    ).toEqual({
      ok: false,
      status: 400,
      error: "broadcast_confirmation_required"
    });
  });

  it("blocks empty recipient sets and configured recipient limits", () => {
    const base = {
      env: { ...enabledEnv, LINE_BROADCAST_MAX_RECIPIENTS: "2" },
      lineClientMode: "real" as const,
      tenantContext: authenticatedContext,
      selectedTenantId: "tenant_amamihome",
      body: "お知らせです。",
      confirmed: true,
      confirmation: ADMIN_BROADCAST_CONFIRMATION_VALUE,
      idempotencyKey: "admin-broadcast-valid-key"
    };

    expect(evaluateAdminBroadcastGate({ ...base, recipientCount: 0 })).toEqual({
      ok: false,
      status: 409,
      error: "broadcast_no_recipients"
    });
    expect(evaluateAdminBroadcastGate({ ...base, recipientCount: 3 })).toEqual({
      ok: false,
      status: 409,
      error: "broadcast_recipient_limit_exceeded"
    });
    expect(evaluateAdminBroadcastGate({ ...base, recipientCount: 2 })).toEqual({
      ok: true,
      maxRecipients: 2
    });
  });

  it("uses a conservative default and caps configured limits", () => {
    expect(resolveAdminBroadcastMaxRecipients({})).toBe(500);
    expect(resolveAdminBroadcastMaxRecipients({ LINE_BROADCAST_MAX_RECIPIENTS: "99999" })).toBe(
      5000
    );
  });
});

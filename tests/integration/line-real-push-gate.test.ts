import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import { REAL_LINE_PUSH_CONFIRMATION_VALUE } from "../../apps/api/src/admin/line-real-push-gate";
import type {
  AuthSessionVerifier,
  AuthSessionVerifierResult
} from "../../apps/api/src/admin/auth-session";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type Customer,
  type StaffAuthLookup,
  type StaffRole,
  type StaffTenantMembership,
  type StaffUser
} from "@amami-line-crm/domain";
import type { LineClient, LineReplyMessage } from "@amami-line-crm/line";

const now = "2026-06-17T06:00:00.000Z";

describe("Loop 102 LINE real push gate", () => {
  it("keeps default staff reply on the demo-save path when delivery_mode is omitted", async () => {
    const setup = createRealPushGateApp({ lineClientMode: "mock" });

    const response = await setup.app.fetch(
      staffReplyRequest({
        customerId: "customer_amami",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: { body: "デモ保存の返信です。" }
      })
    );

    expect(response.status).toBe(200);
    expect(setup.lineClient.pushes).toHaveLength(0);
    expect(setup.messageRepository.list()).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_amami",
        role: "staff",
        body: "デモ保存の返信です。"
      })
    ]);
  });

  it("does not call a real line client when either real push flag is disabled", async () => {
    const setup = createRealPushGateApp({
      env: {
        LINE_MESSAGING_ENABLED: "false",
        LINE_REAL_PUSH_ENABLED: "true"
      }
    });

    const response = await setup.app.fetch(
      authenticatedStaffReplyRequest({
        body: {
          body: "本物送信はまだ不可です。",
          delivery_mode: "real_line_push",
          real_line_push_confirmed: true,
          line_push_confirmation: REAL_LINE_PUSH_CONFIRMATION_VALUE,
          idempotency_key: "idem_disabled"
        }
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "real_push_disabled" });
    expect(setup.lineClient.pushes).toHaveLength(0);
    expect(setup.messageRepository.list()).toHaveLength(0);
  });

  it("allows explicit demo-save staff replies while real push remains disabled", async () => {
    const setup = createRealPushGateApp({
      env: {
        LINE_MESSAGING_ENABLED: "true",
        LINE_REAL_PUSH_ENABLED: "false"
      }
    });

    const response = await setup.app.fetch(
      authenticatedStaffReplyRequest({
        body: {
          body: "デモ保存の返信です。",
          delivery_mode: "demo_save"
        }
      })
    );

    expect(response.status).toBe(200);
    expect(setup.lineClient.pushes).toHaveLength(0);
    expect(setup.messageRepository.list()).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_amami",
        role: "staff",
        body: "デモ保存の返信です。"
      })
    ]);
  });

  it("returns a closed real-send capability when the canary window is disabled", async () => {
    const setup = createRealPushGateApp({
      env: {
        LINE_MESSAGING_ENABLED: "true",
        LINE_REAL_PUSH_ENABLED: "false"
      }
    });

    const response = await setup.app.fetch(authenticatedCapabilityRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      tenant_id: "tenant_amamihome",
      line_real_send_window_open: false,
      real_send_action_visible: false,
      delivery_mode_required: "real_line_push",
      explicit_confirmation_required: true,
      single_send_only: true,
      retry_allowed: false,
      bulk_multicast_broadcast_allowed: false
    });
  });

  it("returns an open real-send capability only when both runtime flags are enabled", async () => {
    const setup = createRealPushGateApp();

    const response = await setup.app.fetch(authenticatedCapabilityRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      tenant_id: "tenant_amamihome",
      line_real_send_window_open: true,
      real_send_action_visible: true,
      delivery_mode_required: "real_line_push",
      explicit_confirmation_required: true,
      single_send_only: true,
      retry_allowed: false,
      bulk_multicast_broadcast_allowed: false
    });
  });

  it("requires authenticated_staff and selectedTenantId before real push", async () => {
    const devHeaderSetup = createRealPushGateApp();
    const devHeaderResponse = await devHeaderSetup.app.fetch(
      staffReplyRequest({
        customerId: "customer_amami",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: {
          body: "dev headerでは本物送信不可です。",
          delivery_mode: "real_line_push",
          real_line_push_confirmed: true,
          line_push_confirmation: REAL_LINE_PUSH_CONFIRMATION_VALUE,
          idempotency_key: "idem_dev_header"
        }
      })
    );

    const missingSelectedSetup = createRealPushGateApp();
    const missingSelectedResponse = await missingSelectedSetup.app.fetch(
      authenticatedStaffReplyRequest({
        includeSelectedTenantId: false,
        body: {
          body: "selectedTenantIdなしでは本物送信不可です。",
          delivery_mode: "real_line_push",
          real_line_push_confirmed: true,
          line_push_confirmation: REAL_LINE_PUSH_CONFIRMATION_VALUE,
          idempotency_key: "idem_missing_selected"
        }
      })
    );

    expect(devHeaderResponse.status).toBe(401);
    expect(await devHeaderResponse.json()).toEqual({
      ok: false,
      error: "authenticated_staff_required"
    });
    expect(missingSelectedResponse.status).toBe(409);
    expect(await missingSelectedResponse.json()).toEqual({
      ok: false,
      error: "real_push_selected_tenant_required"
    });
    expect(devHeaderSetup.lineClient.pushes).toHaveLength(0);
    expect(missingSelectedSetup.lineClient.pushes).toHaveLength(0);
  });

  it("requires send_staff_reply permission before real push", async () => {
    const setup = createRealPushGateApp({ role: "viewer" as StaffRole });

    const response = await setup.app.fetch(
      authenticatedStaffReplyRequest({
        body: {
          body: "権限なしでは本物送信不可です。",
          delivery_mode: "real_line_push",
          real_line_push_confirmed: true,
          line_push_confirmation: REAL_LINE_PUSH_CONFIRMATION_VALUE,
          idempotency_key: "idem_permission"
        }
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "permission_denied" });
    expect(setup.lineClient.pushes).toHaveLength(0);
  });

  it("hides another-tenant customers before real push", async () => {
    const setup = createRealPushGateApp();

    const response = await setup.app.fetch(
      authenticatedStaffReplyRequest({
        customerId: "customer_other",
        body: {
          body: "別tenant顧客には送れません。",
          delivery_mode: "real_line_push",
          real_line_push_confirmed: true,
          line_push_confirmation: REAL_LINE_PUSH_CONFIRMATION_VALUE,
          idempotency_key: "idem_other_tenant"
        }
      })
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "customer_not_found" });
    expect(setup.lineClient.pushes).toHaveLength(0);
  });

  it("requires explicit confirmation and idempotency for real push", async () => {
    const missingConfirmationSetup = createRealPushGateApp();
    const missingConfirmationResponse = await missingConfirmationSetup.app.fetch(
      authenticatedStaffReplyRequest({
        body: {
          body: "確認なしでは本物送信不可です。",
          delivery_mode: "real_line_push",
          idempotency_key: "idem_missing_confirmation"
        }
      })
    );

    const missingIdempotencySetup = createRealPushGateApp();
    const missingIdempotencyResponse = await missingIdempotencySetup.app.fetch(
      authenticatedStaffReplyRequest({
        body: {
          body: "idempotencyなしでは本物送信不可です。",
          delivery_mode: "real_line_push",
          real_line_push_confirmed: true,
          line_push_confirmation: REAL_LINE_PUSH_CONFIRMATION_VALUE
        }
      })
    );

    expect(missingConfirmationResponse.status).toBe(409);
    expect(await missingConfirmationResponse.json()).toEqual({
      ok: false,
      error: "real_push_confirmation_required"
    });
    expect(missingIdempotencyResponse.status).toBe(409);
    expect(await missingIdempotencyResponse.json()).toEqual({
      ok: false,
      error: "real_push_idempotency_required"
    });
    expect(missingConfirmationSetup.lineClient.pushes).toHaveLength(0);
    expect(missingIdempotencySetup.lineClient.pushes).toHaveLength(0);
  });

  it("allows confirmed real push through a fake client and blocks duplicate idempotency keys", async () => {
    const setup = createRealPushGateApp();

    const requestBody = {
      body: "確認済みの本物送信gateテストです。",
      delivery_mode: "real_line_push",
      real_line_push_confirmed: true,
      line_push_confirmation: REAL_LINE_PUSH_CONFIRMATION_VALUE,
      idempotency_key: "idem_confirmed_once"
    };
    const firstResponse = await setup.app.fetch(
      authenticatedStaffReplyRequest({ body: requestBody })
    );
    const duplicateResponse = await setup.app.fetch(
      authenticatedStaffReplyRequest({ body: requestBody })
    );

    expect(firstResponse.status).toBe(200);
    expect(setup.lineClient.pushes).toEqual([
      {
        to: "U_TEST_LINE_TARGET",
        messages: [{ type: "text", text: "確認済みの本物送信gateテストです。" }]
      }
    ]);
    expect(setup.messageRepository.list()).toHaveLength(1);
    expect(setup.messageRepository.list()[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      role: "staff",
      body: "確認済みの本物送信gateテストです。"
    });
    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toEqual({ ok: false, error: "real_push_duplicate" });
    expect(setup.lineClient.pushes).toHaveLength(1);
    expect(setup.messageRepository.list()).toHaveLength(1);
  });
});

interface CreateRealPushGateAppInput {
  env?: NodeJS.ProcessEnv;
  lineClientMode?: "mock" | "real";
  role?: StaffRole;
}

function createRealPushGateApp(input: CreateRealPushGateAppInput = {}) {
  const customerRepository = new InMemoryCustomerRepository();
  const messageRepository = new InMemoryMessageRepository();
  const lineClient = new RecordingLineClient();
  const role = input.role ?? "staff";

  void customerRepository.save(
    createCustomer({
      id: "customer_amami",
      tenantId: "tenant_amamihome",
      lineUserId: "U_TEST_LINE_TARGET"
    })
  );
  void customerRepository.save(
    createCustomer({
      id: "customer_other",
      tenantId: "tenant_other",
      lineUserId: "U_TEST_OTHER_TARGET"
    })
  );

  const app = createApiApp({
    customerRepository,
    messageRepository,
    lineClient,
    lineClientMode: input.lineClientMode ?? "real",
    adminAuthRuntime: {
      sessionVerifier: new FakeAuthSessionVerifier(),
      staffAuthLookup: new FakeStaffAuthLookup(role)
    },
    env: {
      LINE_CHANNEL_SECRET: "test-secret",
      TENANT_ID: "tenant_amamihome",
      TENANT_SLUG: "amamihome",
      LINE_MESSAGING_ENABLED: "true",
      LINE_REAL_PUSH_ENABLED: "true",
      ...input.env
    }
  });

  return {
    app,
    customerRepository,
    lineClient,
    messageRepository
  };
}

function authenticatedStaffReplyRequest(input: {
  customerId?: string;
  includeSelectedTenantId?: boolean;
  body: Record<string, unknown>;
}): Request {
  return staffReplyRequest({
    customerId: input.customerId ?? "customer_amami",
    headers: {
      authorization: "Bearer test-admin-token",
      ...(input.includeSelectedTenantId === false
        ? {}
        : { "x-selected-tenant-id": "tenant_amamihome" })
    },
    body: input.body
  });
}

function authenticatedCapabilityRequest(): Request {
  return new Request("http://localhost/api/admin/runtime/line-real-send-capability", {
    headers: {
      authorization: "Bearer test-admin-token",
      "x-selected-tenant-id": "tenant_amamihome"
    }
  });
}

function staffReplyRequest(input: {
  customerId: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}): Request {
  return new Request(`http://localhost/api/admin/customers/${input.customerId}/reply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...input.headers
    },
    body: JSON.stringify(input.body)
  });
}

class RecordingLineClient implements LineClient {
  readonly pushes: Array<{ to: string; messages: LineReplyMessage[] }> = [];

  async replyMessage(): Promise<void> {
    throw new Error("replyMessage is not used by staff reply.");
  }

  async pushMessage(to: string, messages: LineReplyMessage[]): Promise<void> {
    this.pushes.push({ to, messages });
  }
}

class FakeAuthSessionVerifier implements AuthSessionVerifier {
  async verifyBearerToken(): Promise<AuthSessionVerifierResult> {
    return {
      ok: true,
      authUser: {
        authUserId: "auth_staff"
      }
    };
  }
}

class FakeStaffAuthLookup implements StaffAuthLookup {
  constructor(private readonly role: StaffRole) {}

  async findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null> {
    return {
      id: "staff_001",
      tenant_id: "tenant_amamihome",
      auth_user_id: authUserId,
      email: "staff@example.test",
      display_name: "Test Staff",
      role: this.role,
      status: "active",
      line_user_id: null,
      is_active: true,
      last_login_at: null,
      disabled_at: null,
      archived_at: null,
      created_at: now,
      updated_at: now
    };
  }

  async listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]> {
    return [
      {
        id: "membership_001",
        tenant_id: "tenant_amamihome",
        staff_user_id: staffUserId,
        role: this.role,
        status: "active",
        invited_at: null,
        accepted_at: now,
        disabled_at: null,
        archived_at: null,
        created_at: now,
        updated_at: now
      }
    ];
  }
}

function createCustomer(input: {
  id: string;
  tenantId: string;
  lineUserId: string;
}): Customer {
  return {
    id: input.id,
    tenant_id: input.tenantId,
    line_user_id: input.lineUserId,
    display_name: "テスト顧客",
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: [],
    response_mode: "human_active",
    status: "active",
    last_message_at: null,
    last_customer_message_at: null,
    last_staff_reply_at: null,
    created_at: now,
    updated_at: now
  };
}

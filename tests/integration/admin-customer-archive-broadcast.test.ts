import { describe, expect, it } from "vitest";

import {
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type Alert,
  type AuthUserIdentity,
  type Customer,
  type StaffAuthLookup,
  type StaffRole,
  type StaffTenantMembership,
  type StaffUser
} from "@amami-line-crm/domain";
import type { LineClient, LineReplyMessage } from "@amami-line-crm/line";
import { createApiApp } from "../../apps/api/src/index";
import { ADMIN_BROADCAST_CONFIRMATION_VALUE } from "../../apps/api/src/admin/broadcast-gate";
import type {
  AuthSessionVerifier,
  AuthSessionVerifierResult
} from "../../apps/api/src/admin/auth-session";

const now = "2026-07-17T00:00:00.000Z";

describe("admin customer archive and broadcast", () => {
  it("archives and restores a tenant customer while resolving its open alerts", async () => {
    const setup = createTestApp("manager");
    await setup.customerRepository.save(makeCustomer("customer_active", "U_ACTIVE"));
    await setup.alertRepository.create(makeAlert("alert_open", "customer_active"));

    const missingConfirmation = await setup.app.fetch(
      authenticatedRequest("/api/admin/customers/customer_active/archive", {
        method: "POST",
        body: {}
      })
    );
    expect(missingConfirmation.status).toBe(400);
    expect(await missingConfirmation.json()).toEqual({
      ok: false,
      error: "customer_archive_confirmation_required"
    });

    const archiveResponse = await setup.app.fetch(
      authenticatedRequest("/api/admin/customers/customer_active/archive", {
        method: "POST",
        body: { confirmed: true }
      })
    );
    expect(archiveResponse.status).toBe(200);
    expect(await archiveResponse.json()).toMatchObject({
      ok: true,
      customer_id: "customer_active",
      status: "archived"
    });
    expect(setup.customerRepository.list()[0]?.status).toBe("archived");
    expect((await setup.alertRepository.listByTenant("tenant_amamihome"))[0]).toMatchObject({
      status: "resolved",
      resolved_at: now
    });

    const restoreResponse = await setup.app.fetch(
      authenticatedRequest("/api/admin/customers/customer_active/restore", {
        method: "POST"
      })
    );
    expect(restoreResponse.status).toBe(200);
    expect(setup.customerRepository.list()[0]?.status).toBe("active");
  });

  it("denies archive and broadcast actions to staff", async () => {
    const setup = createTestApp("staff");
    await setup.customerRepository.save(makeCustomer("customer_active", "U_ACTIVE"));

    const archiveResponse = await setup.app.fetch(
      authenticatedRequest("/api/admin/customers/customer_active/archive", {
        method: "POST",
        body: { confirmed: true }
      })
    );
    const previewResponse = await setup.app.fetch(
      authenticatedRequest("/api/admin/broadcast/preview")
    );

    expect(archiveResponse.status).toBe(403);
    expect(previewResponse.status).toBe(403);
    expect(setup.customerRepository.list()[0]?.status).toBe("active");
  });

  it("sends once only to active LINE-linked customers in the selected tenant", async () => {
    const setup = createTestApp("manager");
    await Promise.all([
      setup.customerRepository.save(makeCustomer("customer_active", "U_ACTIVE")),
      setup.customerRepository.save(makeCustomer("customer_duplicate", "U_ACTIVE")),
      setup.customerRepository.save(makeCustomer("customer_archived", "U_ARCHIVED", "archived")),
      setup.customerRepository.save(makeCustomer("customer_without_line", null)),
      setup.customerRepository.save(
        makeCustomer("customer_other", "U_OTHER", "active", "tenant_other")
      )
    ]);

    const previewResponse = await setup.app.fetch(
      authenticatedRequest("/api/admin/broadcast/preview")
    );
    expect(previewResponse.status).toBe(200);
    expect(await previewResponse.json()).toMatchObject({
      total_customers: 4,
      eligible_recipients: 1,
      excluded_archived: 1,
      excluded_without_line: 1,
      excluded_duplicate_line: 1,
      broadcast_enabled: true
    });

    const requestBody = {
      body: "営業時間変更のお知らせです。",
      confirmed: true,
      confirmation: ADMIN_BROADCAST_CONFIRMATION_VALUE,
      idempotency_key: "admin-broadcast-integration-001"
    };
    const sendResponse = await setup.app.fetch(
      authenticatedRequest("/api/admin/broadcast/send", {
        method: "POST",
        body: requestBody
      })
    );
    expect(sendResponse.status).toBe(200);
    expect(await sendResponse.json()).toMatchObject({
      intended_recipients: 1,
      sent_count: 1,
      failed_count: 0,
      history_record_failed_count: 0,
      retry_allowed: false
    });
    expect(setup.lineClient.pushes).toEqual([
      {
        to: "U_ACTIVE",
        messages: [{ type: "text", text: "営業時間変更のお知らせです。" }]
      }
    ]);
    expect(setup.messageRepository.list()).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_active",
        role: "staff",
        body: "営業時間変更のお知らせです。"
      })
    ]);

    const duplicateResponse = await setup.app.fetch(
      authenticatedRequest("/api/admin/broadcast/send", {
        method: "POST",
        body: requestBody
      })
    );
    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toEqual({ ok: false, error: "broadcast_duplicate" });
    expect(setup.lineClient.pushes).toHaveLength(1);
  });

  it("records aggregate failures without retrying or creating history for failed recipients", async () => {
    const setup = createTestApp("manager");
    await Promise.all([
      setup.customerRepository.save(makeCustomer("customer_success", "U_SUCCESS")),
      setup.customerRepository.save(makeCustomer("customer_failure", "U_FAILURE"))
    ]);
    setup.lineClient.failedRecipients.add("U_FAILURE");

    const sendResponse = await setup.app.fetch(
      authenticatedRequest("/api/admin/broadcast/send", {
        method: "POST",
        body: {
          body: "休業日のお知らせです。",
          confirmed: true,
          confirmation: ADMIN_BROADCAST_CONFIRMATION_VALUE,
          idempotency_key: "admin-broadcast-integration-failure-001"
        }
      })
    );

    expect(sendResponse.status).toBe(200);
    expect(await sendResponse.json()).toMatchObject({
      intended_recipients: 2,
      sent_count: 1,
      failed_count: 1,
      history_record_failed_count: 0,
      retry_allowed: false
    });
    expect(setup.lineClient.attempts).toEqual(["U_SUCCESS", "U_FAILURE"]);
    expect(setup.lineClient.pushes).toEqual([
      {
        to: "U_SUCCESS",
        messages: [{ type: "text", text: "休業日のお知らせです。" }]
      }
    ]);
    expect(setup.messageRepository.list()).toEqual([
      expect.objectContaining({ customer_id: "customer_success" })
    ]);
  });
});

function createTestApp(role: StaffRole) {
  const alertRepository = new InMemoryAlertRepository();
  const customerRepository = new InMemoryCustomerRepository();
  const messageRepository = new InMemoryMessageRepository();
  const lineClient = new RecordingLineClient();

  return {
    alertRepository,
    customerRepository,
    lineClient,
    messageRepository,
    app: createApiApp({
      alertRepository,
      customerRepository,
      messageRepository,
      lineClient,
      lineClientMode: "real",
      now: () => now,
      adminAuthRuntime: {
        sessionVerifier: new FakeAuthSessionVerifier(),
        staffAuthLookup: new FakeStaffAuthLookup(role)
      },
      env: {
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome",
        LINE_MESSAGING_ENABLED: "true",
        LINE_REAL_PUSH_ENABLED: "true",
        LINE_BROADCAST_ENABLED: "true"
      }
    })
  };
}

function authenticatedRequest(
  path: string,
  input: { method?: string; body?: Record<string, unknown> } = {}
): Request {
  return new Request(`http://localhost${path}`, {
    method: input.method,
    headers: {
      authorization: "Bearer test-admin-token",
      "x-selected-tenant-id": "tenant_amamihome",
      ...(input.body ? { "content-type": "application/json" } : {})
    },
    ...(input.body ? { body: JSON.stringify(input.body) } : {})
  });
}

class RecordingLineClient implements LineClient {
  readonly attempts: string[] = [];
  readonly failedRecipients = new Set<string>();
  readonly pushes: Array<{ to: string; messages: LineReplyMessage[] }> = [];

  async replyMessage(): Promise<void> {
    throw new Error("replyMessage is not used by broadcast.");
  }

  async pushMessage(to: string, messages: LineReplyMessage[]): Promise<void> {
    this.attempts.push(to);
    if (this.failedRecipients.has(to)) {
      throw new Error("simulated LINE push failure");
    }
    this.pushes.push({ to, messages });
  }
}

class FakeAuthSessionVerifier implements AuthSessionVerifier {
  async verifyBearerToken(): Promise<AuthSessionVerifierResult> {
    const authUser: AuthUserIdentity = { authUserId: "auth_staff" };
    return { ok: true, authUser };
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

function makeCustomer(
  id: string,
  lineUserId: string | null,
  status: Customer["status"] = "active",
  tenantId = "tenant_amamihome"
): Customer {
  return {
    id,
    tenant_id: tenantId,
    line_user_id: lineUserId,
    display_name: "テスト顧客",
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: [],
    response_mode: "human_active",
    status,
    last_message_at: null,
    last_customer_message_at: null,
    last_staff_reply_at: null,
    created_at: now,
    updated_at: now
  };
}

function makeAlert(id: string, customerId: string): Alert {
  return {
    id,
    tenant_id: "tenant_amamihome",
    customer_id: customerId,
    consultation_id: null,
    alert_type: "unreplied_customer_message",
    status: "open",
    severity: "high",
    message: "未対応です。",
    triggered_at: now,
    notified_at: null,
    resolved_at: null,
    created_at: now,
    updated_at: now
  };
}

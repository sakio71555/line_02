import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import type {
  AuthSessionVerifier,
  AuthSessionVerifierResult
} from "../../apps/api/src/admin/auth-session";
import {
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type Alert,
  type AlertRepository,
  type AlertStatus,
  type AlertType,
  type AuthUserIdentity,
  type Customer,
  type StaffAuthLookup,
  type StaffNotificationPayload,
  type StaffNotifier,
  type StaffRole,
  type StaffTenantMembership,
  type StaffUser
} from "@amami-line-crm/domain";

const now = "2026-06-17T01:00:00.000Z";

describe("authenticated_staff runtime alert routes", () => {
  it("lists alerts through a single membership and no selectedTenantId", async () => {
    const { app, alertRepository } = createAuthenticatedAlertApp({
      includeAuthRuntime: true
    });
    await seedAlertRouteData({ alertRepository });

    const response = await app.fetch(alertsRequest({ authorization: "Bearer fake-valid-owner" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome"
    });
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0]).toMatchObject({
      id: "alert_amami_open",
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      status: "open"
    });
    expect(alertRepository.listByTenantCalls).toEqual(["tenant_amamihome"]);
  });

  it("requires selectedTenantId for a multi-tenant alert list request", async () => {
    const { app, alertRepository } = createAuthenticatedAlertApp({
      includeAuthRuntime: true
    });
    await seedAlertRouteData({ alertRepository });

    const response = await app.fetch(alertsRequest({ authorization: "Bearer fake-valid-multi" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "tenant_selection_required"
    });
    expect(alertRepository.listByTenantCalls).toEqual([]);
  });

  it("uses matching x-selected-tenant-id to scope alert list results", async () => {
    const { app, alertRepository } = createAuthenticatedAlertApp({
      includeAuthRuntime: true
    });
    await seedAlertRouteData({ alertRepository });

    const response = await app.fetch(
      alertsRequest({
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant_other"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_other"
    });
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0]).toMatchObject({
      id: "alert_other_open",
      tenant_id: "tenant_other",
      customer_id: "customer_other",
      status: "open"
    });
    expect(alertRepository.listByTenantCalls).toEqual(["tenant_other"]);
  });

  it("rejects wrong selectedTenantId before alert list repository access", async () => {
    const { app, alertRepository } = createAuthenticatedAlertApp({
      includeAuthRuntime: true
    });
    await seedAlertRouteData({ alertRepository });

    const response = await app.fetch(
      alertsRequest({
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant_outside"
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "tenant_membership_denied"
    });
    expect(alertRepository.listByTenantCalls).toEqual([]);
  });

  it("rejects invalid selectedTenantId before session and alert repository access", async () => {
    const { app, alertRepository, sessionVerifier } = createAuthenticatedAlertApp({
      includeAuthRuntime: true
    });
    await seedAlertRouteData({ alertRepository });

    const response = await app.fetch(
      alertsRequest({
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant invalid"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_selected_tenant_id"
    });
    expect(sessionVerifier.tokens).toEqual([]);
    expect(alertRepository.listByTenantCalls).toEqual([]);
  });

  it("checks unreplied alerts through verified AdminTenantContext.tenantId only", async () => {
    const { app, customerRepository, alertRepository } = createAuthenticatedAlertApp({
      includeAuthRuntime: true
    });
    await seedAlertRouteData({ customerRepository });

    const response = await app.fetch(
      checkUnrepliedRequest({
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant_other"
      })
    );
    const body = await response.json();
    const amamiAlerts = await alertRepository.listByTenant("tenant_amamihome");
    const otherAlerts = await alertRepository.listByTenant("tenant_other");

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_other",
      checked_customers: 1,
      alerts_created: 1
    });
    expect(body.alerts).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_other",
        customer_id: "customer_other",
        alert_type: "unreplied_customer_message",
        type: "unreplied_customer_message",
        status: "open"
      })
    ]);
    expect(customerRepository.listByTenantCalls).toEqual(["tenant_other"]);
    expect(alertRepository.findActiveByCustomerAndTypeCalls).toEqual([
      {
        tenantId: "tenant_other",
        customerId: "customer_other",
        alertType: "unreplied_customer_message"
      }
    ]);
    expect(alertRepository.createCalls).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_other",
        customer_id: "customer_other"
      })
    ]);
    expect(amamiAlerts).toEqual([]);
    expect(otherAlerts).toHaveLength(1);
  });

  it("denies staff role for unreplied alert checks before repository access", async () => {
    const { app, customerRepository, alertRepository } = createAuthenticatedAlertApp({
      includeAuthRuntime: true
    });
    await seedAlertRouteData({ customerRepository });

    const response = await app.fetch(
      checkUnrepliedRequest({
        authorization: "Bearer fake-valid-staff"
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "permission_denied"
    });
    expect(customerRepository.listByTenantCalls).toEqual([]);
    expect(alertRepository.findActiveByCustomerAndTypeCalls).toEqual([]);
    expect(alertRepository.createCalls).toEqual([]);
  });

  it("notifies open alerts through verified AdminTenantContext.tenantId only", async () => {
    const { app, alertRepository, staffNotifier } = createAuthenticatedAlertApp({
      includeAuthRuntime: true
    });
    await seedAlertRouteData({ alertRepository });

    const response = await app.fetch(
      notifyOpenRequest({
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant_other"
      })
    );
    const body = await response.json();
    const amamiAlert = await alertRepository.findActiveByCustomerAndType(
      "tenant_amamihome",
      "customer_amami",
      "unreplied_customer_message"
    );
    const otherAlert = await alertRepository.findActiveByCustomerAndType(
      "tenant_other",
      "customer_other",
      "unreplied_customer_message"
    );

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_other",
      notified: 1,
      failed: 0,
      skipped: 0
    });
    expect(alertRepository.listByTenantCalls).toEqual(["tenant_other"]);
    expect(alertRepository.listOpenByTenantCalls).toEqual(["tenant_other"]);
    expect(alertRepository.updateStatusCalls).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_other",
        alert_id: "alert_other_open",
        status: "notified",
        notified_at: now
      })
    ]);
    expect(staffNotifier.notifications).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_other",
        alert_id: "alert_other_open",
        customer_id: "customer_other"
      })
    ]);
    expect(amamiAlert).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      status: "open",
      notified_at: null
    });
    expect(otherAlert).toMatchObject({
      tenant_id: "tenant_other",
      customer_id: "customer_other",
      status: "notified",
      notified_at: now
    });
  });

  it("denies staff role for open alert notification before notifier access", async () => {
    const { app, alertRepository, staffNotifier } = createAuthenticatedAlertApp({
      includeAuthRuntime: true
    });
    await seedAlertRouteData({ alertRepository });

    const response = await app.fetch(
      notifyOpenRequest({
        authorization: "Bearer fake-valid-staff"
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "permission_denied"
    });
    expect(alertRepository.listByTenantCalls).toEqual([]);
    expect(alertRepository.listOpenByTenantCalls).toEqual([]);
    expect(alertRepository.updateStatusCalls).toEqual([]);
    expect(staffNotifier.notifications).toEqual([]);
  });

  it("keeps dev_header path and ignores x-selected-tenant-id on alert routes", async () => {
    const { app, customerRepository, alertRepository, staffNotifier, sessionVerifier } =
      createAuthenticatedAlertApp();
    await seedAlertRouteData({ customerRepository, alertRepository });

    const headers = {
      "x-tenant-id": "tenant_amamihome",
      "x-selected-tenant-id": "tenant invalid"
    };
    const listResponse = await app.fetch(alertsRequest(headers));
    const checkResponse = await app.fetch(checkUnrepliedRequest(headers));
    const notifyResponse = await app.fetch(notifyOpenRequest(headers));

    expect(listResponse.status).toBe(200);
    expect(checkResponse.status).toBe(200);
    expect(notifyResponse.status).toBe(200);
    expect(sessionVerifier.tokens).toEqual([]);
    expect(customerRepository.listByTenantCalls).toEqual(["tenant_amamihome"]);
    expect(alertRepository.listOpenByTenantCalls).toEqual(["tenant_amamihome"]);
    expect(staffNotifier.notifications).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_amamihome",
        alert_id: "alert_amami_open"
      })
    ]);
  });

  it("keeps default in_memory app behavior for alert routes", async () => {
    const app = createApiApp({
      customerRepository: new InMemoryCustomerRepository(),
      messageRepository: new InMemoryMessageRepository(),
      alertRepository: new InMemoryAlertRepository(),
      env: {
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome",
        LINE_CHANNEL_SECRET: "test-secret"
      }
    });
    const headers = { "x-tenant-id": "tenant_amamihome" };

    const listResponse = await app.fetch(alertsRequest(headers));
    const checkResponse = await app.fetch(checkUnrepliedRequest(headers));
    const notifyResponse = await app.fetch(notifyOpenRequest(headers));
    const listBody = await listResponse.json();
    const checkBody = await checkResponse.json();
    const notifyBody = await notifyResponse.json();

    expect(listResponse.status).toBe(200);
    expect(checkResponse.status).toBe(200);
    expect(notifyResponse.status).toBe(200);
    expect(listBody).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      alerts: []
    });
    expect(checkBody).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      checked_customers: 0,
      alerts_created: 0,
      alerts: []
    });
    expect(notifyBody).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      notified: 0,
      failed: 0,
      skipped: 0,
      notified_alerts: [],
      failed_alerts: []
    });
  });
});

interface AuthenticatedAlertAppInput {
  includeAuthRuntime?: boolean;
}

function createAuthenticatedAlertApp(input: AuthenticatedAlertAppInput = {}) {
  const customerRepository = new SpyCustomerRepository();
  const alertRepository = new SpyAlertRepository();
  const staffNotifier = new RecordingStaffNotifier();
  const sessionVerifier = new FakeAuthSessionVerifier({
    "fake-valid-owner": { authUserId: "auth_owner", email: "owner@example.test" },
    "fake-valid-staff": { authUserId: "auth_staff", email: "staff@example.test" },
    "fake-valid-multi": { authUserId: "auth_multi", email: "multi@example.test" }
  });
  const staffAuthLookup = createFakeStaffAuthLookup();

  const app = createApiApp({
    customerRepository,
    messageRepository: new InMemoryMessageRepository(),
    alertRepository,
    staffNotifier,
    now: () => now,
    ...(input.includeAuthRuntime
      ? {
          adminAuthRuntime: {
            sessionVerifier,
            staffAuthLookup
          }
        }
      : {}),
    env: {
      TENANT_ID: "tenant_amamihome",
      TENANT_SLUG: "amamihome",
      LINE_CHANNEL_SECRET: "test-secret"
    }
  });

  return {
    app,
    customerRepository,
    alertRepository,
    staffNotifier,
    sessionVerifier
  };
}

async function seedAlertRouteData(input: {
  customerRepository?: SpyCustomerRepository;
  alertRepository?: SpyAlertRepository;
}): Promise<void> {
  if (input.customerRepository) {
    await input.customerRepository.save(
      createCustomer({
        id: "customer_amami",
        tenant_id: "tenant_amamihome",
        last_customer_message_at: "2026-06-17T00:00:00.000Z",
        last_message_at: "2026-06-17T00:00:00.000Z"
      })
    );
    await input.customerRepository.save(
      createCustomer({
        id: "customer_other",
        tenant_id: "tenant_other",
        last_customer_message_at: "2026-06-17T00:00:00.000Z",
        last_message_at: "2026-06-17T00:00:00.000Z"
      })
    );
  }

  if (input.alertRepository) {
    await input.alertRepository.create(
      createAlert({
        id: "alert_amami_open",
        tenant_id: "tenant_amamihome",
        customer_id: "customer_amami"
      })
    );
    await input.alertRepository.create(
      createAlert({
        id: "alert_other_open",
        tenant_id: "tenant_other",
        customer_id: "customer_other"
      })
    );
  }
}

function alertsRequest(headers: HeadersInit = {}): Request {
  return new Request("http://localhost/api/admin/alerts", {
    headers
  });
}

function checkUnrepliedRequest(headers: HeadersInit = {}): Request {
  return new Request("http://localhost/api/admin/alerts/check-unreplied", {
    method: "POST",
    headers
  });
}

function notifyOpenRequest(headers: HeadersInit = {}): Request {
  return new Request("http://localhost/api/admin/alerts/notify-open", {
    method: "POST",
    headers
  });
}

class SpyCustomerRepository extends InMemoryCustomerRepository {
  readonly listByTenantCalls: string[] = [];

  override async listByTenant(tenantId: string): Promise<Customer[]> {
    this.listByTenantCalls.push(tenantId);
    return super.listByTenant(tenantId);
  }
}

class SpyAlertRepository extends InMemoryAlertRepository implements AlertRepository {
  readonly createCalls: Alert[] = [];
  readonly listByTenantCalls: string[] = [];
  readonly listOpenByTenantCalls: string[] = [];
  readonly findActiveByCustomerAndTypeCalls: Array<{
    tenantId: string;
    customerId: string;
    alertType: AlertType;
  }> = [];
  readonly updateStatusCalls: Array<{
    tenant_id: string;
    alert_id: string;
    status: AlertStatus;
    notified_at?: string | null;
    resolved_at?: string | null;
    updated_at: string;
  }> = [];

  override async create(alert: Alert): Promise<Alert> {
    this.createCalls.push(alert);
    return super.create(alert);
  }

  override async listByTenant(tenantId: string): Promise<Alert[]> {
    this.listByTenantCalls.push(tenantId);
    return super.listByTenant(tenantId);
  }

  override async listOpenByTenant(tenantId: string): Promise<Alert[]> {
    this.listOpenByTenantCalls.push(tenantId);
    return super.listOpenByTenant(tenantId);
  }

  override async findActiveByCustomerAndType(
    tenantId: string,
    customerId: string,
    alertType: AlertType
  ): Promise<Alert | null> {
    this.findActiveByCustomerAndTypeCalls.push({ tenantId, customerId, alertType });
    return super.findActiveByCustomerAndType(tenantId, customerId, alertType);
  }

  override async updateStatus(input: {
    tenant_id: string;
    alert_id: string;
    status: AlertStatus;
    notified_at?: string | null;
    resolved_at?: string | null;
    updated_at: string;
  }): Promise<Alert | null> {
    this.updateStatusCalls.push(input);
    return super.updateStatus(input);
  }
}

class RecordingStaffNotifier implements StaffNotifier {
  readonly notifications: StaffNotificationPayload[] = [];

  async notify(payload: StaffNotificationPayload): Promise<void> {
    this.notifications.push(payload);
  }
}

type FakeVerifierResponse = AuthSessionVerifierResult | AuthUserIdentity | null;

class FakeAuthSessionVerifier implements AuthSessionVerifier {
  readonly tokens: string[] = [];

  constructor(private readonly responses: Record<string, FakeVerifierResponse>) {}

  async verifyBearerToken(token: string): Promise<FakeVerifierResponse> {
    this.tokens.push(token);
    if (Object.prototype.hasOwnProperty.call(this.responses, token)) {
      return this.responses[token] ?? null;
    }

    return null;
  }
}

class FakeStaffAuthLookup implements StaffAuthLookup {
  constructor(
    private readonly staffByAuthUserId: Map<string, StaffUser>,
    private readonly membershipsByStaffUserId: Map<string, StaffTenantMembership[]>
  ) {}

  async findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null> {
    const staff = this.staffByAuthUserId.get(authUserId) ?? null;
    return staff?.auth_user_id === authUserId ? staff : null;
  }

  async listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]> {
    return this.membershipsByStaffUserId.get(staffUserId) ?? [];
  }
}

function createFakeStaffAuthLookup(): FakeStaffAuthLookup {
  const owner = createStaff({ id: "staff_owner", auth_user_id: "auth_owner", role: "owner" });
  const staff = createStaff({ id: "staff_staff", auth_user_id: "auth_staff", role: "staff" });
  const multi = createStaff({ id: "staff_multi", auth_user_id: "auth_multi", role: "manager" });

  return new FakeStaffAuthLookup(
    new Map([
      ["auth_owner", owner],
      ["auth_staff", staff],
      ["auth_multi", multi]
    ]),
    new Map([
      ["staff_owner", [createMembership({ staff_user_id: "staff_owner", role: "owner" })]],
      ["staff_staff", [createMembership({ staff_user_id: "staff_staff", role: "staff" })]],
      [
        "staff_multi",
        [
          createMembership({
            id: "membership_multi_amami",
            tenant_id: "tenant_amamihome",
            staff_user_id: "staff_multi",
            role: "manager"
          }),
          createMembership({
            id: "membership_multi_other",
            tenant_id: "tenant_other",
            staff_user_id: "staff_multi",
            role: "owner"
          })
        ]
      ]
    ])
  );
}

function createStaff(overrides: Partial<StaffUser> = {}): StaffUser {
  return {
    id: "staff_1",
    tenant_id: "tenant_amamihome",
    auth_user_id: "auth_user_1",
    email: "staff@example.test",
    display_name: "Fake Staff",
    role: "staff",
    status: "active",
    line_user_id: null,
    is_active: true,
    last_login_at: null,
    disabled_at: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function createMembership(
  overrides: Partial<StaffTenantMembership> = {}
): StaffTenantMembership {
  return {
    id: "membership_1",
    tenant_id: "tenant_amamihome",
    staff_user_id: "staff_1",
    role: "staff" satisfies StaffRole,
    status: "active",
    invited_at: null,
    accepted_at: now,
    disabled_at: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "customer_1",
    tenant_id: "tenant_amamihome",
    line_user_id: "U_TEST_USER",
    display_name: "Fake Customer",
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: [],
    response_mode: "human_required",
    status: "active",
    last_message_at: null,
    last_customer_message_at: null,
    last_staff_reply_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function createAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert_1",
    tenant_id: "tenant_amamihome",
    customer_id: "customer_1",
    consultation_id: null,
    alert_type: "unreplied_customer_message",
    status: "open",
    severity: "high",
    message: "未返信alertです。",
    triggered_at: "2026-06-17T00:00:00.000Z",
    notified_at: null,
    resolved_at: null,
    created_at: "2026-06-17T00:00:00.000Z",
    updated_at: "2026-06-17T00:00:00.000Z",
    ...overrides
  };
}

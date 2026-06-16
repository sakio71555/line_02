import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  MockStaffNotifier,
  type Alert,
  type Customer
} from "@amami-line-crm/domain";

const tenantId = "tenant_amamihome";
const now = "2026-06-16T10:00:00.000Z";

describe("API alert runtime bundle", () => {
  it("uses the injected customer/message/alert bundle for alert routes", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const alertRepository = new InMemoryAlertRepository();
    const staffNotifier = new MockStaffNotifier();
    const app = createApiApp({
      customerMessageRepositories: {
        runtime_mode: "supabase",
        customerRepository,
        messageRepository,
        alertRepository
      },
      staffNotifier,
      now: () => now,
      env: {
        TENANT_ID: tenantId,
        TENANT_SLUG: "amamihome",
        LINE_REAL_PUSH_ENABLED: "false",
        AI_PROVIDER: "mock"
      }
    });

    await customerRepository.save(createUnrepliedCustomer());

    const checkResponse = await app.fetch(adminRequest("/api/admin/alerts/check-unreplied", {
      method: "POST"
    }));
    const checkBody = (await checkResponse.json()) as {
      checked_customers: number;
      alerts_created: number;
      alerts: Array<{ tenant_id: string; customer_id: string; status: string }>;
    };

    expect(checkResponse.status).toBe(200);
    expect(checkBody.checked_customers).toBe(1);
    expect(checkBody.alerts_created).toBe(1);
    expect(checkBody.alerts).toEqual([
      expect.objectContaining({
        tenant_id: tenantId,
        customer_id: "customer_alert_runtime_1",
        status: "open"
      })
    ]);
    await expect(alertRepository.listOpenByTenant(tenantId)).resolves.toHaveLength(1);

    const listOpenResponse = await app.fetch(adminRequest("/api/admin/alerts?status=open"));
    const listOpenBody = (await listOpenResponse.json()) as {
      alerts: Array<{ tenant_id: string; customer_id: string; status: string }>;
    };

    expect(listOpenResponse.status).toBe(200);
    expect(listOpenBody.alerts).toEqual([
      expect.objectContaining({
        tenant_id: tenantId,
        customer_id: "customer_alert_runtime_1",
        status: "open"
      })
    ]);

    const notifyResponse = await app.fetch(adminRequest("/api/admin/alerts/notify-open", {
      method: "POST"
    }));
    const notifyBody = (await notifyResponse.json()) as {
      notified: number;
      failed: number;
      notified_alerts: Array<{ tenant_id: string; customer_id: string; status: string }>;
    };

    expect(notifyResponse.status).toBe(200);
    expect(notifyBody.notified).toBe(1);
    expect(notifyBody.failed).toBe(0);
    expect(notifyBody.notified_alerts).toEqual([
      expect.objectContaining({
        tenant_id: tenantId,
        customer_id: "customer_alert_runtime_1",
        status: "notified"
      })
    ]);
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(staffNotifier.notifications[0]).toMatchObject({
      tenant_id: tenantId,
      customer_id: "customer_alert_runtime_1",
      alert_type: "unreplied_customer_message"
    });

    const restartedApp = createApiApp({
      customerMessageRepositories: {
        runtime_mode: "supabase",
        customerRepository,
        messageRepository,
        alertRepository
      },
      staffNotifier: new MockStaffNotifier(),
      env: {
        TENANT_ID: tenantId,
        TENANT_SLUG: "amamihome"
      }
    });
    const persistedResponse = await restartedApp.fetch(adminRequest("/api/admin/alerts"));
    const persistedBody = (await persistedResponse.json()) as {
      alerts: Array<{ tenant_id: string; customer_id: string; status: string }>;
    };

    expect(persistedResponse.status).toBe(200);
    expect(persistedBody.alerts).toEqual([
      expect.objectContaining({
        tenant_id: tenantId,
        customer_id: "customer_alert_runtime_1",
        status: "notified"
      })
    ]);
  });

  it("keeps explicit alertRepository injection compatible and higher priority", async () => {
    const explicitAlertRepository = new InMemoryAlertRepository();
    const bundleAlertRepository = new InMemoryAlertRepository();
    const app = createApiApp({
      alertRepository: explicitAlertRepository,
      customerMessageRepositories: {
        runtime_mode: "supabase",
        customerRepository: new InMemoryCustomerRepository(),
        messageRepository: new InMemoryMessageRepository(),
        alertRepository: bundleAlertRepository
      },
      env: {
        TENANT_ID: tenantId,
        TENANT_SLUG: "amamihome"
      }
    });

    await explicitAlertRepository.create(createAlert({ id: "alert_explicit" }));
    await bundleAlertRepository.create(createAlert({ id: "alert_bundle" }));

    const response = await app.fetch(adminRequest("/api/admin/alerts"));
    const body = (await response.json()) as { alerts: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.alerts.map((alert) => alert.id)).toEqual(["alert_explicit"]);
  });
});

function adminRequest(
  path: string,
  init: RequestInit & { headers?: HeadersInit } = {}
): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: {
      "x-tenant-id": tenantId,
      ...init.headers
    }
  });
}

function createUnrepliedCustomer(input: Partial<Customer> = {}): Customer {
  return {
    id: "customer_alert_runtime_1",
    tenant_id: tenantId,
    line_user_id: "dummy_line_user_alert_runtime_1",
    display_name: "Alert Runtime Demo",
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: ["未返信チェック"],
    response_mode: "human_required",
    status: "active",
    last_message_at: "2026-06-16T09:00:00.000Z",
    last_customer_message_at: "2026-06-16T09:00:00.000Z",
    last_staff_reply_at: null,
    created_at: "2026-06-16T09:00:00.000Z",
    updated_at: "2026-06-16T09:00:00.000Z",
    ...input
  };
}

function createAlert(input: Partial<Alert> = {}): Alert {
  return {
    id: "alert_1",
    tenant_id: tenantId,
    customer_id: "customer_alert_runtime_1",
    consultation_id: null,
    alert_type: "unreplied_customer_message",
    status: "open",
    severity: "medium",
    message: "未返信のdummy alertです。",
    triggered_at: now,
    notified_at: null,
    resolved_at: null,
    created_at: now,
    updated_at: now,
    ...input
  };
}

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type Alert,
  type AlertStatus
} from "@amami-line-crm/domain";

function createTestApp(input: {
  tenantId: string;
  tenantSlug: string;
  alertRepository: InMemoryAlertRepository;
}) {
  return createApiApp({
    alertRepository: input.alertRepository,
    customerRepository: new InMemoryCustomerRepository(),
    messageRepository: new InMemoryMessageRepository(),
    env: {
      TENANT_ID: input.tenantId,
      TENANT_SLUG: input.tenantSlug
    }
  });
}

function makeAlert(input: {
  id: string;
  tenantId?: string;
  customerId: string;
  status?: AlertStatus;
}): Alert {
  return {
    id: input.id,
    tenant_id: input.tenantId ?? "tenant_amamihome",
    customer_id: input.customerId,
    consultation_id: null,
    alert_type: "unreplied_customer_message",
    status: input.status ?? "open",
    severity: "high",
    message: `未返信alert: ${input.customerId}`,
    triggered_at: "2026-06-13T10:00:00.000Z",
    notified_at: input.status === "notified" ? "2026-06-13T10:10:00.000Z" : null,
    resolved_at: input.status === "resolved" ? "2026-06-13T10:20:00.000Z" : null,
    created_at: "2026-06-13T10:00:00.000Z",
    updated_at: "2026-06-13T10:00:00.000Z"
  };
}

function alertsRequest(tenantId?: string, status?: AlertStatus): Request {
  const headers: HeadersInit = {};

  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const query = status ? `?status=${status}` : "";

  return new Request(`http://localhost/api/admin/alerts${query}`, {
    headers
  });
}

describe("admin alert list API", () => {
  it("returns 401/403 before listing alerts", async () => {
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      alertRepository: new InMemoryAlertRepository()
    });

    const missingTenantResponse = await app.fetch(alertsRequest());
    const unknownTenantResponse = await app.fetch(alertsRequest("tenant_unknown"));

    expect(missingTenantResponse.status).toBe(401);
    expect(await missingTenantResponse.json()).toEqual({
      ok: false,
      error: "missing_tenant_id"
    });
    expect(unknownTenantResponse.status).toBe(403);
    expect(await unknownTenantResponse.json()).toEqual({
      ok: false,
      error: "unknown_tenant_id"
    });
  });

  it("returns only known tenant alerts with list fields", async () => {
    const alertRepository = new InMemoryAlertRepository();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      alertRepository
    });

    await alertRepository.create(
      makeAlert({ id: "alert_open", customerId: "customer_amami", status: "open" })
    );
    await alertRepository.create(
      makeAlert({ id: "alert_notified", customerId: "customer_notified", status: "notified" })
    );
    await alertRepository.create(
      makeAlert({
        id: "alert_other",
        tenantId: "tenant_other",
        customerId: "customer_other",
        status: "open"
      })
    );

    const response = await app.fetch(alertsRequest("tenant_amamihome"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.tenant_id).toBe("tenant_amamihome");
    expect(body.alerts).toHaveLength(2);
    expect(body.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "alert_open",
          tenant_id: "tenant_amamihome",
          customer_id: "customer_amami",
          type: "unreplied_customer_message",
          severity: "high",
          status: "open",
          message: "未返信alert: customer_amami",
          notified_at: null,
          resolved_at: null,
          created_at: "2026-06-13T10:00:00.000Z"
        }),
        expect.objectContaining({
          id: "alert_notified",
          tenant_id: "tenant_amamihome",
          customer_id: "customer_notified",
          status: "notified",
          notified_at: "2026-06-13T10:10:00.000Z"
        })
      ])
    );
    expect(
      body.alerts.every((alert: { tenant_id: string }) => alert.tenant_id === "tenant_amamihome")
    ).toBe(true);
  });

  it("filters alerts by status for the known tenant only", async () => {
    const alertRepository = new InMemoryAlertRepository();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      alertRepository
    });

    await alertRepository.create(
      makeAlert({ id: "alert_open", customerId: "customer_open", status: "open" })
    );
    await alertRepository.create(
      makeAlert({ id: "alert_notified", customerId: "customer_notified", status: "notified" })
    );
    await alertRepository.create(
      makeAlert({
        id: "alert_other_open",
        tenantId: "tenant_other",
        customerId: "customer_other",
        status: "open"
      })
    );

    const response = await app.fetch(alertsRequest("tenant_amamihome", "open"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0]).toMatchObject({
      id: "alert_open",
      tenant_id: "tenant_amamihome",
      status: "open"
    });
  });
});

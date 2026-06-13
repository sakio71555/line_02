import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type Alert,
  type Customer,
  type ResponseMode
} from "@amami-line-crm/domain";

const now = "2026-06-13T10:00:00.000Z";

function createTestApp(input: {
  tenantId: string;
  tenantSlug: string;
  customerRepository: InMemoryCustomerRepository;
  alertRepository: InMemoryAlertRepository;
}) {
  return createApiApp({
    customerRepository: input.customerRepository,
    messageRepository: new InMemoryMessageRepository(),
    alertRepository: input.alertRepository,
    now: () => now,
    env: {
      LINE_CHANNEL_SECRET: "test_line_channel_secret",
      LINE_WEBHOOK_SECRET_PATH: "wh_dev_amamihome",
      TENANT_ID: input.tenantId,
      TENANT_SLUG: input.tenantSlug
    }
  });
}

function makeCustomer(input: {
  id: string;
  tenantId?: string;
  responseMode: ResponseMode;
  lastCustomerMessageAt: string | null;
  lastStaffReplyAt?: string | null;
}): Customer {
  return {
    id: input.id,
    tenant_id: input.tenantId ?? "tenant_amamihome",
    line_user_id: `U_${input.id}`,
    display_name: null,
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: [],
    response_mode: input.responseMode,
    status: "active",
    last_message_at: input.lastCustomerMessageAt,
    last_customer_message_at: input.lastCustomerMessageAt,
    last_staff_reply_at: input.lastStaffReplyAt ?? null,
    created_at: "2026-06-13T08:00:00.000Z",
    updated_at: "2026-06-13T08:00:00.000Z"
  };
}

function makeExistingAlert(input: {
  id: string;
  tenantId?: string;
  customerId: string;
  status?: "open" | "notified" | "resolved" | "dismissed";
}): Alert {
  return {
    id: input.id,
    tenant_id: input.tenantId ?? "tenant_amamihome",
    customer_id: input.customerId,
    consultation_id: null,
    alert_type: "unreplied_customer_message",
    status: input.status ?? "open",
    severity: "high",
    message: `Existing unreplied alert for ${input.customerId}.`,
    triggered_at: "2026-06-13T09:00:00.000Z",
    notified_at: null,
    resolved_at: null,
    created_at: "2026-06-13T09:00:00.000Z",
    updated_at: "2026-06-13T09:00:00.000Z"
  };
}

async function checkUnreplied(app: ReturnType<typeof createApiApp>, tenantId?: string): Promise<Response> {
  return app.fetch(
    new Request("http://localhost/api/admin/alerts/check-unreplied", {
      method: "POST",
      headers: tenantId ? { "x-tenant-id": tenantId } : {}
    })
  );
}

describe("admin unreplied alert check API", () => {
  it("returns 401/403 before checking unreplied alerts", async () => {
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      customerRepository: new InMemoryCustomerRepository(),
      alertRepository: new InMemoryAlertRepository()
    });

    const missingTenantResponse = await checkUnreplied(app);
    const unknownTenantResponse = await checkUnreplied(app, "tenant_unknown");

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

  it("creates alerts for unreplied human_required, human_active, and emergency customers only", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const alertRepository = new InMemoryAlertRepository();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      customerRepository,
      alertRepository
    });
    const customers = [
      makeCustomer({
        id: "customer_human_required",
        responseMode: "human_required",
        lastCustomerMessageAt: "2026-06-13T09:20:00.000Z"
      }),
      makeCustomer({
        id: "customer_human_active",
        responseMode: "human_active",
        lastCustomerMessageAt: "2026-06-13T09:00:00.000Z"
      }),
      makeCustomer({
        id: "customer_emergency",
        responseMode: "emergency",
        lastCustomerMessageAt: "2026-06-13T09:59:59.000Z"
      }),
      makeCustomer({
        id: "customer_bot_auto",
        responseMode: "bot_auto",
        lastCustomerMessageAt: "2026-06-13T09:00:00.000Z"
      }),
      makeCustomer({
        id: "customer_closed",
        responseMode: "closed",
        lastCustomerMessageAt: "2026-06-13T09:00:00.000Z"
      }),
      makeCustomer({
        id: "customer_no_last_customer_message",
        responseMode: "human_required",
        lastCustomerMessageAt: null
      }),
      makeCustomer({
        id: "customer_replied",
        responseMode: "human_required",
        lastCustomerMessageAt: "2026-06-13T09:00:00.000Z",
        lastStaffReplyAt: "2026-06-13T09:30:00.000Z"
      }),
      makeCustomer({
        id: "customer_recent",
        responseMode: "human_required",
        lastCustomerMessageAt: "2026-06-13T09:45:00.000Z"
      })
    ];

    for (const customer of customers) {
      await customerRepository.save(customer);
    }

    const response = await checkUnreplied(app, "tenant_amamihome");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.tenant_id).toBe("tenant_amamihome");
    expect(body.checked_customers).toBe(8);
    expect(body.alerts_created).toBe(3);
    expect(body.alerts.map((alert: { customer_id: string }) => alert.customer_id).sort()).toEqual([
      "customer_emergency",
      "customer_human_active",
      "customer_human_required"
    ]);
    expect(body.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tenant_id: "tenant_amamihome",
          customer_id: "customer_human_required",
          type: "unreplied_customer_message",
          alert_type: "unreplied_customer_message",
          status: "open",
          severity: "high"
        }),
        expect.objectContaining({
          tenant_id: "tenant_amamihome",
          customer_id: "customer_human_active",
          type: "unreplied_customer_message",
          status: "open",
          severity: "high"
        }),
        expect.objectContaining({
          tenant_id: "tenant_amamihome",
          customer_id: "customer_emergency",
          type: "unreplied_customer_message",
          status: "open",
          severity: "critical"
        })
      ])
    );
    expect(
      body.alerts.every((alert: { message: string; customer_id: string }) =>
        alert.message.includes(alert.customer_id)
      )
    ).toBe(true);
    expect(alertRepository.list()).toHaveLength(3);
  });

  it("does not create alerts for another tenant customers", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const alertRepository = new InMemoryAlertRepository();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      customerRepository,
      alertRepository
    });

    await customerRepository.save(
      makeCustomer({
        id: "customer_amami",
        responseMode: "human_required",
        lastCustomerMessageAt: "2026-06-13T09:00:00.000Z"
      })
    );
    await customerRepository.save(
      makeCustomer({
        id: "customer_other",
        tenantId: "tenant_other",
        responseMode: "human_required",
        lastCustomerMessageAt: "2026-06-13T09:00:00.000Z"
      })
    );

    const response = await checkUnreplied(app, "tenant_amamihome");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checked_customers).toBe(1);
    expect(body.alerts_created).toBe(1);
    expect(body.alerts[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami"
    });
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami"
    });
  });

  it("does not duplicate an existing open or notified unreplied alert", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const alertRepository = new InMemoryAlertRepository();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      customerRepository,
      alertRepository
    });

    await customerRepository.save(
      makeCustomer({
        id: "customer_existing_open",
        responseMode: "human_active",
        lastCustomerMessageAt: "2026-06-13T09:00:00.000Z"
      })
    );
    await customerRepository.save(
      makeCustomer({
        id: "customer_existing_notified",
        responseMode: "human_active",
        lastCustomerMessageAt: "2026-06-13T09:00:00.000Z"
      })
    );
    await alertRepository.create(
      makeExistingAlert({ id: "alert_open", customerId: "customer_existing_open" })
    );
    await alertRepository.create(
      makeExistingAlert({
        id: "alert_notified",
        customerId: "customer_existing_notified",
        status: "notified"
      })
    );

    const response = await checkUnreplied(app, "tenant_amamihome");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checked_customers).toBe(2);
    expect(body.alerts_created).toBe(0);
    expect(body.alerts).toEqual([]);
    expect(alertRepository.list()).toHaveLength(2);
  });
});

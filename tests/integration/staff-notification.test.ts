import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  MockStaffNotifier,
  type Alert,
  type AlertStatus,
  type StaffNotificationPayload,
  type StaffNotifier
} from "@amami-line-crm/domain";

const now = "2026-06-13T11:00:00.000Z";

class FailingStaffNotifier implements StaffNotifier {
  readonly notifications: StaffNotificationPayload[] = [];

  async notify(payload: StaffNotificationPayload): Promise<void> {
    this.notifications.push(payload);
    throw new Error("Mock staff notification failure.");
  }
}

function createTestApp(input: {
  tenantId: string;
  tenantSlug: string;
  alertRepository: InMemoryAlertRepository;
  staffNotifier?: StaffNotifier;
  env?: Record<string, string>;
}) {
  return createApiApp({
    alertRepository: input.alertRepository,
    customerRepository: new InMemoryCustomerRepository(),
    messageRepository: new InMemoryMessageRepository(),
    ...(input.staffNotifier ? { staffNotifier: input.staffNotifier } : {}),
    now: () => now,
    env: {
      APP_BASE_URL: "http://localhost:3000",
      LINE_CHANNEL_SECRET: "test_line_channel_secret",
      LINE_WEBHOOK_SECRET_PATH: "wh_dev_amamihome",
      TENANT_ID: input.tenantId,
      TENANT_SLUG: input.tenantSlug,
      ...input.env
    }
  });
}

function makeAlert(input: {
  id: string;
  tenantId?: string;
  customerId: string;
  status?: AlertStatus;
  severity?: "low" | "medium" | "high" | "critical";
  message?: string;
}): Alert {
  return {
    id: input.id,
    tenant_id: input.tenantId ?? "tenant_amamihome",
    customer_id: input.customerId,
    consultation_id: null,
    alert_type: "unreplied_customer_message",
    status: input.status ?? "open",
    severity: input.severity ?? "high",
    message: input.message ?? `未返信です: ${input.customerId}`,
    triggered_at: "2026-06-13T10:00:00.000Z",
    notified_at: null,
    resolved_at: null,
    created_at: "2026-06-13T10:00:00.000Z",
    updated_at: "2026-06-13T10:00:00.000Z"
  };
}

async function notifyOpen(app: ReturnType<typeof createApiApp>, tenantId?: string): Promise<Response> {
  return app.fetch(
    new Request("http://localhost/api/admin/alerts/notify-open", {
      method: "POST",
      headers: tenantId ? { "x-tenant-id": tenantId } : {}
    })
  );
}

describe("admin open alert staff notification API", () => {
  it("returns 401/403 before notifying open alerts", async () => {
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      alertRepository: new InMemoryAlertRepository()
    });

    const missingTenantResponse = await notifyOpen(app);
    const unknownTenantResponse = await notifyOpen(app, "tenant_unknown");

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

  it("notifies only the known tenant open alerts and marks successful alerts as notified", async () => {
    const alertRepository = new InMemoryAlertRepository();
    const staffNotifier = new MockStaffNotifier();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      alertRepository,
      staffNotifier
    });
    const openAlert = makeAlert({
      id: "alert_open",
      customerId: "customer_amami",
      severity: "critical",
      message: "未返信の緊急相談があります"
    });

    await alertRepository.create(openAlert);
    await alertRepository.create(
      makeAlert({ id: "alert_notified", customerId: "customer_notified", status: "notified" })
    );
    await alertRepository.create(
      makeAlert({ id: "alert_resolved", customerId: "customer_resolved", status: "resolved" })
    );
    await alertRepository.create(
      makeAlert({ id: "alert_dismissed", customerId: "customer_dismissed", status: "dismissed" })
    );
    await alertRepository.create(
      makeAlert({
        id: "alert_other_tenant",
        tenantId: "tenant_other",
        customerId: "customer_other",
        severity: "critical"
      })
    );

    const response = await notifyOpen(app, "tenant_amamihome");
    const body = await response.json();
    const updatedOpenAlert = await alertRepository.findActiveByCustomerAndType(
      "tenant_amamihome",
      "customer_amami",
      "unreplied_customer_message"
    );
    const otherTenantAlerts = await alertRepository.listByTenant("tenant_other");

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      notified: 1,
      failed: 0,
      skipped: 3
    });
    expect(body.notified_alerts).toHaveLength(1);
    expect(body.failed_alerts).toEqual([]);
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(staffNotifier.notifications[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      alert_id: "alert_open",
      customer_id: "customer_amami",
      alert_type: "unreplied_customer_message",
      severity: "critical",
      admin_url: "http://localhost:3000/customers/customer_amami"
    });
    expect(staffNotifier.notifications[0]?.message).toContain("新しい相談が届きました。");
    expect(staffNotifier.notifications[0]?.message).toContain("種別：未返信の相談");
    expect(staffNotifier.notifications[0]?.message).toContain("緊急度：緊急");
    expect(staffNotifier.notifications[0]?.message).toContain("対応状況：未対応");
    expect(staffNotifier.notifications[0]?.message).toContain(
      "http://localhost:3000/customers/customer_amami"
    );
    expect(staffNotifier.notifications[0]?.message).not.toContain("未返信の緊急相談があります");
    expect(staffNotifier.notifications[0]?.message).not.toContain("Alert type:");
    expect(staffNotifier.notifications[0]?.message).not.toContain("Customer:");
    expect(updatedOpenAlert).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      status: "notified",
      notified_at: now
    });
    expect(otherTenantAlerts).toHaveLength(1);
    expect(otherTenantAlerts[0]).toMatchObject({
      tenant_id: "tenant_other",
      customer_id: "customer_other",
      status: "open",
      notified_at: null
    });
  });

  it("keeps alerts open when mock staff notification fails", async () => {
    const alertRepository = new InMemoryAlertRepository();
    const staffNotifier = new FailingStaffNotifier();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      alertRepository,
      staffNotifier
    });

    await alertRepository.create(
      makeAlert({
        id: "alert_open",
        customerId: "customer_amami",
        message: "未返信の相談があります"
      })
    );

    const response = await notifyOpen(app, "tenant_amamihome");
    const body = await response.json();
    const alerts = await alertRepository.listByTenant("tenant_amamihome");

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      notified: 0,
      failed: 1,
      skipped: 0
    });
    expect(body.notified_alerts).toEqual([]);
    expect(body.failed_alerts).toHaveLength(1);
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      status: "open",
      notified_at: null
    });
  });

  it("uses the captured staff LINE target runtime file for runtime staff notifications", async () => {
    const originalFetch = globalThis.fetch;
    const runtimeDir = join(
      process.cwd(),
      "tmp",
      "tests",
      "staff-notification-runtime-target"
    );
    const runtimeFile = join(runtimeDir, "staff-line-target.env");
    const linePushRequests: Array<{ input: string; body: unknown }> = [];
    const alertRepository = new InMemoryAlertRepository();

    mkdirSync(runtimeDir, { recursive: true });
    writeFileSync(runtimeFile, "STAFF_LINE_GROUP_ID='U_TEST_STAFF_RUNTIME_TARGET'\n");
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      linePushRequests.push({
        input: String(input),
        body: init?.body ? JSON.parse(String(init.body)) : null
      });

      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    try {
      const app = createTestApp({
        tenantId: "tenant_amamihome",
        tenantSlug: "amamihome",
        alertRepository,
        env: {
          STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token",
          STAFF_LINE_TARGET_RUNTIME_FILE: runtimeFile
        }
      });

      await alertRepository.create(
        makeAlert({
          id: "alert_open_runtime_target",
          customerId: "customer_amami",
          severity: "high",
          message: "通知本文には含めない相談内容です"
        })
      );

      const response = await notifyOpen(app, "tenant_amamihome");
      const body = await response.json();
      const pushBody = linePushRequests[0]?.body as {
        to?: string;
        messages?: Array<{ type?: string; text?: string }>;
      };
      const updatedOpenAlert = await alertRepository.findActiveByCustomerAndType(
        "tenant_amamihome",
        "customer_amami",
        "unreplied_customer_message"
      );

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        tenant_id: "tenant_amamihome",
        notified: 1,
        failed: 0,
        skipped: 0
      });
      expect(linePushRequests).toHaveLength(1);
      expect(linePushRequests[0]?.input).toBe("https://api.line.me/v2/bot/message/push");
      expect(pushBody.to).toBe("U_TEST_STAFF_RUNTIME_TARGET");
      expect(pushBody.messages?.[0]).toMatchObject({
        type: "text"
      });
      expect(pushBody.messages?.[0]?.text).toContain("新しい相談が届きました。");
      expect(pushBody.messages?.[0]?.text).toContain("管理画面で確認してください。");
      expect(pushBody.messages?.[0]?.text).not.toContain("通知本文には含めない相談内容です");
      expect(updatedOpenAlert).toMatchObject({
        status: "notified",
        notified_at: now
      });
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(runtimeDir, { recursive: true, force: true });
    }
  });

  it("can send runtime staff notifications through the customer LINE channel during temporary fallback operation", async () => {
    const originalFetch = globalThis.fetch;
    const runtimeDir = join(
      process.cwd(),
      "tmp",
      "tests",
      "staff-notification-customer-channel-fallback"
    );
    const runtimeFile = join(runtimeDir, "staff-line-target.env");
    const linePushRequests: Array<{
      input: string;
      authorization: string | undefined;
      body: unknown;
    }> = [];
    const alertRepository = new InMemoryAlertRepository();

    mkdirSync(runtimeDir, { recursive: true });
    writeFileSync(runtimeFile, "STAFF_LINE_GROUP_ID='U_TEST_CUSTOMER_CHANNEL_STAFF_TARGET'\n");
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      linePushRequests.push({
        input: String(input),
        authorization:
          init?.headers instanceof Headers
            ? init.headers.get("authorization") ?? undefined
            : (init?.headers as Record<string, string> | undefined)?.authorization,
        body: init?.body ? JSON.parse(String(init.body)) : null
      });

      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    try {
      const app = createTestApp({
        tenantId: "tenant_amamihome",
        tenantSlug: "amamihome",
        alertRepository,
        env: {
          LINE_CHANNEL_ACCESS_TOKEN: "test_customer_line_access_token",
          STAFF_LINE_USE_CUSTOMER_CHANNEL_FOR_NOTIFICATIONS: "true",
          STAFF_LINE_TARGET_RUNTIME_FILE: runtimeFile
        }
      });

      await alertRepository.create(
        makeAlert({
          id: "alert_open_customer_channel_fallback",
          customerId: "customer_amami",
          severity: "high",
          message: "仮運用通知本文には含めない相談内容です"
        })
      );

      const response = await notifyOpen(app, "tenant_amamihome");
      const body = await response.json();
      const pushBody = linePushRequests[0]?.body as {
        to?: string;
        messages?: Array<{ type?: string; text?: string }>;
      };

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        tenant_id: "tenant_amamihome",
        notified: 1,
        failed: 0,
        skipped: 0
      });
      expect(linePushRequests).toHaveLength(1);
      expect(linePushRequests[0]?.input).toBe("https://api.line.me/v2/bot/message/push");
      expect(linePushRequests[0]?.authorization).toBe("Bearer test_customer_line_access_token");
      expect(pushBody.to).toBe("U_TEST_CUSTOMER_CHANNEL_STAFF_TARGET");
      expect(pushBody.messages?.[0]?.text).toContain("新しい相談が届きました。");
      expect(pushBody.messages?.[0]?.text).not.toContain(
        "仮運用通知本文には含めない相談内容です"
      );
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(runtimeDir, { recursive: true, force: true });
    }
  });
});

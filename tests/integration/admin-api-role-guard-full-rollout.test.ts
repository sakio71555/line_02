import { describe, expect, it, vi } from "vitest";

import type { AdminAction, StaffRole } from "@amami-line-crm/domain";

import {
  adminRouteActions,
  evaluateAdminRouteRoleGuardCompatibility
} from "../../apps/api/src/admin/role-guarded-handler";
import type { AdminTenantContext } from "../../apps/api/src/admin/tenant-context";
import { createApiApp } from "../../apps/api/src/index";

describe("admin API role guard full route rollout compatibility", () => {
  it("exports route/action mapping without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(import("../../apps/api/src/admin/role-guarded-handler")).resolves.toHaveProperty(
      "adminRouteActions"
    );

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("defines the AdminAction mapping for all current Admin API routes", () => {
    expect(adminRouteActions).toEqual({
      listCustomers: "view_customers",
      getCustomerDetail: "view_customer_detail",
      getCustomerTimeline: "view_timeline",
      createAiSummary: "create_ai_summary",
      createAiReplyDraft: "create_ai_reply_draft",
      searchRag: "search_rag",
      createRagAnswerDraft: "create_rag_answer_draft",
      sendStaffReply: "send_staff_reply",
      archiveCustomer: "manage_customers",
      restoreCustomer: "manage_customers",
      previewBroadcast: "send_broadcast",
      sendBroadcast: "send_broadcast",
      listAlerts: "view_alerts",
      checkUnrepliedAlerts: "check_unreplied_alerts",
      notifyOpenAlerts: "notify_open_alerts"
    });
    expect(routeActions()).not.toContain("run_dev_seed");
  });

  it("temporarily skips role enforcement for dev_header compatibility", () => {
    for (const action of routeActions()) {
      expect(
        evaluateAdminRouteRoleGuardCompatibility({
          context: devHeaderContext(),
          action
        })
      ).toEqual({
        ok: true,
        action,
        context: devHeaderContext(),
        mode: "skipped_dev_header"
      });
    }
  });

  it("enforces every mapped route action for owner and manager authenticated staff", () => {
    for (const role of ["owner", "manager"] as const satisfies readonly StaffRole[]) {
      for (const action of routeActions()) {
        expect(
          evaluateAdminRouteRoleGuardCompatibility({
            context: authenticatedContext(role),
            action
          })
        ).toMatchObject({
          ok: true,
          action,
          mode: "enforced_authenticated_staff",
          context: {
            source: "authenticated_staff",
            role
          }
        });
      }
    }
  });

  it("allows staff on support/read actions and denies persistent summary and alert mutations", () => {
    const staffAllowedActions: AdminAction[] = [
      "view_customers",
      "view_customer_detail",
      "view_timeline",
      "create_ai_reply_draft",
      "search_rag",
      "create_rag_answer_draft",
      "send_staff_reply",
      "view_alerts"
    ];

    for (const action of staffAllowedActions) {
      expect(
        evaluateAdminRouteRoleGuardCompatibility({
          context: authenticatedContext("staff"),
          action
        })
      ).toMatchObject({
        ok: true,
        action,
        mode: "enforced_authenticated_staff"
      });
    }

    for (const action of [
      "create_ai_summary",
      "check_unreplied_alerts",
      "notify_open_alerts"
    ] as const satisfies readonly AdminAction[]) {
      expect(
        evaluateAdminRouteRoleGuardCompatibility({
          context: authenticatedContext("staff"),
          action
        })
      ).toEqual({
        ok: false,
        status: 403,
        body: {
          ok: false,
          error: "permission_denied"
        },
        placeholderRoute: "/permission-denied"
      });
    }
  });

  it("keeps existing dev-header Admin route behavior unchanged", async () => {
    const app = createApiApp({
      env: {
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome",
        LINE_CHANNEL_SECRET: "test-secret"
      }
    });

    const listCustomersResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const missingTenantResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers")
    );
    const unknownTenantResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_unknown" }
      })
    );

    expect(listCustomersResponse.status).toBe(200);
    expect(await listCustomersResponse.json()).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customers: []
    });
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

  it("keeps dev seed health and LINE webhook out of Admin route action mapping", () => {
    const actions = routeActions();

    expect(actions).not.toContain("run_dev_seed");
    expect(Object.keys(adminRouteActions)).not.toContain("health");
    expect(Object.keys(adminRouteActions)).not.toContain("lineWebhook");
  });
});

function routeActions(): AdminAction[] {
  return Object.values(adminRouteActions);
}

function devHeaderContext(): AdminTenantContext {
  return {
    tenantId: "tenant_amamihome",
    source: "dev_header"
  };
}

function authenticatedContext(role: StaffRole): AdminTenantContext {
  return {
    tenantId: "tenant_amamihome",
    source: "authenticated_staff",
    staffUserId: "staff_1",
    authUserId: "auth_user_1",
    role
  };
}

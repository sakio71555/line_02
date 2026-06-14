import { describe, expect, it, vi } from "vitest";

import type { StaffRole } from "@amami-line-crm/domain";

import { runRoleGuardedAdminHandler } from "../../apps/api/src/admin/role-guarded-handler";
import type { AdminTenantContext } from "../../apps/api/src/admin/tenant-context";
import { createApiApp } from "../../apps/api/src/index";

describe("admin API role guard representative handler", () => {
  it("exports the representative handler without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(import("../../apps/api/src/admin/role-guarded-handler")).resolves.toHaveProperty(
      "runRoleGuardedAdminHandler"
    );

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("allows authenticated_staff owner manager and staff for view_customers", async () => {
    for (const role of ["owner", "manager", "staff"] as const satisfies readonly StaffRole[]) {
      const handler = vi.fn(async (context: AdminTenantContext) => ({
        ok: true,
        tenant_id: context.tenantId,
        customers: []
      }));
      const result = await runRoleGuardedAdminHandler({
        context: authenticatedContext(role),
        action: "view_customers",
        handler
      });

      expect(result).toMatchObject({
        ok: true,
        status: 200,
        action: "view_customers",
        body: {
          ok: true,
          tenant_id: "tenant_amamihome",
          customers: []
        },
        context: {
          source: "authenticated_staff",
          role
        }
      });
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });

  it("maps staff denial for create_ai_summary to the existing permission_denied response", async () => {
    const handler = vi.fn(async () => ({ ok: true }));
    const result = await runRoleGuardedAdminHandler({
      context: authenticatedContext("staff"),
      action: "create_ai_summary",
      handler
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      body: {
        ok: false,
        error: "permission_denied"
      },
      placeholderRoute: "/permission-denied"
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("keeps dev_header out of the representative role guard path", async () => {
    const handler = vi.fn(async () => ({ ok: true }));
    const result = await runRoleGuardedAdminHandler({
      context: {
        tenantId: "tenant_amamihome",
        source: "dev_header"
      },
      action: "view_customers",
      handler
    });

    expect(result).toEqual({
      ok: false,
      status: 401,
      body: {
        ok: false,
        error: "authenticated_staff_required"
      },
      placeholderRoute: "/login"
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("keeps the existing dev-header /api/admin/customers route behavior unchanged", async () => {
    const app = createApiApp({
      env: {
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome",
        LINE_CHANNEL_SECRET: "test-secret"
      }
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customers: []
    });
  });

  it("keeps the existing dev-header route denial shape for missing tenant header", async () => {
    const app = createApiApp({
      env: {
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome",
        LINE_CHANNEL_SECRET: "test-secret"
      }
    });

    const response = await app.fetch(new Request("http://localhost/api/admin/customers"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: "missing_tenant_id"
    });
  });
});

function authenticatedContext(role: StaffRole): AdminTenantContext {
  return {
    tenantId: "tenant_amamihome",
    source: "authenticated_staff",
    staffUserId: "staff_1",
    authUserId: "auth_user_1",
    role
  };
}

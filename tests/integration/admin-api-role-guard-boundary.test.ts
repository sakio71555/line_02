import { describe, expect, it, vi } from "vitest";

import { roleGuardedAdminActions, type AdminAction, type StaffRole } from "@amami-line-crm/domain";

import { mapAdminAuthErrorToHttp } from "../../apps/api/src/admin/auth-error-response";
import {
  AdminRoleGuardError,
  evaluateAdminRoleGuard,
  mapAdminRoleGuardFailureToAuthError,
  requireAdminRole
} from "../../apps/api/src/admin/role-guard";
import type { AdminTenantContext } from "../../apps/api/src/admin/tenant-context";

describe("admin API role guard boundary", () => {
  it("exports the guard without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(import("../../apps/api/src/admin/role-guard")).resolves.toHaveProperty(
      "evaluateAdminRoleGuard"
    );

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("allows owner to pass every role-guarded AdminAction", () => {
    for (const action of roleGuardedAdminActions) {
      expect(
        evaluateAdminRoleGuard({
          context: authenticatedContext("owner"),
          action
        })
      ).toMatchObject({
        ok: true,
        action,
        context: {
          tenantId: "tenant_amamihome",
          source: "authenticated_staff",
          role: "owner"
        }
      });
    }
  });

  it("allows manager for operational actions and denies management-only actions", () => {
    expect(
      evaluateAdminRoleGuard({
        context: authenticatedContext("manager"),
        action: "create_ai_summary"
      })
    ).toMatchObject({
      ok: true,
      action: "create_ai_summary"
    });

    const denied = evaluateAdminRoleGuard({
      context: authenticatedContext("manager"),
      action: "manage_staff"
    });

    expect(denied).toEqual({
      ok: false,
      error: { code: "permission_denied" },
      permission: {
        allowed: false,
        reason: "role_not_allowed",
        role: "manager",
        action: "manage_staff"
      }
    });
    if (!denied.ok) {
      expect(mapAdminAuthErrorToHttp(mapAdminRoleGuardFailureToAuthError(denied))).toMatchObject({
        status: 403,
        body: { ok: false, error: "permission_denied" },
        placeholderRoute: "/permission-denied"
      });
    }
  });

  it("allows staff for day-to-day support actions and denies alert notification", () => {
    expect(
      evaluateAdminRoleGuard({
        context: authenticatedContext("staff"),
        action: "send_staff_reply"
      })
    ).toMatchObject({
      ok: true,
      action: "send_staff_reply"
    });

    const denied = evaluateAdminRoleGuard({
      context: authenticatedContext("staff"),
      action: "notify_open_alerts"
    });

    expect(denied).toEqual({
      ok: false,
      error: { code: "permission_denied" },
      permission: {
        allowed: false,
        reason: "role_not_allowed",
        role: "staff",
        action: "notify_open_alerts"
      }
    });
  });

  it("rejects dev_header context as not authenticated staff", () => {
    const denied = evaluateAdminRoleGuard({
      context: {
        tenantId: "tenant_amamihome",
        source: "dev_header"
      },
      action: "view_customers"
    });

    expect(denied).toEqual({
      ok: false,
      error: { code: "authenticated_staff_required" }
    });
    if (!denied.ok) {
      expect(mapAdminAuthErrorToHttp(mapAdminRoleGuardFailureToAuthError(denied))).toMatchObject({
        status: 401,
        body: { ok: false, error: "authenticated_staff_required" },
        placeholderRoute: "/login"
      });
    }
  });

  it("rejects authenticated_staff context without role", () => {
    const denied = evaluateAdminRoleGuard({
      context: {
        tenantId: "tenant_amamihome",
        source: "authenticated_staff",
        staffUserId: "staff_1",
        authUserId: "auth_user_1"
      },
      action: "view_customers"
    });

    expect(denied).toEqual({
      ok: false,
      error: { code: "authenticated_staff_required" }
    });
  });

  it("throws a mappable AdminRoleGuardError from requireAdminRole", () => {
    expect(
      requireAdminRole({
        context: authenticatedContext("owner"),
        action: "manage_tenant_settings"
      })
    ).toMatchObject({
      ok: true,
      action: "manage_tenant_settings"
    });

    expect(() =>
      requireAdminRole({
        context: authenticatedContext("staff"),
        action: "manage_tenant_settings"
      })
    ).toThrow(AdminRoleGuardError);

    try {
      requireAdminRole({
        context: authenticatedContext("staff"),
        action: "manage_tenant_settings"
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AdminRoleGuardError);
      if (error instanceof AdminRoleGuardError) {
        expect(error.error).toEqual({ code: "permission_denied" });
        expect(mapAdminAuthErrorToHttp(error.error)).toMatchObject({
          status: 403,
          body: { ok: false, error: "permission_denied" }
        });
      }
    }
  });

  it("does not treat run_dev_seed as a role-guarded production action", () => {
    const action: AdminAction = "run_dev_seed";

    expect(
      evaluateAdminRoleGuard({
        context: authenticatedContext("owner"),
        action
      })
    ).toEqual({
      ok: false,
      error: { code: "permission_denied" },
      permission: {
        allowed: false,
        reason: "role_not_allowed",
        role: "owner",
        action: "run_dev_seed"
      }
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

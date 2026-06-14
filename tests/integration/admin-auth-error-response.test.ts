import { describe, expect, it } from "vitest";

import {
  mapAdminAuthErrorToHttp,
  type AdminAuthErrorCode
} from "../../apps/api/src/admin/auth-error-response";

describe("admin auth error response mapping", () => {
  it("maps missing tenant context to the legacy missing_tenant_id response", () => {
    expect(mapAdminAuthErrorToHttp({ code: "missing_tenant_context" })).toEqual({
      status: 401,
      body: {
        ok: false,
        error: "missing_tenant_id"
      },
      placeholderRoute: "/login"
    });
  });

  it("maps unknown tenant to the legacy unknown_tenant_id response", () => {
    expect(mapAdminAuthErrorToHttp({ code: "unknown_tenant" })).toEqual({
      status: 403,
      body: {
        ok: false,
        error: "unknown_tenant_id"
      },
      placeholderRoute: "/permission-denied"
    });
  });

  it("defines future auth and permission status mappings", () => {
    expect(mapAdminAuthErrorToHttp({ code: "authenticated_staff_required" })).toMatchObject({
      status: 401,
      body: { ok: false, error: "authenticated_staff_required" },
      placeholderRoute: "/login"
    });
    expect(mapAdminAuthErrorToHttp({ code: "session_expired" })).toMatchObject({
      status: 401,
      body: { ok: false, error: "session_expired" },
      placeholderRoute: "/session-expired"
    });
    expect(mapAdminAuthErrorToHttp({ code: "tenant_selection_required" })).toMatchObject({
      status: 409,
      body: { ok: false, error: "tenant_selection_required" },
      placeholderRoute: "/select-tenant"
    });
    expect(mapAdminAuthErrorToHttp({ code: "tenant_membership_denied" })).toMatchObject({
      status: 403,
      body: { ok: false, error: "tenant_membership_denied" },
      placeholderRoute: "/permission-denied"
    });
    expect(mapAdminAuthErrorToHttp({ code: "permission_denied" })).toMatchObject({
      status: 403,
      body: { ok: false, error: "permission_denied" },
      placeholderRoute: "/permission-denied"
    });
  });

  it("collapses staff lookup failures without returning identifiers", () => {
    const sensitiveInternalCodes: AdminAuthErrorCode[] = [
      "missing_auth_user",
      "staff_not_found",
      "staff_inactive",
      "membership_not_found"
    ];

    for (const code of sensitiveInternalCodes) {
      const response = mapAdminAuthErrorToHttp({ code });
      const bodyText = JSON.stringify(response.body);

      expect(response.body.ok).toBe(false);
      expect(bodyText).not.toContain("auth_user_id");
      expect(bodyText).not.toContain("token");
      expect(bodyText).not.toContain("secret");
      expect(bodyText).not.toContain("env");
    }
  });
});

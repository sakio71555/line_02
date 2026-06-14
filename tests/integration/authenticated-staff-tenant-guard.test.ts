import { describe, expect, it, vi } from "vitest";

import {
  mapAuthContextErrorToAdminAuthError,
  resolveAuthenticatedStaffAdminTenantContext
} from "../../apps/api/src/admin/authenticated-staff-tenant-context";
import { mapAdminAuthErrorToHttp } from "../../apps/api/src/admin/auth-error-response";
import { resolveAdminTenantContext } from "../../apps/api/src/admin/tenant-context";
import type { StaffAuthLookup, StaffTenantMembership, StaffUser } from "@amami-line-crm/domain";

const now = "2026-06-14T00:00:00.000Z";

describe("authenticated staff tenant guard", () => {
  it("exports the guard without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      import("../../apps/api/src/admin/authenticated-staff-tenant-context")
    ).resolves.toHaveProperty("resolveAuthenticatedStaffAdminTenantContext");

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("creates an authenticated_staff AdminTenantContext for active staff and one membership", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff({ tenant_id: "tenant_legacy" }), [
      createMembership({ tenant_id: "tenant_amamihome", role: "staff" })
    ]);

    const result = await resolveAuthenticatedStaffAdminTenantContext(
      {
        authUser: { authUserId: "auth_user_1", email: "staff@example.test" }
      },
      lookup
    );

    expect(result).toEqual({
      ok: true,
      tenantId: "tenant_amamihome",
      context: {
        tenantId: "tenant_amamihome",
        source: "authenticated_staff",
        staffUserId: "staff_1",
        authUserId: "auth_user_1",
        role: "staff"
      }
    });
  });

  it("uses membership role instead of the legacy staff_users role", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff({ role: "owner" }), [
      createMembership({ tenant_id: "tenant_amamihome", role: "manager" })
    ]);

    const result = await resolveAuthenticatedStaffAdminTenantContext(
      { authUser: { authUserId: "auth_user_1" } },
      lookup
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.role).toBe("manager");
    }
  });

  it("requires tenant selection when active staff has multiple active memberships", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [
      createMembership({ id: "membership_1", tenant_id: "tenant_amamihome" }),
      createMembership({ id: "membership_2", tenant_id: "tenant_other" })
    ]);

    const result = await resolveAuthenticatedStaffAdminTenantContext(
      { authUser: { authUserId: "auth_user_1" } },
      lookup
    );

    expect(result).toEqual({
      ok: false,
      error: { code: "tenant_selection_required" }
    });
    expect(mapAdminAuthErrorToHttp(result.ok ? { code: "permission_denied" } : result.error))
      .toMatchObject({
        status: 409,
        body: { ok: false, error: "tenant_selection_required" },
        placeholderRoute: "/select-tenant"
      });
  });

  it("allows selectedTenantId only when it matches an active membership", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [
      createMembership({ id: "membership_1", tenant_id: "tenant_amamihome", role: "manager" }),
      createMembership({ id: "membership_2", tenant_id: "tenant_other", role: "owner" })
    ]);

    const result = await resolveAuthenticatedStaffAdminTenantContext(
      {
        authUser: { authUserId: "auth_user_1" },
        selectedTenantId: "tenant_other"
      },
      lookup
    );

    expect(result).toEqual({
      ok: true,
      tenantId: "tenant_other",
      context: {
        tenantId: "tenant_other",
        source: "authenticated_staff",
        staffUserId: "staff_1",
        authUserId: "auth_user_1",
        role: "owner"
      }
    });
  });

  it("rejects selectedTenantId outside memberships", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [
      createMembership({ tenant_id: "tenant_amamihome" })
    ]);

    const result = await resolveAuthenticatedStaffAdminTenantContext(
      {
        authUser: { authUserId: "auth_user_1" },
        selectedTenantId: "tenant_other"
      },
      lookup
    );

    expect(result).toEqual({
      ok: false,
      error: { code: "tenant_membership_denied" }
    });
  });

  it("rejects disabled and archived staff", async () => {
    const disabledLookup = new FakeStaffAuthLookup(createStaff({ status: "disabled" }), [
      createMembership()
    ]);
    const archivedLookup = new FakeStaffAuthLookup(createStaff({ status: "archived" }), [
      createMembership()
    ]);

    await expect(
      resolveAuthenticatedStaffAdminTenantContext(
        { authUser: { authUserId: "auth_user_1" } },
        disabledLookup
      )
    ).resolves.toEqual({
      ok: false,
      error: { code: "staff_inactive" }
    });
    await expect(
      resolveAuthenticatedStaffAdminTenantContext(
        { authUser: { authUserId: "auth_user_1" } },
        archivedLookup
      )
    ).resolves.toEqual({
      ok: false,
      error: { code: "staff_inactive" }
    });
  });

  it("rejects invited disabled and archived memberships", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [
      createMembership({ id: "membership_invited", status: "invited" }),
      createMembership({ id: "membership_disabled", status: "disabled" }),
      createMembership({ id: "membership_archived", status: "archived" })
    ]);

    const result = await resolveAuthenticatedStaffAdminTenantContext(
      { authUser: { authUserId: "auth_user_1" } },
      lookup
    );

    expect(result).toEqual({
      ok: false,
      error: { code: "membership_not_found" }
    });
  });

  it("rejects missing staff and missing membership", async () => {
    const missingStaffLookup = new FakeStaffAuthLookup(null, [createMembership()]);
    const missingMembershipLookup = new FakeStaffAuthLookup(createStaff(), []);

    await expect(
      resolveAuthenticatedStaffAdminTenantContext(
        { authUser: { authUserId: "auth_user_1" } },
        missingStaffLookup
      )
    ).resolves.toEqual({
      ok: false,
      error: { code: "staff_not_found" }
    });
    await expect(
      resolveAuthenticatedStaffAdminTenantContext(
        { authUser: { authUserId: "auth_user_1" } },
        missingMembershipLookup
      )
    ).resolves.toEqual({
      ok: false,
      error: { code: "membership_not_found" }
    });
  });

  it("maps domain auth context errors to Admin auth errors", () => {
    expect(mapAuthContextErrorToAdminAuthError({ code: "missing_auth_user" })).toEqual({
      code: "missing_auth_user"
    });
    expect(mapAdminAuthErrorToHttp({ code: "missing_auth_user" })).toMatchObject({
      status: 401,
      body: { ok: false, error: "authenticated_staff_required" },
      placeholderRoute: "/login"
    });
    expect(mapAdminAuthErrorToHttp({ code: "membership_not_found" })).toMatchObject({
      status: 403,
      body: { ok: false, error: "tenant_membership_denied" },
      placeholderRoute: "/permission-denied"
    });
  });

  it("keeps the dev-only x-tenant-id guard path unchanged", () => {
    expect(
      resolveAdminTenantContext({
        tenantIdHeader: "tenant_amamihome",
        env: { TENANT_ID: "tenant_amamihome" }
      })
    ).toEqual({
      status: "ok",
      tenantId: "tenant_amamihome",
      context: {
        tenantId: "tenant_amamihome",
        source: "dev_header"
      }
    });
  });
});

class FakeStaffAuthLookup implements StaffAuthLookup {
  constructor(
    private readonly staff: StaffUser | null,
    private readonly memberships: StaffTenantMembership[]
  ) {}

  async findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null> {
    if (!this.staff || this.staff.auth_user_id !== authUserId) {
      return null;
    }

    return this.staff;
  }

  async listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]> {
    return this.memberships.filter((membership) => membership.staff_user_id === staffUserId);
  }
}

function createStaff(overrides: Partial<StaffUser> = {}): StaffUser {
  return {
    id: "staff_1",
    tenant_id: "tenant_amamihome",
    auth_user_id: "auth_user_1",
    email: "staff@example.test",
    display_name: "Dev Staff",
    role: "owner",
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
    role: "manager",
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

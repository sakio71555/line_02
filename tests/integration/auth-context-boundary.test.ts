import { describe, expect, it } from "vitest";

import type { StaffAuthLookup, StaffTenantMembership, StaffUser } from "@amami-line-crm/domain";
import { resolveAuthenticatedTenantContext } from "@amami-line-crm/domain";

const now = "2026-06-14T00:00:00.000Z";

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

class FakeStaffAuthLookup implements StaffAuthLookup {
  public staffLookups = 0;
  public membershipLookups = 0;
  public membershipActivations = 0;
  public activateInvitedMembershipsForStaffUserId?: (staffUserId: string) => Promise<void>;

  public constructor(
    private readonly staff: StaffUser | null,
    private readonly memberships: StaffTenantMembership[],
    activateInvitations = false
  ) {
    if (activateInvitations) {
      this.activateInvitedMembershipsForStaffUserId = async (staffUserId: string) => {
        this.membershipActivations += 1;
        for (const membership of this.memberships) {
          if (membership.staff_user_id === staffUserId && membership.status === "invited") {
            membership.status = "active";
            membership.accepted_at = now;
          }
        }
      };
    }
  }

  public async findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null> {
    this.staffLookups += 1;

    if (!this.staff || this.staff.auth_user_id !== authUserId) {
      return null;
    }

    return this.staff;
  }

  public async listMembershipsByStaffUserId(
    staffUserId: string
  ): Promise<StaffTenantMembership[]> {
    this.membershipLookups += 1;
    return this.memberships.filter((membership) => membership.staff_user_id === staffUserId);
  }
}

describe("auth context boundary", () => {
  it("returns tenant context for active staff with one active membership", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [createMembership({ role: "staff" })]);

    const result = await resolveAuthenticatedTenantContext({ authUserId: "auth_user_1" }, lookup);

    expect(result).toEqual({
      ok: true,
      context: {
        tenantId: "tenant_amamihome",
        staffUserId: "staff_1",
        authUserId: "auth_user_1",
        role: "staff",
        source: "authenticated_staff"
      }
    });
  });

  it("requires tenant selection when active staff has multiple active memberships", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [
      createMembership({ id: "membership_1", tenant_id: "tenant_amamihome" }),
      createMembership({ id: "membership_2", tenant_id: "tenant_other" })
    ]);

    const result = await resolveAuthenticatedTenantContext({ authUserId: "auth_user_1" }, lookup);

    expect(result).toEqual({
      ok: false,
      error: { code: "tenant_selection_required" }
    });
  });

  it("allows selected tenant only when it is an active membership", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [
      createMembership({ id: "membership_1", tenant_id: "tenant_amamihome", role: "manager" }),
      createMembership({ id: "membership_2", tenant_id: "tenant_other", role: "owner" })
    ]);

    const result = await resolveAuthenticatedTenantContext(
      { authUserId: "auth_user_1", selectedTenantId: "tenant_other" },
      lookup
    );

    expect(result).toEqual({
      ok: true,
      context: {
        tenantId: "tenant_other",
        staffUserId: "staff_1",
        authUserId: "auth_user_1",
        role: "owner",
        source: "authenticated_staff"
      }
    });
  });

  it("rejects selected tenant outside active memberships", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [
      createMembership({ tenant_id: "tenant_amamihome" })
    ]);

    const result = await resolveAuthenticatedTenantContext(
      { authUserId: "auth_user_1", selectedTenantId: "tenant_other" },
      lookup
    );

    expect(result).toEqual({
      ok: false,
      error: { code: "tenant_membership_denied" }
    });
  });

  it("rejects disabled staff", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff({ status: "disabled" }), [
      createMembership()
    ]);

    const result = await resolveAuthenticatedTenantContext({ authUserId: "auth_user_1" }, lookup);

    expect(result).toEqual({
      ok: false,
      error: { code: "staff_inactive" }
    });
  });

  it("rejects archived staff", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff({ status: "archived" }), [
      createMembership()
    ]);

    const result = await resolveAuthenticatedTenantContext({ authUserId: "auth_user_1" }, lookup);

    expect(result).toEqual({
      ok: false,
      error: { code: "staff_inactive" }
    });
  });

  it("rejects inactive legacy staff flag", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff({ is_active: false }), [
      createMembership()
    ]);

    const result = await resolveAuthenticatedTenantContext({ authUserId: "auth_user_1" }, lookup);

    expect(result).toEqual({
      ok: false,
      error: { code: "staff_inactive" }
    });
  });

  it("ignores invited disabled and archived memberships", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [
      createMembership({ id: "membership_invited", status: "invited" }),
      createMembership({ id: "membership_disabled", status: "disabled" }),
      createMembership({ id: "membership_archived", status: "archived" })
    ]);

    const result = await resolveAuthenticatedTenantContext({ authUserId: "auth_user_1" }, lookup);

    expect(result).toEqual({
      ok: false,
      error: { code: "membership_not_found" }
    });
  });

  it("activates an invited membership only after the linked auth user signs in", async () => {
    const lookup = new FakeStaffAuthLookup(
      createStaff(),
      [createMembership({ status: "invited", accepted_at: null })],
      true
    );

    const result = await resolveAuthenticatedTenantContext({ authUserId: "auth_user_1" }, lookup);

    expect(result).toEqual({
      ok: true,
      context: {
        tenantId: "tenant_amamihome",
        staffUserId: "staff_1",
        authUserId: "auth_user_1",
        role: "manager",
        source: "authenticated_staff"
      }
    });
    expect(lookup.membershipActivations).toBe(1);
    expect(lookup.membershipLookups).toBe(2);
  });

  it("does not activate invitations for a disabled staff identity", async () => {
    const lookup = new FakeStaffAuthLookup(
      createStaff({ status: "disabled", is_active: false }),
      [createMembership({ status: "invited", accepted_at: null })],
      true
    );

    const result = await resolveAuthenticatedTenantContext({ authUserId: "auth_user_1" }, lookup);

    expect(result).toEqual({
      ok: false,
      error: { code: "staff_inactive" }
    });
    expect(lookup.membershipActivations).toBe(0);
    expect(lookup.membershipLookups).toBe(0);
  });

  it("rejects empty auth user id without lookup", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [createMembership()]);

    const result = await resolveAuthenticatedTenantContext({ authUserId: "   " }, lookup);

    expect(result).toEqual({
      ok: false,
      error: { code: "missing_auth_user" }
    });
    expect(lookup.staffLookups).toBe(0);
    expect(lookup.membershipLookups).toBe(0);
  });

  it("rejects missing staff", async () => {
    const lookup = new FakeStaffAuthLookup(null, [createMembership()]);

    const result = await resolveAuthenticatedTenantContext({ authUserId: "auth_user_1" }, lookup);

    expect(result).toEqual({
      ok: false,
      error: { code: "staff_not_found" }
    });
  });

  it("rejects active staff without active memberships", async () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), []);

    const result = await resolveAuthenticatedTenantContext({ authUserId: "auth_user_1" }, lookup);

    expect(result).toEqual({
      ok: false,
      error: { code: "membership_not_found" }
    });
  });

  it("does not touch lookup until resolver is called", () => {
    const lookup = new FakeStaffAuthLookup(createStaff(), [createMembership()]);

    expect(lookup.staffLookups).toBe(0);
    expect(lookup.membershipLookups).toBe(0);
  });
});

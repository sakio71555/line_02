import { describe, expect, it, vi } from "vitest";

import type {
  AuthUserIdentity,
  StaffAuthLookup,
  StaffRole,
  StaffTenantMembership,
  StaffUser
} from "@amami-line-crm/domain";
import type {
  AuthSessionVerifier,
  AuthSessionVerifierResult
} from "../../apps/api/src/admin/auth-session";
import { resolveAdminTenantContext } from "../../apps/api/src/admin/tenant-context";

const now = "2026-06-15T00:00:00.000Z";

function loadAuthenticatedRuntimeModule() {
  return import("../../apps/api/src/admin/authenticated-runtime");
}

describe("fake authenticated staff runtime connection", () => {
  it("imports without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadAuthenticatedRuntimeModule()).resolves.toHaveProperty(
      "resolveAuthenticatedAdminRuntimeContext"
    );

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("resolves owner authenticated_staff context and allows view_customers", async () => {
    const { resolveAuthenticatedAdminRuntimeContext } = await loadAuthenticatedRuntimeModule();
    const dependencies = createFakeRuntimeDependencies();

    const result = await resolveAuthenticatedAdminRuntimeContext(
      {
        authorizationHeader: "Bearer fake-valid-owner",
        action: "view_customers"
      },
      dependencies
    );

    expect(result).toEqual({
      ok: true,
      tenantId: "tenant_amamihome",
      context: {
        tenantId: "tenant_amamihome",
        source: "authenticated_staff",
        staffUserId: "staff_owner",
        authUserId: "auth_owner",
        role: "owner"
      },
      action: "view_customers"
    });
  });

  it("allows staff authenticated_staff context to view customers", async () => {
    const { resolveAuthenticatedAdminRuntimeContext } = await loadAuthenticatedRuntimeModule();
    const dependencies = createFakeRuntimeDependencies();

    const result = await resolveAuthenticatedAdminRuntimeContext(
      {
        authorizationHeader: "Bearer fake-valid-staff",
        action: "view_customers"
      },
      dependencies
    );

    expect(result).toMatchObject({
      ok: true,
      tenantId: "tenant_amamihome",
      context: {
        source: "authenticated_staff",
        staffUserId: "staff_staff",
        authUserId: "auth_staff",
        role: "staff"
      },
      action: "view_customers"
    });
  });

  it("denies staff create_ai_summary through the role guard", async () => {
    const { resolveAuthenticatedAdminRuntimeContext } = await loadAuthenticatedRuntimeModule();
    const dependencies = createFakeRuntimeDependencies();

    const result = await resolveAuthenticatedAdminRuntimeContext(
      {
        authorizationHeader: "Bearer fake-valid-staff",
        action: "create_ai_summary"
      },
      dependencies
    );

    expect(result).toEqual({
      ok: false,
      error: { code: "permission_denied" },
      permission: {
        allowed: false,
        reason: "role_not_allowed",
        role: "staff",
        action: "create_ai_summary"
      }
    });
  });

  it("requires selectedTenantId for multi-tenant staff", async () => {
    const { resolveAuthenticatedAdminRuntimeContext } = await loadAuthenticatedRuntimeModule();
    const dependencies = createFakeRuntimeDependencies();

    await expect(
      resolveAuthenticatedAdminRuntimeContext(
        {
          authorizationHeader: "Bearer fake-valid-multi",
          action: "view_customers"
        },
        dependencies
      )
    ).resolves.toEqual({
      ok: false,
      error: { code: "tenant_selection_required" }
    });
  });

  it("uses selectedTenantId when it matches an active membership", async () => {
    const { resolveAuthenticatedAdminRuntimeContext } = await loadAuthenticatedRuntimeModule();
    const dependencies = createFakeRuntimeDependencies();

    const result = await resolveAuthenticatedAdminRuntimeContext(
      {
        authorizationHeader: "Bearer fake-valid-multi",
        selectedTenantId: "tenant_other",
        action: "view_alerts"
      },
      dependencies
    );

    expect(result).toMatchObject({
      ok: true,
      tenantId: "tenant_other",
      context: {
        tenantId: "tenant_other",
        source: "authenticated_staff",
        staffUserId: "staff_multi",
        authUserId: "auth_multi",
        role: "owner"
      },
      action: "view_alerts"
    });
  });

  it("rejects selectedTenantId outside active memberships", async () => {
    const { resolveAuthenticatedAdminRuntimeContext } = await loadAuthenticatedRuntimeModule();
    const dependencies = createFakeRuntimeDependencies();

    await expect(
      resolveAuthenticatedAdminRuntimeContext(
        {
          authorizationHeader: "Bearer fake-valid-multi",
          selectedTenantId: "tenant_outside",
          action: "view_customers"
        },
        dependencies
      )
    ).resolves.toEqual({
      ok: false,
      error: { code: "tenant_membership_denied" }
    });
  });

  it("maps missing Authorization header to authenticated_staff_required", async () => {
    const { resolveAuthenticatedAdminRuntimeContext } = await loadAuthenticatedRuntimeModule();
    const dependencies = createFakeRuntimeDependencies();

    await expect(
      resolveAuthenticatedAdminRuntimeContext(
        {
          authorizationHeader: null,
          action: "view_customers"
        },
        dependencies
      )
    ).resolves.toEqual({
      ok: false,
      error: { code: "authenticated_staff_required" }
    });
    expect(dependencies.sessionVerifier.tokens).toEqual([]);
  });

  it("maps invalid fake token to authenticated_staff_required without leaking the token", async () => {
    const { resolveAuthenticatedAdminRuntimeContext } = await loadAuthenticatedRuntimeModule();
    const dependencies = createFakeRuntimeDependencies();

    const result = await resolveAuthenticatedAdminRuntimeContext(
      {
        authorizationHeader: "Bearer fake-private-invalid-token",
        action: "view_customers"
      },
      dependencies
    );
    const serialized = JSON.stringify(result);

    expect(result).toEqual({
      ok: false,
      error: { code: "authenticated_staff_required" }
    });
    expect(serialized).not.toContain("fake-private-invalid-token");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("env");
    expect(serialized).not.toContain("auth_private");
  });

  it("keeps session_expired distinct for future HTTP mapping", async () => {
    const { resolveAuthenticatedAdminRuntimeContext } = await loadAuthenticatedRuntimeModule();
    const dependencies = createFakeRuntimeDependencies();

    await expect(
      resolveAuthenticatedAdminRuntimeContext(
        {
          authorizationHeader: "Bearer fake-expired-token",
          action: "view_customers"
        },
        dependencies
      )
    ).resolves.toEqual({
      ok: false,
      error: { code: "session_expired" }
    });
  });

  it("keeps no-membership staff errors compatible with the existing auth mapper", async () => {
    const { resolveAuthenticatedAdminRuntimeContext } = await loadAuthenticatedRuntimeModule();
    const { mapAdminAuthErrorToHttp } = await import(
      "../../apps/api/src/admin/auth-error-response"
    );
    const dependencies = createFakeRuntimeDependencies();

    const result = await resolveAuthenticatedAdminRuntimeContext(
      {
        authorizationHeader: "Bearer fake-valid-no-membership",
        action: "view_customers"
      },
      dependencies
    );

    expect(result).toEqual({
      ok: false,
      error: { code: "membership_not_found" }
    });
    if (!result.ok) {
      expect(mapAdminAuthErrorToHttp(result.error)).toMatchObject({
        status: 403,
        body: { ok: false, error: "tenant_membership_denied" },
        placeholderRoute: "/permission-denied"
      });
    }
  });

  it("does not change the existing dev_header tenant guard path", () => {
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

type FakeVerifierResponse = AuthSessionVerifierResult | AuthUserIdentity | null;

class FakeAuthSessionVerifier implements AuthSessionVerifier {
  readonly tokens: string[] = [];

  constructor(private readonly responses: Record<string, FakeVerifierResponse>) {}

  async verifyBearerToken(token: string): Promise<FakeVerifierResponse> {
    this.tokens.push(token);
    if (Object.prototype.hasOwnProperty.call(this.responses, token)) {
      return this.responses[token] ?? null;
    }

    return null;
  }
}

class FakeStaffAuthLookup implements StaffAuthLookup {
  constructor(
    private readonly staffByAuthUserId: Map<string, StaffUser>,
    private readonly membershipsByStaffUserId: Map<string, StaffTenantMembership[]>
  ) {}

  async findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null> {
    const staff = this.staffByAuthUserId.get(authUserId) ?? null;
    return staff?.auth_user_id === authUserId ? staff : null;
  }

  async listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]> {
    return this.membershipsByStaffUserId.get(staffUserId) ?? [];
  }
}

function createFakeRuntimeDependencies(): {
  sessionVerifier: FakeAuthSessionVerifier;
  staffAuthLookup: FakeStaffAuthLookup;
} {
  const owner = createStaff({ id: "staff_owner", auth_user_id: "auth_owner", role: "owner" });
  const manager = createStaff({
    id: "staff_manager",
    auth_user_id: "auth_manager",
    role: "manager"
  });
  const staff = createStaff({ id: "staff_staff", auth_user_id: "auth_staff", role: "staff" });
  const disabled = createStaff({
    id: "staff_disabled",
    auth_user_id: "auth_disabled",
    role: "staff",
    status: "disabled",
    is_active: false,
    disabled_at: now
  });
  const multi = createStaff({ id: "staff_multi", auth_user_id: "auth_multi", role: "manager" });
  const noMembership = createStaff({
    id: "staff_no_membership",
    auth_user_id: "auth_no_membership",
    role: "staff"
  });

  return {
    sessionVerifier: new FakeAuthSessionVerifier({
      "fake-valid-owner": { authUserId: "auth_owner", email: "owner@example.test" },
      "fake-valid-manager": { authUserId: "auth_manager", email: "manager@example.test" },
      "fake-valid-staff": { authUserId: "auth_staff", email: "staff@example.test" },
      "fake-valid-disabled": { authUserId: "auth_disabled", email: "disabled@example.test" },
      "fake-valid-multi": { authUserId: "auth_multi", email: "multi@example.test" },
      "fake-valid-no-membership": {
        authUserId: "auth_no_membership",
        email: "nomembership@example.test"
      },
      "fake-expired-token": {
        ok: false,
        error: { code: "session_expired" }
      }
    }),
    staffAuthLookup: new FakeStaffAuthLookup(
      new Map([
        ["auth_owner", owner],
        ["auth_manager", manager],
        ["auth_staff", staff],
        ["auth_disabled", disabled],
        ["auth_multi", multi],
        ["auth_no_membership", noMembership]
      ]),
      new Map([
        [
          "staff_owner",
          [createMembership({ staff_user_id: "staff_owner", role: "owner" })]
        ],
        [
          "staff_manager",
          [createMembership({ staff_user_id: "staff_manager", role: "manager" })]
        ],
        ["staff_staff", [createMembership({ staff_user_id: "staff_staff", role: "staff" })]],
        [
          "staff_disabled",
          [createMembership({ staff_user_id: "staff_disabled", role: "staff" })]
        ],
        [
          "staff_multi",
          [
            createMembership({
              id: "membership_multi_amami",
              tenant_id: "tenant_amamihome",
              staff_user_id: "staff_multi",
              role: "manager"
            }),
            createMembership({
              id: "membership_multi_other",
              tenant_id: "tenant_other",
              staff_user_id: "staff_multi",
              role: "owner"
            })
          ]
        ]
      ])
    )
  };
}

function createStaff(overrides: Partial<StaffUser> = {}): StaffUser {
  return {
    id: "staff_1",
    tenant_id: "tenant_amamihome",
    auth_user_id: "auth_user_1",
    email: "staff@example.test",
    display_name: "Fake Staff",
    role: "staff",
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
    role: "staff" satisfies StaffRole,
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

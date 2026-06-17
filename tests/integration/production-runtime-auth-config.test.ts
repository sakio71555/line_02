import { describe, expect, it } from "vitest";

import { createProductionAdminAuthRuntimeDependencies } from "../../apps/api/src/admin/production-auth-runtime-gate";
import { resolveAuthenticatedAdminRuntimeContext } from "../../apps/api/src/admin/authenticated-runtime";
import type {
  SupabaseAuthClientLike,
  SupabaseAuthGetUserResultLike
} from "../../apps/api/src/admin/supabase-auth-session-verifier";
import type { StaffAuthLookup, StaffTenantMembership, StaffUser } from "@amami-line-crm/domain";

const now = "2026-06-18T00:00:00.000Z";

describe("Loop 103 production Auth runtime auto config audit", () => {
  it("does not create production auth runtime unless AUTH_SESSION_VERIFIER=supabase", () => {
    const runtime = createProductionAdminAuthRuntimeDependencies({
      env: {},
      supabaseAuthClient: new FakeSupabaseAuthClient({}),
      staffAuthLookup: createFakeStaffAuthLookup()
    });

    expect(runtime).toBeUndefined();
  });

  it("fails safe when supabase mode lacks client or StaffAuthLookup dependencies", () => {
    expect(
      createProductionAdminAuthRuntimeDependencies({
        env: { AUTH_SESSION_VERIFIER: "supabase" }
      })
    ).toBeUndefined();
    expect(
      createProductionAdminAuthRuntimeDependencies({
        env: { AUTH_SESSION_VERIFIER: "supabase" },
        supabaseAuthClient: new FakeSupabaseAuthClient({})
      })
    ).toBeUndefined();
    expect(
      createProductionAdminAuthRuntimeDependencies({
        env: { AUTH_SESSION_VERIFIER: "supabase" },
        staffAuthLookup: createFakeStaffAuthLookup()
      })
    ).toBeUndefined();
  });

  it("uses SupabaseAuthSessionVerifier and StaffAuthLookup when both are injected", async () => {
    const supabaseAuthClient = new FakeSupabaseAuthClient({
      "private-prod-token": {
        data: {
          user: {
            id: "auth_owner"
          }
        }
      }
    });
    const runtime = createProductionAdminAuthRuntimeDependencies({
      env: { AUTH_SESSION_VERIFIER: "supabase" },
      supabaseAuthClient,
      staffAuthLookup: createFakeStaffAuthLookup()
    });

    expect(runtime).toBeDefined();

    const result = await resolveAuthenticatedAdminRuntimeContext(
      {
        authorizationHeader: "Bearer private-prod-token",
        selectedTenantId: "tenant_amamihome",
        action: "view_customers"
      },
      runtime!
    );
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      ok: true,
      tenantId: "tenant_amamihome"
    });
    expect(supabaseAuthClient.tokens).toEqual(["private-prod-token"]);
    expect(serialized).not.toContain("private-prod-token");
    expect(serialized).not.toContain("SUPABASE");
    expect(serialized).not.toContain("project-ref");
  });
});

class FakeSupabaseAuthClient implements SupabaseAuthClientLike {
  readonly tokens: string[] = [];
  readonly auth: SupabaseAuthClientLike["auth"];

  constructor(private readonly responses: Record<string, SupabaseAuthGetUserResultLike>) {
    this.auth = {
      getUser: async (accessToken: string): Promise<SupabaseAuthGetUserResultLike> => {
        this.tokens.push(accessToken);

        return this.responses[accessToken] ?? { error: { message: "invalid token" } };
      }
    };
  }
}

class FakeStaffAuthLookup implements StaffAuthLookup {
  constructor(
    private readonly staffByAuthUserId: Map<string, StaffUser>,
    private readonly membershipsByStaffUserId: Map<string, StaffTenantMembership[]>
  ) {}

  async findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null> {
    return this.staffByAuthUserId.get(authUserId) ?? null;
  }

  async listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]> {
    return this.membershipsByStaffUserId.get(staffUserId) ?? [];
  }
}

function createFakeStaffAuthLookup(): FakeStaffAuthLookup {
  const owner = createStaff({
    id: "staff_owner",
    auth_user_id: "auth_owner",
    role: "owner"
  });

  return new FakeStaffAuthLookup(
    new Map([["auth_owner", owner]]),
    new Map([
      [
        "staff_owner",
        [
          createMembership({
            staff_user_id: "staff_owner",
            role: "owner"
          })
        ]
      ]
    ])
  );
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
    role: "staff",
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

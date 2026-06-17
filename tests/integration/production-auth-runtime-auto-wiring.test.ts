import { describe, expect, it, vi } from "vitest";

import type {
  StaffAuthLookup,
  StaffTenantMembership,
  StaffUser
} from "@amami-line-crm/domain";
import { createApiApp } from "../../apps/api/src/index";
import {
  createProductionAdminAuthRuntimeDependencies,
  FAKE_AUTH_SESSION_VERIFIER_MODE,
  resolveProductionAdminAuthRuntimeDependencies,
  SUPABASE_AUTH_SESSION_VERIFIER_MODE,
  type ProductionAdminAuthRuntimeFactory
} from "../../apps/api/src/admin/production-auth-runtime-gate";
import {
  createDefaultProductionAdminAuthRuntimeDependencies,
  type ProductionAuthRuntimeFetch,
  type ProductionAuthRuntimeFetchResponse
} from "../../apps/api/src/admin/production-auth-runtime-factories";
import type {
  SupabaseAuthClientLike,
  SupabaseAuthGetUserResultLike
} from "../../apps/api/src/admin/supabase-auth-session-verifier";

const now = "2026-06-18T00:00:00.000Z";

describe("Loop 104 production Auth runtime auto wiring", () => {
  it("imports the runtime factory modules without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      import("../../apps/api/src/admin/production-auth-runtime-gate")
    ).resolves.toHaveProperty("resolveProductionAdminAuthRuntimeDependencies");
    await expect(
      import("../../apps/api/src/admin/production-auth-runtime-factories")
    ).resolves.toHaveProperty("createDefaultProductionAdminAuthRuntimeDependencies");

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does not create a fake verifier by default in production", () => {
    const resolution = resolveProductionAdminAuthRuntimeDependencies({
      env: { APP_ENV: "production" }
    });

    expect(resolution).toEqual({
      ok: false,
      error: { code: "auth_runtime_not_configured" }
    });
    expect(
      createProductionAdminAuthRuntimeDependencies({
        env: { APP_ENV: "production" }
      })
    ).toBeUndefined();
  });

  it("rejects AUTH_SESSION_VERIFIER=fake explicitly in production config", () => {
    const factory = vi.fn<ProductionAdminAuthRuntimeFactory>();
    const resolution = resolveProductionAdminAuthRuntimeDependencies({
      env: {
        APP_ENV: "production",
        AUTH_SESSION_VERIFIER: FAKE_AUTH_SESSION_VERIFIER_MODE
      },
      productionAuthRuntimeFactory: factory
    });

    expect(resolution).toEqual({
      ok: false,
      error: { code: "fake_auth_session_verifier_not_allowed" }
    });
    expect(factory).not.toHaveBeenCalled();
  });

  it("fails safely when supabase mode lacks required env", () => {
    const resolution = resolveProductionAdminAuthRuntimeDependencies({
      env: {
        APP_ENV: "production",
        AUTH_SESSION_VERIFIER: SUPABASE_AUTH_SESSION_VERIFIER_MODE
      }
    });
    const serialized = JSON.stringify(resolution);

    expect(resolution).toEqual({
      ok: false,
      error: {
        code: "auth_runtime_not_configured",
        missing: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]
      }
    });
    expect(serialized).not.toContain("private-anon-key");
    expect(serialized).not.toContain("private-service-role-key");
  });

  it("fails safely when supabase mode has invalid config values", () => {
    const resolution = resolveProductionAdminAuthRuntimeDependencies({
      env: {
        APP_ENV: "production",
        AUTH_SESSION_VERIFIER: SUPABASE_AUTH_SESSION_VERIFIER_MODE,
        SUPABASE_URL: "not-a-url-with-private-project-ref",
        SUPABASE_ANON_KEY: "private-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "private-service-role-key"
      }
    });
    const serialized = JSON.stringify(resolution);

    expect(resolution).toEqual({
      ok: false,
      error: {
        code: "auth_runtime_not_configured",
        invalid: ["SUPABASE_URL"]
      }
    });
    expect(serialized).not.toContain("not-a-url-with-private-project-ref");
    expect(serialized).not.toContain("private-anon-key");
    expect(serialized).not.toContain("private-service-role-key");
  });

  it("creates fetch-backed Supabase Auth and StaffAuthLookup boundaries without immediate network access", async () => {
    const fetchMock = vi.fn<ProductionAuthRuntimeFetch>(async () =>
      createJsonResponse({
        id: "auth_owner",
        email: "owner@example.test"
      })
    );

    const dependencies = createDefaultProductionAdminAuthRuntimeDependencies({
      env: createValidSupabaseRuntimeEnv(),
      fetch: fetchMock
    });

    expect(fetchMock).not.toHaveBeenCalled();

    const result = await dependencies.supabaseAuthClient.auth.getUser("private-prod-token");
    const serialized = JSON.stringify(result);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      data: {
        user: {
          id: "auth_owner",
          email: "owner@example.test"
        }
      },
      error: null
    });
    expect(serialized).not.toContain("private-prod-token");
  });

  it("uses AUTH_SESSION_VERIFIER=supabase with fake factories on a representative Admin route", async () => {
    const supabaseAuthClient = new FakeSupabaseAuthClient({
      "private-prod-token": {
        data: {
          user: {
            id: "auth_owner",
            email: "owner@example.test"
          }
        },
        error: null
      }
    });
    const staffAuthLookup = createFakeStaffAuthLookup();
    const factory = vi.fn<ProductionAdminAuthRuntimeFactory>(() => ({
      supabaseAuthClient,
      staffAuthLookup
    }));
    const app = createProductionApp({ productionAuthRuntimeFactory: factory });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: {
          authorization: "Bearer private-prod-token",
          "x-selected-tenant-id": "tenant_amamihome"
        }
      })
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customers: []
    });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(supabaseAuthClient.tokens).toEqual(["private-prod-token"]);
    expect(staffAuthLookup.authUserIds).toEqual(["auth_owner"]);
    expect(staffAuthLookup.staffUserIds).toEqual(["staff_owner"]);
    expect(serialized).not.toContain("private-prod-token");
    expect(serialized).not.toContain("private-service-role-key");
  });

  it("maps StaffAuthLookup runtime errors to a safe Admin auth failure", async () => {
    const supabaseAuthClient = new FakeSupabaseAuthClient({
      "private-prod-token": {
        data: {
          user: {
            id: "auth_owner"
          }
        },
        error: null
      }
    });
    const factory: ProductionAdminAuthRuntimeFactory = () => ({
      supabaseAuthClient,
      staffAuthLookup: new ThrowingStaffAuthLookup()
    });
    const app = createProductionApp({ productionAuthRuntimeFactory: factory });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: {
          authorization: "Bearer private-prod-token",
          "x-selected-tenant-id": "tenant_amamihome"
        }
      })
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      error: "authenticated_staff_required"
    });
    expect(serialized).not.toContain("private-prod-token");
    expect(serialized).not.toContain("private-service-role-key");
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
  readonly authUserIds: string[] = [];
  readonly staffUserIds: string[] = [];

  constructor(
    private readonly staffByAuthUserId: Map<string, StaffUser>,
    private readonly membershipsByStaffUserId: Map<string, StaffTenantMembership[]>
  ) {}

  async findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null> {
    this.authUserIds.push(authUserId);

    return this.staffByAuthUserId.get(authUserId) ?? null;
  }

  async listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]> {
    this.staffUserIds.push(staffUserId);

    return this.membershipsByStaffUserId.get(staffUserId) ?? [];
  }
}

class ThrowingStaffAuthLookup implements StaffAuthLookup {
  async findStaffByAuthUserId(): Promise<StaffUser | null> {
    throw new Error("private-service-role-key project-ref database password");
  }

  async listMembershipsByStaffUserId(): Promise<StaffTenantMembership[]> {
    throw new Error("private-service-role-key project-ref database password");
  }
}

function createProductionApp(input: {
  productionAuthRuntimeFactory: ProductionAdminAuthRuntimeFactory;
}) {
  return createApiApp({
    productionAuthRuntimeFactory: input.productionAuthRuntimeFactory,
    env: {
      TENANT_ID: "tenant_amamihome",
      TENANT_SLUG: "amamihome",
      LINE_CHANNEL_SECRET: "test-secret",
      APP_ENV: "production",
      AUTH_SESSION_VERIFIER: SUPABASE_AUTH_SESSION_VERIFIER_MODE
    }
  });
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

function createValidSupabaseRuntimeEnv(): NodeJS.ProcessEnv {
  return {
    SUPABASE_URL: "https://supabase.test",
    SUPABASE_ANON_KEY: "private-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "private-service-role-key"
  };
}

function createJsonResponse(payload: unknown): ProductionAuthRuntimeFetchResponse {
  return {
    ok: true,
    status: 200,
    json: async () => payload
  };
}

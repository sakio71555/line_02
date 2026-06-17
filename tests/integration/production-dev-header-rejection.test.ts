import { describe, expect, it } from "vitest";

import {
  type AuthUserIdentity,
  type StaffAuthLookup,
  type StaffRole,
  type StaffTenantMembership,
  type StaffUser
} from "@amami-line-crm/domain";
import { createApiApp } from "../../apps/api/src/index";
import type {
  AuthSessionVerifier,
  AuthSessionVerifierResult
} from "../../apps/api/src/admin/auth-session";

const now = "2026-06-17T03:00:00.000Z";

describe("Loop 093 production dev_header rejection and Auth/JWT boundary", () => {
  it("rejects x-tenant-id on production customer read routes", async () => {
    const { app } = createProductionGateApp();

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "dev_tenant_header_not_allowed"
    });
  });

  it("rejects x-tenant-id on production customer write routes", async () => {
    const { app } = createProductionGateApp();

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami/reply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant_amamihome"
        },
        body: JSON.stringify({ body: "確認しました。" })
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "dev_tenant_header_not_allowed"
    });
  });

  it("rejects x-tenant-id on production alerts routes", async () => {
    const { app } = createProductionGateApp();

    const response = await app.fetch(
      new Request("http://localhost/api/admin/alerts", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "dev_tenant_header_not_allowed"
    });
  });

  it("rejects x-tenant-id on production RAG routes", async () => {
    const { app } = createProductionGateApp();

    const response = await app.fetch(
      new Request("http://localhost/api/admin/rag/search", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant_amamihome"
        },
        body: JSON.stringify({ query: "オンライン相談" })
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "dev_tenant_header_not_allowed"
    });
  });

  it("rejects the dev seed route in production", async () => {
    const { app } = createProductionGateApp();

    const response = await app.fetch(
      new Request("http://localhost/api/dev/seed-demo-data", {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "dev_route_not_allowed"
    });
  });

  it("does not treat x-selected-tenant-id alone as production authentication", async () => {
    const { app } = createProductionGateApp();

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-selected-tenant-id": "tenant_amamihome" }
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: "authenticated_staff_required"
    });
  });

  it("does not silently use a fake verifier by default in production", async () => {
    const { app, sessionVerifier } = createProductionGateApp();

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer private-prod-test-token" }
      })
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      error: "authenticated_staff_required"
    });
    expect(sessionVerifier.tokens).toEqual([]);
    expect(serialized).not.toContain("private-prod-test-token");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("env");
  });

  it("allows production Authorization Bearer path through the fake authenticated boundary", async () => {
    const { app, sessionVerifier } = createProductionGateApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer private-prod-test-token" }
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
    expect(sessionVerifier.tokens).toEqual(["private-prod-test-token"]);
    expect(serialized).not.toContain("private-prod-test-token");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("env");
  });

  it("does not leak invalid production Bearer tokens in error bodies", async () => {
    const { app } = createProductionGateApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer private-secret-invalid-token" }
      })
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      error: "authenticated_staff_required"
    });
    expect(serialized).not.toContain("private-secret-invalid-token");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("env");
  });

  it("rejects production x-tenant-id even when Authorization is present", async () => {
    const { app, sessionVerifier } = createProductionGateApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: {
          authorization: "Bearer private-prod-test-token",
          "x-tenant-id": "tenant_amamihome"
        }
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "dev_tenant_header_not_allowed"
    });
    expect(sessionVerifier.tokens).toEqual([]);
  });

  it("keeps local dev_header compatibility outside production", async () => {
    const { app } = createProductionGateApp({
      env: { APP_ENV: "local" }
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: {
          "x-tenant-id": "tenant_amamihome",
          "x-selected-tenant-id": "tenant invalid"
        }
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
});

interface CreateProductionGateAppInput {
  includeAuthRuntime?: boolean;
  env?: NodeJS.ProcessEnv;
}

function createProductionGateApp(input: CreateProductionGateAppInput = {}) {
  const sessionVerifier = new FakeAuthSessionVerifier({
    "private-prod-test-token": {
      authUserId: "auth_owner",
      email: "owner@example.test"
    }
  });
  const staffAuthLookup = createFakeStaffAuthLookup();

  const app = createApiApp({
    ...(input.includeAuthRuntime
      ? {
          adminAuthRuntime: {
            sessionVerifier,
            staffAuthLookup
          }
        }
      : {}),
    env: {
      TENANT_ID: "tenant_amamihome",
      TENANT_SLUG: "amamihome",
      LINE_CHANNEL_SECRET: "test-secret",
      APP_ENV: "production",
      ...input.env
    }
  });

  return {
    app,
    sessionVerifier
  };
}

type FakeVerifierResponse = AuthSessionVerifierResult | AuthUserIdentity | null;

class FakeAuthSessionVerifier implements AuthSessionVerifier {
  readonly tokens: string[] = [];

  constructor(private readonly responses: Record<string, FakeVerifierResponse>) {}

  async verifyBearerToken(token: string): Promise<FakeVerifierResponse> {
    this.tokens.push(token);

    return this.responses[token] ?? null;
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

import { describe, expect, it } from "vitest";

import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type AuthUserIdentity,
  type Customer,
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

const now = "2026-06-15T00:00:00.000Z";

describe("representative Admin API authenticated runtime route", () => {
  it("keeps GET /api/admin/customers dev_header success unchanged", async () => {
    const { app, customerRepository } = createRepresentativeRouteApp();
    await seedRepresentativeCustomers(customerRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome"
    });
    expect(body.customers).toHaveLength(1);
    expect(body.customers[0]).toMatchObject({
      id: "customer_amami",
      tenant_id: "tenant_amamihome"
    });
  });

  it("keeps missing and unknown dev_header responses unchanged when Authorization is absent", async () => {
    const { app } = createRepresentativeRouteApp();

    const missingResponse = await app.fetch(new Request("http://localhost/api/admin/customers"));
    const unknownResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_unknown" }
      })
    );

    expect(missingResponse.status).toBe(401);
    expect(await missingResponse.json()).toEqual({
      ok: false,
      error: "missing_tenant_id"
    });
    expect(unknownResponse.status).toBe(403);
    expect(await unknownResponse.json()).toEqual({
      ok: false,
      error: "unknown_tenant_id"
    });
  });

  it.each(["fake-valid-owner", "fake-valid-manager", "fake-valid-staff"] as const)(
    "allows %s through authenticated_staff runtime for view_customers",
    async (token) => {
      const { app, customerRepository, sessionVerifier } = createRepresentativeRouteApp({
        includeAuthRuntime: true
      });
      await seedRepresentativeCustomers(customerRepository);

      const response = await app.fetch(
        new Request("http://localhost/api/admin/customers", {
          headers: { authorization: `Bearer ${token}` }
        })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        tenant_id: "tenant_amamihome"
      });
      expect(body.customers).toHaveLength(1);
      expect(body.customers[0]).toMatchObject({
        id: "customer_amami",
        tenant_id: "tenant_amamihome"
      });
      expect(sessionVerifier.tokens).toEqual([token]);
    }
  );

  it("returns authenticated_staff_required when Authorization is present but runtime deps are absent", async () => {
    const { app } = createRepresentativeRouteApp();

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer fake-valid-owner" }
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: "authenticated_staff_required"
    });
  });

  it("maps invalid fake token without leaking the token value", async () => {
    const { app } = createRepresentativeRouteApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer fake-invalid" }
      })
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      error: "authenticated_staff_required"
    });
    expect(serialized).not.toContain("fake-invalid");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("env");
  });

  it("maps expired fake token to session_expired", async () => {
    const { app } = createRepresentativeRouteApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer fake-expired" }
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: "session_expired"
    });
  });

  it("requires selectedTenantId for multi-tenant fake staff", async () => {
    const { app } = createRepresentativeRouteApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer fake-valid-multi" }
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "tenant_selection_required"
    });
  });

  it("rejects selectedTenantId outside fake staff memberships", async () => {
    const { app } = createRepresentativeRouteApp({
      includeAuthRuntime: true,
      authenticatedSelectedTenantId: "tenant_outside"
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer fake-valid-multi" }
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "tenant_membership_denied"
    });
  });

  it("rejects invalid x-selected-tenant-id before resolving authenticated staff context", async () => {
    const { app, sessionVerifier } = createRepresentativeRouteApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: {
          authorization: "Bearer fake-valid-multi",
          "x-selected-tenant-id": "tenant invalid"
        }
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_selected_tenant_id"
    });
    expect(sessionVerifier.tokens).toEqual([]);
  });

  it("uses selectedTenantId inside fake staff memberships to scope customers", async () => {
    const { app, customerRepository } = createRepresentativeRouteApp({
      includeAuthRuntime: true,
      authenticatedSelectedTenantId: "tenant_other"
    });
    await seedRepresentativeCustomers(customerRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer fake-valid-multi" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_other"
    });
    expect(body.customers).toHaveLength(1);
    expect(body.customers[0]).toMatchObject({
      id: "customer_other",
      tenant_id: "tenant_other"
    });
  });

  it("uses x-selected-tenant-id header as the authenticated_staff transport", async () => {
    const { app, customerRepository } = createRepresentativeRouteApp({
      includeAuthRuntime: true
    });
    await seedRepresentativeCustomers(customerRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: {
          authorization: "Bearer fake-valid-multi",
          "x-selected-tenant-id": "tenant_other"
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_other"
    });
    expect(body.customers).toHaveLength(1);
    expect(body.customers[0]).toMatchObject({
      id: "customer_other",
      tenant_id: "tenant_other"
    });
  });

  it("ignores x-selected-tenant-id on the dev_header path", async () => {
    const { app, customerRepository } = createRepresentativeRouteApp();
    await seedRepresentativeCustomers(customerRepository);

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
      tenant_id: "tenant_amamihome"
    });
    expect(body.customers).toHaveLength(1);
    expect(body.customers[0]).toMatchObject({
      id: "customer_amami",
      tenant_id: "tenant_amamihome"
    });
  });
});

interface RepresentativeRouteAppInput {
  includeAuthRuntime?: boolean;
  authenticatedSelectedTenantId?: string | null;
}

function createRepresentativeRouteApp(input: RepresentativeRouteAppInput = {}) {
  const customerRepository = new InMemoryCustomerRepository();
  const messageRepository = new InMemoryMessageRepository();
  const sessionVerifier = new FakeAuthSessionVerifier({
    "fake-valid-owner": { authUserId: "auth_owner", email: "owner@example.test" },
    "fake-valid-manager": { authUserId: "auth_manager", email: "manager@example.test" },
    "fake-valid-staff": { authUserId: "auth_staff", email: "staff@example.test" },
    "fake-valid-multi": { authUserId: "auth_multi", email: "multi@example.test" },
    "fake-expired": {
      ok: false,
      error: { code: "session_expired" }
    }
  });
  const staffAuthLookup = createFakeStaffAuthLookup();

  const app = createApiApp({
    customerRepository,
    messageRepository,
    ...(input.includeAuthRuntime
      ? {
          adminAuthRuntime: {
            sessionVerifier,
            staffAuthLookup
          }
        }
      : {}),
    ...(input.authenticatedSelectedTenantId !== undefined
      ? { authenticatedSelectedTenantId: input.authenticatedSelectedTenantId }
      : {}),
    env: {
      TENANT_ID: "tenant_amamihome",
      TENANT_SLUG: "amamihome",
      LINE_CHANNEL_SECRET: "test-secret"
    }
  });

  return {
    app,
    customerRepository,
    sessionVerifier
  };
}

async function seedRepresentativeCustomers(
  customerRepository: InMemoryCustomerRepository
): Promise<void> {
  await customerRepository.save(
    createCustomer({
      id: "customer_amami",
      tenant_id: "tenant_amamihome",
      display_name: "Fake Amami Customer"
    })
  );
  await customerRepository.save(
    createCustomer({
      id: "customer_other",
      tenant_id: "tenant_other",
      display_name: "Fake Other Customer"
    })
  );
}

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

function createFakeStaffAuthLookup(): FakeStaffAuthLookup {
  const owner = createStaff({ id: "staff_owner", auth_user_id: "auth_owner", role: "owner" });
  const manager = createStaff({
    id: "staff_manager",
    auth_user_id: "auth_manager",
    role: "manager"
  });
  const staff = createStaff({ id: "staff_staff", auth_user_id: "auth_staff", role: "staff" });
  const multi = createStaff({ id: "staff_multi", auth_user_id: "auth_multi", role: "manager" });

  return new FakeStaffAuthLookup(
    new Map([
      ["auth_owner", owner],
      ["auth_manager", manager],
      ["auth_staff", staff],
      ["auth_multi", multi]
    ]),
    new Map([
      ["staff_owner", [createMembership({ staff_user_id: "staff_owner", role: "owner" })]],
      [
        "staff_manager",
        [createMembership({ staff_user_id: "staff_manager", role: "manager" })]
      ],
      ["staff_staff", [createMembership({ staff_user_id: "staff_staff", role: "staff" })]],
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

function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "customer_1",
    tenant_id: "tenant_amamihome",
    line_user_id: null,
    display_name: "Fake Customer",
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: [],
    response_mode: "bot_auto",
    status: "active",
    last_message_at: null,
    last_customer_message_at: null,
    last_staff_reply_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

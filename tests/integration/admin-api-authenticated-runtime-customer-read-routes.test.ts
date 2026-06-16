import { describe, expect, it } from "vitest";

import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type AuthUserIdentity,
  type Customer,
  type Message,
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

const now = "2026-06-17T00:00:00.000Z";

describe("authenticated_staff runtime customer read routes", () => {
  it("allows customer list with a single membership and no selectedTenantId", async () => {
    const { app, customerRepository } = createCustomerReadApp({ includeAuthRuntime: true });
    await seedCustomerReadData(customerRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer fake-valid-owner" }
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
    expect(customerRepository.listByTenantCalls).toEqual(["tenant_amamihome"]);
  });

  it("requires selectedTenantId for a multi-tenant staff customer list request", async () => {
    const { app, customerRepository } = createCustomerReadApp({ includeAuthRuntime: true });
    await seedCustomerReadData(customerRepository);

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
    expect(customerRepository.listByTenantCalls).toEqual([]);
  });

  it("uses matching x-selected-tenant-id to scope the customer list", async () => {
    const { app, customerRepository } = createCustomerReadApp({ includeAuthRuntime: true });
    await seedCustomerReadData(customerRepository);

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
    expect(customerRepository.listByTenantCalls).toEqual(["tenant_other"]);
  });

  it("rejects wrong selectedTenantId before customer list repository access", async () => {
    const { app, customerRepository } = createCustomerReadApp({ includeAuthRuntime: true });
    await seedCustomerReadData(customerRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: {
          authorization: "Bearer fake-valid-multi",
          "x-selected-tenant-id": "tenant_outside"
        }
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "tenant_membership_denied"
    });
    expect(customerRepository.listByTenantCalls).toEqual([]);
  });

  it("rejects invalid selectedTenantId before session and customer list repository access", async () => {
    const { app, customerRepository, sessionVerifier } = createCustomerReadApp({
      includeAuthRuntime: true
    });
    await seedCustomerReadData(customerRepository);

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
    expect(customerRepository.listByTenantCalls).toEqual([]);
  });

  it("reads customer detail through verified AdminTenantContext.tenantId", async () => {
    const { app, customerRepository } = createCustomerReadApp({ includeAuthRuntime: true });
    await seedCustomerReadData(customerRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_other", {
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
      tenant_id: "tenant_other",
      customer: {
        id: "customer_other",
        tenant_id: "tenant_other"
      }
    });
    expect(customerRepository.findByIdForTenantCalls).toEqual([
      {
        tenantId: "tenant_other",
        customerId: "customer_other"
      }
    ]);
  });

  it("keeps other-tenant customer detail hidden behind 404", async () => {
    const { app, customerRepository } = createCustomerReadApp({ includeAuthRuntime: true });
    await seedCustomerReadData(customerRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami", {
        headers: {
          authorization: "Bearer fake-valid-multi",
          "x-selected-tenant-id": "tenant_other"
        }
      })
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: "customer_not_found"
    });
    expect(customerRepository.findByIdForTenantCalls).toEqual([
      {
        tenantId: "tenant_other",
        customerId: "customer_amami"
      }
    ]);
  });

  it("does not call customer detail repository for invalid selectedTenantId", async () => {
    const { app, customerRepository, sessionVerifier } = createCustomerReadApp({
      includeAuthRuntime: true
    });
    await seedCustomerReadData(customerRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_other", {
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
    expect(customerRepository.findByIdForTenantCalls).toEqual([]);
  });

  it("reads timeline through verified AdminTenantContext.tenantId", async () => {
    const { app, customerRepository, messageRepository } = createCustomerReadApp({
      includeAuthRuntime: true
    });
    await seedCustomerReadData(customerRepository, messageRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_other/timeline", {
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
      tenant_id: "tenant_other",
      customer_id: "customer_other"
    });
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]).toMatchObject({
      id: "message_other_1",
      tenant_id: "tenant_other",
      customer_id: "customer_other"
    });
    expect(customerRepository.findByIdForTenantCalls).toEqual([
      {
        tenantId: "tenant_other",
        customerId: "customer_other"
      }
    ]);
    expect(messageRepository.listByCustomerCalls).toEqual([
      {
        tenantId: "tenant_other",
        customerId: "customer_other"
      }
    ]);
  });

  it("does not read timeline messages when the customer is outside the verified tenant", async () => {
    const { app, customerRepository, messageRepository } = createCustomerReadApp({
      includeAuthRuntime: true
    });
    await seedCustomerReadData(customerRepository, messageRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami/timeline", {
        headers: {
          authorization: "Bearer fake-valid-multi",
          "x-selected-tenant-id": "tenant_other"
        }
      })
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: "customer_not_found"
    });
    expect(customerRepository.findByIdForTenantCalls).toEqual([
      {
        tenantId: "tenant_other",
        customerId: "customer_amami"
      }
    ]);
    expect(messageRepository.listByCustomerCalls).toEqual([]);
  });

  it("keeps dev_header path and ignores x-selected-tenant-id on customer read routes", async () => {
    const { app, customerRepository, messageRepository, sessionVerifier } = createCustomerReadApp();
    await seedCustomerReadData(customerRepository, messageRepository);

    const listResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: {
          "x-tenant-id": "tenant_amamihome",
          "x-selected-tenant-id": "tenant invalid"
        }
      })
    );
    const detailResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami", {
        headers: {
          "x-tenant-id": "tenant_amamihome",
          "x-selected-tenant-id": "tenant invalid"
        }
      })
    );
    const timelineResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami/timeline", {
        headers: {
          "x-tenant-id": "tenant_amamihome",
          "x-selected-tenant-id": "tenant invalid"
        }
      })
    );

    expect(listResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(timelineResponse.status).toBe(200);
    expect(sessionVerifier.tokens).toEqual([]);
    expect(customerRepository.listByTenantCalls).toEqual(["tenant_amamihome"]);
    expect(customerRepository.findByIdForTenantCalls).toEqual([
      {
        tenantId: "tenant_amamihome",
        customerId: "customer_amami"
      },
      {
        tenantId: "tenant_amamihome",
        customerId: "customer_amami"
      }
    ]);
    expect(messageRepository.listByCustomerCalls).toEqual([
      {
        tenantId: "tenant_amamihome",
        customerId: "customer_amami"
      }
    ]);
  });

  it("keeps default in_memory app behavior for customer list", async () => {
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

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customers: []
    });
  });
});

interface CustomerReadAppInput {
  includeAuthRuntime?: boolean;
  authenticatedSelectedTenantId?: string | null;
}

function createCustomerReadApp(input: CustomerReadAppInput = {}) {
  const customerRepository = new SpyCustomerRepository();
  const messageRepository = new SpyMessageRepository();
  const sessionVerifier = new FakeAuthSessionVerifier({
    "fake-valid-owner": { authUserId: "auth_owner", email: "owner@example.test" },
    "fake-valid-multi": { authUserId: "auth_multi", email: "multi@example.test" }
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
    messageRepository,
    sessionVerifier
  };
}

async function seedCustomerReadData(
  customerRepository: SpyCustomerRepository,
  messageRepository?: SpyMessageRepository
): Promise<void> {
  await customerRepository.save(
    createCustomer({
      id: "customer_amami",
      tenant_id: "tenant_amamihome",
      display_name: "Amami Customer"
    })
  );
  await customerRepository.save(
    createCustomer({
      id: "customer_other",
      tenant_id: "tenant_other",
      display_name: "Other Tenant Customer"
    })
  );

  if (!messageRepository) {
    return;
  }

  await messageRepository.insert(
    createMessage({
      id: "message_amami_1",
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      body: "Amami message",
      created_at: "2026-06-17T00:01:00.000Z"
    })
  );
  await messageRepository.insert(
    createMessage({
      id: "message_other_1",
      tenant_id: "tenant_other",
      customer_id: "customer_other",
      body: "Other tenant message",
      created_at: "2026-06-17T00:02:00.000Z"
    })
  );
}

class SpyCustomerRepository extends InMemoryCustomerRepository {
  readonly listByTenantCalls: string[] = [];
  readonly findByIdForTenantCalls: Array<{ tenantId: string; customerId: string }> = [];

  override async listByTenant(tenantId: string): Promise<Customer[]> {
    this.listByTenantCalls.push(tenantId);
    return super.listByTenant(tenantId);
  }

  override async findByIdForTenant(tenantId: string, customerId: string): Promise<Customer | null> {
    this.findByIdForTenantCalls.push({ tenantId, customerId });
    return super.findByIdForTenant(tenantId, customerId);
  }
}

class SpyMessageRepository extends InMemoryMessageRepository {
  readonly listByCustomerCalls: Array<{ tenantId: string; customerId: string }> = [];

  override async listByCustomer(tenantId: string, customerId: string): Promise<Message[]> {
    this.listByCustomerCalls.push({ tenantId, customerId });
    return super.listByCustomer(tenantId, customerId);
  }
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
  const multi = createStaff({ id: "staff_multi", auth_user_id: "auth_multi", role: "manager" });

  return new FakeStaffAuthLookup(
    new Map([
      ["auth_owner", owner],
      ["auth_multi", multi]
    ]),
    new Map([
      ["staff_owner", [createMembership({ staff_user_id: "staff_owner", role: "owner" })]],
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

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "message_1",
    tenant_id: "tenant_amamihome",
    customer_id: "customer_1",
    consultation_id: null,
    line_message_id: null,
    role: "customer",
    message_type: "text",
    body: "Fake message",
    media_storage_path: null,
    staff_user_id: null,
    ai_generated: false,
    sent_to_line_at: null,
    created_at: now,
    ...overrides
  };
}

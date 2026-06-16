import { describe, expect, it } from "vitest";

import {
  MockAiProvider,
  type AiRagAnswerDraft,
  type AiRagAnswerDraftInput,
  type AiReplyDraftInput,
  type AiSummaryInput
} from "@amami-line-crm/ai";
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
import type { LineClient, LineReplyMessage } from "@amami-line-crm/line";
import { createApiApp } from "../../apps/api/src/index";
import type {
  AuthSessionVerifier,
  AuthSessionVerifierResult
} from "../../apps/api/src/admin/auth-session";

const now = "2026-06-17T01:00:00.000Z";

describe("authenticated_staff runtime customer write and AI routes", () => {
  it("allows staff reply with a single membership and no selectedTenantId", async () => {
    const { app, customerRepository, messageRepository, lineClient } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository);

    const response = await app.fetch(
      staffReplyRequest("customer_amami", {
        authorization: "Bearer fake-valid-owner"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      message: {
        tenant_id: "tenant_amamihome",
        customer_id: "customer_amami",
        role: "staff",
        message_type: "text"
      }
    });
    expect(customerRepository.findByIdForTenantCalls).toEqual([
      {
        tenantId: "tenant_amamihome",
        customerId: "customer_amami"
      }
    ]);
    expect(lineClient.pushes).toEqual([
      {
        to: "U_AMAMI_CUSTOMER",
        messages: [{ type: "text", text: "確認しました。担当者から返信します。" }]
      }
    ]);
    expect(messageRepository.insertCalls).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_amami",
        role: "staff"
      })
    ]);
  });

  it("requires selectedTenantId for a multi-tenant staff reply request", async () => {
    const { app, customerRepository, lineClient } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository);

    const response = await app.fetch(
      staffReplyRequest("customer_amami", {
        authorization: "Bearer fake-valid-multi"
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "tenant_selection_required"
    });
    expect(customerRepository.findByIdForTenantCalls).toEqual([]);
    expect(lineClient.pushes).toEqual([]);
  });

  it("uses matching x-selected-tenant-id to scope staff reply", async () => {
    const { app, customerRepository, messageRepository, lineClient } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository);

    const response = await app.fetch(
      staffReplyRequest("customer_other", {
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant_other"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_other",
      customer_id: "customer_other",
      message: {
        tenant_id: "tenant_other",
        customer_id: "customer_other",
        role: "staff"
      }
    });
    expect(customerRepository.findByIdForTenantCalls).toEqual([
      {
        tenantId: "tenant_other",
        customerId: "customer_other"
      }
    ]);
    expect(lineClient.pushes).toEqual([
      {
        to: "U_OTHER_CUSTOMER",
        messages: [{ type: "text", text: "確認しました。担当者から返信します。" }]
      }
    ]);
    expect(messageRepository.insertCalls).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_other",
        customer_id: "customer_other",
        role: "staff"
      })
    ]);
  });

  it("rejects wrong selectedTenantId before staff reply repository access", async () => {
    const { app, customerRepository, lineClient } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository);

    const response = await app.fetch(
      staffReplyRequest("customer_amami", {
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant_outside"
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "tenant_membership_denied"
    });
    expect(customerRepository.findByIdForTenantCalls).toEqual([]);
    expect(lineClient.pushes).toEqual([]);
  });

  it("rejects invalid selectedTenantId before session and staff reply repository access", async () => {
    const { app, customerRepository, lineClient, sessionVerifier } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository);

    const response = await app.fetch(
      staffReplyRequest("customer_amami", {
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant invalid"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_selected_tenant_id"
    });
    expect(sessionVerifier.tokens).toEqual([]);
    expect(customerRepository.findByIdForTenantCalls).toEqual([]);
    expect(lineClient.pushes).toEqual([]);
  });

  it("keeps other-tenant staff reply customer hidden behind 404", async () => {
    const { app, customerRepository, lineClient } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository);

    const response = await app.fetch(
      staffReplyRequest("customer_amami", {
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant_other"
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
    expect(lineClient.pushes).toEqual([]);
  });

  it("summarizes through verified AdminTenantContext.tenantId only", async () => {
    const { app, customerRepository, messageRepository, aiProvider } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository, messageRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_other/ai-summary", {
        method: "POST",
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
      customer_id: "customer_other",
      message: {
        tenant_id: "tenant_other",
        customer_id: "customer_other",
        role: "ai",
        message_type: "summary"
      }
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
    expect(aiProvider.summaryCalls).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_other",
        customer_id: "customer_other",
        conversation: [
          expect.objectContaining({
            content: "Other tenant customer message"
          })
        ]
      })
    ]);
    expect(JSON.stringify(aiProvider.summaryCalls[0])).not.toContain("Amami customer message");
    expect(messageRepository.insertCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tenant_id: "tenant_other",
          customer_id: "customer_other",
          role: "ai",
          message_type: "summary"
        })
      ])
    );
  });

  it("does not summarize another tenant customer", async () => {
    const { app, customerRepository, messageRepository, aiProvider } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository, messageRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami/ai-summary", {
        method: "POST",
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
    expect(aiProvider.summaryCalls).toEqual([]);
  });

  it("denies staff role for AI summary before customer lookup", async () => {
    const { app, customerRepository, aiProvider } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami/ai-summary", {
        method: "POST",
        headers: {
          authorization: "Bearer fake-valid-staff"
        }
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "permission_denied"
    });
    expect(customerRepository.findByIdForTenantCalls).toEqual([]);
    expect(aiProvider.summaryCalls).toEqual([]);
  });

  it("drafts a reply through verified AdminTenantContext.tenantId without saving messages", async () => {
    const { app, customerRepository, messageRepository, aiProvider } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository, messageRepository);
    const messageCountBefore = messageRepository.list().length;

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_other/ai-reply-draft", {
        method: "POST",
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
      customer_id: "customer_other",
      draft_body: expect.any(String),
      recommended_response_mode: "human_required",
      provider: "mock"
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
    expect(aiProvider.draftCalls).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_other",
        customer_id: "customer_other"
      })
    ]);
    expect(JSON.stringify(aiProvider.draftCalls[0])).not.toContain("Amami customer message");
    expect(messageRepository.list()).toHaveLength(messageCountBefore);
  });

  it("does not draft a reply for another tenant customer", async () => {
    const { app, customerRepository, messageRepository, aiProvider } = createCustomerWriteAiApp({
      includeAuthRuntime: true
    });
    await seedCustomerWriteAiData(customerRepository, messageRepository);

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami/ai-reply-draft", {
        method: "POST",
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
    expect(aiProvider.draftCalls).toEqual([]);
  });

  it("keeps dev_header path and ignores x-selected-tenant-id on customer write and AI routes", async () => {
    const { app, customerRepository, messageRepository, lineClient, aiProvider, sessionVerifier } =
      createCustomerWriteAiApp();
    await seedCustomerWriteAiData(customerRepository, messageRepository);

    const headers = {
      "x-tenant-id": "tenant_amamihome",
      "x-selected-tenant-id": "tenant invalid"
    };
    const replyResponse = await app.fetch(staffReplyRequest("customer_amami", headers));
    const summaryResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami/ai-summary", {
        method: "POST",
        headers
      })
    );
    const draftResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami/ai-reply-draft", {
        method: "POST",
        headers
      })
    );

    expect(replyResponse.status).toBe(200);
    expect(summaryResponse.status).toBe(200);
    expect(draftResponse.status).toBe(200);
    expect(sessionVerifier.tokens).toEqual([]);
    expect(lineClient.pushes).toHaveLength(1);
    expect(aiProvider.summaryCalls[0]).toMatchObject({ tenant_id: "tenant_amamihome" });
    expect(aiProvider.draftCalls[0]).toMatchObject({ tenant_id: "tenant_amamihome" });
  });

  it("keeps default in_memory app behavior for customer write and AI routes", async () => {
    const app = createApiApp({
      env: {
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome",
        LINE_CHANNEL_SECRET: "test-secret"
      }
    });
    const headers = { "x-tenant-id": "tenant_amamihome" };

    const replyResponse = await app.fetch(staffReplyRequest("customer_missing", headers));
    const summaryResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_missing/ai-summary", {
        method: "POST",
        headers
      })
    );
    const draftResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_missing/ai-reply-draft", {
        method: "POST",
        headers
      })
    );

    expect(replyResponse.status).toBe(404);
    expect(summaryResponse.status).toBe(404);
    expect(draftResponse.status).toBe(404);
  });
});

interface CustomerWriteAiAppInput {
  includeAuthRuntime?: boolean;
  authenticatedSelectedTenantId?: string | null;
}

function createCustomerWriteAiApp(input: CustomerWriteAiAppInput = {}) {
  const customerRepository = new SpyCustomerRepository();
  const messageRepository = new SpyMessageRepository();
  const lineClient = new RecordingLineClient();
  const aiProvider = new RecordingMockAiProvider();
  const sessionVerifier = new FakeAuthSessionVerifier({
    "fake-valid-owner": { authUserId: "auth_owner", email: "owner@example.test" },
    "fake-valid-staff": { authUserId: "auth_staff", email: "staff@example.test" },
    "fake-valid-multi": { authUserId: "auth_multi", email: "multi@example.test" }
  });
  const staffAuthLookup = createFakeStaffAuthLookup();

  const app = createApiApp({
    customerRepository,
    messageRepository,
    lineClient,
    aiProvider,
    now: () => now,
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
    lineClient,
    aiProvider,
    sessionVerifier
  };
}

async function seedCustomerWriteAiData(
  customerRepository: SpyCustomerRepository,
  messageRepository?: SpyMessageRepository
): Promise<void> {
  await customerRepository.save(
    createCustomer({
      id: "customer_amami",
      tenant_id: "tenant_amamihome",
      line_user_id: "U_AMAMI_CUSTOMER",
      display_name: "Amami Customer"
    })
  );
  await customerRepository.save(
    createCustomer({
      id: "customer_other",
      tenant_id: "tenant_other",
      line_user_id: "U_OTHER_CUSTOMER",
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
      body: "Amami customer message",
      created_at: "2026-06-17T01:01:00.000Z"
    })
  );
  await messageRepository.insert(
    createMessage({
      id: "message_other_1",
      tenant_id: "tenant_other",
      customer_id: "customer_other",
      body: "Other tenant customer message",
      created_at: "2026-06-17T01:02:00.000Z"
    })
  );
}

function staffReplyRequest(customerId: string, headers: HeadersInit = {}): Request {
  return new Request(`http://localhost/api/admin/customers/${customerId}/reply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify({ body: "確認しました。担当者から返信します。" })
  });
}

class SpyCustomerRepository extends InMemoryCustomerRepository {
  readonly findByIdForTenantCalls: Array<{ tenantId: string; customerId: string }> = [];

  override async findByIdForTenant(tenantId: string, customerId: string): Promise<Customer | null> {
    this.findByIdForTenantCalls.push({ tenantId, customerId });
    return super.findByIdForTenant(tenantId, customerId);
  }
}

class SpyMessageRepository extends InMemoryMessageRepository {
  readonly insertCalls: Message[] = [];
  readonly listByCustomerCalls: Array<{ tenantId: string; customerId: string }> = [];

  override async insert(message: Message): Promise<Message> {
    this.insertCalls.push(message);
    return super.insert(message);
  }

  override async listByCustomer(tenantId: string, customerId: string): Promise<Message[]> {
    this.listByCustomerCalls.push({ tenantId, customerId });
    return super.listByCustomer(tenantId, customerId);
  }
}

class RecordingLineClient implements LineClient {
  readonly pushes: Array<{ to: string; messages: LineReplyMessage[] }> = [];

  async replyMessage(): Promise<void> {
    throw new Error("replyMessage is not used by staff reply routes.");
  }

  async pushMessage(to: string, messages: LineReplyMessage[]): Promise<void> {
    this.pushes.push({ to, messages });
  }
}

class RecordingMockAiProvider extends MockAiProvider {
  readonly summaryCalls: AiSummaryInput[] = [];
  readonly draftCalls: AiReplyDraftInput[] = [];
  readonly ragAnswerCalls: AiRagAnswerDraftInput[] = [];

  override async summarizeConversation(input: AiSummaryInput) {
    this.summaryCalls.push(input);
    return super.summarizeConversation(input);
  }

  override async draftReply(input: AiReplyDraftInput) {
    this.draftCalls.push(input);
    return super.draftReply(input);
  }

  override async draftRagAnswer(input: AiRagAnswerDraftInput): Promise<AiRagAnswerDraft> {
    this.ragAnswerCalls.push(input);
    return super.draftRagAnswer(input);
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
  const staff = createStaff({ id: "staff_staff", auth_user_id: "auth_staff", role: "staff" });
  const multi = createStaff({ id: "staff_multi", auth_user_id: "auth_multi", role: "manager" });

  return new FakeStaffAuthLookup(
    new Map([
      ["auth_owner", owner],
      ["auth_staff", staff],
      ["auth_multi", multi]
    ]),
    new Map([
      ["staff_owner", [createMembership({ staff_user_id: "staff_owner", role: "owner" })]],
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
    line_user_id: "U_TEST_USER",
    display_name: "Fake Customer",
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: [],
    response_mode: "human_required",
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

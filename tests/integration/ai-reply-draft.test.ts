import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  MockAiProvider,
  type AiProvider,
  type AiReplyDraftInput,
  type AiSummary,
  type AiSummaryInput
} from "@amami-line-crm/ai";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type Customer,
  type Message
} from "@amami-line-crm/domain";

class RecordingMockAiProvider extends MockAiProvider {
  readonly calls: AiReplyDraftInput[] = [];

  override async draftReply(input: AiReplyDraftInput) {
    this.calls.push(input);
    return super.draftReply(input);
  }
}

class FailingAiProvider implements AiProvider {
  readonly calls: AiReplyDraftInput[] = [];

  async summarizeConversation(_input: AiSummaryInput): Promise<AiSummary> {
    throw new Error("summarizeConversation is not used by AI reply draft.");
  }

  async draftReply(input: AiReplyDraftInput): Promise<never> {
    this.calls.push(input);
    throw new Error("Mock AI reply draft failure.");
  }
}

function createTestApp(input: {
  tenantId?: string;
  tenantSlug?: string;
  customerRepository: InMemoryCustomerRepository;
  messageRepository: InMemoryMessageRepository;
  aiProvider?: AiProvider;
}) {
  return createApiApp({
    customerRepository: input.customerRepository,
    messageRepository: input.messageRepository,
    ...(input.aiProvider ? { aiProvider: input.aiProvider } : {}),
    env: {
      TENANT_ID: input.tenantId ?? "tenant_amamihome",
      TENANT_SLUG: input.tenantSlug ?? "amamihome"
    }
  });
}

function makeCustomer(input: { id: string; tenantId: string }): Customer {
  return {
    id: input.id,
    tenant_id: input.tenantId,
    line_user_id: "U_TEST_USER_001",
    display_name: null,
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: [],
    response_mode: "human_required",
    status: "new",
    last_message_at: null,
    last_customer_message_at: null,
    last_staff_reply_at: null,
    created_at: "2026-06-13T00:00:00.000Z",
    updated_at: "2026-06-13T00:00:00.000Z"
  };
}

function makeMessage(input: {
  id: string;
  tenantId: string;
  customerId: string;
  body: string | null;
  role?: Message["role"];
  messageType?: Message["message_type"];
  sentToLineAt?: string | null;
  createdAt: string;
}): Message {
  return {
    id: input.id,
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    consultation_id: null,
    line_message_id: null,
    role: input.role ?? "customer",
    message_type: input.messageType ?? "text",
    body: input.body,
    media_storage_path: null,
    staff_user_id: null,
    ai_generated: input.role === "ai",
    sent_to_line_at: input.sentToLineAt ?? null,
    created_at: input.createdAt
  };
}

function aiReplyDraftRequest(customerId: string, tenantId?: string): Request {
  const headers: HeadersInit = {};

  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  return new Request(`http://localhost/api/admin/customers/${customerId}/ai-reply-draft`, {
    method: "POST",
    headers
  });
}

describe("admin AI reply draft API", () => {
  it("returns 401/403 before drafting a reply", async () => {
    const provider = new RecordingMockAiProvider();
    const app = createTestApp({
      customerRepository: new InMemoryCustomerRepository(),
      messageRepository: new InMemoryMessageRepository(),
      aiProvider: provider
    });

    const missingTenantResponse = await app.fetch(aiReplyDraftRequest("customer_001"));
    const unknownTenantResponse = await app.fetch(
      aiReplyDraftRequest("customer_001", "tenant_unknown")
    );

    expect(missingTenantResponse.status).toBe(401);
    expect(await missingTenantResponse.json()).toEqual({
      ok: false,
      error: "missing_tenant_id"
    });
    expect(unknownTenantResponse.status).toBe(403);
    expect(await unknownTenantResponse.json()).toEqual({
      ok: false,
      error: "unknown_tenant_id"
    });
    expect(provider.calls).toHaveLength(0);
  });

  it("returns 404 for missing or another tenant customer", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const app = createTestApp({
      customerRepository,
      messageRepository,
      aiProvider: new RecordingMockAiProvider()
    });

    await customerRepository.save(
      makeCustomer({ id: "customer_other", tenantId: "tenant_other" })
    );

    const missingCustomerResponse = await app.fetch(
      aiReplyDraftRequest("customer_missing", "tenant_amamihome")
    );
    const otherTenantResponse = await app.fetch(
      aiReplyDraftRequest("customer_other", "tenant_amamihome")
    );

    expect(missingCustomerResponse.status).toBe(404);
    expect(await missingCustomerResponse.json()).toEqual({
      ok: false,
      error: "customer_not_found"
    });
    expect(otherTenantResponse.status).toBe(404);
    expect(await otherTenantResponse.json()).toEqual({
      ok: false,
      error: "customer_not_found"
    });
  });

  it("returns 409 when the customer timeline has no draftable messages", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const provider = new RecordingMockAiProvider();
    const app = createTestApp({
      customerRepository,
      messageRepository: new InMemoryMessageRepository(),
      aiProvider: provider
    });

    await customerRepository.save(
      makeCustomer({ id: "customer_amami", tenantId: "tenant_amamihome" })
    );

    const response = await app.fetch(aiReplyDraftRequest("customer_amami", "tenant_amamihome"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "cannot_draft_reply_empty_timeline"
    });
    expect(provider.calls).toHaveLength(0);
  });

  it("drafts from only the tenant-scoped customer timeline and does not save messages", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const provider = new RecordingMockAiProvider();
    const app = createTestApp({
      customerRepository,
      messageRepository,
      aiProvider: provider
    });

    await customerRepository.save(
      makeCustomer({ id: "customer_amami", tenantId: "tenant_amamihome" })
    );
    await customerRepository.save(
      makeCustomer({ id: "customer_same_tenant_other", tenantId: "tenant_amamihome" })
    );
    await messageRepository.insert(
      makeMessage({
        id: "message_customer",
        tenantId: "tenant_amamihome",
        customerId: "customer_amami",
        body: "モデルホームを見学したいです",
        role: "customer",
        createdAt: "2026-06-13T00:01:00.000Z"
      })
    );
    await messageRepository.insert(
      makeMessage({
        id: "message_staff",
        tenantId: "tenant_amamihome",
        customerId: "customer_amami",
        body: "候補日を確認します",
        role: "staff",
        sentToLineAt: "2026-06-13T00:02:00.000Z",
        createdAt: "2026-06-13T00:02:00.000Z"
      })
    );
    await messageRepository.insert(
      makeMessage({
        id: "message_other_tenant",
        tenantId: "tenant_other",
        customerId: "customer_amami",
        body: "他tenantの会話を混ぜない",
        role: "customer",
        createdAt: "2026-06-13T00:03:00.000Z"
      })
    );
    await messageRepository.insert(
      makeMessage({
        id: "message_other_customer",
        tenantId: "tenant_amamihome",
        customerId: "customer_same_tenant_other",
        body: "別customerの会話を混ぜない",
        role: "customer",
        createdAt: "2026-06-13T00:04:00.000Z"
      })
    );
    const messageCountBefore = messageRepository.list().length;

    const response = await app.fetch(aiReplyDraftRequest("customer_amami", "tenant_amamihome"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      conversation: [
        {
          role: "customer",
          content: "モデルホームを見学したいです",
          created_at: "2026-06-13T00:01:00.000Z"
        },
        {
          role: "staff",
          content: "候補日を確認します",
          created_at: "2026-06-13T00:02:00.000Z"
        }
      ]
    });
    expect(JSON.stringify(provider.calls[0])).not.toContain("他tenantの会話を混ぜない");
    expect(JSON.stringify(provider.calls[0])).not.toContain("別customerの会話を混ぜない");
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      draft_body: expect.stringContaining("お問い合わせありがとうございます"),
      next_questions: expect.arrayContaining([expect.any(String)]),
      risk_flags: expect.arrayContaining([expect.any(String)]),
      recommended_response_mode: "human_required",
      should_handoff: true,
      provider: "mock"
    });
    expect(messageRepository.list()).toHaveLength(messageCountBefore);
  });

  it("returns an error and does not save messages when the provider fails", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const provider = new FailingAiProvider();
    const app = createTestApp({
      customerRepository,
      messageRepository,
      aiProvider: provider
    });

    await customerRepository.save(
      makeCustomer({ id: "customer_amami", tenantId: "tenant_amamihome" })
    );
    await messageRepository.insert(
      makeMessage({
        id: "message_customer",
        tenantId: "tenant_amamihome",
        customerId: "customer_amami",
        body: "相談内容です",
        role: "customer",
        createdAt: "2026-06-13T00:01:00.000Z"
      })
    );
    const messageCountBefore = messageRepository.list().length;

    const response = await app.fetch(aiReplyDraftRequest("customer_amami", "tenant_amamihome"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "ai_reply_draft_failed" });
    expect(provider.calls).toHaveLength(1);
    expect(messageRepository.list()).toHaveLength(messageCountBefore);
  });
});

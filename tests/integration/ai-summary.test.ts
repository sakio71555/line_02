import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  MockAiProvider,
  type AiProvider,
  type AiReplyDraft,
  type AiReplyDraftInput,
  type AiSummaryInput
} from "@amami-line-crm/ai";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type Customer,
  type Message
} from "@amami-line-crm/domain";

class RecordingMockAiProvider extends MockAiProvider {
  readonly calls: AiSummaryInput[] = [];

  override async summarizeConversation(input: AiSummaryInput) {
    this.calls.push(input);
    return super.summarizeConversation(input);
  }
}

class FailingAiProvider implements AiProvider {
  readonly calls: AiSummaryInput[] = [];

  async summarizeConversation(input: AiSummaryInput): Promise<never> {
    this.calls.push(input);
    throw new Error("Mock AI summary failure.");
  }

  async draftReply(_input: AiReplyDraftInput): Promise<AiReplyDraft> {
    throw new Error("draftReply is not used by AI summary.");
  }
}

function createTestApp(input: {
  tenantId?: string;
  tenantSlug?: string;
  customerRepository: InMemoryCustomerRepository;
  messageRepository: InMemoryMessageRepository;
  aiProvider?: AiProvider;
  now?: () => string;
}) {
  return createApiApp({
    customerRepository: input.customerRepository,
    messageRepository: input.messageRepository,
    ...(input.aiProvider ? { aiProvider: input.aiProvider } : {}),
    ...(input.now ? { now: input.now } : {}),
    env: {
      TENANT_ID: input.tenantId ?? "tenant_amamihome",
      TENANT_SLUG: input.tenantSlug ?? "amamihome"
    }
  });
}

function makeCustomer(input: {
  id: string;
  tenantId: string;
  lineUserId?: string | null;
}): Customer {
  return {
    id: input.id,
    tenant_id: input.tenantId,
    line_user_id: input.lineUserId ?? "U_TEST_USER_001",
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

function aiSummaryRequest(customerId: string, tenantId?: string): Request {
  const headers: HeadersInit = {};

  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  return new Request(`http://localhost/api/admin/customers/${customerId}/ai-summary`, {
    method: "POST",
    headers
  });
}

describe("admin AI summary API", () => {
  it("returns 401/403 before summarizing a customer timeline", async () => {
    const provider = new RecordingMockAiProvider();
    const app = createTestApp({
      customerRepository: new InMemoryCustomerRepository(),
      messageRepository: new InMemoryMessageRepository(),
      aiProvider: provider
    });

    const missingTenantResponse = await app.fetch(aiSummaryRequest("customer_001"));
    const unknownTenantResponse = await app.fetch(
      aiSummaryRequest("customer_001", "tenant_unknown")
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
      aiSummaryRequest("customer_missing", "tenant_amamihome")
    );
    const otherTenantResponse = await app.fetch(
      aiSummaryRequest("customer_other", "tenant_amamihome")
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

  it("returns 409 when the customer timeline has no messages", async () => {
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

    const response = await app.fetch(aiSummaryRequest("customer_amami", "tenant_amamihome"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "cannot_summarize_empty_timeline"
    });
    expect(provider.calls).toHaveLength(0);
  });

  it("summarizes only the tenant-scoped customer timeline and saves an AI summary message", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const provider = new RecordingMockAiProvider();
    const app = createTestApp({
      customerRepository,
      messageRepository,
      aiProvider: provider,
      now: () => "2026-06-13T00:10:00.000Z"
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

    const response = await app.fetch(aiSummaryRequest("customer_amami", "tenant_amamihome"));
    const body = await response.json();
    const savedSummaryMessage = messageRepository
      .list()
      .find((message) => message.role === "ai" && message.message_type === "summary");
    const timelineResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_amami/timeline", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const timelineBody = await timelineResponse.json();

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
      summary: {
        provider: "mock",
        recommended_response_mode: "human_required"
      },
      message: {
        tenant_id: "tenant_amamihome",
        customer_id: "customer_amami",
        role: "ai",
        message_type: "summary",
        line_message_id: null,
        source_url: null,
        created_at: "2026-06-13T00:10:00.000Z"
      }
    });
    expect(body.summary).toMatchObject({
      summary: expect.stringContaining("候補日を確認します"),
      next_actions: expect.arrayContaining([expect.any(String)]),
      risk_flags: expect.arrayContaining([expect.any(String)])
    });
    expect(savedSummaryMessage).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      role: "ai",
      message_type: "summary",
      ai_generated: true,
      created_at: "2026-06-13T00:10:00.000Z"
    });
    expect(savedSummaryMessage?.body).toEqual(JSON.stringify(body.summary));
    expect(timelineResponse.status).toBe(200);
    expect(timelineBody.messages.at(-1)).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_amami",
      role: "ai",
      message_type: "summary",
      body: JSON.stringify(body.summary)
    });
  });

  it("does not save an AI summary message when the provider fails", async () => {
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

    const response = await app.fetch(aiSummaryRequest("customer_amami", "tenant_amamihome"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "ai_summary_failed" });
    expect(provider.calls).toHaveLength(1);
    expect(messageRepository.list()).not.toEqual([
      expect.objectContaining({ role: "ai", message_type: "summary" })
    ]);
  });
});

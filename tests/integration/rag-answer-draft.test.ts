import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  MockAiProvider,
  type AiProvider,
  type AiRagAnswerDraftInput,
  type AiReplyDraft,
  type AiReplyDraftInput,
  type AiSummary,
  type AiSummaryInput
} from "@amami-line-crm/ai";
import { InMemoryMessageRepository } from "@amami-line-crm/domain";
import { MockLineClient } from "@amami-line-crm/line";
import {
  createAmamiHomeKnowledgePages,
  InMemoryKnowledgePageRepository,
  type KnowledgePage
} from "@amami-line-crm/rag";

class RecordingMockAiProvider extends MockAiProvider {
  readonly ragAnswerCalls: AiRagAnswerDraftInput[] = [];

  override async draftRagAnswer(input: AiRagAnswerDraftInput) {
    this.ragAnswerCalls.push(input);
    return super.draftRagAnswer(input);
  }
}

class FailingAiProvider implements AiProvider {
  readonly ragAnswerCalls: AiRagAnswerDraftInput[] = [];

  async summarizeConversation(_input: AiSummaryInput): Promise<AiSummary> {
    throw new Error("summarizeConversation is not used by RAG answer draft.");
  }

  async draftReply(_input: AiReplyDraftInput): Promise<AiReplyDraft> {
    throw new Error("draftReply is not used by RAG answer draft.");
  }

  async draftRagAnswer(input: AiRagAnswerDraftInput): Promise<never> {
    this.ragAnswerCalls.push(input);
    throw new Error("Mock RAG answer draft failure.");
  }
}

function createKnowledgeRepository(): InMemoryKnowledgePageRepository {
  return new InMemoryKnowledgePageRepository([
    ...createAmamiHomeKnowledgePages(),
    {
      id: "knowledge_other_online",
      tenant_id: "tenant_other",
      title: "他社オンライン相談",
      url: "https://example.com/online",
      category: "相談",
      source_type: "official_site",
      content: "他社のオンライン相談情報です。",
      allowed_for_ai: true,
      last_crawled_at: null
    },
    {
      id: "knowledge_other_maintenance",
      tenant_id: "tenant_other",
      title: "他社メンテナンス",
      url: "https://example.com/maintenance",
      category: "保証・メンテナンス",
      source_type: "faq",
      content: "他社の保証とメンテナンス情報です。",
      allowed_for_ai: true,
      last_crawled_at: null
    },
    {
      id: "knowledge_hidden_maintenance",
      tenant_id: "tenant_amamihome",
      title: "非公開 メンテナンス",
      url: "https://amamihome.net/private-maintenance/",
      category: "internal",
      source_type: "manual",
      content: "非公開のメンテナンス内部メモです。",
      allowed_for_ai: false,
      last_crawled_at: null
    }
  ] satisfies KnowledgePage[]);
}

function createTestApp(input: {
  tenantId?: string;
  tenantSlug?: string;
  aiProvider?: AiProvider;
  messageRepository?: InMemoryMessageRepository;
  lineClient?: MockLineClient;
  knowledgePageRepository?: InMemoryKnowledgePageRepository;
}) {
  return createApiApp({
    knowledgePageRepository: input.knowledgePageRepository ?? createKnowledgeRepository(),
    ...(input.aiProvider ? { aiProvider: input.aiProvider } : {}),
    ...(input.messageRepository ? { messageRepository: input.messageRepository } : {}),
    ...(input.lineClient ? { lineClient: input.lineClient } : {}),
    env: {
      TENANT_ID: input.tenantId ?? "tenant_amamihome",
      TENANT_SLUG: input.tenantSlug ?? "amamihome"
    }
  });
}

function answerDraftRequest(input: {
  tenantId?: string;
  body?: unknown;
}): Request {
  const headers: HeadersInit = {
    "content-type": "application/json"
  };

  if (input.tenantId) {
    headers["x-tenant-id"] = input.tenantId;
  }

  return new Request("http://localhost/api/admin/rag/answer-draft", {
    method: "POST",
    headers,
    body: JSON.stringify(input.body ?? {})
  });
}

describe("admin RAG answer draft API", () => {
  it("returns 401/403 before drafting from knowledge", async () => {
    const provider = new RecordingMockAiProvider();
    const app = createTestApp({ aiProvider: provider });

    const missingTenantResponse = await app.fetch(
      answerDraftRequest({ body: { query: "オンライン相談" } })
    );
    const unknownTenantResponse = await app.fetch(
      answerDraftRequest({ tenantId: "tenant_unknown", body: { query: "オンライン相談" } })
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
    expect(provider.ragAnswerCalls).toHaveLength(0);
  });

  it("returns 400 for invalid query or limit", async () => {
    const app = createTestApp({ aiProvider: new RecordingMockAiProvider() });

    for (const body of [
      {},
      { query: "" },
      { query: "   " },
      { query: 123 },
      { query: "オンライン相談", limit: 0 },
      { query: "オンライン相談", limit: -1 },
      { query: "オンライン相談", limit: 11 },
      { query: "オンライン相談", limit: "5" }
    ]) {
      const response = await app.fetch(
        answerDraftRequest({ tenantId: "tenant_amamihome", body })
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        ok: false,
        error: "invalid_rag_answer_draft_request"
      });
    }
  });

  it("returns RAG answer drafts with expected Amami Home sources", async () => {
    const provider = new RecordingMockAiProvider();
    const app = createTestApp({ aiProvider: provider });

    for (const [query, expectedSourceId] of [
      ["オンライン相談", "knowledge_amamihome_online_consultation"],
      ["施工事例", "knowledge_amamihome_construction_cases"],
      ["資料請求", "knowledge_amamihome_document_request"],
      ["メンテナンス", "knowledge_amamihome_warranty_maintenance"]
    ] as const) {
      const response = await app.fetch(
        answerDraftRequest({ tenantId: "tenant_amamihome", body: { query } })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        tenant_id: "tenant_amamihome",
        query,
        can_answer: true,
        answer_body: expect.stringContaining("担当者"),
        risk_flags: expect.arrayContaining([expect.any(String)]),
        handoff_required: true,
        recommended_response_mode: "human_required",
        provider: "mock"
      });
      expect(body.sources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expectedSourceId,
            title: expect.any(String),
            url: expect.any(String),
            category: expect.any(String),
            source_type: expect.any(String),
            excerpt: expect.any(String),
            score: expect.any(Number)
          })
        ])
      );
    }

    expect(provider.ragAnswerCalls).toHaveLength(4);
    expect(provider.ragAnswerCalls.every((call) => call.tenant_id === "tenant_amamihome")).toBe(
      true
    );
  });

  it("returns a no-source fallback without calling the AI provider", async () => {
    const provider = new RecordingMockAiProvider();
    const app = createTestApp({ aiProvider: provider });

    const response = await app.fetch(
      answerDraftRequest({ tenantId: "tenant_amamihome", body: { query: "該当なし" } })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      tenant_id: "tenant_amamihome",
      query: "該当なし",
      can_answer: false,
      answer_body: "公式情報では確認できません。担当者が確認します。",
      sources: [],
      risk_flags: ["no_source"],
      handoff_required: true,
      recommended_response_mode: "human_required"
    });
    expect(provider.ragAnswerCalls).toHaveLength(0);
  });

  it("keeps answer sources tenant-scoped in both directions", async () => {
    const repository = createKnowledgeRepository();
    const amamiProvider = new RecordingMockAiProvider();
    const otherProvider = new RecordingMockAiProvider();
    const amamiApp = createTestApp({
      knowledgePageRepository: repository,
      aiProvider: amamiProvider
    });
    const otherApp = createTestApp({
      tenantId: "tenant_other",
      tenantSlug: "other",
      knowledgePageRepository: repository,
      aiProvider: otherProvider
    });

    const amamiResponse = await amamiApp.fetch(
      answerDraftRequest({ tenantId: "tenant_amamihome", body: { query: "オンライン相談" } })
    );
    const otherResponse = await otherApp.fetch(
      answerDraftRequest({ tenantId: "tenant_other", body: { query: "オンライン相談" } })
    );
    const amamiBody = await amamiResponse.json();
    const otherBody = await otherResponse.json();

    expect(amamiResponse.status).toBe(200);
    expect(otherResponse.status).toBe(200);
    expect(amamiBody.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "knowledge_amamihome_online_consultation" })
      ])
    );
    expect(otherBody.sources).toEqual([
      expect.objectContaining({ id: "knowledge_other_online" })
    ]);
    expect(JSON.stringify(amamiBody.sources)).not.toContain("knowledge_other");
    expect(JSON.stringify(otherBody.sources)).not.toContain("knowledge_amamihome");
    expect(amamiProvider.ragAnswerCalls[0]?.sources.map((source) => source.id)).not.toContain(
      "knowledge_other_online"
    );
    expect(otherProvider.ragAnswerCalls[0]?.sources.map((source) => source.id)).not.toContain(
      "knowledge_amamihome_online_consultation"
    );
  });

  it("does not include allowed_for_ai=false knowledge as an answer source", async () => {
    const provider = new RecordingMockAiProvider();
    const app = createTestApp({ aiProvider: provider });

    const response = await app.fetch(
      answerDraftRequest({ tenantId: "tenant_amamihome", body: { query: "非公開 メンテナンス" } })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body.sources)).not.toContain("knowledge_hidden_maintenance");
    expect(provider.ragAnswerCalls[0]?.sources.map((source) => source.id)).not.toContain(
      "knowledge_hidden_maintenance"
    );
  });

  it("does not save messages or send LINE messages on success or provider failure", async () => {
    const successMessageRepository = new InMemoryMessageRepository();
    const successLineClient = new MockLineClient();
    const successApp = createTestApp({
      aiProvider: new RecordingMockAiProvider(),
      messageRepository: successMessageRepository,
      lineClient: successLineClient
    });
    const failingMessageRepository = new InMemoryMessageRepository();
    const failingLineClient = new MockLineClient();
    const failingProvider = new FailingAiProvider();
    const failingApp = createTestApp({
      aiProvider: failingProvider,
      messageRepository: failingMessageRepository,
      lineClient: failingLineClient
    });

    const successResponse = await successApp.fetch(
      answerDraftRequest({ tenantId: "tenant_amamihome", body: { query: "資料請求" } })
    );
    const failingResponse = await failingApp.fetch(
      answerDraftRequest({ tenantId: "tenant_amamihome", body: { query: "資料請求" } })
    );

    expect(successResponse.status).toBe(200);
    expect(successMessageRepository.list()).toHaveLength(0);
    expect(successLineClient.pushes).toHaveLength(0);
    expect(successLineClient.replies).toHaveLength(0);
    expect(failingResponse.status).toBe(502);
    expect(await failingResponse.json()).toEqual({ ok: false, error: "rag_answer_draft_failed" });
    expect(failingProvider.ragAnswerCalls).toHaveLength(1);
    expect(failingMessageRepository.list()).toHaveLength(0);
    expect(failingLineClient.pushes).toHaveLength(0);
    expect(failingLineClient.replies).toHaveLength(0);
  });
});

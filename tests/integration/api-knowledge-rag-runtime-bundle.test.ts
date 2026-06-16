import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import { MockAiProvider, type AiRagAnswerDraftInput } from "@amami-line-crm/ai";
import {
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository
} from "@amami-line-crm/domain";
import {
  InMemoryKnowledgePageRepository,
  type KnowledgePage
} from "@amami-line-crm/rag";

const tenantId = "tenant_amamihome";
const otherTenantId = "tenant_other";
const now = "2026-06-17T00:00:00.000Z";

class RecordingMockAiProvider extends MockAiProvider {
  readonly ragAnswerCalls: AiRagAnswerDraftInput[] = [];

  override async draftRagAnswer(input: AiRagAnswerDraftInput) {
    this.ragAnswerCalls.push(input);
    return super.draftRagAnswer(input);
  }
}

describe("API knowledge/RAG runtime bundle", () => {
  it("uses the injected runtime bundle knowledge repository for RAG search and answer draft", async () => {
    const aiProvider = new RecordingMockAiProvider();
    const app = createApiApp({
      customerMessageRepositories: {
        runtime_mode: "supabase",
        customerRepository: new InMemoryCustomerRepository(),
        messageRepository: new InMemoryMessageRepository(),
        alertRepository: new InMemoryAlertRepository(),
        knowledgePageRepository: createBundleKnowledgeRepository()
      },
      aiProvider,
      env: createApiEnv()
    });

    const searchResponse = await app.fetch(
      adminJsonRequest("/api/admin/rag/search", {
        query: "オンライン相談",
        limit: 5
      })
    );
    const searchBody = (await searchResponse.json()) as {
      results: Array<{ id: string; tenant_id: string; url: string; source_url?: string }>;
    };

    expect(searchResponse.status).toBe(200);
    expect(searchBody.results).toEqual([
      expect.objectContaining({
        id: "knowledge_bundle_online",
        tenant_id: tenantId,
        url: "https://example.invalid/amamihome/online"
      })
    ]);
    expect(searchBody.results[0]).not.toHaveProperty("source_url");
    expect(searchBody.results.some((result) => result.id === "knowledge_bundle_hidden")).toBe(
      false
    );
    expect(searchBody.results.some((result) => result.tenant_id === otherTenantId)).toBe(false);

    const answerResponse = await app.fetch(
      adminJsonRequest("/api/admin/rag/answer-draft", {
        query: "オンライン相談",
        limit: 5
      })
    );
    const answerBody = (await answerResponse.json()) as {
      provider: string;
      sources: Array<{ id: string; tenant_id?: string; url: string; source_url?: string }>;
    };

    expect(answerResponse.status).toBe(200);
    expect(answerBody.provider).toBe("mock");
    expect(answerBody.sources).toEqual([
      expect.objectContaining({
        id: "knowledge_bundle_online",
        url: "https://example.invalid/amamihome/online"
      })
    ]);
    expect(answerBody.sources[0]).not.toHaveProperty("source_url");
    expect(aiProvider.ragAnswerCalls).toHaveLength(1);
    expect(aiProvider.ragAnswerCalls[0]).toMatchObject({
      tenant_id: tenantId,
      query: "オンライン相談",
      sources: [
        expect.objectContaining({
          id: "knowledge_bundle_online",
          url: "https://example.invalid/amamihome/online"
        })
      ]
    });
  });

  it("keeps explicit knowledgePageRepository injection higher priority than the runtime bundle", async () => {
    const app = createApiApp({
      knowledgePageRepository: new InMemoryKnowledgePageRepository([
        createKnowledgePage({
          id: "knowledge_explicit_priority",
          title: "優先検索",
          content: "明示注入されたknowledge repositoryの優先確認です。"
        })
      ]),
      customerMessageRepositories: {
        runtime_mode: "supabase",
        customerRepository: new InMemoryCustomerRepository(),
        messageRepository: new InMemoryMessageRepository(),
        alertRepository: new InMemoryAlertRepository(),
        knowledgePageRepository: new InMemoryKnowledgePageRepository([
          createKnowledgePage({
            id: "knowledge_bundle_priority",
            title: "優先検索",
            content: "bundle側のknowledge repositoryです。"
          })
        ])
      },
      env: createApiEnv()
    });

    const response = await app.fetch(
      adminJsonRequest("/api/admin/rag/search", {
        query: "優先検索",
        limit: 5
      })
    );
    const body = (await response.json()) as { results: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.results.map((result) => result.id)).toEqual(["knowledge_explicit_priority"]);
  });
});

function createApiEnv(): NodeJS.ProcessEnv {
  return {
    TENANT_ID: tenantId,
    TENANT_SLUG: "amamihome",
    LINE_REAL_PUSH_ENABLED: "false",
    AI_PROVIDER: "mock"
  };
}

function adminJsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": tenantId
    },
    body: JSON.stringify(body)
  });
}

function createBundleKnowledgeRepository(): InMemoryKnowledgePageRepository {
  return new InMemoryKnowledgePageRepository([
    createKnowledgePage({
      id: "knowledge_bundle_online",
      title: "オンライン相談",
      url: "https://example.invalid/amamihome/online",
      content: "オンライン相談は家づくりの進め方を担当者と確認するdummy knowledgeです。"
    }),
    createKnowledgePage({
      id: "knowledge_bundle_hidden",
      title: "非公開 オンライン相談",
      url: "https://example.invalid/amamihome/private-online",
      content: "allowed_for_ai=false のためRAGには使わないdummy knowledgeです。",
      allowed_for_ai: false
    }),
    createKnowledgePage({
      id: "knowledge_bundle_other_tenant",
      tenant_id: otherTenantId,
      title: "他tenantオンライン相談",
      url: "https://example.invalid/other/online",
      content: "他tenantのオンライン相談dummy knowledgeです。"
    })
  ]);
}

function createKnowledgePage(overrides: Partial<KnowledgePage> = {}): KnowledgePage {
  return {
    id: "knowledge_bundle_1",
    tenant_id: tenantId,
    title: "オンライン相談",
    url: "https://example.invalid/amamihome/knowledge",
    category: "相談",
    source_type: "official_site",
    content: "オンライン相談のdummy knowledgeです。",
    allowed_for_ai: true,
    last_crawled_at: now,
    ...overrides
  };
}

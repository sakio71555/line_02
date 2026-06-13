import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  InMemoryKnowledgePageRepository,
  type KnowledgePage
} from "@amami-line-crm/rag";

function createTestApp(input: {
  tenantId?: string;
  tenantSlug?: string;
  repository: InMemoryKnowledgePageRepository;
}) {
  return createApiApp({
    knowledgePageRepository: input.repository,
    env: {
      TENANT_ID: input.tenantId ?? "tenant_amamihome",
      TENANT_SLUG: input.tenantSlug ?? "amamihome"
    }
  });
}

function ragSearchRequest(input: {
  tenantId?: string;
  body?: unknown;
}): Request {
  const headers: HeadersInit = {
    "content-type": "application/json"
  };

  if (input.tenantId) {
    headers["x-tenant-id"] = input.tenantId;
  }

  return new Request("http://localhost/api/admin/rag/search", {
    method: "POST",
    headers,
    body: JSON.stringify(input.body ?? {})
  });
}

function createRepository(): InMemoryKnowledgePageRepository {
  return new InMemoryKnowledgePageRepository([
    {
      id: "knowledge_online",
      tenant_id: "tenant_amamihome",
      title: "オンライン相談",
      url: "https://amamihome.net/online",
      category: "相談",
      source_type: "official_site",
      content: "オンライン相談では、リモートで家づくりの進め方やモデルホーム見学前の相談ができます。",
      allowed_for_ai: true,
      last_crawled_at: "2026-06-13T00:00:00.000Z"
    },
    {
      id: "knowledge_case_hiraya",
      tenant_id: "tenant_amamihome",
      title: "施工事例 平屋",
      url: "https://amamihome.net/cases/hiraya",
      category: "施工事例",
      source_type: "official_site",
      content: "平屋の施工事例では、家事動線と暮らしやすさを重視した住まいを紹介します。",
      allowed_for_ai: true,
      last_crawled_at: "2026-06-13T00:01:00.000Z"
    },
    {
      id: "knowledge_request",
      tenant_id: "tenant_amamihome",
      title: "資料請求",
      url: "https://amamihome.net/request",
      category: "相談",
      source_type: "official_site",
      content: "資料請求やオンラインでの相談予約を受け付けています。",
      allowed_for_ai: true,
      last_crawled_at: "2026-06-13T00:02:00.000Z"
    },
    {
      id: "knowledge_maintenance",
      tenant_id: "tenant_amamihome",
      title: "保証・メンテナンス",
      url: "https://amamihome.net/support",
      category: "アフターサポート",
      source_type: "faq",
      content: "保証と定期メンテナンスは担当者が内容を確認して案内します。",
      allowed_for_ai: true,
      last_crawled_at: "2026-06-13T00:03:00.000Z"
    },
    {
      id: "knowledge_hidden",
      tenant_id: "tenant_amamihome",
      title: "未公開 メンテナンス",
      url: "https://amamihome.net/private",
      category: "internal",
      source_type: "manual",
      content: "未公開の内部メモです。",
      allowed_for_ai: false,
      last_crawled_at: "2026-06-13T00:04:00.000Z"
    },
    {
      id: "knowledge_other_case",
      tenant_id: "tenant_other",
      title: "他社の施工事例",
      url: "https://example.com/cases",
      category: "施工事例",
      source_type: "official_site",
      content: "他社の平屋施工事例です。",
      allowed_for_ai: true,
      last_crawled_at: "2026-06-13T00:05:00.000Z"
    },
    {
      id: "knowledge_other_support",
      tenant_id: "tenant_other",
      title: "他社の保証情報",
      url: "https://example.com/support",
      category: "保証",
      source_type: "faq",
      content: "他社の保証とメンテナンス情報です。",
      allowed_for_ai: true,
      last_crawled_at: "2026-06-13T00:06:00.000Z"
    }
  ] satisfies KnowledgePage[]);
}

describe("admin RAG search API", () => {
  it("returns 401/403 before searching knowledge", async () => {
    const app = createTestApp({ repository: createRepository() });

    const missingTenantResponse = await app.fetch(
      ragSearchRequest({ body: { query: "平屋" } })
    );
    const unknownTenantResponse = await app.fetch(
      ragSearchRequest({ tenantId: "tenant_unknown", body: { query: "平屋" } })
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
  });

  it("returns 400 for invalid query or limit", async () => {
    const app = createTestApp({ repository: createRepository() });

    for (const body of [
      {},
      { query: "" },
      { query: "   " },
      { query: 123 },
      { query: "平屋", limit: 0 },
      { query: "平屋", limit: -1 },
      { query: "平屋", limit: 11 },
      { query: "平屋", limit: "5" }
    ]) {
      const response = await app.fetch(
        ragSearchRequest({ tenantId: "tenant_amamihome", body })
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        ok: false,
        error: "invalid_rag_search_request"
      });
    }
  });

  it("searches title/content and returns scored tenant-scoped results", async () => {
    const app = createTestApp({ repository: createRepository() });

    const titleResponse = await app.fetch(
      ragSearchRequest({ tenantId: "tenant_amamihome", body: { query: "平屋" } })
    );
    const contentResponse = await app.fetch(
      ragSearchRequest({ tenantId: "tenant_amamihome", body: { query: "リモート" } })
    );
    const titleBody = await titleResponse.json();
    const contentBody = await contentResponse.json();

    expect(titleResponse.status).toBe(200);
    expect(titleBody).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      query: "平屋",
      limit: 5
    });
    expect(titleBody.results[0]).toMatchObject({
      id: "knowledge_case_hiraya",
      tenant_id: "tenant_amamihome",
      title: "施工事例 平屋",
      url: "https://amamihome.net/cases/hiraya",
      category: "施工事例",
      source_type: "official_site",
      excerpt: expect.stringContaining("平屋"),
      score: expect.any(Number),
      last_crawled_at: "2026-06-13T00:01:00.000Z"
    });
    expect(contentResponse.status).toBe(200);
    expect(contentBody.results).toEqual([
      expect.objectContaining({
        id: "knowledge_online",
        tenant_id: "tenant_amamihome",
        excerpt: expect.stringContaining("リモート")
      })
    ]);
  });

  it("sorts by score, applies limit, and returns [] for no match or disallowed pages", async () => {
    const app = createTestApp({ repository: createRepository() });

    const scoredResponse = await app.fetch(
      ragSearchRequest({
        tenantId: "tenant_amamihome",
        body: { query: "オンライン 相談", limit: 2 }
      })
    );
    const noMatchResponse = await app.fetch(
      ragSearchRequest({ tenantId: "tenant_amamihome", body: { query: "該当なし" } })
    );
    const hiddenResponse = await app.fetch(
      ragSearchRequest({ tenantId: "tenant_amamihome", body: { query: "未公開" } })
    );
    const scoredBody = await scoredResponse.json();

    expect(scoredResponse.status).toBe(200);
    expect(scoredBody.results).toHaveLength(2);
    expect(scoredBody.results[0].id).toBe("knowledge_online");
    expect(scoredBody.results[0].score).toBeGreaterThanOrEqual(scoredBody.results[1].score);
    expect(noMatchResponse.status).toBe(200);
    expect(await noMatchResponse.json()).toMatchObject({ results: [] });
    expect(hiddenResponse.status).toBe(200);
    expect(await hiddenResponse.json()).toMatchObject({ results: [] });
  });

  it("does not mix knowledge across tenants in either direction", async () => {
    const repository = createRepository();
    const amamiApp = createTestApp({ repository });
    const otherApp = createTestApp({
      tenantId: "tenant_other",
      tenantSlug: "other",
      repository
    });

    const amamiResponse = await amamiApp.fetch(
      ragSearchRequest({ tenantId: "tenant_amamihome", body: { query: "保証 メンテナンス" } })
    );
    const otherResponse = await otherApp.fetch(
      ragSearchRequest({ tenantId: "tenant_other", body: { query: "保証 メンテナンス" } })
    );
    const amamiBody = await amamiResponse.json();
    const otherBody = await otherResponse.json();

    expect(amamiResponse.status).toBe(200);
    expect(otherResponse.status).toBe(200);
    expect(amamiBody.results).toEqual([
      expect.objectContaining({
        id: "knowledge_maintenance",
        tenant_id: "tenant_amamihome",
        title: "保証・メンテナンス"
      })
    ]);
    expect(otherBody.results).toEqual([
      expect.objectContaining({
        id: "knowledge_other_support",
        tenant_id: "tenant_other",
        title: "他社の保証情報"
      })
    ]);
    expect(JSON.stringify(amamiBody.results)).not.toContain("他社");
    expect(JSON.stringify(otherBody.results)).not.toContain("アマミホーム");
  });
});

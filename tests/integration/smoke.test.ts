import { describe, expect, it } from "vitest";

import { createMockAiProvider } from "@amami-line-crm/ai";
import { initialTenant } from "@amami-line-crm/domain";
import { InMemoryKnowledgeSearchRepository } from "@amami-line-crm/rag";

describe("Phase 0 scaffold", () => {
  it("uses mock AI without external API calls", async () => {
    const ai = createMockAiProvider();
    const draft = await ai.draftReply({
      tenant_id: initialTenant.id,
      customer_id: "customer_1",
      conversation: [
        {
          role: "customer",
          content: "モデルホームの予約をしたいです",
          created_at: "2026-06-13T00:00:00.000Z"
        }
      ]
    });

    expect(draft.provider).toBe("mock");
    expect(draft.should_handoff).toBe(true);
  });

  it("filters RAG knowledge by tenant_id before returning pages", async () => {
    const repository = new InMemoryKnowledgeSearchRepository([
      {
        id: "page_1",
        tenant_id: initialTenant.id,
        url: "https://amamihome.net/example",
        title: "モデルホーム",
        category: "相談",
        source_type: "official_site",
        content: "オンライン相談とモデルホーム予約",
        allowed_for_ai: true
      },
      {
        id: "page_other",
        tenant_id: "tenant_other",
        url: "https://example.com",
        title: "モデルホーム",
        category: "相談",
        source_type: "official_site",
        content: "他社の情報",
        allowed_for_ai: true
      }
    ]);

    const pages = await repository.searchTenantKnowledge({
      tenant_id: initialTenant.id,
      query: "モデルホーム",
      limit: 10
    });

    expect(pages).toHaveLength(1);
    expect(pages[0]?.tenant_id).toBe(initialTenant.id);
  });
});

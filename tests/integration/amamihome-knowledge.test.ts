import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  AMAMI_HOME_TENANT_ID,
  createAmamiHomeKnowledgePages,
  InMemoryKnowledgePageRepository,
  searchTenantKnowledge,
  seedAmamiHomeKnowledge,
  type KnowledgePage
} from "@amami-line-crm/rag";

const seedSql = readFileSync(
  new URL("../../packages/db/seed/tenant_amamihome_knowledge.sql", import.meta.url),
  "utf8"
);

function createSeededRepository(extraPages: KnowledgePage[] = []): InMemoryKnowledgePageRepository {
  const repository = new InMemoryKnowledgePageRepository(extraPages);
  seedAmamiHomeKnowledge(repository);
  return repository;
}

async function search(
  repository: InMemoryKnowledgePageRepository,
  query: string,
  tenantId = AMAMI_HOME_TENANT_ID
) {
  return searchTenantKnowledge({
    tenant_id: tenantId,
    query,
    limit: 10,
    repository
  });
}

describe("Amami Home static knowledge seed", () => {
  it("provides tenant-scoped AI-allowed fixture items with required fields", () => {
    const pages = createAmamiHomeKnowledgePages();

    expect(pages.map((page) => page.id).sort()).toEqual([
      "knowledge_amamihome_after_support",
      "knowledge_amamihome_construction_cases",
      "knowledge_amamihome_contact_visit",
      "knowledge_amamihome_document_request",
      "knowledge_amamihome_land_and_ready_built",
      "knowledge_amamihome_online_consultation",
      "knowledge_amamihome_owner_interviews",
      "knowledge_amamihome_sotono_ma",
      "knowledge_amamihome_top",
      "knowledge_amamihome_warranty_maintenance"
    ]);

    for (const page of pages) {
      expect(page.tenant_id).toBe(AMAMI_HOME_TENANT_ID);
      expect(page.allowed_for_ai).toBe(true);
      expect(page.title).toBeTruthy();
      expect(page.url).toMatch(/^https:\/\/amamihome\.net\//);
      expect(page.category).toBeTruthy();
      expect(page.source_type).toBeTruthy();
      expect(page.content).toBeTruthy();
      expect("last_crawled_at" in page).toBe(true);
    }
  });

  it("keeps SQL seed tenant-scoped, AI-allowed, and free of secrets", () => {
    expect(seedSql).toContain("tenant_amamihome");
    expect(seedSql).toMatch(/\ballowed_for_ai\b/i);
    expect(seedSql).toMatch(/\ballowed_for_ai = true\b/i);
    expect(seedSql).toMatch(/on conflict \(id\) do update/i);
    expect(seedSql).not.toMatch(
      /OPENAI_API_KEY|LINE_CHANNEL_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY|service_role|sk-[A-Za-z0-9_-]+|password|private_key/i
    );
  });

  it("finds Amami Home knowledge by expected queries", async () => {
    const repository = createSeededRepository();

    await expect(search(repository, "オンライン相談")).resolves.toEqual([
      expect.objectContaining({ id: "knowledge_amamihome_online_consultation" })
    ]);
    await expect(search(repository, "施工事例")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "knowledge_amamihome_construction_cases" })
      ])
    );
    await expect(search(repository, "資料請求")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "knowledge_amamihome_document_request" })
      ])
    );
    await expect(search(repository, "メンテナンス")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "knowledge_amamihome_warranty_maintenance" })
      ])
    );
    await expect(search(repository, "SoToNo MA")).resolves.toEqual([
      expect.objectContaining({ id: "knowledge_amamihome_sotono_ma" })
    ]);
  });

  it("does not return Amami Home knowledge for another tenant", async () => {
    const repository = createSeededRepository();

    await expect(search(repository, "オンライン相談", "tenant_other")).resolves.toEqual([]);
  });

  it("preserves the allowed_for_ai=false filter after seeding", async () => {
    const repository = createSeededRepository([
      {
        id: "knowledge_hidden_maintenance",
        tenant_id: AMAMI_HOME_TENANT_ID,
        title: "非公開 メンテナンス",
        url: "https://amamihome.net/private-maintenance/",
        category: "internal",
        source_type: "manual",
        content: "非公開のメンテナンス内部メモです。",
        allowed_for_ai: false,
        last_crawled_at: null
      }
    ]);
    const results = await search(repository, "非公開 メンテナンス");

    expect(results.map((result) => result.id)).not.toContain("knowledge_hidden_maintenance");
    expect(results.every((result) => result.tenant_id === AMAMI_HOME_TENANT_ID)).toBe(true);
  });
});

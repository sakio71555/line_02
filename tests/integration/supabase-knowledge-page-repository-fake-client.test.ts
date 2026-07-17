import { afterEach, describe, expect, it, vi } from "vitest";
import type { KnowledgePage } from "@amami-line-crm/domain";
import type { KnowledgePageRepository } from "@amami-line-crm/rag";
import { searchTenantKnowledge } from "@amami-line-crm/rag";

import { SupabaseKnowledgePageRepository, SupabaseRepositoryError } from "@amami-line-crm/db";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";

const tenantId = "tenant_amamihome";
const otherTenantId = "tenant_other";
const now = "2026-06-16T00:00:00.000Z";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Supabase knowledge page repository fake-client hardening", () => {
  it("lists AI-allowed knowledge pages by tenant and maps source/content fields", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("knowledge_pages", "list", {
      data: [
        createKnowledgePage({
          id: "knowledge_z",
          title: "資料請求",
          url: "https://amamihome.net/request/",
          category: "資料請求",
          content: "資料請求の案内です。"
        }),
        createKnowledgePage({
          id: "knowledge_hidden",
          title: "非公開 保証情報",
          allowed_for_ai: false
        }),
        createKnowledgePage({
          id: "knowledge_other",
          tenant_id: otherTenantId,
          title: "他社の施工事例"
        }),
        createKnowledgePage({
          id: "knowledge_a",
          title: "オンライン相談",
          url: "https://amamihome.net/online-consultation/",
          category: "相談",
          content: "オンライン相談とモデルホーム見学の案内です。",
          checksum: null,
          last_crawled_at: null
        })
      ],
      error: null
    });
    const repository = new SupabaseKnowledgePageRepository(client.asRepositoryClient());

    const pages = await repository.listByTenant(tenantId);

    expect(pages.map((page) => page.id)).toEqual(["knowledge_a", "knowledge_z"]);
    expect(pages[0]).toEqual({
      id: "knowledge_a",
      tenant_id: tenantId,
      url: "https://amamihome.net/online-consultation/",
      category: "相談",
      source_type: "official_site",
      title: "オンライン相談",
      content: "オンライン相談とモデルホーム見学の案内です。",
      checksum: null,
      allowed_for_ai: true,
      last_crawled_at: null,
      created_at: now,
      updated_at: now
    });
  });

  it("adds tenant_id and allowed_for_ai=true filters with title ordering", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("knowledge_pages", "list", { data: [], error: null });
    const repository = new SupabaseKnowledgePageRepository(client.asRepositoryClient());

    await repository.listByTenant(tenantId);

    expect(client.operations).toContainEqual({
      table: "knowledge_pages",
      action: "select",
      columns: "*"
    });
    expect(client.operations).toContainEqual({
      table: "knowledge_pages",
      action: "eq",
      column: "tenant_id",
      value: tenantId
    });
    expect(client.operations).toContainEqual({
      table: "knowledge_pages",
      action: "eq",
      column: "allowed_for_ai",
      value: true
    });
    expect(client.operations).toContainEqual({
      table: "knowledge_pages",
      action: "order",
      column: "title",
      ascending: true
    });
  });

  it("upserts refreshed official-site knowledge without issuing a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const client = new FakeSupabaseClient();
    client.setResult("knowledge_pages", "list", { data: null, error: null });
    const repository = new SupabaseKnowledgePageRepository(client.asRepositoryClient());
    const page = createKnowledgePage({
      checksum: "refreshed_checksum",
      last_crawled_at: "2026-07-16T00:00:00.000Z",
      updated_at: "2026-07-16T00:00:00.000Z"
    });

    await repository.upsertMany([page]);

    const { created_at: _createdAt, ...expectedPayload } = page;

    expect(client.operations).toContainEqual({
      table: "knowledge_pages",
      action: "upsert",
      payload: [expectedPayload],
      options: { onConflict: "id" }
    });
    expect(
      client.operations.find(
        (operation) => operation.table === "knowledge_pages" && operation.action === "upsert"
      )
    ).not.toHaveProperty("payload.0.created_at");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("acquires, renews, and releases the shared refresh lease through sanitized RPC calls", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("rpc:try_acquire_runtime_lease", "list", {
      data: true,
      error: null
    });
    client.setResult("rpc:release_runtime_lease", "list", {
      data: true,
      error: null
    });
    client.setResult("rpc:renew_runtime_lease", "list", {
      data: true,
      error: null
    });
    const repository = new SupabaseKnowledgePageRepository(client.asRepositoryClient());
    const leaseInput = {
      tenant_id: tenantId,
      lease_key: "official_site_knowledge_refresh",
      holder_id: "api_instance_a",
      lease_ttl_seconds: 1_800
    };

    await expect(
      repository.tryAcquireOfficialSiteKnowledgeRefreshLease(leaseInput)
    ).resolves.toBe(true);
    await expect(
      repository.renewOfficialSiteKnowledgeRefreshLease(leaseInput)
    ).resolves.toBe(true);
    await expect(
      repository.releaseOfficialSiteKnowledgeRefreshLease({
        tenant_id: tenantId,
        lease_key: leaseInput.lease_key,
        holder_id: leaseInput.holder_id
      })
    ).resolves.toBeUndefined();

    expect(client.operations).toContainEqual({
      table: "rpc:try_acquire_runtime_lease",
      action: "rpc",
      payload: {
        p_tenant_id: tenantId,
        p_lease_key: leaseInput.lease_key,
        p_holder_id: leaseInput.holder_id,
        p_lease_ttl_seconds: leaseInput.lease_ttl_seconds
      }
    });
    expect(client.operations).toContainEqual({
      table: "rpc:renew_runtime_lease",
      action: "rpc",
      payload: {
        p_tenant_id: tenantId,
        p_lease_key: leaseInput.lease_key,
        p_holder_id: leaseInput.holder_id,
        p_lease_ttl_seconds: leaseInput.lease_ttl_seconds
      }
    });
    expect(client.operations).toContainEqual({
      table: "rpc:release_runtime_lease",
      action: "rpc",
      payload: {
        p_tenant_id: tenantId,
        p_lease_key: leaseInput.lease_key,
        p_holder_id: leaseInput.holder_id
      }
    });
  });

  it("keeps wrong tenant and disallowed rows out of RAG search results", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("knowledge_pages", "list", {
      data: [
        createKnowledgePage({
          id: "knowledge_warranty",
          title: "保証・メンテナンス",
          category: "保証",
          content: "保証やメンテナンスは担当者が契約内容を確認します。"
        }),
        createKnowledgePage({
          id: "knowledge_hidden_warranty",
          title: "非公開 保証",
          allowed_for_ai: false,
          content: "この保証情報はAIに使いません。"
        }),
        createKnowledgePage({
          id: "knowledge_other_warranty",
          tenant_id: otherTenantId,
          title: "他社の保証",
          content: "他社tenantの保証情報です。"
        })
      ],
      error: null
    });
    const repository: KnowledgePageRepository = new SupabaseKnowledgePageRepository(
      client.asRepositoryClient()
    );

    const results = await searchTenantKnowledge({
      tenant_id: tenantId,
      query: "保証",
      limit: 5,
      repository
    });

    expect(results).toEqual([
      expect.objectContaining({
        id: "knowledge_warranty",
        tenant_id: tenantId,
        title: "保証・メンテナンス",
        url: "https://amamihome.net/knowledge",
        category: "保証",
        source_type: "official_site",
        excerpt: expect.stringContaining("保証"),
        score: expect.any(Number),
        last_crawled_at: now
      })
    ]);
  });

  it("rejects blank tenant_id before using the fake client", async () => {
    const client = new FakeSupabaseClient();
    const repository = new SupabaseKnowledgePageRepository(client.asRepositoryClient());

    await expect(repository.listByTenant(" ")).rejects.toThrow(
      "tenant_id is required for Supabase repository operations."
    );
    expect(client.operations).toEqual([]);
  });

  it("wraps Supabase errors without leaking secret or URL values", async () => {
    const client = new FakeSupabaseClient();
    const secretValue = "secret-service-role-key-value";
    const urlValue = "https://example.supabase.co";
    client.setResult("knowledge_pages", "list", {
      data: null,
      error: {
        message: `failed with ${secretValue}`,
        code: "PGRST500",
        details: `connected to ${urlValue}`,
        hint: "check service role key"
      }
    });
    const repository = new SupabaseKnowledgePageRepository(client.asRepositoryClient());

    await expect(repository.listByTenant(tenantId)).rejects.toThrow(SupabaseRepositoryError);

    try {
      await repository.listByTenant(tenantId);
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseRepositoryError);
      expect(String(error)).toContain("Supabase knowledge_pages.listByTenant failed");
      expect(String(error)).toContain("PGRST500");
      expect(String(error)).not.toContain(secretValue);
      expect(String(error)).not.toContain(urlValue);
      expect(JSON.stringify((error as SupabaseRepositoryError).causeError)).not.toContain(
        secretValue
      );
      expect(JSON.stringify((error as SupabaseRepositoryError).causeError)).not.toContain(urlValue);
    }
  });

  it("uses the fake client without real Supabase env or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const client = new FakeSupabaseClient();
    client.setResult("knowledge_pages", "list", { data: [createKnowledgePage()], error: null });
    const repository = new SupabaseKnowledgePageRepository(client.asRepositoryClient());

    const pages = await repository.listByTenant(tenantId);

    expect(pages).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function createKnowledgePage(overrides: Partial<KnowledgePage> = {}): KnowledgePage {
  return {
    id: "knowledge_1",
    tenant_id: tenantId,
    url: "https://amamihome.net/knowledge",
    category: "相談",
    source_type: "official_site",
    title: "オンライン相談",
    content: "オンライン相談では、リモートで家づくりの相談ができます。",
    checksum: "checksum_1",
    allowed_for_ai: true,
    last_crawled_at: now,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

import { afterEach, describe, expect, it, vi } from "vitest";
import type { KnowledgePage as DomainKnowledgePage } from "@amami-line-crm/domain";
import type { KnowledgePageRepository } from "@amami-line-crm/rag";
import { searchTenantKnowledge } from "@amami-line-crm/rag";

import {
  SupabaseKnowledgePageRepository,
  SupabaseRepositoryError,
  type SupabaseRepositoryClient,
  type SupabaseRepositoryErrorLike
} from "@amami-line-crm/db";

interface FakeResult {
  data: unknown;
  error: SupabaseRepositoryErrorLike | null;
}

interface FakeOperation {
  table: string;
  action: string;
  column?: string;
  value?: unknown;
  columns?: string;
  ascending?: boolean;
}

class FakeSupabaseClient {
  readonly operations: FakeOperation[] = [];
  private readonly results = new Map<string, FakeResult>();

  from(table: string): FakeQueryBuilder {
    this.operations.push({ table, action: "from" });
    return new FakeQueryBuilder(this, table);
  }

  setListResult(table: string, result: FakeResult): void {
    this.results.set(table, result);
  }

  getListResult(table: string): FakeResult {
    return this.results.get(table) ?? { data: null, error: null };
  }

  push(operation: FakeOperation): void {
    this.operations.push(operation);
  }
}

class FakeQueryBuilder implements PromiseLike<FakeResult> {
  constructor(
    private readonly client: FakeSupabaseClient,
    private readonly table: string
  ) {}

  select(columns = "*"): this {
    this.client.push({ table: this.table, action: "select", columns });
    return this;
  }

  eq(column: string, value: unknown): this {
    this.client.push({ table: this.table, action: "eq", column, value });
    return this;
  }

  order(column: string, options: { ascending: boolean }): this {
    this.client.push({
      table: this.table,
      action: "order",
      column,
      ascending: options.ascending
    });
    return this;
  }

  then<TResult1 = FakeResult, TResult2 = never>(
    onfulfilled?: ((value: FakeResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    this.client.push({ table: this.table, action: "execute" });
    return Promise.resolve(this.client.getListResult(this.table)).then(onfulfilled, onrejected);
  }
}

const tenantId = "tenant_amamihome";
const otherTenantId = "tenant_other";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Supabase knowledge page repository", () => {
  it("exports repository without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(import("@amami-line-crm/db")).resolves.toHaveProperty(
      "SupabaseKnowledgePageRepository"
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists AI-allowed knowledge pages by tenant and maps database rows", async () => {
    const client = createFakeClient();
    client.setListResult("knowledge_pages", {
      data: [
        createKnowledgePageRow({
          id: "knowledge_z",
          title: "資料請求",
          content: "資料請求についての案内です。"
        }),
        createKnowledgePageRow({
          id: "knowledge_hidden",
          title: "非公開 メンテナンス",
          allowed_for_ai: false
        }),
        createKnowledgePageRow({
          id: "knowledge_other",
          tenant_id: otherTenantId,
          title: "他社の施工事例"
        }),
        createKnowledgePageRow({
          id: "knowledge_a",
          title: "オンライン相談",
          content: "オンライン相談とモデルホーム見学の案内です。"
        })
      ],
      error: null
    });
    const repository = new SupabaseKnowledgePageRepository(asRepositoryClient(client));

    const pages = await repository.listByTenant(tenantId);

    expect(pages.map((page) => page.id)).toEqual(["knowledge_a", "knowledge_z"]);
    expect(pages[0]).toMatchObject({
      id: "knowledge_a",
      tenant_id: tenantId,
      url: "https://amamihome.net/knowledge",
      category: "相談",
      source_type: "official_site",
      title: "オンライン相談",
      content: "オンライン相談とモデルホーム見学の案内です。",
      checksum: "checksum_1",
      allowed_for_ai: true,
      last_crawled_at: "2026-06-14T00:00:00.000Z",
      created_at: "2026-06-14T00:00:00.000Z",
      updated_at: "2026-06-14T00:00:00.000Z"
    });
  });

  it("adds tenant_id and allowed_for_ai filters to the Supabase query", async () => {
    const client = createFakeClient();
    client.setListResult("knowledge_pages", { data: [], error: null });
    const repository = new SupabaseKnowledgePageRepository(asRepositoryClient(client));

    await repository.listByTenant(tenantId);

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

  it("is structurally compatible with the RAG KnowledgePageRepository interface", async () => {
    const client = createFakeClient();
    client.setListResult("knowledge_pages", {
      data: [
        createKnowledgePageRow({
          id: "knowledge_hiraya",
          title: "施工事例 平屋",
          category: "施工事例",
          content: "平屋の施工事例では、家事動線と暮らしやすさを紹介します。"
        }),
        createKnowledgePageRow({
          id: "knowledge_online",
          title: "オンライン相談",
          content: "リモートで家づくりの進め方を相談できます。"
        }),
        createKnowledgePageRow({
          id: "knowledge_other_hiraya",
          tenant_id: otherTenantId,
          title: "他社の平屋"
        }),
        createKnowledgePageRow({
          id: "knowledge_hidden_hiraya",
          title: "非公開 平屋",
          allowed_for_ai: false
        })
      ],
      error: null
    });
    const repository = new SupabaseKnowledgePageRepository(asRepositoryClient(client));
    const ragRepository: KnowledgePageRepository = repository;

    const results = await searchTenantKnowledge({
      tenant_id: tenantId,
      query: "平屋",
      limit: 5,
      repository: ragRepository
    });

    expect(results).toEqual([
      expect.objectContaining({
        id: "knowledge_hiraya",
        tenant_id: tenantId,
        title: "施工事例 平屋",
        score: expect.any(Number)
      })
    ]);
  });

  it("rejects blank tenant_id before querying", async () => {
    const client = createFakeClient();
    const repository = new SupabaseKnowledgePageRepository(asRepositoryClient(client));

    await expect(repository.listByTenant(" ")).rejects.toThrow(
      "tenant_id is required for Supabase repository operations."
    );
    expect(client.operations).toEqual([]);
  });

  it("wraps Supabase errors as SupabaseRepositoryError", async () => {
    const client = createFakeClient();
    client.setListResult("knowledge_pages", {
      data: null,
      error: {
        message: "database unavailable",
        code: "08006"
      }
    });
    const repository = new SupabaseKnowledgePageRepository(asRepositoryClient(client));

    await expect(repository.listByTenant(tenantId)).rejects.toBeInstanceOf(
      SupabaseRepositoryError
    );
  });
});

function createFakeClient(): FakeSupabaseClient {
  return new FakeSupabaseClient();
}

function asRepositoryClient(client: FakeSupabaseClient): SupabaseRepositoryClient {
  return client as unknown as SupabaseRepositoryClient;
}

function createKnowledgePageRow(
  overrides: Partial<DomainKnowledgePage> = {}
): DomainKnowledgePage {
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
    last_crawled_at: "2026-06-14T00:00:00.000Z",
    created_at: "2026-06-14T00:00:00.000Z",
    updated_at: "2026-06-14T00:00:00.000Z",
    ...overrides
  };
}

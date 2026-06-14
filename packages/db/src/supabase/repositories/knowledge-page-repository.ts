import type { KnowledgePage } from "@amami-line-crm/domain";

import { assertTenantId, type SupabaseRepositoryClient } from "./customer-repository";
import { unwrapSupabaseResult, type SupabaseRepositoryResult } from "./errors";

interface SupabaseKnowledgePageRow {
  id: string;
  tenant_id: string;
  url: string;
  category: string;
  source_type: KnowledgePage["source_type"];
  title: string;
  content: string;
  checksum: string | null;
  allowed_for_ai: boolean;
  last_crawled_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseKnowledgePageRepository {
  constructor(private readonly client: SupabaseRepositoryClient) {}

  async listByTenant(tenantId: string): Promise<KnowledgePage[]> {
    assertTenantId(tenantId);

    const result = (await this.client
      .from("knowledge_pages")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("allowed_for_ai", true)
      .order("title", { ascending: true })) as SupabaseRepositoryResult<
      SupabaseKnowledgePageRow[]
    >;
    const rows = unwrapSupabaseResult(result, "knowledge_pages", "listByTenant") ?? [];

    return rows
      .filter((row) => row.tenant_id === tenantId && row.allowed_for_ai)
      .sort(compareKnowledgePageRowsByTitleAsc)
      .map(toKnowledgePage);
  }
}

function toKnowledgePage(row: SupabaseKnowledgePageRow): KnowledgePage {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    url: row.url,
    category: row.category,
    source_type: row.source_type,
    title: row.title,
    content: row.content,
    checksum: row.checksum,
    allowed_for_ai: row.allowed_for_ai,
    last_crawled_at: row.last_crawled_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function compareKnowledgePageRowsByTitleAsc(
  a: SupabaseKnowledgePageRow,
  b: SupabaseKnowledgePageRow
): number {
  return a.title.localeCompare(b.title);
}

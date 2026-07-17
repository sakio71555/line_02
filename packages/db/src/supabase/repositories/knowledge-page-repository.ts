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

  async upsertMany(pages: KnowledgePage[]): Promise<void> {
    if (pages.length === 0) {
      return;
    }

    for (const page of pages) {
      assertTenantId(page.tenant_id);
    }

    const result = (await this.client.from("knowledge_pages").upsert(
      pages.map(toKnowledgePageWriteRow),
      { onConflict: "id" }
    )) as SupabaseRepositoryResult<null>;
    unwrapSupabaseResult(result, "knowledge_pages", "upsertMany");
  }

  async tryAcquireOfficialSiteKnowledgeRefreshLease(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
    lease_ttl_seconds: number;
  }): Promise<boolean> {
    assertTenantId(input.tenant_id);

    const result = (await this.client.rpc("try_acquire_runtime_lease", {
      p_tenant_id: input.tenant_id,
      p_lease_key: input.lease_key,
      p_holder_id: input.holder_id,
      p_lease_ttl_seconds: input.lease_ttl_seconds
    })) as SupabaseRepositoryResult<boolean>;

    return Boolean(
      unwrapSupabaseResult(result, "runtime_leases", "tryAcquireOfficialSiteKnowledgeRefreshLease")
    );
  }

  async renewOfficialSiteKnowledgeRefreshLease(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
    lease_ttl_seconds: number;
  }): Promise<boolean> {
    assertTenantId(input.tenant_id);

    const result = (await this.client.rpc("renew_runtime_lease", {
      p_tenant_id: input.tenant_id,
      p_lease_key: input.lease_key,
      p_holder_id: input.holder_id,
      p_lease_ttl_seconds: input.lease_ttl_seconds
    })) as SupabaseRepositoryResult<boolean>;

    return Boolean(
      unwrapSupabaseResult(result, "runtime_leases", "renewOfficialSiteKnowledgeRefreshLease")
    );
  }

  async releaseOfficialSiteKnowledgeRefreshLease(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
  }): Promise<void> {
    assertTenantId(input.tenant_id);

    const result = (await this.client.rpc("release_runtime_lease", {
      p_tenant_id: input.tenant_id,
      p_lease_key: input.lease_key,
      p_holder_id: input.holder_id
    })) as SupabaseRepositoryResult<boolean>;
    unwrapSupabaseResult(
      result,
      "runtime_leases",
      "releaseOfficialSiteKnowledgeRefreshLease"
    );
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

function toKnowledgePageWriteRow(
  page: KnowledgePage
): Omit<SupabaseKnowledgePageRow, "created_at"> {
  return {
    id: page.id,
    tenant_id: page.tenant_id,
    url: page.url,
    category: page.category,
    source_type: page.source_type,
    title: page.title,
    content: page.content,
    checksum: page.checksum,
    allowed_for_ai: page.allowed_for_ai,
    last_crawled_at: page.last_crawled_at,
    updated_at: page.updated_at
  };
}

function compareKnowledgePageRowsByTitleAsc(
  a: SupabaseKnowledgePageRow,
  b: SupabaseKnowledgePageRow
): number {
  return a.title.localeCompare(b.title);
}

import type { TenantScoped } from "@amami-line-crm/shared";

export interface KnowledgePage extends TenantScoped {
  id: string;
  source_url: string;
  title: string;
  body: string;
  allowed_for_ai: boolean;
}

export interface KnowledgeSearchInput extends TenantScoped {
  query: string;
  limit: number;
}

export interface KnowledgeSearchRepository {
  searchTenantKnowledge(input: KnowledgeSearchInput): Promise<KnowledgePage[]>;
}

export class InMemoryKnowledgeSearchRepository implements KnowledgeSearchRepository {
  constructor(private readonly pages: KnowledgePage[]) {}

  async searchTenantKnowledge(input: KnowledgeSearchInput): Promise<KnowledgePage[]> {
    const normalizedQuery = input.query.trim().toLowerCase();

    return this.pages
      .filter((page) => page.tenant_id === input.tenant_id)
      .filter((page) => page.allowed_for_ai)
      .filter((page) => {
        const haystack = `${page.title}\n${page.body}`.toLowerCase();
        return normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
      })
      .slice(0, input.limit);
  }
}

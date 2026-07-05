import type { TenantScoped } from "@amami-line-crm/shared";

export interface KnowledgePage extends TenantScoped {
  id: string;
  url: string;
  title: string;
  category: string;
  source_type: string;
  content: string;
  allowed_for_ai: boolean;
  last_crawled_at?: string | null;
}

export interface KnowledgeSearchInput extends TenantScoped {
  query: string;
  limit: number;
}

export interface KnowledgeSearchResult extends TenantScoped {
  id: string;
  title: string;
  url: string;
  category: string;
  source_type: string;
  excerpt: string;
  score: number;
  last_crawled_at: string | null;
}

export interface SearchTenantKnowledgeInput extends KnowledgeSearchInput {
  repository: KnowledgePageRepository;
}

export interface KnowledgePageRepository {
  listByTenant(tenantId: string): Promise<KnowledgePage[]>;
}

export interface KnowledgeSearchRepository {
  searchTenantKnowledge(input: KnowledgeSearchInput): Promise<KnowledgeSearchResult[]>;
}

export class InMemoryKnowledgePageRepository implements KnowledgePageRepository {
  constructor(private readonly pages: KnowledgePage[]) {}

  async listByTenant(tenantId: string): Promise<KnowledgePage[]> {
    return this.pages.filter((page) => page.tenant_id === tenantId);
  }

  upsertMany(pages: KnowledgePage[]): void {
    for (const page of pages) {
      const existingIndex = this.pages.findIndex((item) => item.id === page.id);

      if (existingIndex >= 0) {
        this.pages[existingIndex] = page;
        continue;
      }

      this.pages.push(page);
    }
  }
}

export class InMemoryKnowledgeSearchRepository
  extends InMemoryKnowledgePageRepository
  implements KnowledgeSearchRepository
{
  async searchTenantKnowledge(input: KnowledgeSearchInput): Promise<KnowledgeSearchResult[]> {
    return searchTenantKnowledge({
      ...input,
      repository: this
    });
  }
}

export async function searchTenantKnowledge(
  input: SearchTenantKnowledgeInput
): Promise<KnowledgeSearchResult[]> {
  const terms = tokenizeQuery(input.query);

  if (terms.length === 0) {
    return [];
  }

  const pages = await input.repository.listByTenant(input.tenant_id);

  return pages
    .filter((page) => page.allowed_for_ai)
    .map((page) => scoreKnowledgePage(page, terms))
    .filter((result): result is KnowledgeSearchResult => result !== null)
    .sort(compareKnowledgeSearchResults)
    .slice(0, input.limit);
}

function tokenizeQuery(query: string): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  const baseTerms = normalizedQuery
    .trim()
    .split(/[\s、。！？!?・/／]+/)
    .filter((term) => term.length > 0);
  const knownTerms = [
    "アマミホーム",
    "家づくり",
    "家作り",
    "住宅",
    "新築",
    "モデルハウス",
    "モデルホーム",
    "見学",
    "予約",
    "施工事例",
    "資料請求",
    "資料",
    "カタログ",
    "営業時間",
    "会社",
    "所在地",
    "アクセス",
    "来場",
    "イベント",
    "オンライン相談",
    "保証",
    "メンテナンス",
    "アフター",
    "土地",
    "建売",
    "分譲地",
    "相談",
    "問い合わせ",
    "問合せ"
  ].filter((term) => normalizedQuery.includes(term.toLowerCase()));

  return [...new Set([...baseTerms, ...knownTerms])];
}

function scoreKnowledgePage(page: KnowledgePage, terms: string[]): KnowledgeSearchResult | null {
  const title = page.title;
  const category = page.category;
  const sourceType = page.source_type;
  const content = page.content;
  let score = 0;

  for (const term of terms) {
    if (title.toLowerCase().includes(term)) {
      score += 8;
    }

    if (category.toLowerCase().includes(term)) {
      score += 4;
    }

    if (sourceType.toLowerCase().includes(term)) {
      score += 2;
    }

    if (content.toLowerCase().includes(term)) {
      score += 1;
    }
  }

  if (score === 0) {
    return null;
  }

  return {
    id: page.id,
    tenant_id: page.tenant_id,
    title,
    url: page.url,
    category,
    source_type: sourceType,
    excerpt: createExcerpt(content, terms),
    score,
    last_crawled_at: page.last_crawled_at ?? null
  };
}

function createExcerpt(content: string, terms: string[]): string {
  if (content.length <= 120) {
    return content;
  }

  const normalizedContent = content.toLowerCase();
  const firstMatch = terms
    .map((term) => normalizedContent.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (firstMatch === undefined) {
    return `${content.slice(0, 117)}...`;
  }

  const start = Math.max(0, firstMatch - 40);
  const excerpt = content.slice(start, start + 117);
  const prefix = start > 0 ? "..." : "";
  const suffix = start + 117 < content.length ? "..." : "";

  return `${prefix}${excerpt}${suffix}`;
}

function compareKnowledgeSearchResults(
  a: KnowledgeSearchResult,
  b: KnowledgeSearchResult
): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  return a.title.localeCompare(b.title);
}

export * from "./amamihome-knowledge";

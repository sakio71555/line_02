# Loop 011: RAG Foundation

## Goal

tenant別knowledge_pages検索の基礎を作る。

## Status

API/domain portion implemented in Loop 011. Embedding generation, vector search, official site crawling, AI answer generation, UI, and Supabase persistence remain out of scope for this loop.

## Scope

- `knowledge_pages` repository interface
- tenant_idで先に絞る検索
- `allowed_for_ai` filter
- keyword検索またはin-memory検索のテスト
- `POST /api/admin/rag/search`
- title/content/category/source_typeの簡易キーワード検索

## Out of scope

- embedding生成
- OpenAI embeddings API
- vector search
- Webクロール
- 公式HP取り込み
- AI回答生成

## Acceptance Criteria

- 検索は必ず `tenant_id` で先に絞る。
- 他tenantのknowledge_pagesが返らないテストがある。
- `allowed_for_ai = false` はAI検索に出ない。
- 外部APIを呼ばない。
- `x-tenant-id` なしは401、unknown tenantは403を返す。
- invalid query/limitは400を返す。
- known tenantかつ有効queryなら `results` を返す。
- 該当なしは200で `results: []` を返す。
- resultに `tenant_id`、`title`、`url`、`category`、`source_type`、`excerpt`、`score`、`last_crawled_at` を含める。
- score順とlimit件数がテストされている。

## Implementation Notes

- Loop 011ではAPI/domain土台だけ実装済み。
- `KnowledgePageRepository` / `InMemoryKnowledgePageRepository` と `searchTenantKnowledge` を追加。
- APIは開発用に `x-tenant-id` headerでtenantを判定する。
- repositoryからtenant別に取得した後、`allowed_for_ai = true` と簡易キーワード検索を適用する。
- Loop 011.1でDB migration、domain型、RAG runtime、docs、schema testを `knowledge_pages.url/category/content/allowed_for_ai` に同期済み。
- OpenAI API、embedding生成、Webクロール、AI回答生成は未実装。

## Files likely affected

- `packages/rag/**`
- `apps/api/**`
- `tests/integration/**`
- `docs/05_ai_rules.md`
- `docs/06_multitenancy.md`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 011: RAG foundationを実装してください。tenant_idで先に絞るknowledge_pages検索だけに集中し、embedding生成やWebクロールは実装しないでください。

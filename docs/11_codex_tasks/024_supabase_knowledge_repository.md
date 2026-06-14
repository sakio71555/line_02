# Loop 024: Supabase Knowledge Repository

## Goal

既存の `KnowledgePageRepository` interfaceに対応できるSupabase版repositoryを追加する。既存API route、RAG answer draft API、admin UIにはまだ接続せず、in-memory実行経路を維持する。

## Scope

- `SupabaseKnowledgePageRepository`
- `knowledge_pages` tableとdomain modelのmapping
- `tenant_id` と `allowed_for_ai` のrepository-level filter
- fake Supabase clientを使ったunit/integration test
- README更新
- Obsidian dev log更新

## Out of scope

- 既存API routeをSupabase KnowledgePageRepositoryへ差し替える。
- RAG answer draft APIをSupabaseへ接続する。
- admin UI / LIFF UIからSupabaseを直接使う。
- Supabase本番接続。
- `.env` 作成・変更。
- migration SQL変更。
- RLS policy実装。
- embedding実装。
- pgvector実装。
- Webクロール。
- OpenAI API呼び出し。
- LINE API呼び出し。
- Customer / Message / Alert repositoryの追加変更。
- build前提のUI変更。

## Added Repository Location

- `packages/db/src/supabase/repositories/knowledge-page-repository.ts`
- `packages/db/src/supabase/repositories/index.ts`

実装場所は `packages/db` とした。Supabase client boundaryと既存Supabase repositoriesが `packages/db` に集約されているため。

`KnowledgePageRepository` interfaceは `packages/rag` にあるが、`packages/db` から `packages/rag` への依存を増やさないため、repository sourceではdomain `KnowledgePage` を返す実装にした。domain型はRAG側 `KnowledgePage` に必要なfieldを包含しており、testでRAG `KnowledgePageRepository` interfaceとの構造的互換性を確認する。

## KnowledgePageRepository Mapping

| Interface method | Supabase table | Query policy |
| --- | --- | --- |
| `listByTenant(tenantId)` | `knowledge_pages` | `tenant_id = tenantId` and `allowed_for_ai = true`; `title asc` |

返却field:

- `id`
- `tenant_id`
- `url`
- `category`
- `source_type`
- `title`
- `content`
- `checksum`
- `allowed_for_ai`
- `last_crawled_at`
- `created_at`
- `updated_at`

## Tenant Isolation

- repository method内で `tenant_id` が空の場合はエラーにする。
- 全read queryで `tenant_id` 条件を必須にする。
- Supabaseから返ったrowも防御的に `tenant_id` でfilterする。
- `tenant_id` が異なるknowledge pageはRAG検索材料にしない。

## `allowed_for_ai` Handling

- Supabase queryで `allowed_for_ai = true` を必須条件にする。
- Supabaseから `allowed_for_ai = false` のrowが返ってきてもrepository側で防御的に除外する。
- 既存 `searchTenantKnowledge` も `allowed_for_ai` filterを持つため、repository層とRAG service層の二重防御にする。

## Supabase Client Boundary

Loop 021のserver-side Supabase client boundaryを前提に、repositoryはSupabase client相当をconstructor injectionで受け取る。今回のtestではfake clientだけを使い、本物のSupabaseへ接続しない。

Service role clientはserver-side repository層で使う前提とし、browser、LIFF、Next.js client componentから直接使わない。

## Runtime Status

今回も既存API route、RAG answer draft API、admin UIには接続していない。runtimeはまだin-memory repositoryのまま。

## Not Implemented

- embedding
- pgvector
- vector search
- Webクロール
- OpenAI APIによる回答生成
- Supabase RLS policy

## Test Summary

追加テスト:

- importだけではenv validationやnetwork accessが走らない。
- list queryで `tenant_id` 条件が付く。
- list queryで `allowed_for_ai = true` 条件が付く。
- 別tenant knowledge pageを返さない。
- `allowed_for_ai = false` のknowledge pageを返さない。
- RAG `KnowledgePageRepository` interfaceと構造的に互換である。
- 既存 `searchTenantKnowledge` のkeyword matchingと矛盾しない。
- Supabase errorを `SupabaseRepositoryError` として扱う。

## Schema / Domain Differences

`KnowledgePage` domain型と `packages/db/migrations/0001_initial_schema.sql` の `knowledge_pages` tableは、今回のmapping対象fieldでは整合している。migration変更は行っていない。

## Next Loop

Loop 025: Supabase RLS policy plan

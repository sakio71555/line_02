# Loop 083: Supabase Knowledge Repository Fake-client Hardening

## Goal

`SupabaseKnowledgePageRepository` をknowledge/RAG runtime switchへ接続する前に、fake Supabase clientでtenant filter、`allowed_for_ai` filter、schema/domain mapping、RAG search互換性、error handlingを厚めに固定する。

今回もSupabase実DB、staging DB、API/RAG runtime、migration、RLSには接続しない。

## Scope

- `SupabaseKnowledgePageRepository` fake client integration testsを追加する。
- `tenant_id` filterを確認する。
- `allowed_for_ai = true` filterを確認する。
- wrong tenant rowと `allowed_for_ai = false` rowをdefensive filteringで除外することを確認する。
- `title` / `url` / `category` / `source_type` / `content` / `last_crawled_at` mappingを確認する。
- RAG searchがSupabase repository結果を `excerpt` / `score` 付きsourceとして扱えることを確認する。
- Supabase error sanitizationを確認する。
- README、dev loop docs、staging runbook、dev logを更新する。

## Out of Scope

- Supabase実DB接続
- staging DB接続
- production DB接続
- `.env.staging` の読み込みまたは値表示
- migration SQL変更
- RLS SQL実装
- GRANT変更
- API/RAG runtime switch
- repository wiring変更
- Admin API route変更
- Admin UI変更
- alerts runtime switch
- staff/auth runtime switch
- LINE API実送信
- OpenAI API実接続
- Web crawl
- embedding / pgvector
- selectedTenantId transport実装
- Supabase Auth/JWT実装
- production dev_header rejection実装
- 依存関係追加
- `package.json` / `pnpm-lock.yaml` 変更

## Target Repository

- `packages/db/src/supabase/repositories/knowledge-page-repository.ts`
- class: `SupabaseKnowledgePageRepository`

対象外:

- `SupabaseAlertRepository`
- `SupabaseCustomerRepository`
- `SupabaseMessageRepository`
- `SupabaseStaffAuthLookupRepository`

## Knowledge Domain / Schema Check

Domain `KnowledgePage` fields:

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

The current migration and domain use `url`. They do not define `source_url`. Loop 083 does not add `source_url`; RAG sources continue to expose `url` from the `knowledge_pages.url` column.

`knowledge_pages.allowed_for_ai` already exists in schema as `boolean not null default true`, and the repository query filters it as `true` before RAG search receives rows.

## Fake Client Test Policy

Shared helper:

```text
tests/helpers/fake-supabase-client.ts
```

Loop 083 reuses the shared fake client without extending it. The test does not create a real Supabase client, read `.env`, or perform network access.

## tenant_id Filter Checks

Tests verify:

- `listByTenant(tenantId)` sends `eq("tenant_id", tenantId)`.
- blank `tenant_id` is rejected before any fake client query runs.
- fake result rows from a different tenant are defensively removed even if the fake client returns them.
- RAG search results do not include other tenant knowledge rows.

## allowed_for_ai Filter Checks

Tests verify:

- `listByTenant(tenantId)` sends `eq("allowed_for_ai", true)`.
- fake result rows with `allowed_for_ai = false` are defensively removed.
- RAG search results do not include disallowed knowledge rows.

## Search / List Mapping Checks

Tests verify:

- repository list result is sorted by `title` ascending.
- repository maps database rows to the existing `KnowledgePage` domain shape.
- `searchTenantKnowledge` can consume `SupabaseKnowledgePageRepository` through the `KnowledgePageRepository` interface.
- RAG search returns `tenant_id`, `title`, `url`, `category`, `source_type`, `excerpt`, `score`, and `last_crawled_at`.

## title / source_url / content Mapping Checks

Tests verify:

- `title` is mapped from `knowledge_pages.title`.
- `content` is mapped from `knowledge_pages.content` and used for keyword search/excerpt.
- source URL is mapped from `knowledge_pages.url`.

There is no `source_url` column in the current schema/domain. Loop 083 records that `url` is the canonical field and does not introduce a schema alias.

## Upsert / Import Mapping Checks

`SupabaseKnowledgePageRepository` currently exposes `listByTenant` only. The in-memory repository used by static Amami Home import supports `upsertMany`, but the Supabase repository has no upsert/import method yet.

Loop 083 does not add an upsert/import method because this would expand the runtime surface beyond fake-client hardening. Supabase knowledge import/upsert should be handled in a separate Loop if needed.

## Error Mapping Checks

Tests verify:

- Supabase errors are wrapped as `SupabaseRepositoryError`.
- `table`, `operation`, and sanitized error `code` remain visible.
- raw `message`, `details`, `hint`, secret-like values, and URL-like values are not exposed in the thrown error or `causeError`.

## Implementation Changes

- Added `tests/integration/supabase-knowledge-page-repository-fake-client.test.ts`.
- No `SupabaseKnowledgePageRepository` production code change was needed.
- No API route, runtime wiring, migration, RLS, UI, env, or dependency change was made.

## Why No Runtime Switch In This Loop

This Loop only proves the repository boundary with fake client tests. Connecting knowledge/RAG to runtime also involves API app dependency wiring, staging smoke, source seeding decisions, and response-only AI/RAG behavior. Those are separate Loop tasks.

## Test Content

New test coverage:

- AI-allowed knowledge list mapping
- `tenant_id` + `allowed_for_ai` query filters
- wrong tenant/disallowed rows excluded from repository and RAG search
- blank tenant rejection before query
- secret/URL leak prevention
- no real Supabase env/network access

## Result

- `git diff --check` passed.
- `npx pnpm@10.12.1 lint` passed.
- `npx pnpm@10.12.1 typecheck` passed.
- `npx pnpm@10.12.1 test` passed: 58 files passed, 1 skipped / 394 tests passed, 1 skipped.
- `npx pnpm@10.12.1 test:integration` passed: 58 files passed, 1 skipped / 394 tests passed, 1 skipped.
- `npx pnpm@10.12.1 build` passed: 10 packages successful. Existing Next.js ESLint plugin warning appeared, but build succeeded.

## Remaining Risks

- knowledge/RAG API runtime is still in-memory/static.
- staging knowledge/RAG smoke is not implemented.
- Supabase knowledge upsert/import mapping is not implemented.
- RLS SQL and Supabase Auth/JWT are not implemented.

## Next Loop Candidate

Loop 084: Supabase alerts runtime boundary

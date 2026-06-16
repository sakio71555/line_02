# Loop 085: Supabase Knowledge/RAG Runtime Boundary + Staging 100% Milestone

## Goal

`REPOSITORY_RUNTIME=supabase` を明示したstaging smokeで、customers/messages/alertsに続き、`knowledge_pages` とRAG search / answer-draftもSupabase-backed runtime bundleから扱えるようにする。

このLoopの100%はstaging拡張検証版としての100%相当であり、本番運用版100%ではない。RLS/Auth/JWT未実装のためproduction readinessはNo-Goのまま維持する。

## Scope

- existing runtime bundleへknowledge repository境界を追加する。
- `createApiApp` が明示runtime bundleの `knowledgePageRepository` をRAG routeで使えるようにする。
- default runtimeを `in_memory` のまま維持する。
- RAG searchが `tenant_id` と `allowed_for_ai=true` のsourceだけを返すことを確認する。
- RAG answer-draftがSupabase knowledge source付きで `MockAiProvider` の下書きを返すことを確認する。
- staging smoke scriptを追加する。
- staging dummy seedにAI除外確認用の `allowed_for_ai=false` dummy knowledgeとwrong tenant除外確認用dummy knowledgeを追加する。
- README、dev loop docs、staging runbooks、dev logを更新する。

## Out of Scope

- production Supabase接続
- production key利用
- RLS SQL実装
- RLS policy追加
- GRANT変更
- migration SQL変更
- Supabase Auth/JWT実装
- selectedTenantId transport実装
- production dev_header rejection実装
- staff/auth runtime switch
- LINE API実送信
- OpenAI API実接続
- Web crawl
- embedding / pgvector
- knowledge upsert/import新規実装
- Admin UI大規模変更
- package依存追加
- `package.json` / `pnpm-lock.yaml` 変更

## Starting State

- customers/messages staging runtime smoke: completed.
- alerts runtime boundary/staging smoke: completed.
- `SupabaseKnowledgePageRepository` fake-client hardening: completed.
- knowledge/RAG runtime switch: not connected before this Loop.
- production readiness: No-Go because RLS/Auth/JWT are not implemented.

## Runtime Boundary Changes

Updated runtime bundle:

```text
packages/db/src/runtime/customer-message-repositories.ts
```

The explicit Supabase bundle now includes:

```text
SupabaseCustomerRepository
SupabaseMessageRepository
SupabaseAlertRepository
SupabaseKnowledgePageRepository
```

The in-memory bundle also exposes a small empty knowledge repository so the bundle shape stays consistent without adding a package dependency from `packages/db` to `packages/rag`.

Runtime behavior:

```text
REPOSITORY_RUNTIME unspecified -> in_memory
REPOSITORY_RUNTIME=in_memory -> in_memory
REPOSITORY_RUNTIME=supabase -> customers/messages/alerts/knowledge_pages Supabase-backed bundle
```

`createApiApp` now reads `dependencies.customerMessageRepositories.knowledgePageRepository` when no explicit `knowledgePageRepository` is provided.

Existing explicit `knowledgePageRepository` injection remains higher priority for backwards-compatible tests and local fixtures.

## RAG Search Boundary

Target route:

```text
POST /api/admin/rag/search
```

The route continues to use `searchTenantKnowledge` and the same response shape. When a Supabase runtime bundle is injected, the search repository comes from `SupabaseKnowledgePageRepository`.

Search constraints:

- query is scoped by `tenant_id`.
- repository query filters `allowed_for_ai=true`.
- `searchTenantKnowledge` defensively filters `allowed_for_ai`.
- wrong tenant rows are not returned.
- result source URL uses canonical `url`.
- `source_url` is not introduced.

## RAG Answer Draft Boundary

Target route:

```text
POST /api/admin/rag/answer-draft
```

The route keeps the existing response-only behavior:

- no message save.
- no LINE send.
- no OpenAI call.
- source list comes from `knowledge_pages.url`.
- `MockAiProvider` creates the answer draft.

## Staging Dummy Data Policy

Updated script:

```text
scripts/dev-loop/seed-staging-dummy-data.mjs
```

Added only dummy knowledge rows:

- `knowledge_staging_hidden_online`: `tenant_amamihome`, `allowed_for_ai=false`
- `knowledge_staging_other_online`: `tenant_staging_other`, `allowed_for_ai=true`

These rows are used only to prove exclusion behavior. They use dummy content and `example.invalid` URLs where appropriate. No real customer information, real LINE userId, production logs, API keys, or env values are recorded.

## Staging Smoke Content

Script:

```text
scripts/dev-loop/smoke-staging-knowledge-rag-api.mjs
```

The script:

- verifies `.env.staging` without printing values.
- checks `psql --version`.
- verifies schema.
- verifies service_role PostgREST grants.
- verifies dummy staging data.
- runs `tests/integration/staging-knowledge-rag-api-smoke.test.ts` with `RUN_STAGING_KNOWLEDGE_RAG_SMOKE=1`.

Smoke flow:

1. create an API app with explicit Supabase runtime bundle.
2. call `POST /api/admin/rag/search` for `オンライン相談`.
3. confirm `tenant_amamihome` source is returned.
4. confirm `allowed_for_ai=false` source is excluded.
5. confirm wrong tenant source is excluded.
6. call `POST /api/admin/rag/answer-draft`.
7. confirm `MockAiProvider` returns source付き answer draft.
8. recreate the Supabase runtime bundle and repeat search to confirm restart-equivalent persistence.

## Test Content

New and updated coverage:

- runtime factory returns knowledge repository for both in-memory and Supabase modes.
- default runtime remains `in_memory`.
- API RAG routes use injected runtime bundle `knowledgePageRepository`.
- explicit `knowledgePageRepository` injection remains higher priority.
- staging smoke test is skipped by default.
- staging smoke script does not enable real LINE push, OpenAI, or unsafe Supabase CLI operations.

## Staging 100% Milestone

Loop 085 completes the staging拡張検証版100%相当 milestone:

- customers/messages Supabase runtime smoke: done.
- alerts Supabase runtime smoke: done.
- knowledge_pages Supabase runtime smoke: done.
- RAG search uses Supabase `knowledge_pages` source.
- RAG answer-draft returns Supabase source付き mock answer.
- default runtime remains `in_memory`.
- LINE real push remains disabled.
- OpenAI remains mock.

This is not production readiness. Production remains No-Go.

## RLS/Auth/JWT State

- RLS SQL is not implemented.
- Supabase Auth/JWT is not connected.
- selectedTenantId production transport is not connected.
- production dev_header rejection is not implemented.

Production remains No-Go.

## Result

- staging knowledge/RAG smoke: passed.
- `git diff --check`: passed.
- `npx pnpm@10.12.1 lint`: passed.
- `npx pnpm@10.12.1 typecheck`: passed.
- `npx pnpm@10.12.1 test`: passed, 62 files passed / 1 skipped, 400 tests passed / 3 skipped.
- `npx pnpm@10.12.1 test:integration`: passed, 62 files passed / 1 skipped, 400 tests passed / 3 skipped.
- `npx pnpm@10.12.1 build`: passed, 10 packages successful. Existing Next.js ESLint plugin warning appeared, but build succeeded.

## Remaining Risks

- RLS/Auth/JWT are not implemented.
- production readiness remains No-Go.
- selectedTenantId transport and production dev_header rejection remain future work.
- staff/auth runtime switch is not implemented.
- OpenAI and LINE real providers remain disconnected.
- staging smoke uses dummy data only.

## Next Loop Candidate

Loop 086: RLS/Auth/JWT implementation planning or production hardening split

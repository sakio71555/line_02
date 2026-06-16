# Loop 081: Supabase Alerts/Knowledge Staging Runtime Plan

## Goal

customers/messagesのstaging Supabase runtime smokeが通った現在地から、次に `alerts` と `knowledge_pages` をstaging runtimeへ進めるための実装順、test境界、smoke方針をdocs-onlyで整理する。

今回はruntime switch、API変更、migration変更、Supabase接続、RLS SQL実装、LINE/OpenAI接続は行わない。

## Scope

- 現在のstaging状態を整理する。
- `alerts` / `knowledge_pages` / RAG search / RAG answer draft / unreplied check / notify-openの棚卸しをする。
- alerts runtime方針を整理する。
- knowledge_pages runtime方針を整理する。
- fake client test方針を整理する。
- staging smoke方針を整理する。
- service_role / RLS / production No-Goの関係を整理する。
- 後続Loop分割を整理する。
- README、database docs、dev loop docs、staging runbook、dev logを更新する。
- docs testを追加する。

## Out of Scope

- API runtime変更
- Supabase AlertRepository / KnowledgePageRepositoryをAPIへ接続する実装
- `packages/db/src/runtime` の拡張
- migration SQL変更
- RLS SQL実装
- Supabase staging / production接続
- `.env` 作成・変更
- LINE API呼び出し
- OpenAI API呼び出し
- Webクロール
- pgvector / embedding実装
- admin UI / LIFF UI変更
- build前提のUI変更

## Current Staging State

| item | state |
| --- | --- |
| staging schema | `0001_initial_schema.sql` applied in Loop 078 |
| PostgREST grants | `0002_service_role_postgrest_grants.sql` applied for `service_role` only in Loop 079.1 |
| dummy seed | customers: 2, messages: 5, knowledge pages: 10 |
| customers/messages smoke | passed through injected Supabase customer/message runtime bundle |
| default runtime | still `in_memory` |
| alerts runtime | not switched to Supabase |
| knowledge runtime | not switched to Supabase |
| RAG runtime | still uses injected/default in-memory knowledge repository |
| RLS enabled tables | `0/12` in staging record |
| LINE provider | mock/disabled |
| OpenAI provider | mock |
| production readiness | No-Go |

Loop 079.1の `service_role` grantsはstaging PostgREST/Data API smokeを通すための回復処置であり、production authorizationではない。`service_role` はRLS bypass前提のため、productionへ進む前にRLS/Auth/JWT/selectedTenantId/production dev_header rejectionを別Loopで揃える必要がある。

## Runtime Inventory

| target | current runtime | Supabase repository | schema | staging seed | runtime switch state | notes |
| --- | --- | --- | --- | --- | --- | --- |
| alerts list/check/notify | in-memory `AlertRepository` injected into API app | `SupabaseAlertRepository` exists | `alerts` table exists | no dedicated alert seed yet | not connected | `check-unreplied` and `notify-open` are still in-memory + mock notifier |
| knowledge_pages search source | in-memory/static `KnowledgePageRepository` | `SupabaseKnowledgePageRepository` exists | `knowledge_pages` table exists | 10 dummy pages | not connected | repository filters tenant and `allowed_for_ai` |
| RAG search | `searchTenantKnowledge` over current repository | structurally compatible with Supabase repository | `knowledge_pages` | 10 dummy pages | not connected | keyword search only, no embeddings |
| RAG answer draft | RAG search + `MockAiProvider`, response only | depends on knowledge repository | no draft table | N/A | not connected | no save, no LINE send, no OpenAI call |
| unreplied check | customer repository + alert repository | alert repository exists, customer/message runtime exists | `customers`, `messages`, `alerts` | customers/messages only | not connected | avoid split-brain by switching related repositories together in staging smoke |
| notify-open | alert repository + `MockStaffNotifier` | alert repository exists | `alerts` | no dedicated alert seed yet | not connected | real staff LINE notification remains out of scope |

## Alerts Runtime Plan

Target routes:

- `GET /api/admin/alerts`
- `POST /api/admin/alerts/check-unreplied`
- `POST /api/admin/alerts/notify-open`

Plan:

1. Keep default runtime as `in_memory`.
2. Add fake client tests for `SupabaseAlertRepository` before connecting it to any API route.
3. Extend runtime bundle/factory in a later Loop only after fake client tests prove tenant filters, mapping, and error handling.
4. In staging smoke, use explicit injection rather than changing the default local runtime.
5. For `check-unreplied`, avoid mixed runtime split-brain. The checker reads customers and writes alerts, so staging smoke should inject Supabase customers/messages plus Supabase alerts together.
6. For `notify-open`, keep `MockStaffNotifier`; only alert status persistence should move to Supabase.
7. Verify `tenant_id + status` filtering for open alerts and `tenant_id + alert_id` filtering for status updates.
8. Do not add scheduler, real LINE notification, or production runtime in this phase.

Required runtime behavior:

- Reads must include `tenant_id`.
- Inserts must include `tenant_id`.
- Open/notified duplicate prevention must remain `tenant_id + customer_id + alert_type + status in open/notified`.
- `notify-open` success updates `status = notified` and `notified_at`.
- Failed mock notification keeps `status = open`.
- Other tenant alerts must never appear in list/check/notify results.

## knowledge_pages Runtime Plan

Target routes:

- `POST /api/admin/rag/search`
- `POST /api/admin/rag/answer-draft`

Plan:

1. Keep default runtime as in-memory/static Amami Home knowledge.
2. Add fake client tests for `SupabaseKnowledgePageRepository` and RAG service interaction before connecting routes.
3. Later, extend a runtime bundle/factory so RAG routes can receive `SupabaseKnowledgePageRepository` when explicitly configured.
4. Staging smoke should use the existing dummy `knowledge_pages` seed.
5. Search must only use rows where `tenant_id` matches and `allowed_for_ai = true`.
6. RAG answer draft remains response-only. Do not save drafts, send LINE messages, call OpenAI, crawl the web, or generate embeddings.

Required runtime behavior:

- `tenant_id` is always part of knowledge lookup.
- `allowed_for_ai=false` rows are excluded by repository/service defense.
- Results keep `title`, `url`, `category`, `source_type`, `excerpt`, `score`, and `last_crawled_at`.
- No cross-tenant sources are mixed into RAG context.

## Fake Client Test Plan

Before staging runtime connection:

- `SupabaseAlertRepository` fake client tests verify:
  - every read query includes `tenant_id`.
  - insert payload includes `tenant_id`.
  - open alert listing filters `tenant_id + status = open`.
  - active duplicate lookup filters `tenant_id + customer_id + alert_type + status`.
  - status update filters `tenant_id + alert_id`.
  - Supabase errors become `SupabaseRepositoryError` without leaking secrets.
  - importing the repository does not read env or connect to Supabase.
- `SupabaseKnowledgePageRepository` fake client tests verify:
  - query filters `tenant_id`.
  - query filters `allowed_for_ai = true`.
  - defensive row filtering drops wrong tenant and disallowed rows.
  - mapping matches `KnowledgePage`.
  - Supabase errors become `SupabaseRepositoryError` without leaking secrets.
  - importing the repository does not read env or connect to Supabase.
- RAG service tests verify that Supabase-shaped knowledge rows still produce keyword-ranked results and exclude `allowed_for_ai=false`.

## Staging Smoke Plan

Follow-up smoke should be split into small loops.

1. Alerts staging smoke:
   - seed or create dummy alert data only for `tenant_amamihome`.
   - inject Supabase customers/messages and Supabase alerts together.
   - run `check-unreplied`.
   - verify `GET /api/admin/alerts` returns the alert.
   - run `notify-open`.
   - verify status becomes `notified`.
   - verify restart-equivalent app instance reads the persisted alert.
2. Knowledge/RAG staging smoke:
   - use existing dummy `knowledge_pages` seed.
   - query `オンライン相談`, `施工事例`, `メンテナンス`, `SoToNo MA`.
   - verify only `tenant_amamihome` sources are returned.
   - verify `allowed_for_ai=false` rows are not returned.
   - run RAG answer draft and verify sources are attached.
3. Keep smoke scripts value-safe:
   - do not print `.env.staging` raw content.
   - do not print DB URL, project ref, keys, or passwords.
   - do not use real customer data or real LINE userId.

## service_role / RLS Relationship

- Staging smoke may use server-side `service_role` through repository boundaries.
- `service_role` bypasses RLS, so repository tenant filters remain mandatory.
- No broad `anon` / `authenticated` table DML grants should be added.
- RLS SQL is still未実装.
- RLS/Auth/JWT must be implemented and tested before production.
- browser, LIFF, and Next client components must never receive `SUPABASE_SERVICE_ROLE_KEY`.

## Production No-Go

Production remains No-Go because:

- RLS SQL is未実装.
- Supabase Auth/JWT is未接続.
- selectedTenantId transport and membership revalidation are未接続.
- production dev_header rejection is未実装.
- alerts/knowledge runtime switch is未接続.
- staff/auth runtime is未接続.
- LINE real send is disabled/mock.
- OpenAI API is mock.

This Loop only plans the staging path. It does not change production readiness.

## Follow-up Loop Candidates

```text
Loop 082: Supabase alert repository fake-client hardening
Loop 083: Supabase knowledge repository fake-client hardening
Loop 084: Supabase alerts runtime boundary
Loop 085: Supabase alerts staging smoke
Loop 086: Supabase knowledge/RAG runtime boundary
Loop 087: Supabase knowledge/RAG staging smoke
Loop 088: RLS policy SQL draft for customers/messages/alerts/knowledge
```

## Test Plan

- docs static test confirms this task doc and runbook exist.
- docs static test confirms alerts/knowledge runtime plans, fake client plan, staging smoke plan, service_role/RLS relationship, production No-Go, and links are present.
- docs static test confirms this Loop remains docs/test-only and does not introduce RLS SQL in migrations.

## Result

- `git diff --check` passed.
- `npx pnpm@10.12.1 lint` passed.
- `npx pnpm@10.12.1 typecheck` passed.
- `npx pnpm@10.12.1 test` passed: 56 files passed, 1 skipped / 380 tests passed, 1 skipped.
- `npx pnpm@10.12.1 test:integration` passed: 56 files passed, 1 skipped / 380 tests passed, 1 skipped.
- build was not run because this Loop changed docs and a static integration test only.

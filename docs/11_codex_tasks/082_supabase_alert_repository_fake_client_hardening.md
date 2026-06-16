# Loop 082: Supabase Alert Repository Fake-client Hardening

## Goal

`SupabaseAlertRepository` をalerts runtime switchへ接続する前に、fake Supabase clientでtenant filter、payload mapping、active alert lookup、status update、error handlingを厚めに固定する。

今回もSupabase実DB、staging DB、API runtime、migration、RLSには接続しない。

## Scope

- `SupabaseAlertRepository` fake client integration testsを追加する。
- shared fake Supabase client helperを、repositoryが使う範囲だけ小さく拡張する。
- `tenant_id` filterを確認する。
- create alert payload mappingを確認する。
- open alert listingを確認する。
- active alert lookupを確認する。
- status update mappingを確認する。
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
- API runtime switch
- repository wiring変更
- Admin API route変更
- Admin UI変更
- alerts runtime switch
- knowledge_pages runtime switch
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

- `packages/db/src/supabase/repositories/alert-repository.ts`
- class: `SupabaseAlertRepository`

対象外:

- `SupabaseKnowledgePageRepository`
- `SupabaseCustomerRepository`
- `SupabaseMessageRepository`
- `SupabaseStaffAuthLookupRepository`

## Alert Domain / Schema Check

Domain `Alert` fields:

- `id`
- `tenant_id`
- `customer_id`
- `consultation_id`
- `alert_type`
- `status`
- `severity`
- `message`
- `triggered_at`
- `notified_at`
- `resolved_at`
- `created_at`
- `updated_at`

Status values:

- `open`
- `notified`
- `resolved`
- `dismissed`

The current domain and initial migration do not define `metadata` or `dismissed_at`. Loop 082 does not add those fields. `dismissed` is represented by `status = dismissed` plus `updated_at`.

## Fake Client Test Policy

Shared helper:

```text
tests/helpers/fake-supabase-client.ts
```

Loop 082 adds only `limit(count)` support because `SupabaseAlertRepository.findActiveByCustomerAndType` uses `.limit(1)`.

Fake client covers only the repository methods used in tests. It does not create a real Supabase client, read `.env`, or perform network access.

## tenant_id Filter Checks

Tests verify:

- `listOpenByTenant(tenantId)` sends `eq("tenant_id", tenantId)`.
- `listOpenByTenant(tenantId)` sends `eq("status", "open")`.
- `findActiveByCustomerAndType` sends `tenant_id`, `customer_id`, `alert_type`, and `status in ["open", "notified"]`.
- `updateStatus` filters by `tenant_id` and `id`.
- fake result rows outside the requested tenant are dropped or return `null`.
- write payload includes `tenant_id`.

## Create Alert Mapping Checks

Tests verify the insert payload includes:

- `id`
- `tenant_id`
- `customer_id`
- `consultation_id`
- `alert_type`
- `status`
- `severity`
- `message`
- `triggered_at`
- `notified_at`
- `resolved_at`
- `created_at`
- `updated_at`

The repository returns the mapped alert from Supabase `.single()`.

## List Open Alerts Checks

Tests verify:

- `tenant_id` filter
- `status = open` filter
- `created_at` ascending order query
- defensive filtering removes wrong tenant and non-open rows
- returned alerts are sorted by `created_at` ascending

## Find Active Alert Checks

Tests verify:

- `tenant_id + customer_id + alert_type + status in (open, notified)`
- `created_at` ascending order
- `limit(1)`
- `maybeSingle()`
- `notified` is active
- wrong tenant/customer/type/status returns `null`

## Update Status Mapping Checks

Tests verify:

- `notified` update maps `status`, `updated_at`, and `notified_at`.
- `resolved` update maps `status`, `updated_at`, and `resolved_at`.
- `dismissed` update maps `status` and `updated_at`.
- all updates filter by `tenant_id + alert_id`.
- wrong-tenant returned row becomes `null`.

Because `dismissed_at` is not in the current domain/schema, Loop 082 does not add a dismissed timestamp.

## Error Mapping Checks

Tests verify:

- Supabase errors are wrapped as `SupabaseRepositoryError`.
- `table`, `operation`, and sanitized error `code` remain visible.
- raw `message`, `details`, `hint`, secret-like values, and URL-like values are not exposed in the thrown error or `causeError`.

## Implementation Changes

- Added `limit(count)` to `tests/helpers/fake-supabase-client.ts`.
- Added `tests/integration/supabase-alert-repository-fake-client.test.ts`.
- No `SupabaseAlertRepository` production code change was needed.
- No API route, runtime wiring, migration, RLS, UI, or env change was made.

## Why No Runtime Switch In This Loop

This Loop only proves the repository boundary with fake client tests. Connecting alerts to runtime would also involve API app dependency wiring, staging smoke, and split-brain decisions with customers/messages during unreplied checks. Those are separate Loop tasks.

## Test Content

New test coverage:

- complete create payload mapping
- open alert tenant/status filtering and sort
- active alert tenant/customer/type/status/limit lookup
- active lookup null defense
- notified/resolved/dismissed status update mapping
- wrong-tenant status update null defense
- secret/URL leak prevention
- no real Supabase env/network access

## Result

- `git diff --check` passed.
- `npx pnpm@10.12.1 lint` passed.
- `npx pnpm@10.12.1 typecheck` passed.
- `npx pnpm@10.12.1 test` passed: 57 files passed, 1 skipped / 388 tests passed, 1 skipped.
- `npx pnpm@10.12.1 test:integration` passed: 57 files passed, 1 skipped / 388 tests passed, 1 skipped.
- `npx pnpm@10.12.1 build` passed: 10 packages successful. Existing Next.js ESLint plugin warning appeared, but build succeeded.

## Remaining Risks

- alerts API runtime is still in-memory.
- staging alerts smoke is not implemented.
- RLS SQL and Supabase Auth/JWT are not implemented.
- `dismissed_at` does not exist in the current schema; dismissed audit timing is limited to `updated_at`.

## Next Loop Candidate

Loop 083: Supabase knowledge repository fake-client hardening

# Loop 084: Supabase Alerts Runtime Boundary + Staging Smoke

## Goal

`REPOSITORY_RUNTIME=supabase` を明示したstaging smokeで、customers/messages/alertsを同じSupabase-backed runtime bundleとして扱えるようにする。

default runtimeは引き続き `in_memory` のまま維持する。production readyにはしない。

## Scope

- existing customer/message runtime bundleへalert repository境界を追加する。
- `createApiApp` が明示runtime bundleの `alertRepository` を使えるようにする。
- alerts routesでcustomers/messages/alerts split-brainを避けるtestを追加する。
- staging alerts smoke scriptを追加する。
- stagingで未返信チェック、alert一覧、notify-open mock、再読込でのnotified永続化を確認する。
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
- knowledge_pages runtime switch
- RAG runtime switch
- staff/auth runtime switch
- LINE API実送信
- OpenAI API実接続
- Web crawl
- embedding / pgvector
- Admin UI大規模変更
- package依存追加
- `package.json` / `pnpm-lock.yaml` 変更

## Starting State

- customers/messages staging runtime smoke: completed.
- `SupabaseAlertRepository` fake-client hardening: completed.
- `SupabaseKnowledgePageRepository` fake-client hardening: completed.
- alerts runtime switch: not connected before this Loop.
- production readiness: No-Go because RLS/Auth/JWT are not implemented.

## Runtime Boundary Changes

Updated runtime bundle:

```text
packages/db/src/runtime/customer-message-repositories.ts
```

`createCustomerMessageRepositoriesForRuntime`, `createInMemoryCustomerMessageRepositories`, and `createSupabaseCustomerMessageRepositories` now return an alert repository with the existing customer/message repositories.

Runtime behavior:

```text
REPOSITORY_RUNTIME unspecified -> in_memory
REPOSITORY_RUNTIME=in_memory -> in_memory
REPOSITORY_RUNTIME=supabase -> SupabaseCustomerRepository + SupabaseMessageRepository + SupabaseAlertRepository
```

`createApiApp` now reads `dependencies.customerMessageRepositories.alertRepository` when no explicit `alertRepository` is provided.

Existing explicit `alertRepository` injection remains higher priority for backwards-compatible tests.

## Default in_memory Maintained

The runtime factory still defaults to `in_memory` when no mode is provided. `.env.staging` remains `REPOSITORY_RUNTIME=in_memory`; smoke tests override runtime only through explicit dependency injection.

## Split-brain Avoidance

Alerts depend on customers. In the staging smoke, these use the same Supabase-backed bundle:

- customers: `SupabaseCustomerRepository`
- messages: `SupabaseMessageRepository`
- alerts: `SupabaseAlertRepository`
- staff notification: `MockStaffNotifier`

This avoids running customers/messages against Supabase while alerts stay in-memory.

## Target Routes

- `GET /api/admin/alerts`
- `POST /api/admin/alerts/check-unreplied`
- `POST /api/admin/alerts/notify-open`

API response shapes were not changed.

## Staging Dummy Data Policy

The existing staging dummy seed was not changed. The staging smoke creates one per-run dummy alert customer/message through the Supabase repository bundle:

- dummy customer id prefix: `customer_smoke_alert_`
- dummy LINE user id prefix: `dummy_line_user_alert_`
- dummy message id prefix: `message_smoke_alert_`

No real customer data, real LINE userId, phone, email, address, production logs, or secrets are used.

## Staging Smoke Content

Script:

```text
scripts/dev-loop/smoke-staging-alerts-api.mjs
```

The script:

- verifies `.env.staging` without printing values.
- checks `psql --version` through an absolute path.
- verifies schema.
- verifies service_role PostgREST grants.
- verifies dummy staging data.
- runs `tests/integration/staging-alerts-api-smoke.test.ts` with `RUN_STAGING_ALERTS_SMOKE=1`.

Smoke flow:

1. create dummy unreplied customer/message through Supabase repositories.
2. call `POST /api/admin/alerts/check-unreplied`.
3. confirm an `open` unreplied alert is created for the dummy customer.
4. call `GET /api/admin/alerts?status=open`.
5. call `POST /api/admin/alerts/notify-open`.
6. confirm `MockStaffNotifier` observed the dummy alert notification.
7. recreate the Supabase runtime bundle and call `GET /api/admin/alerts?status=notified`.
8. confirm the alert remains `notified`.

## Test Content

New and updated coverage:

- runtime factory returns alert repository for both in-memory and Supabase modes.
- default runtime remains in-memory.
- API alerts route uses injected customer/message/alert bundle.
- explicit `alertRepository` injection remains higher priority.
- staging smoke test is skipped by default.
- staging smoke script does not enable real LINE push or OpenAI.

## Staging Smoke Result

Succeeded on staging.

Verified:

- staging env verification passed.
- schema verification passed.
- service_role grants verification passed.
- dummy data verification passed.
- unreplied check created/detected a dummy alert.
- alert list returned the dummy open alert.
- notify-open used `MockStaffNotifier`.
- alert status persisted as `notified` after restart-equivalent reread.

## RLS/Auth/JWT State

- RLS enabled tables remain `0/12`.
- RLS policies remain `0`.
- Supabase Auth/JWT is not connected.
- selectedTenantId production transport is not connected.
- production dev_header rejection is not implemented.

Production remains No-Go.

## LINE/OpenAI State

- `LINE_REAL_PUSH_ENABLED=false`.
- `AI_PROVIDER=mock`.
- No real LINE API send was performed.
- No OpenAI API call was performed.

## Result

- staging env verification passed.
- psql absolute path version check passed: `/usr/local/opt/libpq/bin/psql`.
- staging schema verification passed.
- staging service_role grants verification passed.
- staging dummy data verification passed.
- staging alerts smoke passed.
- `git diff --check` passed.
- `npx pnpm@10.12.1 lint` passed.
- `npx pnpm@10.12.1 typecheck` passed.
- `npx pnpm@10.12.1 test` passed: 60 files passed, 1 skipped / 397 tests passed, 2 skipped.
- `npx pnpm@10.12.1 test:integration` passed: 60 files passed, 1 skipped / 397 tests passed, 2 skipped.
- `npx pnpm@10.12.1 build` passed: 10 packages successful. Existing Next.js ESLint plugin warning appeared, but build succeeded.

## Remaining Risks

- RLS/Auth/JWT are not implemented.
- production readiness remains No-Go.
- knowledge_pages/RAG runtime switch is not implemented.
- staff/auth runtime switch is not implemented.
- staging smoke uses dummy data only.

## Next Loop Candidate

Loop 085: Supabase knowledge/RAG runtime boundary

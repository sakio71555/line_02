# Loop 079: Staging Verification Edition Completion Milestone

## Goal

Supabase staging DB上でdummy customers/messagesの永続化検証を行い、staging検証版を100%前後まで進める。

これはproduction readinessではない。RLS、Auth/JWT、本物LINE送信、OpenAI実接続は行わない。

## Scope

- Loop 078 commitをpushする。
- `.env.staging` を値非表示でverifyする。
- psql absolute pathを確認する。
- staging schema verificationを再確認する。
- rollback/recovery runbookを追加する。
- staging dummy seed scriptを追加する。
- staging dummy data verification scriptを追加する。
- customer/message repository bundleをAPI factoryへ注入できる境界を追加する。
- default `in_memory` 維持testを追加する。
- staging API smoke helperを追加する。
- README、dev loop、runbooks、dev logを更新する。

## Out Of Scope

- production Supabase接続
- production key利用
- real customer data投入
- real LINE userId投入
- RLS SQL実装
- Supabase Auth/JWT実装
- selectedTenantId transport実装
- alerts/knowledge/staff/auth runtime switch
- LINE API実送信
- OpenAI API実接続
- migration repair / reset

## Staging Verification Definition

- staging DB schema applied: done in Loop 078.
- dummy seed: added and executed.
- customers/messages can be tested through Supabase runtime bundle.
- default runtime remains `in_memory`.
- LINE/OpenAI remain mock/disabled.
- RLS is not implemented and production remains No-Go.

## Push Result

- Loop 078 commit was pushed at the beginning of the attempt.
- No force push, reset, or stash was used.

## Rollback / Recovery Runbook

Added:

```text
docs/15_runbooks/supabase_staging_rollback_recovery.md
```

It records staging-only stop conditions, schema mismatch handling, dummy seed failure handling, and the rule not to use `supabase db reset`, migration repair, or manual SQL without a separate explicit Loop.

## Dummy Seed

Added:

```text
scripts/dev-loop/seed-staging-dummy-data.mjs
scripts/dev-loop/verify-staging-dummy-data.mjs
```

Seed result:

- tenant upserted: 1
- customers upserted: 2
- messages upserted: 5
- knowledge pages upserted: 10

The data is dummy-only and uses dummy LINE markers.

## API Runtime Boundary

`apps/api/src/index.ts` now accepts a `customerMessageRepositories` bundle.

This keeps the API free of a new `@amami-line-crm/db` package dependency while allowing staging smoke tests to inject a Supabase customer/message bundle.

Priority:

1. explicit `customerRepository` / `messageRepository` injection
2. `customerMessageRepositories` bundle
3. module-level in-memory defaults

## Default In-Memory

- `REPOSITORY_RUNTIME`未指定: existing in-memory behavior.
- `REPOSITORY_RUNTIME=in_memory`: existing in-memory behavior.
- Supabase bundle is used only when explicitly injected for staging smoke.

## Initial No-Go

Initial staging API smoke failed with:

```text
SupabaseRepositoryError
table: customers
operation: listByTenant
code: 42501
```

Direct psql migration, seed, and verification had succeeded. The failure was treated as a PostgREST service_role grant gap and recovered in Loop 079.1.

## Final Result

Final milestone result is recorded in:

```text
docs/15_runbooks/supabase_staging_verification_final_record.md
```

## RLS State

- RLS enabled tables: `0/12`.
- Policies count: `0`.
- RLS SQL is not implemented.
- Production readiness remains No-Go.

## Test / Build Result

Final command results are recorded in Loop 079.1.

## Remaining Risks

- RLS/Auth/JWT are not implemented.
- production dev header rejection is not implemented.
- alerts/knowledge/staff/auth runtime switch is not implemented.
- staging dummy data is not production data.

## Next Loop Candidates

```text
Loop 080: RLS/Auth production readiness plan
Loop 081: Supabase alerts/knowledge staging runtime plan
Loop 082: staging manual verification checklist update
```

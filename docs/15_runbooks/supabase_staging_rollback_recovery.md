# Supabase Staging Rollback / Recovery

## Purpose

Supabase staging migration apply後、runtime switchやdummy seed検証で問題が出た場合の停止・復旧判断を整理する。

このrunbookはstaging専用です。production DB、production key、実顧客データ、実LINE userIdは扱いません。

## Audience

- staging検証を進める開発者
- migration apply後にschema mismatchやdummy seed失敗を確認する人
- runtime switch前のGo / No-Goを判断する人

## Staging Only

- 対象はstaging Supabase projectのみ。
- production projectでは実行しない。
- secret、DB URL、project ref、database password、`.env.staging` の値をdocsへ書かない。
- RLS core tablesはLoop 095Bでstaging apply済みだが、authenticated role / JWT smoke未完了のため、production readinessはNo-Goのまま扱う。

## Rollbackが必要なケース

- migration適用後に必須table / column / indexが不足している。
- customers/messages repository mappingとschemaが一致しない。
- direct `psql` では読めるが Supabase REST / PostgREST で `42501 permission denied` が出る。
- dummy seedがFK/check制約で失敗し、修正にmigration変更が必要になる。
- staging runtimeでtenant_id分離を守れない。
- `.env.staging` がgit管理対象になりそう。
- production接続の疑いがある。

## Runtime Switch前の停止条件

- `verify-staging-env` が失敗する。
- psql absolute pathが使えない。
- `verify-staging-schema` が失敗する。
- dummy seedに実顧客情報や実LINE userIdが必要になる。
- default runtimeを `in_memory` から変える必要がある。
- customers/messages以外のalerts、knowledge、staff/authへruntime switchが波及する。
- RLS SQL、Auth/JWT、LINE/OpenAI本接続が必要になる。

## Schema Mismatch時の対応

1. その場でmigration repairや手動SQLを実行しない。
2. mismatch内容をsecretなしで記録する。
3. 既存migrationが原因か、repository mappingが原因かを切り分ける。
4. 修正が必要な場合は、schema sync専用Loopを作る。
5. 修正後に `verify-staging-schema` を再実行する。

## Dummy Seed失敗時の対応

1. seed scriptの出力にsecretやDB URLが出ていないことを確認する。
2. FK/check制約違反なら、実schemaに合わせてdummy値だけを修正する。
3. migration SQL変更が必要な場合はこのLoopで続行しない。
4. seedはidempotentに保ち、再実行で重複しないようにする。

## PostgREST 42501時の対応

`psql` でmigration apply、seed、verificationが成功しているのに、Supabase REST / PostgREST経由で `42501 permission denied` が出る場合は、RLSではなくtable/schema grants不足を疑う。

Loop 079.1では以下の方針で回復した。

- `service_role` にだけ `public` schema usageを付与する。
- `service_role` にだけcore staging tablesの `select, insert, update, delete` を付与する。
- `service_role` にだけpublic sequencesの `usage, select` を付与する。
- `anon` / `authenticated` に広いtable DML grantを付けない。
- RLS SQLやpolicyは追加しない。

検証には以下を使う。

```text
scripts/dev-loop/verify-staging-postgrest-grants.mjs
```

RLSは未実装のため、service role grants recovery後もproduction readinessはNo-Goのままにする。

Loop 080の [RLS/Auth Production Readiness](rls_auth_production_readiness.md) で、production No-Go理由をRLS未実装、Supabase Auth/JWT未接続、selectedTenantId再検証未接続、production dev_header rejection未実装として整理している。rollback/recovery中にこれらをまとめて実装しない。

Loop 094Aでは `packages/db/migrations/0003_rls_core_tables.sql` をRLS SQL draftとして追加したが、staging applyは未実施。rollback/recovery中にRLS draftをその場でapplyしない。RLS applyが必要な場合は、local/staging apply verification専用Loopで、dummy staff Auth context、tenant A/B境界、anon拒否、service_role bypass前提のrepository filterを確認してから進める。詳細は [Loop 094A: RLS SQL Draft Review](../11_codex_tasks/094a_rls_sql_draft_review.md) を参照する。

Loop 095AではRLS staging apply前のGo/No-Go、apply予定手順、apply後verification、staging smoke、rollback/recovery方針を整理した。RLS rollbackが必要な場合も、その場で即席SQLを書かず、別Loopで明示許可を取る。詳細は [Loop 095A: RLS Staging Apply Plan](../11_codex_tasks/095a_rls_staging_apply_plan.md) と [RLS Staging Apply Plan](rls_staging_apply_plan.md) を参照する。

Loop 095Bでは `0003_rls_core_tables.sql` のstaging applyとRLS verificationが成功したため、rollback/recoveryは実行していない。RLS enabled/forced `9/9`、policies `14/14`、service_role grants維持、既存staging smoke成功を確認した。今後RLS rollbackが必要になった場合も、このrunbook内で即席SQLを作らず、別Loopで明示許可を取る。詳細は [Loop 095B: RLS Staging Apply Execution Gate](../11_codex_tasks/095b_rls_staging_apply_execution_gate.md) を参照する。

## DBを作り直す判断

staging DBを作り直す判断は別Loopで行う。

- `supabase db reset` を勝手に使わない。
- migration repair、manual SQL、staging project再作成は明示許可が必要。
- 実行する場合は、事前に影響、対象環境、rollback不能リスクをdocsへ記録する。

## Next Conditions

次へ進む条件:

- `.env.staging` verificationが値非表示で通る。
- psql absolute pathが確認済み。
- schema verificationが通る。
- dummy seedとdummy verificationが通る。
- customers/messagesだけがSupabase runtime境界で検証できる。
- default runtimeは `in_memory` のまま。
- LINE/OpenAIはmock/disabledのまま。
- RLS staging apply済みでもauthenticated role / JWT smoke未完了によるproduction No-Goが明記されている。

## Related Docs

- [Supabase Staging Persistence Checklist](supabase_staging_persistence_checklist.md)
- [Supabase Staging Migration Apply Result](supabase_staging_migration_apply_result.md)
- [Supabase Staging Verification Final Record](supabase_staging_verification_final_record.md)
- [RLS/Auth Production Readiness](rls_auth_production_readiness.md)
- [RLS Staging Apply Plan](rls_staging_apply_plan.md)
- [Loop 095B: RLS Staging Apply Execution Gate](../11_codex_tasks/095b_rls_staging_apply_execution_gate.md)

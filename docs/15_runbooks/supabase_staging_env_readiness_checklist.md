# Supabase Staging Env Readiness Checklist

## Purpose

Supabase staging projectへ接続する前に、env名、key管理、project分離、migration apply前確認、dummy seed、runtime switch前条件を確認するためのrunbookです。

これは接続手順ではありません。今回の段階ではSupabase接続、`.env` 作成、migration apply、runtime switchは行いません。

## Audience

- 開発者
- staging検証を準備する担当者
- Supabase project / keyを扱う担当者
- 社内確認版から永続化検証版へ進める判断者

## Preconditions Before Any Connection

- runtimeはまだin-memory。
- Supabase repositoriesは存在するがAdmin API runtimeには未接続。
- migration applyは未実行。
- RLS SQLは未実装。
- Supabase Auth/JWTは未接続。
- selectedTenantId transportは未実装。
- 実顧客情報、LINE userId、API key、本番ログを使わない。

## Required Env Names

値は書かない。名前だけ確認する。

| env名 | 用途 | stagingで必要か | productionで必要か | browserに出してよいか |
| --- | --- | --- | --- | --- |
| `SUPABASE_URL` | Supabase project URL | yes | yes | yes/限定 |
| `SUPABASE_ANON_KEY` | anon/Auth client用 | yes | yes | yes/公開前提だが注意 |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side repository用 | yes | yes | no |
| `SUPABASE_DB_URL` | migration/local DB検証用 | maybe | maybe | no |

## Staging Project Check

- project名または識別子でstagingと分かる。
- project refを声出し確認する。
- production projectではない。
- dummy tenantのみを使う。
- dummy customerのみを使う。
- 本番LINE channelとは接続しない。
- OpenAI本番課金APIとは接続しない。
- staging projectのkeyをproduction docsへ貼らない。

## Production Project Misuse Prevention

- staging検証でproduction projectを使わない。
- production keyをlocal/staging検証に使わない。
- production keyをCodexへ貼らない。
- production keyをREADME、docs、dev logへ書かない。
- production projectへmigration applyする前にRLS/Auth/JWT/backup/rollbackを別Loopで確認する。

## Key Management

- 実keyを書かない。
- 実keyをCodexに貼らない。
- 実keyをREADMEに書かない。
- 実keyをdev logに書かない。
- `.env` と `.env.local` をgitに入れない。
- service role keyはserver-sideだけで使う。
- service role keyをbrowser / LIFF / Next.js client componentへ出さない。
- staging keyとproduction keyを混ぜない。
- key漏洩の可能性がある場合は即rotateする。

## `.env` Operation

- 今回 `.env` は作らない。
- `.env` はlocal developerごとに作る。
- `.env.local` もgit管理しない。
- `.env.staging.example` はLoop 074で追加済み。
- 実値入力は `.env.staging.example` をコピーした `.env.staging` に作業者がローカルで行う。
- `.env.staging` はgit管理しない。
- `.env.example` / `.env.staging.example` には実keyを書かない。
- staging用とproduction用を分ける。
- key値はdocsに残さない。
- terminal historyにkey値が残るコマンドを避ける。

Staging env templateの使い方は [Staging Env Template Setup](staging_env_template_setup.md) を参照する。実key、project ref、DB URL、LINE token、OpenAI API keyはdocs / README / dev log / Codexへ書かない。

## Before Migration Apply

- Loop 070 dry-run記録を確認する。
- `packages/db/migrations/0001_initial_schema.sql` のschema inventory、tenant_id index、customers/messages repository期待値、RLS SQL未実装状態が記録済みである。
- Loop 071 apply planを確認する。
- apply承認条件、禁止コマンド、rollback / recovery、Go / No-Go判断、結果記録テンプレートが記録済みである。
- Supabase projectがstagingであることを確認する。
- production projectではないことを確認する。
- project refを声出し確認する。
- migration SQLを確認する。
- schema差分を確認する。
- dummy seedだけを使う。
- 実顧客情報を使わない。
- LINE userIdを使わない。
- service role keyの保存場所を確認する。
- rollback方針を確認する。
- RLS有無を確認する。
- RLSなしでproductionへ進まない。
- apply前に `git status --short` がclean。
- apply前にlint / typecheck / testが成功。
- apply結果をdev logに秘密情報なしで記録する。

## Dummy Seed Policy

使ってよいもの:

- 架空の顧客名
- 架空の問い合わせ
- 架空のmessage
- `tenant_amamihome` のdummy tenant
- 静的knowledge fixture
- 個人情報を含まない実在URL

使ってはいけないもの:

- 実顧客名
- 電話番号
- 住所
- LINE userId
- メールアドレス
- 契約情報
- 本番ログ
- API key

## Runtime Switch Pre-check

- Loop 067でcustomers/messagesのruntime mode / bundle / factory境界は追加済み。
- default runtimeは引き続きin-memoryで、Supabase実接続やAPI route差し替えはまだ行っていない。
- customers/messages repository integration testがある。
- tenant_id filterが効いている。
- demo seed相当のstaging seed方針がある。
- API route単位でin-memoryとSupabaseを切り替える境界がある。
- fallback / rollback方針がある。
- loggingでkeyや個人情報が出ない。
- test dataだけで確認する。
- RLSなしの状態をproductionへ持ち込まない。

## Tool Readiness

Loop 026の記録:

- Supabase CLI: available
- Docker CLI: available
- Docker daemon: unavailable
- `psql`: not found
- `supabase/` config: not found

次にmigration dry-runやstaging接続へ進むLoopでは、接続前にtool状態を再確認する。今回のrunbook作成ではtool確認コマンドを実行しない。

## Do Not Do In This Runbook

- Supabaseへ接続しない。
- `supabase link` しない。
- migration applyしない。
- `.env` を作らない。
- `.env.local` を作らない。
- `.env.example` を変更しない。
- 実keyを入力しない。
- runtime switchしない。
- RLS SQLを書かない。
- production projectを使わない。

## Ready To Proceed When

- このrunbookのstaging project、key管理、dummy seed、migration apply前チェックを人間が確認済み。
- `git status --short` がclean。
- lint / typecheck / testが成功。
- 実keyや実顧客情報がdocs / dev log / fixtureに入っていない。
- 次LoopのScopeが接続、migration、runtime switchのどれか1つに絞られている。

## Related Docs

- [Loop 065: Supabase Persistence Staging Plan](../11_codex_tasks/065_supabase_persistence_staging_plan.md)
- [Loop 066: Supabase Staging Env Readiness Checklist](../11_codex_tasks/066_supabase_staging_env_readiness_checklist.md)
- [Loop 067: Supabase Runtime Switch Boundary for Customers/Messages](../11_codex_tasks/067_supabase_runtime_switch_boundary_customers_messages.md)
- [Loop 070: Staging Migration Dry-run Record](../11_codex_tasks/070_staging_migration_dry_run_record.md)
- [Loop 071: Supabase Staging Migration Apply Plan](../11_codex_tasks/071_supabase_staging_migration_apply_plan.md)
- [Loop 073: Supabase Staging Migration Apply Execution Gate](../11_codex_tasks/073_supabase_staging_migration_apply_execution_gate.md)
- [Loop 074: Staging Env Template And Provider Flags](../11_codex_tasks/074_staging_env_template_and_provider_flags.md)
- [Supabase Staging Persistence Checklist](supabase_staging_persistence_checklist.md)
- [Staging Env Template Setup](staging_env_template_setup.md)
- [Supabase Staging Migration Dry-run](supabase_staging_migration_dry_run.md)
- [Supabase Staging Migration Apply Plan](supabase_staging_migration_apply_plan.md)
- [Supabase Staging Migration Apply Result Template](supabase_staging_migration_apply_result_template.md)
- [Supabase Local Migration Test Runbook](supabase_local_migration_test.md)

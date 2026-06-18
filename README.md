# amami-line-crm

アマミホーム向けの「AI顧客カルテ付きLINE相談CRM」です。LINE公式アカウント、Webhook、Web管理画面、LIFFフォーム、AI要約・返信下書きをつなぎ、顧客ごとの相談履歴をカルテとして管理します。

## 初期tenant

- `tenant_id`: `tenant_amamihome`
- `tenant_slug`: `amamihome`
- `official_domain`: `amamihome.net`

初期導入先はアマミホーム1社ですが、将来ほかの工務店にも販売できるように、Phase 0からすべての主要データを `tenant_id` で分離します。

## 技術構成

- package manager: pnpm
- monorepo: pnpm workspace + Turborepo
- 管理画面: `apps/admin` Next.js
- API: `apps/api` Hono
- LIFF: `apps/liff` Next.js
- DB想定: Supabase PostgreSQL
- Storage想定: Supabase Storage
- AI: OpenAI API、Responses API前提の `AiProvider` 抽象化
- LINE: LINE Messaging API、Webhook、LIFF
- Test: Vitest
- E2E: 後続PhaseでPlaywright導入予定
- Lint/format: ESLint + Prettier

## セットアップ予定

Phase 0では開発レールと雛形だけを作ります。Supabase、LINE、OpenAIの本番接続はまだ行いません。

```bash
npx pnpm@10.12.1 install
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
```

この環境ではdirect `pnpm` や `corepack` が使えない可能性があるため、当面は `npx pnpm@10.12.1 ...` を標準コマンドとします。将来的に `corepack enable` などでpnpmが直接使える環境になった場合は、同じscriptを `pnpm install` や `pnpm lint` のようなdirect `pnpm` コマンドへ置き換えて構いません。

## 開発コマンド

- `npx pnpm@10.12.1 dev`: 各アプリのdev serverを起動
- `npx pnpm@10.12.1 build`: monorepo全体のbuild
- `npx pnpm@10.12.1 lint`: ESLint
- `npx pnpm@10.12.1 typecheck`: TypeScript typecheck
- `npx pnpm@10.12.1 test`: Vitest
- `npx pnpm@10.12.1 test:integration`: integration test
- `npx pnpm@10.12.1 format`: Prettier

## ローカル管理画面確認

ローカル確認ではAPIを先に起動し、開発専用のin-memory demo seedを投入してからadmin画面を開きます。現在のローカルデモMVPでは、顧客一覧、顧客詳細/timeline、AI/RAG mock、担当者返信mock、alerts操作mock、Auth placeholderを確認できます。

API server:

```bash
TENANT_ID=tenant_amamihome TENANT_SLUG=amamihome npx pnpm@10.12.1 --filter @amami-line-crm/api dev
```

Admin server:

```bash
API_BASE_URL=http://localhost:4000 TENANT_ID=tenant_amamihome npx pnpm@10.12.1 --filter @amami-line-crm/admin dev
```

Demo data seed:

```bash
curl -X POST http://localhost:4000/api/dev/seed-demo-data \
  -H "x-tenant-id: tenant_amamihome"
```

その後、以下を確認します。

- `http://localhost:3000`: Demo flow、主要導線、mock/未接続範囲
- `http://localhost:3000/customers`: デモ顧客一覧
- `http://localhost:3000/customers/customer_demo_yamada_taro`: 未返信っぽいデモ顧客の詳細・タイムライン
- `http://localhost:3000/customers/customer_demo_sato_hanako`: 返信済みっぽいデモ顧客の詳細・タイムライン
- `http://localhost:3000/alerts`: 未返信チェック、alert一覧、open alert通知mock
- `http://localhost:3000/login`: 認証placeholder
- `http://localhost:3000/select-tenant`: テナント選択placeholder

`API_BASE_URL` はadminが参照するAPIのURL、`TENANT_ID` はadmin APIへ送る開発用tenantです。demo seedはin-memoryの開発確認専用で、API processを再起動すると消えます。`APP_ENV=production` または `NODE_ENV=production` では使えません。

詳しいローカル手動確認は [docs/15_runbooks/local_manual_test_checklist.md](docs/15_runbooks/local_manual_test_checklist.md) を参照してください。demo seedはin-memoryであり、API process再起動で消えます。本物のLINE API、OpenAI API、Supabaseはまだ呼びません。

Loop 056.1ではlocal demo manual verification recordを追加しました。API/Admin起動、demo seed、主要Admin API、Admin UI route、mock/未接続範囲の確認結果を記録しています。詳細は [docs/11_codex_tasks/056_1_local_demo_manual_verification_record.md](docs/11_codex_tasks/056_1_local_demo_manual_verification_record.md) を参照してください。

Loop 056.2ではlocal demo RAG knowledge seed verification patchを実施しました。demo seed後にRAG search / answer draftでsource付き確認ができるようにし、runbookへ確認keywordと期待結果を追記しました。ただしWeb crawl、embedding、pgvector、OpenAI実接続は未実装です。詳細は [docs/11_codex_tasks/056_2_local_demo_rag_knowledge_seed_verification_patch.md](docs/11_codex_tasks/056_2_local_demo_rag_knowledge_seed_verification_patch.md) を参照してください。

Loop 056.3では、初心者でも分かりやすいPOPなAdmin UIへ進めるためのdocs-only方針を追加しました。まだUI実装は変更していません。今後の画面改善では [docs/16_design/beginner_friendly_pop_admin_ui.md](docs/16_design/beginner_friendly_pop_admin_ui.md) と [docs/11_codex_tasks/056_3_beginner_friendly_pop_admin_ui_direction.md](docs/11_codex_tasks/056_3_beginner_friendly_pop_admin_ui_direction.md) を参照します。

Loop 058ではbeginner-friendly Admin top polishを実施しました。ローカルデモの入口として、顧客一覧、未返信アラート、デモの流れ、デモ用/一時保存/本番未接続の範囲が初心者にも分かるようAdminトップを整理しました。詳細は [docs/11_codex_tasks/058_beginner_friendly_admin_top_polish.md](docs/11_codex_tasks/058_beginner_friendly_admin_top_polish.md) を参照してください。

Loop 059ではcustomer detail action cards POP UIを実施しました。顧客詳細のAI要約、返信下書き、ホームページ情報からの回答案、担当者返信を初心者向けカードUIとして整理しました。ただしAPI挙動、本物LINE送信、OpenAI実接続は未変更です。詳細は [docs/11_codex_tasks/059_customer_detail_action_cards_pop_ui.md](docs/11_codex_tasks/059_customer_detail_action_cards_pop_ui.md) を参照してください。

Loop 060ではalerts page beginner-friendly polishを実施しました。未返信アラート画面を、対応が必要な相談の確認、未返信チェック、デモ通知、本物通知未接続が初心者にも分かるよう整理しました。ただし通知ロジックやAPI挙動は未変更です。詳細は [docs/11_codex_tasks/060_alerts_page_beginner_friendly_polish.md](docs/11_codex_tasks/060_alerts_page_beginner_friendly_polish.md) を参照してください。

Loop 061ではAmami Home internal review edition readinessを追加しました。社内確認版として、確認順、できること/まだできないこと、mock/未接続範囲、フィードバック項目をrunbook化しました。実API接続や本番認証は未実装です。詳細は [docs/15_runbooks/amami_home_internal_review_checklist.md](docs/15_runbooks/amami_home_internal_review_checklist.md) と [docs/11_codex_tasks/061_amami_home_internal_review_edition_readiness.md](docs/11_codex_tasks/061_amami_home_internal_review_edition_readiness.md) を参照してください。

Loop 061.1ではinternal review feedback triageを追加しました。アマミホーム社内確認で出た意見を、UI/業務/AI/RAG/LINE/通知/認証/永続化などに分類し、priority/severity/effortを付けて次Loopへ落とす運用をdocs化しました。詳細は [docs/15_runbooks/internal_review_feedback_triage.md](docs/15_runbooks/internal_review_feedback_triage.md)、[docs/15_runbooks/internal_review_feedback_log.md](docs/15_runbooks/internal_review_feedback_log.md)、[docs/11_codex_tasks/061_1_internal_review_feedback_triage.md](docs/11_codex_tasks/061_1_internal_review_feedback_triage.md) を参照してください。

Loop 062ではAmami Home internal review final readiness hardeningを実施しました。主要画面/API/RAG source付き確認、mock/未接続表記、feedback導線を確認し、社内確認版としての最終確認記録を追加しました。詳細は [docs/15_runbooks/amami_home_internal_review_final_verification.md](docs/15_runbooks/amami_home_internal_review_final_verification.md) と [docs/11_codex_tasks/062_amami_home_internal_review_final_readiness_hardening.md](docs/11_codex_tasks/062_amami_home_internal_review_final_readiness_hardening.md) を参照してください。

Loop 063ではstaff reply safety confirmation planを追加しました。担当者返信を将来本物LINE送信へ接続する前に、AI下書きと送信の分離、送信前確認、デモ送信/本番送信の表示、誤送信・二重送信・送信失敗時の方針をdocs化しました。LINE API実送信は未実装です。詳細は [docs/16_design/staff_reply_safety_confirmation.md](docs/16_design/staff_reply_safety_confirmation.md) と [docs/11_codex_tasks/063_staff_reply_safety_confirmation_plan.md](docs/11_codex_tasks/063_staff_reply_safety_confirmation_plan.md) を参照してください。

Loop 064ではstaff reply confirmation UI placeholderを追加しました。担当者返信で、送信前確認カードと確認checkboxを挟み、デモ保存前に宛先・利用先・本文・本物LINE未送信を確認できるようにしました。LINE API実送信は未実装です。詳細は [docs/11_codex_tasks/064_staff_reply_confirmation_ui_placeholder.md](docs/11_codex_tasks/064_staff_reply_confirmation_ui_placeholder.md) を参照してください。

## Codex開発ループ

このプロジェクトはループエンジニアリングで開発します。広範囲の機能を一度に実装せず、`docs/11_codex_tasks/` の小さいタスクを1つずつ完了し、テストを通してから次へ進みます。

- Codex運用ルール: [docs/15_runbooks/codex_development_kit.md](docs/15_runbooks/codex_development_kit.md)

Loop 072ではGPT-Codex handoff automation scaffoldを追加しました。repo状態・最新Loop・dev logを収集し、Codexへ貼るprompt下書きをproject `tmp/` 配下へ生成するscriptsとrunbookを追加しました。Codex自動実行、OpenAI API呼び出し、commit/push自動化は未実装です。詳細は [docs/15_runbooks/gpt_codex_handoff_automation.md](docs/15_runbooks/gpt_codex_handoff_automation.md) と [docs/11_codex_tasks/072_gpt_codex_handoff_automation_scaffold.md](docs/11_codex_tasks/072_gpt_codex_handoff_automation_scaffold.md) を参照してください。

1. `docs/11_codex_tasks/` の対象タスクを読む。
2. Scopeに書かれた範囲だけ実装する。
3. Out of scopeに書かれたものは実装しない。
4. 必要なテストを追加する。
5. `npx pnpm@10.12.1 lint` を実行する。
6. `npx pnpm@10.12.1 typecheck` を実行する。
7. `npx pnpm@10.12.1 test` を実行する。
8. 失敗した場合は原因を修正して再実行する。
9. READMEまたはdocsを必要に応じて更新する。
10. 変更ファイル、実行コマンド、残リスク、次タスクを報告する。

理想サイズは、DBテーブル定義だけ、LINE Webhook署名検証だけ、メッセージ保存だけ、顧客一覧APIだけ、AI要約Providerだけのような単位です。LINE BOT全体、管理画面、AI、RAG、LIFFをまとめて作る進め方は禁止です。

## 本番接続について

Phase 0では以下を行いません。

- LINE本番API呼び出し
- OpenAI APIの実呼び出し
- Supabase本番接続
- 本番ドメイン設定
- LIFF本番登録
- Webスクレイピング
- RAG embedding生成

LINE実機テストが必要になったら、開発段階では本番ドメインを用意せず、ngrokまたはCloudflare TunnelでWebhook URLを一時公開します。

## Supabase永続化について

Supabase PostgreSQLはDB想定ですが、現時点ではin-memory repositoryで動作しており、Supabase永続化は未実装です。Loop 020では実装前の導入計画だけを追加しました。詳細は [docs/11_codex_tasks/020_supabase_persistence_planning.md](docs/11_codex_tasks/020_supabase_persistence_planning.md) を参照してください。

Loop 021では `packages/db` にserver-side Supabase client boundaryを追加しました。ただし、まだrepository、API route、admin UI、LIFFには接続していません。詳細は [docs/11_codex_tasks/021_supabase_client_boundary.md](docs/11_codex_tasks/021_supabase_client_boundary.md) を参照してください。

Loop 022では `CustomerRepository` / `MessageRepository` に対応するSupabase版repositoryを追加しました。ただし、まだAPI routeやUIには接続しておらず、既存runtimeはin-memoryのままです。詳細は [docs/11_codex_tasks/022_supabase_customer_message_repository.md](docs/11_codex_tasks/022_supabase_customer_message_repository.md) を参照してください。

Loop 022.1では `customers.last_customer_message_at` を初期migrationへ追加し、domain `Customer` とSupabase customer mappingの差異を解消しました。詳細は [docs/11_codex_tasks/022_1_customer_schema_sync.md](docs/11_codex_tasks/022_1_customer_schema_sync.md) を参照してください。

Loop 023では `AlertRepository` に対応するSupabase版repositoryを追加しました。ただし、まだAPI routeやUIには接続しておらず、既存runtimeはin-memoryのままです。詳細は [docs/11_codex_tasks/023_supabase_alert_repository.md](docs/11_codex_tasks/023_supabase_alert_repository.md) を参照してください。

Loop 024では `KnowledgePageRepository` に対応できるSupabase版repositoryを追加しました。ただし、まだAPI route、UI、RAG実行経路には接続しておらず、既存runtimeはin-memoryのままです。詳細は [docs/11_codex_tasks/024_supabase_knowledge_repository.md](docs/11_codex_tasks/024_supabase_knowledge_repository.md) を参照してください。

Loop 025ではSupabase RLS policy planを追加しました。ただし、まだRLS SQL実装、migration変更、Supabase接続、API差し替えは行っていません。詳細は [docs/11_codex_tasks/025_supabase_rls_policy_plan.md](docs/11_codex_tasks/025_supabase_rls_policy_plan.md) を参照してください。

Loop 026ではSupabase local migration testの手順を整理しました。現在の環境ではDocker daemonが使えず `psql` もないため、実DBへのmigration適用は未実行で、SQL validation testを強化しています。詳細は [docs/11_codex_tasks/026_supabase_local_migration_test.md](docs/11_codex_tasks/026_supabase_local_migration_test.md) と [docs/15_runbooks/supabase_local_migration_test.md](docs/15_runbooks/supabase_local_migration_test.md) を参照してください。

Loop 065ではSupabase persistence staging planを追加しました。社内確認版のin-memory制約を解消するため、customers/messages/alerts/knowledgeなどの永続化優先順位、local/staging/production分離、env/key管理、migration apply前チェックリストを整理しました。Supabase接続やmigration applyは未実施です。詳細は [docs/11_codex_tasks/065_supabase_persistence_staging_plan.md](docs/11_codex_tasks/065_supabase_persistence_staging_plan.md) と [docs/15_runbooks/supabase_staging_persistence_checklist.md](docs/15_runbooks/supabase_staging_persistence_checklist.md) を参照してください。

Loop 066ではSupabase staging env readiness checklistを追加しました。staging Supabaseへ接続する前に、必要env名、key管理、staging/production分離、migration apply前チェック、dummy seed方針、runtime switch前条件を整理しました。Supabase接続、`.env` 作成、migration applyは未実施です。詳細は [docs/11_codex_tasks/066_supabase_staging_env_readiness_checklist.md](docs/11_codex_tasks/066_supabase_staging_env_readiness_checklist.md) と [docs/15_runbooks/supabase_staging_env_readiness_checklist.md](docs/15_runbooks/supabase_staging_env_readiness_checklist.md) を参照してください。

Loop 067ではcustomers/messagesのSupabase runtime switch boundaryを追加しました。default in-memoryを維持したまま、将来Supabase repositoryへ切り替えるためのruntime mode、bundle、factory、env不足時error境界を追加しました。Supabase実接続、`.env` 作成、migration apply、API runtime差し替えは未実施です。詳細は [docs/11_codex_tasks/067_supabase_runtime_switch_boundary_customers_messages.md](docs/11_codex_tasks/067_supabase_runtime_switch_boundary_customers_messages.md) を参照してください。

Loop 068ではSupabase repository integration tests with fake clientを追加しました。実DB接続なしで、customers/messages repositoryのtenant_id filter、mapping、timeline order、error handling、runtime bundleをfake clientで検証しました。Supabase実接続、`.env` 作成、migration apply、API runtime switchは未実施です。詳細は [docs/11_codex_tasks/068_supabase_repository_integration_tests_fake_client.md](docs/11_codex_tasks/068_supabase_repository_integration_tests_fake_client.md) を参照してください。

Loop 070ではSupabase staging migration apply前の静的dry-run記録を追加しました。`packages/db/migrations/0001_initial_schema.sql` のschema inventory、tenant_id index、customers/messages repository期待値、RLS SQL未実装状態を確認しましたが、Supabase接続、`.env` 作成、migration apply、API runtime switch、git pushは行っていません。詳細は [docs/11_codex_tasks/070_staging_migration_dry_run_record.md](docs/11_codex_tasks/070_staging_migration_dry_run_record.md) と [docs/15_runbooks/supabase_staging_migration_dry_run.md](docs/15_runbooks/supabase_staging_migration_dry_run.md) を参照してください。

Loop 071ではSupabase staging migration apply planを追加しました。staging apply前の承認条件、禁止コマンド、rollback / recovery方針、apply後確認、Go / No-Go判断、結果記録テンプレートを整理しました。Supabase接続、migration apply、`.env` 作成、pushは未実施です。詳細は [docs/11_codex_tasks/071_supabase_staging_migration_apply_plan.md](docs/11_codex_tasks/071_supabase_staging_migration_apply_plan.md)、[docs/15_runbooks/supabase_staging_migration_apply_plan.md](docs/15_runbooks/supabase_staging_migration_apply_plan.md)、[docs/15_runbooks/supabase_staging_migration_apply_result_template.md](docs/15_runbooks/supabase_staging_migration_apply_result_template.md) を参照してください。

Loop 073ではSupabase staging migration apply execution gateを追加しました。migration apply実行前に、明示許可、staging project/env readiness、Go / No-Go、No-Go時の不足情報を確認する手順をdocs化しました。今回の判定はNo-Goで、Supabase接続、migration apply、`.env` 作成、pushは未実施です。詳細は [docs/11_codex_tasks/073_supabase_staging_migration_apply_execution_gate.md](docs/11_codex_tasks/073_supabase_staging_migration_apply_execution_gate.md) と [docs/15_runbooks/supabase_staging_migration_apply_execution_gate.md](docs/15_runbooks/supabase_staging_migration_apply_execution_gate.md) を参照してください。

Loop 074ではstaging env template and provider flagsを追加しました。Supabase staging用env templateと、LINE/OpenAIの将来用disabled/mock placeholderを `.env.staging.example` に整理しました。実key入力、`.env.staging` 作成、Supabase/LINE/OpenAI接続、runtime/API/UI/DB変更は未実施です。詳細は [docs/11_codex_tasks/074_staging_env_template_and_provider_flags.md](docs/11_codex_tasks/074_staging_env_template_and_provider_flags.md) と [docs/15_runbooks/staging_env_template_setup.md](docs/15_runbooks/staging_env_template_setup.md) を参照してください。

Loop 075ではstaging env local fill verificationを追加しました。ローカル `.env.staging` の必須項目と安全フラグを、値を表示せずに確認するscriptとrunbookを追加しました。Supabase接続、migration apply、LINE/OpenAI接続、runtime/API/UI/DB変更は未実施です。詳細は [docs/11_codex_tasks/075_staging_env_local_fill_verification.md](docs/11_codex_tasks/075_staging_env_local_fill_verification.md) と [docs/15_runbooks/staging_env_local_fill_verification.md](docs/15_runbooks/staging_env_local_fill_verification.md) を参照してください。

Loop 076では既存未push commitをGitHubへpushし、staging migration applyの実行可否を確認しました。`.env.staging` は値非表示で検証passしましたが、`psql` が使えないためmigration applyはNo-Goとして停止し、Supabase接続やmigration applyは行っていません。詳細は [docs/11_codex_tasks/076_supabase_staging_migration_apply_execution.md](docs/11_codex_tasks/076_supabase_staging_migration_apply_execution.md) と [docs/15_runbooks/supabase_staging_migration_apply_result.md](docs/15_runbooks/supabase_staging_migration_apply_result.md) を参照してください。

Loop 077ではpsql availability setup / apply preflightを追加しました。staging migration apply前に `psql` availabilityを確認し、`psql` 未導入時の手動準備runbookを追加しました。Codexはinstall、Supabase接続、migration apply、git pushを実行していません。詳細は [docs/11_codex_tasks/077_psql_availability_setup_apply_preflight.md](docs/11_codex_tasks/077_psql_availability_setup_apply_preflight.md) と [docs/15_runbooks/psql_availability_setup.md](docs/15_runbooks/psql_availability_setup.md) を参照してください。

Loop 078ではSupabase staging migration apply retryを実施しました。`psql` absolute pathを確認し、helper経由でmigration applyとschema verificationを実施して、主要table/column/indexを確認しました。RLSは未実装のためproductionは引き続きNo-Goです。結果は [docs/15_runbooks/supabase_staging_migration_apply_result.md](docs/15_runbooks/supabase_staging_migration_apply_result.md)、詳細は [docs/11_codex_tasks/078_supabase_staging_migration_apply_retry.md](docs/11_codex_tasks/078_supabase_staging_migration_apply_retry.md) を参照してください。

Loop 079ではstaging verification edition completion milestoneを実施しました。staging DBへdummy seedを投入し、customers/messagesをSupabase runtime bundleでAPI検証できるscriptとrunbookを追加しました。初回smokeではPostgREST `42501` が出たため、Loop 079.1で `service_role` 限定GRANT migrationを追加・適用し、staging API smokeを通しました。default runtimeは引き続き `in_memory` で、LINE/OpenAI/RLS/productionは未接続です。詳細は [docs/11_codex_tasks/079_staging_verification_edition_completion_milestone.md](docs/11_codex_tasks/079_staging_verification_edition_completion_milestone.md)、[docs/11_codex_tasks/079_1_staging_postgrest_grants_recovery.md](docs/11_codex_tasks/079_1_staging_postgrest_grants_recovery.md)、[docs/15_runbooks/supabase_staging_verification_final_record.md](docs/15_runbooks/supabase_staging_verification_final_record.md) を参照してください。

Loop 080ではRLS/Auth production readiness planを追加しました。staging検証版でservice_role前提のcustomers/messages永続化は確認済みですが、productionへ進むにはRLS、Supabase Auth/JWT、selectedTenantId再検証、production dev_header rejectionが必要であることを整理しました。RLS SQL、Auth接続、migration変更、API/UI/runtime変更は未実装です。詳細は [docs/11_codex_tasks/080_rls_auth_production_readiness_plan.md](docs/11_codex_tasks/080_rls_auth_production_readiness_plan.md) と [docs/15_runbooks/rls_auth_production_readiness.md](docs/15_runbooks/rls_auth_production_readiness.md) を参照してください。

Loop 081ではSupabase alerts/knowledge staging runtime planを追加しました。customers/messagesのstaging smoke後に、alerts、knowledge_pages、RAG search/answer draftをどの順でSupabase staging runtimeへ進めるかをdocs-onlyで整理しました。API runtime変更、migration変更、RLS SQL、Supabase接続は未実装です。詳細は [docs/11_codex_tasks/081_supabase_alerts_knowledge_staging_runtime_plan.md](docs/11_codex_tasks/081_supabase_alerts_knowledge_staging_runtime_plan.md) と [docs/15_runbooks/supabase_alerts_knowledge_staging_runtime_plan.md](docs/15_runbooks/supabase_alerts_knowledge_staging_runtime_plan.md) を参照してください。

Loop 082ではSupabase alert repository fake-client hardeningを追加しました。実DB接続なしで、alerts repositoryの `tenant_id` filter、open alert listing、active alert lookup、status update、error handlingをfake clientで検証しました。alerts runtime switchやDB変更は未実施です。詳細は [docs/11_codex_tasks/082_supabase_alert_repository_fake_client_hardening.md](docs/11_codex_tasks/082_supabase_alert_repository_fake_client_hardening.md) を参照してください。

Loop 083ではSupabase knowledge repository fake-client hardeningを追加しました。実DB接続なしで、knowledge_pages repositoryの `tenant_id` filter、`allowed_for_ai` filter、RAG search互換性、`url`/`title`/`content` mapping、error handlingをfake clientで検証しました。knowledge/RAG runtime switchやDB変更は未実施です。詳細は [docs/11_codex_tasks/083_supabase_knowledge_repository_fake_client_hardening.md](docs/11_codex_tasks/083_supabase_knowledge_repository_fake_client_hardening.md) を参照してください。

Loop 084ではSupabase alerts runtime boundaryとstaging smokeを追加しました。`REPOSITORY_RUNTIME=supabase` の明示時にcustomers/messages/alertsを同じSupabase-backed bundleで扱い、未返信チェック、alert一覧、notify-open mock、alert状態永続化をstagingで確認しました。default runtimeは `in_memory` のまま維持し、LINE/OpenAI/RLS/Auth/JWTは未接続です。詳細は [docs/11_codex_tasks/084_supabase_alerts_runtime_boundary.md](docs/11_codex_tasks/084_supabase_alerts_runtime_boundary.md) を参照してください。

Loop 085ではSupabase knowledge/RAG runtime boundaryとstaging smokeを追加しました。`REPOSITORY_RUNTIME=supabase` の明示時にknowledge_pagesをSupabase-backed bundleで扱い、RAG searchとRAG answer-draftが `tenant_id + allowed_for_ai=true` のsourceを使うことをstagingで確認しました。customers/messages/alerts/knowledge/RAGのstaging smokeが揃ったため、staging拡張検証版は100%相当に到達しました。default runtimeは `in_memory` のまま維持し、LINE/OpenAI/RLS/Auth/JWTは未接続です。詳細は [docs/11_codex_tasks/085_supabase_knowledge_rag_runtime_boundary.md](docs/11_codex_tasks/085_supabase_knowledge_rag_runtime_boundary.md) を参照してください。

Loop 086ではstaging拡張検証版100%相当からproduction hardeningへ進む前に、RLS/Auth/JWT/selectedTenantId/production dev_header rejection/LINE/OpenAI gateを分割するdocs-only planを追加しました。productionは引き続きNo-Goで、RLS SQL実装、Auth/JWT接続、API/UI/runtime変更、Supabase接続は行っていません。詳細は [docs/11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md](docs/11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md) と [docs/15_runbooks/production_hardening_split_plan.md](docs/15_runbooks/production_hardening_split_plan.md) を参照してください。

Loop 087ではselectedTenantId transport boundaryを追加しました。authenticated runtimeで `x-selected-tenant-id` を受け取り、active `staff_tenant_memberships` で再検証してから `AdminTenantContext.tenantId` を確定します。`selectedTenantId` は権限ではなくselectorであり、repositoryへは検証済みtenantIdのみ渡します。RLS/Auth/JWT本接続、全Admin route rollout、production dev_header rejectionはまだ未実装です。詳細は [docs/11_codex_tasks/087_selected_tenant_transport_boundary.md](docs/11_codex_tasks/087_selected_tenant_transport_boundary.md) を参照してください。

Loop 088ではauthenticated staff runtime full route rollout planを追加しました。Loop 087で追加した `x-selected-tenant-id` / selectedTenantId boundaryを全Admin routeへ展開するため、route matrix、AdminAction/role guard方針、dev_header互換、rollout phase、Go/No-Go gateを整理しました。route実装、Auth/JWT、RLS、production dev_header rejectionは未実装です。詳細は [docs/11_codex_tasks/088_authenticated_staff_runtime_full_route_rollout_plan.md](docs/11_codex_tasks/088_authenticated_staff_runtime_full_route_rollout_plan.md) と [docs/15_runbooks/authenticated_staff_runtime_route_rollout.md](docs/15_runbooks/authenticated_staff_runtime_route_rollout.md) を参照してください。

Loop 089ではauthenticated_staff runtimeをcustomer read routesへ展開しました。`GET /api/admin/customers`、顧客詳細、timelineで `x-selected-tenant-id` をactive membership再検証し、検証済み `AdminTenantContext.tenantId` のみをrepositoryへ渡すことをtestで固定しました。customer write/AI、alerts、RAG、production dev_header rejection、Auth/JWT、RLSは未実装です。詳細は [docs/11_codex_tasks/089_authenticated_staff_customer_read_routes.md](docs/11_codex_tasks/089_authenticated_staff_customer_read_routes.md) を参照してください。

Loop 090ではauthenticated_staff runtimeをcustomer write / AI routesへ展開しました。staff reply、AI summary、AI reply draftで `x-selected-tenant-id` をactive membership再検証し、検証済み `AdminTenantContext.tenantId` のみをwrite / AI処理へ渡すことをtestで固定しました。本物LINE送信とOpenAI API呼び出しは行わず、dev_header pathとdefault `in_memory` は維持しています。alerts/RAG、production dev_header rejection、Auth/JWT、RLSは未実装です。詳細は [docs/11_codex_tasks/090_authenticated_staff_customer_write_ai_routes.md](docs/11_codex_tasks/090_authenticated_staff_customer_write_ai_routes.md) を参照してください。

Loop 091ではauthenticated_staff runtimeをalerts routesへ展開しました。alert list、未返信チェック、open alert通知mockで `x-selected-tenant-id` をactive membership再検証し、検証済み `AdminTenantContext.tenantId` のみをalerts処理へ渡すことをtestで固定しました。本物LINE通知は行わず、dev_header pathとdefault `in_memory` は維持しています。RAG、production dev_header rejection、Auth/JWT、RLSは未実装です。詳細は [docs/11_codex_tasks/091_authenticated_staff_alert_routes.md](docs/11_codex_tasks/091_authenticated_staff_alert_routes.md) を参照してください。

Loop 092ではauthenticated_staff runtimeをRAG routesへ展開し、主要Admin route rolloutの完了監査を追加しました。`POST /api/admin/rag/search` と `POST /api/admin/rag/answer-draft` で `x-selected-tenant-id` をactive membership再検証し、検証済み `AdminTenantContext.tenantId` と `allowed_for_ai=true` のknowledgeだけをRAG search / MockAiProviderへ渡すことをtestで固定しました。dev_header pathとdefault `in_memory` は維持しており、production dev_header rejection、Auth/JWT、RLSは未実装です。詳細は [docs/11_codex_tasks/092_authenticated_staff_rag_routes_and_rollout_audit.md](docs/11_codex_tasks/092_authenticated_staff_rag_routes_and_rollout_audit.md) と [docs/15_runbooks/authenticated_staff_route_rollout_completion_audit.md](docs/15_runbooks/authenticated_staff_route_rollout_completion_audit.md) を参照してください。

Loop 093ではproduction dev_header rejectionとAuth/JWT boundaryを追加しました。production modeではAdmin routeの `x-tenant-id` / dev_header pathとdev seed routeを拒否し、Admin routeは `Authorization: Bearer` + authenticated_staff pathを前提にします。`x-selected-tenant-id` は認証ではなくselectorとして扱い、Bearerなしでは認証扱いしません。実Supabase Auth/JWT接続、RLS SQL、LINE/OpenAI本接続は未実装です。詳細は [docs/11_codex_tasks/093_production_dev_header_rejection_auth_jwt_boundary.md](docs/11_codex_tasks/093_production_dev_header_rejection_auth_jwt_boundary.md) を参照してください。

Loop 094AではRLS SQL draft reviewを追加しました。core tables向けに `auth.uid()::text`、`staff_users`、`staff_tenant_memberships`、active staff / active membershipを使うRLS migration draftを作成し、`anon` への広範grantや `using true` を禁止する静的検証を追加しました。staging applyはまだ実施せず、production readinessはNo-Go継続です。詳細は [docs/11_codex_tasks/094a_rls_sql_draft_review.md](docs/11_codex_tasks/094a_rls_sql_draft_review.md) を参照してください。

Loop 095AではRLS staging apply planを追加しました。`0003_rls_core_tables.sql` をstagingへ適用する前に、Go/No-Go、実行予定手順、RLS verification、staging smoke、rollback/recovery方針を整理しました。staging DBへのapplyは未実施で、production readinessはNo-Go継続です。詳細は [docs/11_codex_tasks/095a_rls_staging_apply_plan.md](docs/11_codex_tasks/095a_rls_staging_apply_plan.md) と [docs/15_runbooks/rls_staging_apply_plan.md](docs/15_runbooks/rls_staging_apply_plan.md) を参照してください。

Loop 095Bでは `0003_rls_core_tables.sql` をstaging DBへ適用し、RLS enabled/forced/policy状態、service_role grants、既存staging smokeを確認しました。service_role smokeはRLS bypass前提のため、authenticated role/JWT smokeは後続Loopで行います。production readinessはNo-Go継続です。詳細は [docs/11_codex_tasks/095b_rls_staging_apply_execution_gate.md](docs/11_codex_tasks/095b_rls_staging_apply_execution_gate.md) を参照してください。

Loop 096ではauthenticated role / JWT claim相当のRLS smokeを追加しました。staging DB上でdummy `auth.uid()` を使い、active staff + active membershipによるtenant A/B分離、inactive staff/membership拒否、`knowledge_pages.allowed_for_ai` 制御、rollback内write smokeを確認しました。本物Supabase Authユーザー作成やSupabase Auth/JWT本接続は未実施で、production readinessはNo-Go継続です。詳細は [docs/11_codex_tasks/096_authenticated_role_jwt_rls_smoke.md](docs/11_codex_tasks/096_authenticated_role_jwt_rls_smoke.md) を参照してください。

Loop 097ではSupabase Auth/JWT connection planを追加しました。`Authorization: Bearer` からSupabase Auth `user.id` を解決し、`staff_users.auth_user_id`、active staff、active membership、`selectedTenantId` 再検証、RLS `auth.uid()` へ接続する方針を整理しました。実Supabase Auth/JWT接続、Auth user作成、RLS SQL変更、production接続は未実施で、production readinessはNo-Go継続です。詳細は [docs/11_codex_tasks/097_supabase_auth_jwt_connection_plan.md](docs/11_codex_tasks/097_supabase_auth_jwt_connection_plan.md) と [docs/15_runbooks/supabase_auth_jwt_connection_plan.md](docs/15_runbooks/supabase_auth_jwt_connection_plan.md) を参照してください。

Loop 098ではSupabase Auth real verifier boundaryを追加しました。`Authorization: Bearer` tokenをSupabase Auth `user.id` へ変換する `SupabaseAuthSessionVerifier` をfake Supabase auth clientで検証し、token/secret redactionとproductionでfake verifierをdefault利用しないguardを固定しました。実Supabase Auth接続、Auth user作成、staging real Auth smokeは未実施で、production readinessはNo-Go継続です。詳細は [docs/11_codex_tasks/098_supabase_auth_real_verifier_boundary.md](docs/11_codex_tasks/098_supabase_auth_real_verifier_boundary.md) を参照してください。

Loop 099ではstaging real Auth user smokeを追加しました。staging Supabase Authのdummy userからBearer tokenを取得し、`SupabaseAuthSessionVerifier`、`staff_users.auth_user_id`、active membership、selectedTenantId再検証、Admin route smoke、RLS tenant boundaryを確認しました。token/secretは表示せず、smoke後にdummy Auth userとdummy DB rowsをcleanupします。LINE/OpenAI本接続とproduction接続は未実施で、production readinessはNo-Go継続です。詳細は [docs/11_codex_tasks/099_staging_real_auth_user_smoke.md](docs/11_codex_tasks/099_staging_real_auth_user_smoke.md) を参照してください。

Loop 100ではAdmin UI selectedTenantId persistenceを追加しました。`/select-tenant` で非secretのtenant selectorだけをlocalStorageとcookieに保存し、server-side Admin API helperから `x-selected-tenant-id` を送れるようにしました。`x-selected-tenant-id` は権限ではなくselectorであり、開発用 `x-tenant-id` とは別物です。Bearer token、API key、session値は保存・表示しません。Supabase Auth/JWT production runtime、LINE/OpenAI本接続、production readiness final gateは未実装で、production readinessはNo-Go継続です。詳細は [docs/11_codex_tasks/100_admin_ui_selected_tenant_persistence.md](docs/11_codex_tasks/100_admin_ui_selected_tenant_persistence.md) を参照してください。

Loop 101ではAdmin UI token forwarding boundaryとproduction Auth runtime gateを追加しました。Admin API helperはaccess token providerから受け取ったtokenを `Authorization: Bearer` headerへだけ載せ、保存・表示はしません。production modeでは開発用 `x-tenant-id` を送らない設定を使えます。API側は `AUTH_SESSION_VERIFIER=supabase` と注入されたfake可能なSupabase Auth client/StaffAuthLookupがある場合だけ `SupabaseAuthSessionVerifier` を使います。実Supabase Auth login、token取得、production接続、LINE/OpenAI本接続は未実装です。詳細は [docs/11_codex_tasks/101_admin_ui_token_forwarding_auth_runtime_gate.md](docs/11_codex_tasks/101_admin_ui_token_forwarding_auth_runtime_gate.md) を参照してください。

Loop 102ではLINE real push gateを追加しました。`LINE_MESSAGING_ENABLED=true` と `LINE_REAL_PUSH_ENABLED=true` の明示、authenticated_staff、`send_staff_reply` permission、`selectedTenantId` 再検証、customer tenant一致、送信前確認、idempotencyを満たさない限りreal push pathは動きません。MockLineClientは維持し、RealLineClient boundaryはfake transportで検証します。本物LINE API送信、LINE token実値利用、実LINE userId利用は未実施です。詳細は [docs/11_codex_tasks/102_line_real_push_gate.md](docs/11_codex_tasks/102_line_real_push_gate.md) と [docs/15_runbooks/line_real_push_gate.md](docs/15_runbooks/line_real_push_gate.md) を参照してください。

Loop 103ではproduction readiness final gateを追加しました。OpenAI real API gate、fake transport前提のOpenAI provider boundary、production Auth runtime構成監査、LINE real push gate監査、production readiness final checklistを追加しました。本物LINE送信、OpenAI API呼び出し、production接続は未実施で、最終判定は `production_no_go` です。詳細は [docs/11_codex_tasks/103_production_readiness_final_gate.md](docs/11_codex_tasks/103_production_readiness_final_gate.md)、[docs/15_runbooks/openai_real_api_gate.md](docs/15_runbooks/openai_real_api_gate.md)、[docs/15_runbooks/production_readiness_final.md](docs/15_runbooks/production_readiness_final.md) を参照してください。

Loop 104ではproduction Auth runtime auto wiringを追加しました。production modeでfake verifierをdefault利用せず、`AUTH_SESSION_VERIFIER=supabase` の明示時にSupabase Auth client境界、`SupabaseAuthSessionVerifier`、StaffAuthLookup境界を構成できるようにしました。required env不足やruntime例外はsecret/token/URLを出さずsafe failureします。実Supabase接続、Admin login/session本実装、production deploy、LINE/OpenAI本接続は未実施です。詳細は [docs/11_codex_tasks/104_production_auth_runtime_auto_wiring.md](docs/11_codex_tasks/104_production_auth_runtime_auto_wiring.md) を参照してください。

Loop 105ではAdmin login/session minimal integrationを追加しました。Admin UI側でSupabase Auth sessionを扱うための最小境界、fake auth clientによるsign-in / refresh / logout test、既存Admin API helperへtoken providerを渡す境界を追加しました。access tokenはUI、docs、dev log、localStorage、cookieへ独自保存・表示しません。実Supabase Auth接続、production deploy、LINE/OpenAI本接続は未実施です。詳細は [docs/11_codex_tasks/105_admin_login_session_minimal_integration.md](docs/11_codex_tasks/105_admin_login_session_minimal_integration.md) と [docs/15_runbooks/admin_login_session_minimal_integration.md](docs/15_runbooks/admin_login_session_minimal_integration.md) を参照してください。

Loop 106ではtaiyolabel.site向けVPS deployment plan and templatesを追加しました。`admin.taiyolabel.site` / `api.taiyolabel.site` の予定route、nginx template、systemd template、env example、SSL/certbot手順、rollback、No-Go条件をrepo内に追加しました。VPS接続、nginx reload、certbot、systemd作成、LINE/OpenAI/Supabase production接続は未実施で、production readinessは引き続き `production_no_go` です。詳細は [docs/11_codex_tasks/106_vps_deployment_plan_and_templates.md](docs/11_codex_tasks/106_vps_deployment_plan_and_templates.md) と [docs/15_runbooks/vps_deployment_taiyolabel_site.md](docs/15_runbooks/vps_deployment_taiyolabel_site.md) を参照してください。

Loop 107ではproduction start script and port boundaryを追加しました。Loop 109のVPS localhost smokeではAPIをreview/mock用の `tsx src/index.ts`、Adminを `next start --hostname 127.0.0.1` で起動し、API/Adminを `127.0.0.1:8788` / `127.0.0.1:3002` に閉じる境界へ同期しました。ただしNginx公開、SSL、external smokeは未実施で、production readinessは引き続き `production_no_go` です。詳細は [docs/11_codex_tasks/107_production_start_script_and_port_boundary.md](docs/11_codex_tasks/107_production_start_script_and_port_boundary.md) と [docs/15_runbooks/production_start_script_and_port_boundary.md](docs/15_runbooks/production_start_script_and_port_boundary.md) を参照してください。

Loop 108ではtaiyolabel.site向けVPS dry deployment preflight command packを追加しました。DNS/VPS監査、Admin `127.0.0.1:3002` / API `127.0.0.1:8788`、既存Nginx保護、secret投入前チェック、rollback、No-Go条件をdocs化しました。VPS実作業、nginx/systemd/certbot実行、LINE/OpenAI/Supabase実接続は未実施で、production readinessは引き続き `production_no_go` です。詳細は [docs/11_codex_tasks/108_vps_dry_deployment_preflight_commands.md](docs/11_codex_tasks/108_vps_dry_deployment_preflight_commands.md) と [docs/15_runbooks/vps_dry_deployment_preflight_commands.md](docs/15_runbooks/vps_dry_deployment_preflight_commands.md) を参照してください。

Loop 109ではVPS localhost-only mock deploymentを実施しました。`/var/www/amami-line-crm`、`/etc/amami-line-crm/*.env`、`amami-line-crm-api.service`、`amami-line-crm-admin.service` を使い、Nginx公開なしでSSH tunnel確認できる形にします。LINE/OpenAI/Supabase実接続、Nginx reload、certbot、LINE webhook設定は未実施で、production readinessは引き続き `production_no_go` です。詳細は [docs/11_codex_tasks/109_vps_localhost_mock_deployment_execution.md](docs/11_codex_tasks/109_vps_localhost_mock_deployment_execution.md) と [docs/15_runbooks/vps_localhost_mock_deployment_execution.md](docs/15_runbooks/vps_localhost_mock_deployment_execution.md) を参照してください。

Loop 027では本番向けstaff/admin tenant context planを追加しました。ただし、まだSupabase Auth実装、JWT検証、API差し替え、migration変更は行っていません。詳細は [docs/11_codex_tasks/027_supabase_auth_staff_tenant_context_plan.md](docs/11_codex_tasks/027_supabase_auth_staff_tenant_context_plan.md) を参照してください。

Loop 028ではstaff/admin tenant schema planを追加しました。staff membership、role、status、`auth_user_id` 連携を設計しましたが、migration SQL、Supabase Auth実装、API差し替えはまだ行っていません。詳細は [docs/11_codex_tasks/028_staff_tenant_schema_plan.md](docs/11_codex_tasks/028_staff_tenant_schema_plan.md) を参照してください。

Loop 029ではstaff tenant schema migrationを追加しました。`staff_users` にauth連携/status系columnを追加し、`staff_tenant_memberships` でtenant所属を表現する準備をしました。ただしSupabase Auth、JWT検証、API差し替え、RLS SQLはまだ未実装です。詳細は [docs/11_codex_tasks/029_staff_tenant_schema_migration.md](docs/11_codex_tasks/029_staff_tenant_schema_migration.md) を参照してください。

Loop 030ではauth context boundaryを追加しました。`auth_user_id` からactive staff / active membershipを検証してtenant contextを作るpure resolverを追加しましたが、Supabase Auth、JWT検証、API差し替えはまだ未実装です。詳細は [docs/11_codex_tasks/030_auth_context_boundary.md](docs/11_codex_tasks/030_auth_context_boundary.md) を参照してください。

Loop 031ではAdmin API tenant context guardを追加しました。既存のdev-only `x-tenant-id` 解決をguard境界へ集約し、将来のauthenticated staff contextへ差し替えやすくしました。ただしSupabase Auth、JWT検証、Admin login、RLS SQLはまだ未実装です。詳細は [docs/11_codex_tasks/031_admin_api_tenant_context_guard.md](docs/11_codex_tasks/031_admin_api_tenant_context_guard.md) を参照してください。

Loop 032ではAdmin auth placeholder UI planを追加しました。将来のlogin / tenant selection / permission denied / session expired導線を設計しましたが、UI実装、Supabase Auth、JWT検証、API差し替えはまだ未実装です。詳細は [docs/11_codex_tasks/032_admin_auth_placeholder_ui_plan.md](docs/11_codex_tasks/032_admin_auth_placeholder_ui_plan.md) を参照してください。

Loop 033ではAdmin auth placeholder UIを追加しました。`/login`、`/select-tenant`、`/permission-denied`、`/session-expired` のplaceholder画面を追加しましたが、Supabase Auth、JWT/session、Admin API authenticated_staff guard連携はまだ未実装です。詳細は [docs/11_codex_tasks/033_admin_auth_ui_placeholder.md](docs/11_codex_tasks/033_admin_auth_ui_placeholder.md) を参照してください。

Loop 034ではAdmin API auth error response mappingを追加しました。tenant/auth/permission系error codeをHTTP responseへ変換する境界を整えましたが、Supabase Auth、JWT/session、Admin UI redirect、RLSはまだ未実装です。詳細は [docs/11_codex_tasks/034_admin_api_auth_error_response_mapping.md](docs/11_codex_tasks/034_admin_api_auth_error_response_mapping.md) を参照してください。

Loop 035ではSupabase Auth client boundaryを追加しました。`SUPABASE_URL` / `SUPABASE_ANON_KEY` からAuth config/clientを作る境界を追加しましたが、login/logout/session/JWT/Admin API guard接続はまだ未実装です。詳細は [docs/11_codex_tasks/035_supabase_auth_client_boundary.md](docs/11_codex_tasks/035_supabase_auth_client_boundary.md) を参照してください。

Loop 036ではstaff auth lookup repositoryを追加しました。`auth_user_id` からstaff identityとtenant membershipを取得するSupabase repository境界を追加しましたが、Supabase Auth/JWT/Admin API guard接続はまだ未実装です。詳細は [docs/11_codex_tasks/036_staff_auth_lookup_repository.md](docs/11_codex_tasks/036_staff_auth_lookup_repository.md) を参照してください。

Loop 037ではauthenticated staff tenant guard境界を追加しました。`AuthUserIdentity + StaffAuthLookup` から `AdminTenantContext(source: authenticated_staff)` を作る境界を追加しましたが、JWT/session検証やAdmin API route接続はまだ未実装です。詳細は [docs/11_codex_tasks/037_authenticated_staff_tenant_guard.md](docs/11_codex_tasks/037_authenticated_staff_tenant_guard.md) を参照してください。

Loop 038ではAdmin login UIを将来のAuth接続に向けて整理しました。email/password入力欄とdisabled submitを追加しましたが、Supabase Auth呼び出し、session保存、JWT/API guard連携はまだ未実装です。詳細は [docs/11_codex_tasks/038_admin_login_ui_integration.md](docs/11_codex_tasks/038_admin_login_ui_integration.md) を参照してください。

Loop 039ではtenant selection UIを整理しました。`/select-tenant` に `tenant_amamihome` の静的placeholder cardとdisabled選択導線を追加しましたが、tenant取得API、選択保存、Supabase Auth/JWT連携はまだ未実装です。詳細は [docs/11_codex_tasks/039_tenant_selection_ui.md](docs/11_codex_tasks/039_tenant_selection_ui.md) を参照してください。

Loop 040ではrole-based admin action guard planを追加しました。`owner` / `manager` / `staff` の操作許可matrixとAPI/UI制御方針を整理しましたが、role guard実装、UI制御、API接続はまだ未実装です。詳細は [docs/11_codex_tasks/040_role_based_admin_action_guard_plan.md](docs/11_codex_tasks/040_role_based_admin_action_guard_plan.md) を参照してください。

Loop 041ではAdmin role permission boundaryを追加しました。`owner` / `manager` / `staff` と `AdminAction` の許可判定をpure function化しましたが、API route guard接続、UI制御、authenticated runtime接続はまだ未実装です。詳細は [docs/11_codex_tasks/041_admin_role_permission_boundary.md](docs/11_codex_tasks/041_admin_role_permission_boundary.md) を参照してください。

Loop 042ではAdmin API role guard connection planを追加しました。Admin API routeと `AdminAction` の対応表を整理しましたが、role guard接続、API route変更、UI制御はまだ未実装です。詳細は [docs/11_codex_tasks/042_admin_api_role_guard_connection_plan.md](docs/11_codex_tasks/042_admin_api_role_guard_connection_plan.md) を参照してください。

Loop 043ではAdmin API role guard boundaryを追加しました。`AdminTenantContext(source: authenticated_staff)` と `AdminAction` を組み合わせてrole permissionを判定し、`dev_header` は `authenticated_staff_required` として拒否します。ただしAdmin API routeへの接続、UI制御、authenticated runtime接続はまだ未実装です。詳細は [docs/11_codex_tasks/043_admin_api_role_guard_boundary.md](docs/11_codex_tasks/043_admin_api_role_guard_boundary.md) を参照してください。

Loop 044ではAdmin API role guardを代表actionで検証しました。`view_customers` を代表actionに、authenticated staff contextでのrole判定と `permission_denied` response mappingを確認しましたが、全Admin API route展開、Supabase Auth/JWT接続、UI制御はまだ未実装です。詳細は [docs/11_codex_tasks/044_admin_api_role_guard_representative_route.md](docs/11_codex_tasks/044_admin_api_role_guard_representative_route.md) を参照してください。

Loop 045ではAdmin API role guardを全Admin routeへ展開できる形に整理しました。`authenticated_staff` ではAdminActionごとにrole guardをenforceし、`dev_header` では既存MVP互換のため暫定skipします。ただしSupabase Auth/JWT接続、UI制御、production dev_header拒否はまだ未実装です。詳細は [docs/11_codex_tasks/045_admin_api_role_guard_full_route_rollout.md](docs/11_codex_tasks/045_admin_api_role_guard_full_route_rollout.md) を参照してください。

Loop 046ではAdmin UI role visibility planを追加しました。Admin UI操作と `AdminAction` の対応、`owner` / `manager` / `staff` の表示/disabled方針を整理しましたが、UI制御実装、API helper変更、authenticated runtime接続はまだ未実装です。詳細は [docs/11_codex_tasks/046_admin_ui_role_visibility_plan.md](docs/11_codex_tasks/046_admin_ui_role_visibility_plan.md) を参照してください。

Loop 047ではAdmin UI role visibility placeholderを追加しました。顧客詳細/alertsなどに `owner` / `manager` / `staff` の将来表示制御方針を示すnoteを追加しましたが、本物のrole判定、button disabled、authenticated runtime接続はまだ未実装です。詳細は [docs/11_codex_tasks/047_admin_ui_role_visibility_placeholder.md](docs/11_codex_tasks/047_admin_ui_role_visibility_placeholder.md) を参照してください。

Loop 048ではAdmin UI role visibility test fixturesを追加しました。UI操作と `AdminAction` の対応、`owner` / `manager` / `staff` の期待visibilityをfixture化し、permission boundaryとの整合をtestしましたが、本物のUI制御、button disabled、authenticated runtime接続はまだ未実装です。詳細は [docs/11_codex_tasks/048_admin_ui_role_visibility_test_fixtures.md](docs/11_codex_tasks/048_admin_ui_role_visibility_test_fixtures.md) を参照してください。

Loop 049ではauthenticated runtime connection planを追加しました。`dev_header` runtimeから `authenticated_staff` runtimeへ移行するためのJWT/session extraction、StaffAuthLookup注入、selectedTenantId、runtime mode、production dev_header rejection方針を整理しましたが、実装、API差し替え、Supabase Auth/JWT接続はまだ未実装です。詳細は [docs/11_codex_tasks/049_authenticated_runtime_connection_plan.md](docs/11_codex_tasks/049_authenticated_runtime_connection_plan.md) を参照してください。

Loop 050ではdev header production rejection planを追加しました。`x-tenant-id` / `dev_header` をproductionで拒否するためのruntime mode、環境判定、error response、staging移行、local/test互換方針を整理しましたが、拒否実装、JWT/session接続、API差し替えはまだ未実装です。詳細は [docs/11_codex_tasks/050_dev_header_production_rejection_plan.md](docs/11_codex_tasks/050_dev_header_production_rejection_plan.md) を参照してください。

Loop 051ではAdmin API向けのSupabase Auth session extraction boundaryを追加しました。Bearer token付きAuthorization headerの解析、token verifier interface、session extraction error mappingを用意しましたが、まだAdmin API route、Supabase Auth実接続、Admin UI token forwardingには接続していません。詳細は [docs/11_codex_tasks/051_supabase_auth_session_extraction_boundary.md](docs/11_codex_tasks/051_supabase_auth_session_extraction_boundary.md) を参照してください。

Loop 052ではfake authenticated staff runtime connectionを追加しました。fake `AuthSessionVerifier` とfake `StaffAuthLookup` を使い、Bearer tokenから `AdminTenantContext(source=authenticated_staff)` とrole guardまで通す境界を検証しましたが、Admin API route接続、Supabase Auth本接続、JWT本検証はまだ未実装です。詳細は [docs/11_codex_tasks/052_fake_authenticated_staff_runtime_connection.md](docs/11_codex_tasks/052_fake_authenticated_staff_runtime_connection.md) を参照してください。

Loop 053では代表Admin API routeにfake authenticated_staff runtime wiringを追加しました。`GET /api/admin/customers` でBearer fake tokenから `AdminTenantContext(source=authenticated_staff)` を作り、`view_customers` role guardを通す検証を追加しましたが、全route rollout、Supabase Auth本接続、production `dev_header` rejectionはまだ未実装です。詳細は [docs/11_codex_tasks/053_representative_admin_api_authenticated_runtime_wiring.md](docs/11_codex_tasks/053_representative_admin_api_authenticated_runtime_wiring.md) を参照してください。

Loop 054では代表routeで確認した authenticated runtime を全Admin API routeへ広げるためのrollout planを追加しました。ただし、まだroute実装、Supabase Auth本接続、Admin UI token forwarding、production `dev_header` rejectionは行っていません。詳細は [docs/11_codex_tasks/054_admin_api_authenticated_runtime_full_route_rollout_plan.md](docs/11_codex_tasks/054_admin_api_authenticated_runtime_full_route_rollout_plan.md) を参照してください。

Loop 055ではauthenticated runtimeの `selectedTenantId` transport planを追加しました。複数tenant所属staff向けにAdmin UIからAdmin APIへ選択tenantを渡す候補を比較し、短期はtest-only injection、中期は `x-selected-tenant-id` header候補、本番ではactive membership再検証必須と整理しました。ただし、transport実装、保存処理、Admin API接続はまだ未実装です。詳細は [docs/11_codex_tasks/055_authenticated_runtime_selected_tenant_transport_plan.md](docs/11_codex_tasks/055_authenticated_runtime_selected_tenant_transport_plan.md) を参照してください。

Loop 056ではlocal demo MVP completion hardeningを実施しました。ローカルで見せるデモMVP向けにAdmin UI導線、mock/未接続表示、manual checklist/runbookを補強しました。ただし、Supabase Auth/JWT、LINE/OpenAI実API、Supabase実DB runtime、本番deployは未実装です。詳細は [docs/11_codex_tasks/056_local_demo_mvp_completion_hardening.md](docs/11_codex_tasks/056_local_demo_mvp_completion_hardening.md) を参照してください。

## Secrets

APIキーやトークンはコミットしません。ローカル値は `.env` や `.env.staging` に置く想定ですが、実envは `.gitignore` で除外しています。共有するのは `.env.example` や `.env.staging.example` のような値なしテンプレートだけです。

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

## Codex開発ループ

このプロジェクトはループエンジニアリングで開発します。広範囲の機能を一度に実装せず、`docs/11_codex_tasks/` の小さいタスクを1つずつ完了し、テストを通してから次へ進みます。

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

Loop 051ではAdmin API向けのSupabase Auth session extraction boundaryを追加しました。`Authorization: Bearer <token>` の解析、token verifier interface、session extraction error mappingを用意しましたが、まだAdmin API route、Supabase Auth実接続、Admin UI token forwardingには接続していません。詳細は [docs/11_codex_tasks/051_supabase_auth_session_extraction_boundary.md](docs/11_codex_tasks/051_supabase_auth_session_extraction_boundary.md) を参照してください。

Loop 052ではfake authenticated staff runtime connectionを追加しました。fake `AuthSessionVerifier` とfake `StaffAuthLookup` を使い、Bearer tokenから `AdminTenantContext(source=authenticated_staff)` とrole guardまで通す境界を検証しましたが、Admin API route接続、Supabase Auth本接続、JWT本検証はまだ未実装です。詳細は [docs/11_codex_tasks/052_fake_authenticated_staff_runtime_connection.md](docs/11_codex_tasks/052_fake_authenticated_staff_runtime_connection.md) を参照してください。

Loop 053では代表Admin API routeにfake authenticated_staff runtime wiringを追加しました。`GET /api/admin/customers` でBearer fake tokenから `AdminTenantContext(source=authenticated_staff)` を作り、`view_customers` role guardを通す検証を追加しましたが、全route rollout、Supabase Auth本接続、production `dev_header` rejectionはまだ未実装です。詳細は [docs/11_codex_tasks/053_representative_admin_api_authenticated_runtime_wiring.md](docs/11_codex_tasks/053_representative_admin_api_authenticated_runtime_wiring.md) を参照してください。

Loop 054では代表routeで確認した authenticated runtime を全Admin API routeへ広げるためのrollout planを追加しました。ただし、まだroute実装、Supabase Auth本接続、Admin UI token forwarding、production `dev_header` rejectionは行っていません。詳細は [docs/11_codex_tasks/054_admin_api_authenticated_runtime_full_route_rollout_plan.md](docs/11_codex_tasks/054_admin_api_authenticated_runtime_full_route_rollout_plan.md) を参照してください。

Loop 055ではauthenticated runtimeの `selectedTenantId` transport planを追加しました。複数tenant所属staff向けにAdmin UIからAdmin APIへ選択tenantを渡す候補を比較し、短期はtest-only injection、中期は `x-selected-tenant-id` header候補、本番ではactive membership再検証必須と整理しました。ただし、transport実装、保存処理、Admin API接続はまだ未実装です。詳細は [docs/11_codex_tasks/055_authenticated_runtime_selected_tenant_transport_plan.md](docs/11_codex_tasks/055_authenticated_runtime_selected_tenant_transport_plan.md) を参照してください。

Loop 056ではlocal demo MVP completion hardeningを実施しました。ローカルで見せるデモMVP向けにAdmin UI導線、mock/未接続表示、manual checklist/runbookを補強しました。ただし、Supabase Auth/JWT、LINE/OpenAI実API、Supabase実DB runtime、本番deployは未実装です。詳細は [docs/11_codex_tasks/056_local_demo_mvp_completion_hardening.md](docs/11_codex_tasks/056_local_demo_mvp_completion_hardening.md) を参照してください。

## Secrets

APIキーやトークンはコミットしません。ローカル値は `.env` に置く想定ですが、`.env` は `.gitignore` で除外しています。共有するのは `.env.example` だけです。

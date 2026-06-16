# Database

DBはSupabase PostgreSQLを想定します。Loop 001では実接続せず、migration SQL、seed SQL、TypeScript型、Zod validation、外部DBなしのテストを追加しました。

## 実装ファイル

- migration: `packages/db/migrations/0001_initial_schema.sql`
- seed: `packages/db/seed/tenant_amamihome.sql`
- TypeScript型・validation: `packages/domain/src/index.ts`
- SQL検査テスト: `tests/integration/database-schema.test.ts`

## 共通方針

- `tenants` 以外の主要テーブルには `tenant_id` を持たせる。
- 各tenant-owned tableの `tenant_id` は `tenants(id)` を参照する。
- `tenant_id` はアプリ層だけでなくDB/RLSでも検証する。
- 顧客個人情報、LINE user ID、相談内容はtenant境界を越えて検索・表示しない。
- AI検索対象も `tenant_id` で先に絞る。
- 監査に必要なテーブルには `created_at`、`updated_at`、必要に応じて `created_by_staff_user_id` を持たせる。
- `customers` は `line_user_id` がある場合だけ `tenant_id + line_user_id` をpartial unique indexで一意にする。
- `messages` は `line_message_id` がある場合だけ `tenant_id + line_message_id` をpartial unique indexで一意にする。

## RLS方針

Loop 025ではRLS policy planのみを追加しています。RLS SQL、migration変更、Supabase接続、API差し替えはまだ行っていません。

基本方針:

- tenant-owned tableは `tenant_id` でDB levelでも分離する。
- `SUPABASE_SERVICE_ROLE_KEY` はserver-side API / repository層だけで使う。
- browser、LIFF、Next.js client componentからSupabase DBへ直接アクセスする設計は当面採用しない。
- Admin UIとLIFF予定機能はAPI経由でDBへアクセスする。
- 開発用 `x-tenant-id` は本番認証では使わず、将来は認証済みadmin user / staff contextからtenantを決定する。
- RLS SQLとlocal検証は後続Loopで扱う。

詳細は [docs/11_codex_tasks/025_supabase_rls_policy_plan.md](11_codex_tasks/025_supabase_rls_policy_plan.md) を参照してください。

## RLS/Auth production readiness

Loop 080では、stagingでcustomers/messagesのSupabase smokeが通った現在地を前提に、production readinessはNo-Goであることを明文化しました。RLS SQL、Supabase Auth/JWT、selectedTenantId transport、production dev_header rejectionはまだ未実装です。

productionへ進む前に必要な条件:

- RLS SQLを専用Loopで実装し、local/staging test DBでtenant Aからtenant Bのrowを読めない・書けないことを確認する。
- Supabase Auth/JWTから `staff_users.auth_user_id` を解決し、active `staff_tenant_memberships` でtenantとroleを確定する。
- `selectedTenantId` は権限ではなくselectorとして扱い、membershipで再検証してから `AdminTenantContext.tenantId` をrepositoryへ渡す。
- productionでは `x-tenant-id` / `dev_header` を拒否し、`Authorization: Bearer` + authenticated staff contextを必須にする。
- service_roleはserver-side onlyで扱い、browser / LIFF / Next client componentへ出さない。

詳細は [docs/11_codex_tasks/080_rls_auth_production_readiness_plan.md](11_codex_tasks/080_rls_auth_production_readiness_plan.md) と [docs/15_runbooks/rls_auth_production_readiness.md](15_runbooks/rls_auth_production_readiness.md) を参照してください。

## Production hardening split plan

Loop 086では、Loop 085でstaging拡張検証版100%相当に到達した後のproduction hardeningを分割しました。productionは引き続きNo-Goで、RLS未実装、Auth/JWT未接続、selectedTenantId transport未接続、production dev_header rejection未実装、LINE/OpenAI real provider未接続を明確に残しています。

Loop 086ではmigration SQL unchanged / no RLS SQLを守り、RLS SQL、Auth/JWT、API runtime、UI、Supabase接続は変更していません。詳細は [docs/11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md](11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md) と [docs/15_runbooks/production_hardening_split_plan.md](15_runbooks/production_hardening_split_plan.md) を参照してください。

## ローカルmigration検証

Loop 026ではlocal migration testの手順を整理しました。現在の環境ではSupabase CLIはありますが、Docker daemonが使えず `psql` もないため、実DBへのmigration適用は未実行です。

代替として `tests/integration/database-schema.test.ts` のSQL validationを強化し、主要table、tenant-owned table、主要index、RLS SQL未混入を確認しています。

詳細は [docs/11_codex_tasks/026_supabase_local_migration_test.md](11_codex_tasks/026_supabase_local_migration_test.md) と [docs/15_runbooks/supabase_local_migration_test.md](15_runbooks/supabase_local_migration_test.md) を参照してください。

## staff/admin tenant context方針

Loop 027では、開発用 `x-tenant-id` から本番向けの認証済みstaff/admin tenant contextへ移行するための計画を追加しました。現時点ではschema変更、Supabase Auth実装、JWT検証、API差し替えは行っていません。

現在の `staff_users` は `tenant_id` を持つtenant-scoped tableです。後続Loopで `auth_user_id` やmembership tableの要否を決め、staff identityとtenant membershipを安全に結びます。

詳細は [docs/11_codex_tasks/027_supabase_auth_staff_tenant_context_plan.md](11_codex_tasks/027_supabase_auth_staff_tenant_context_plan.md) を参照してください。

## staff tenant schema計画

Loop 028では、本番認証に必要なstaff/admin tenant schemaをdocs-onlyで設計しました。現時点のmigration SQLはまだ変更していません。

方針:

- 現在の `staff_users` は `tenant_id` を持つtenant-scoped tableで、`role` と `is_active` はありますが、`auth_user_id`、membership table、招待状態、disabled/archived timestampは未実装です。
- 本番向けにはstaff identityとtenant membershipを分け、`staff_users.auth_user_id` と `staff_tenant_memberships` で認証済みstaffからtenant accessを決定する案を優先します。
- `x-tenant-id` はdev-onlyのselectorであり、本番tenant contextではありません。
- RLS SQLを実装する前に、staff identity / membership schemaを決める必要があります。

詳細は [docs/11_codex_tasks/028_staff_tenant_schema_plan.md](11_codex_tasks/028_staff_tenant_schema_plan.md) を参照してください。

## staff tenant schema migration

Loop 029では、staff/admin tenant contextの前提schemaを初期migrationに反映しました。Loop 026時点で実DB適用は未実行のため、追加migrationではなく `0001_initial_schema.sql` を同期修正しています。

変更点:

- `staff_users` に `auth_user_id`、`status`、`disabled_at`、`archived_at` を追加。
- `staff_tenant_memberships` を追加し、staffとtenantの所属・role・statusを表現できるようにした。
- `staff_invites` はLoop 029では未実装。招待token、email送信、期限管理が絡むため後続Loopで検討する。
- Supabase Auth / JWT / API tenant guard / RLS SQLはまだ未実装。
- runtimeは引き続きin-memory。

詳細は [docs/11_codex_tasks/029_staff_tenant_schema_migration.md](11_codex_tasks/029_staff_tenant_schema_migration.md) を参照してください。

## auth context boundary

Loop 030では、`staff_users.auth_user_id` と `staff_tenant_memberships` を使ってtenant contextを解決するpure resolverを `packages/domain` に追加しました。

方針:

- `auth_user_id` からactive staffを特定する。
- active membershipだけをtenant accessとして扱う。
- selected tenantはmembershipで再検証する。
- roleはmembership由来にする。
- 現在のdev-only `x-tenant-id` resolverはまだ置き換えない。
- Supabase Auth / JWT / Admin API guard / RLS SQLはまだ未実装。

詳細は [docs/11_codex_tasks/030_auth_context_boundary.md](11_codex_tasks/030_auth_context_boundary.md) を参照してください。

## Admin API tenant context guard

Loop 031では、Admin API request境界でtenant contextを作るguardを `apps/api` に追加しました。

方針:

- 現在の実行経路はdev-only `x-tenant-id` をguard経由で扱う。
- `staff_users.auth_user_id` / `staff_tenant_memberships` を使うauthenticated staff pathは将来接続する。
- Loop 031ではDB membership lookupはまだAdmin API実行経路に接続していない。
- Supabase Auth / JWT / Admin login / RLS SQLはまだ未実装。

詳細は [docs/11_codex_tasks/031_admin_api_tenant_context_guard.md](11_codex_tasks/031_admin_api_tenant_context_guard.md) を参照してください。

## Admin auth placeholder UI plan

Loop 032では、Admin login、tenant selection、permission denied、session expiredなどの管理画面認証UIをdocs-onlyで設計しました。`staff_users.auth_user_id` と `staff_tenant_memberships` は存在しますが、Admin UIのlogin/session、Supabase Auth、JWT検証、authenticated staff guardとはまだ接続していません。

詳細は [docs/11_codex_tasks/032_admin_auth_placeholder_ui_plan.md](11_codex_tasks/032_admin_auth_placeholder_ui_plan.md) を参照してください。

## Supabase Auth client boundary

Loop 035では、`SUPABASE_URL` / `SUPABASE_ANON_KEY` からSupabase Auth用config/clientを作る境界を `packages/db` に追加しました。Auth boundaryは `SUPABASE_SERVICE_ROLE_KEY` を読まず、login/logout/session保存/JWT検証/Admin API guard接続はまだ行っていません。

詳細は [docs/11_codex_tasks/035_supabase_auth_client_boundary.md](11_codex_tasks/035_supabase_auth_client_boundary.md) を参照してください。

## staff auth lookup repository

Loop 036では、`staff_users.auth_user_id` と `staff_tenant_memberships.staff_user_id` を読むSupabase lookup repositoryを追加しました。取得したstaff identityとmembershipはLoop 030の `resolveAuthenticatedTenantContext` に渡せますが、Admin API runtime、Supabase Auth、JWT検証、RLS SQLにはまだ接続していません。

詳細は [docs/11_codex_tasks/036_staff_auth_lookup_repository.md](11_codex_tasks/036_staff_auth_lookup_repository.md) を参照してください。

## authenticated staff tenant guard

Loop 037では、`AuthUserIdentity` と `StaffAuthLookup` から `AdminTenantContext(source: authenticated_staff)` を作るAPI境界を追加しました。`staff_users.auth_user_id` と `staff_tenant_memberships` を使う想定は固まりましたが、Admin API runtime、JWT/session検証、Supabase Auth、RLS SQLにはまだ接続していません。

詳細は [docs/11_codex_tasks/037_authenticated_staff_tenant_guard.md](11_codex_tasks/037_authenticated_staff_tenant_guard.md) を参照してください。

## authenticated runtime connection plan

Loop 049では、現在の `dev_header` runtimeから `authenticated_staff` runtimeへ移行するための接続計画を追加しました。`staff_users.auth_user_id` と `staff_tenant_memberships` は将来の `StaffAuthLookup` / tenant context解決で参照予定ですが、Loop 049ではSupabase Auth/JWT検証、Admin API runtime差し替え、RLS SQL実装、Supabase本番接続は行っていません。

詳細は [docs/11_codex_tasks/049_authenticated_runtime_connection_plan.md](11_codex_tasks/049_authenticated_runtime_connection_plan.md) を参照してください。

## selectedTenantId transport plan

Loop 055では、複数tenant所属staffが操作対象tenantを選ぶための `selectedTenantId` transport方針をdocs-onlyで整理しました。`selectedTenantId` は権限ではなくselectorであり、必ず `StaffAuthLookup` / `staff_tenant_memberships` のactive membershipで再検証してから `AdminTenantContext.tenantId` として採用します。transport実装、cookie/session保存、Admin API route変更、Supabase Auth本接続はまだ行っていません。

Loop 087では、authenticated runtime用の初期transportとして `x-selected-tenant-id` header境界を追加しました。`x-selected-tenant-id` は `x-tenant-id` / `dev_header` と別物で、active membership再検証後の `AdminTenantContext.tenantId` だけがrepositoryへ渡されます。全Admin route rollout、Supabase Auth/JWT本接続、production dev_header rejection、RLS SQLはまだ未実装です。

詳細は [docs/11_codex_tasks/055_authenticated_runtime_selected_tenant_transport_plan.md](11_codex_tasks/055_authenticated_runtime_selected_tenant_transport_plan.md) を参照してください。

## dev header production rejection plan

Loop 050では、productionでtenant境界を `x-tenant-id` / `dev_header` に依存させず、認証済みstaff membership由来の `authenticated_staff` tenant contextを前提にする計画を追加しました。RLS SQL、Admin API runtime差し替え、Supabase Auth/JWT接続はまだ未実装です。

詳細は [docs/11_codex_tasks/050_dev_header_production_rejection_plan.md](11_codex_tasks/050_dev_header_production_rejection_plan.md) を参照してください。

## enum/check制約

PostgreSQL enumではなくcheck制約で初期表現しています。

- `customers.response_mode`: `bot_auto` / `human_required` / `human_active` / `emergency` / `closed`
- `messages.role`: `customer` / `bot` / `staff` / `system` / `ai`
- `messages.message_type`: `text` / `image` / `file` / `form` / `reservation` / `alert` / `summary`
- `alerts.status`: `open` / `notified` / `resolved` / `dismissed`
- `alerts.severity`: `low` / `medium` / `high` / `critical`
- `staff_users.status`: `active` / `disabled` / `archived`
- `staff_tenant_memberships.role`: `owner` / `manager` / `staff`
- `staff_tenant_memberships.status`: `invited` / `active` / `disabled` / `archived`

## tenants

工務店tenantのマスターです。

- `id`: text primary key。例: `tenant_amamihome`
- `slug`: text unique。例: `amamihome`
- `name`: text。例: `アマミホーム`
- `official_domain`: text。例: `amamihome.net`
- `status`: `active` / `paused`
- `created_at`
- `updated_at`

## tenant_line_settings

tenantごとのLINE公式アカウント設定です。

- `tenant_id`: primary key、`tenants(id)` を参照
- `channel_id`
- `channel_secret_encrypted`
- `channel_access_token_encrypted`
- `webhook_secret_path`
- `liff_id`
- `staff_line_group_id`
- `status`
- `created_at`
- `updated_at`

## tenant_ai_settings

tenantごとのAI設定です。

- `tenant_id`: primary key、`tenants(id)` を参照
- `provider`: 初期は `openai`
- `model`
- `summary_enabled`
- `reply_draft_enabled`
- `auto_reply_enabled`
- `rag_enabled`
- `allowed_source_policy`
- `created_at`
- `updated_at`

## staff_users

管理画面を使う担当者です。

- `id`
- `tenant_id`
- `auth_user_id`: Supabase Auth `auth.users.id` と紐付ける予定のnullable column
- `email`
- `display_name`
- `role`: `owner` / `manager` / `staff`
- `status`: `active` / `disabled` / `archived`
- `line_user_id`
- `is_active`
- `last_login_at`
- `disabled_at`
- `archived_at`
- `created_at`
- `updated_at`
- unique: `tenant_id + email`
- partial unique index: `auth_user_id` where `auth_user_id is not null`
- index: `email`
- index: `status`

`tenant_id`、`role`、`is_active` は既存runtimeとの互換性のため残しています。本番tenant contextでは、後続Loopで `staff_tenant_memberships` を主な所属情報として使う予定です。

## staff_tenant_memberships

担当者とtenantの所属・role・statusを表すtableです。

- `id`
- `tenant_id`: `tenants(id)` を参照
- `staff_user_id`: `staff_users(id)` を参照
- `role`: `owner` / `manager` / `staff`
- `status`: `invited` / `active` / `disabled` / `archived`
- `invited_at`
- `accepted_at`
- `disabled_at`
- `archived_at`
- `created_at`
- `updated_at`
- unique: `tenant_id + staff_user_id`
- index: `tenant_id`
- index: `staff_user_id`
- index: `tenant_id + status`
- index: `staff_user_id + status`

`active` membershipだけが将来の本番Admin API access対象です。`platform_admin` は通常tenant membershipとは別概念として後続Loopで扱います。

## customers

LINE友だち単位の顧客カルテです。

- `id`
- `tenant_id`
- `line_user_id`
- `display_name`
- `picture_url`
- `phone`
- `email`
- `postal_code`
- `address`
- `interest_tags`
- `response_mode`: `bot_auto` / `human_required` / `human_active` / `emergency` / `closed`
- `status`: `new` / `active` / `archived`
- `last_message_at`
- `last_customer_message_at`
- `last_staff_reply_at`
- `created_at`
- `updated_at`
- partial unique index: `tenant_id + line_user_id` where `line_user_id is not null`
- index: `tenant_id`
- index: `tenant_id + response_mode`

## messages

LINE、管理画面、AI下書きなどの時系列ログです。

- `id`
- `tenant_id`
- `customer_id`
- `consultation_id`
- `line_message_id`
- `role`: `customer` / `bot` / `staff` / `system` / `ai`
- `staff_user_id`
- `message_type`: `text` / `image` / `file` / `form` / `reservation` / `alert` / `summary`
- `body`
- `media_storage_path`
- `ai_generated`
- `sent_to_line_at`
- `created_at`
- partial unique index: `tenant_id + line_message_id` where `line_message_id is not null`
- index: `tenant_id + customer_id + created_at desc`
- index: `tenant_id + consultation_id + created_at desc`

## consultations

相談案件のまとまりです。

- `id`
- `tenant_id`
- `customer_id`
- `subject`
- `category`: `new_build` / `land` / `built_house` / `reservation` / `after_support` / `document_request` / `other`
- `status`: `open` / `waiting_customer` / `waiting_staff` / `closed`
- `assigned_staff_user_id`
- `priority`
- `summary`
- `next_action`
- `created_at`
- `updated_at`
- `closed_at`

## alerts

未返信、放置、緊急などのアラートです。

- `id`
- `tenant_id`
- `customer_id`
- `consultation_id`
- `alert_type`: `unreplied` / `unreplied_customer_message` / `stale` / `emergency` / `ai_risk`
- `severity`: `low` / `medium` / `high` / `critical`
- `status`: `open` / `notified` / `resolved` / `dismissed`
- `message`
- `triggered_at`
- `notified_at`
- `resolved_at`
- `created_at`
- `updated_at`
- index: `tenant_id + status + severity`

## knowledge_pages

公式HP、FAQ、キャンペーン情報などAIが参照できるナレッジです。

- `id`
- `tenant_id`
- `url`
- `category`
- `source_type`: `official_site` / `faq` / `manual` / `campaign`
- `title`
- `content`
- `checksum`
- `allowed_for_ai`: RAG検索でAI利用できるページだけを返すためのflag
- `last_crawled_at`
- `created_at`
- `updated_at`
- index: `tenant_id`
- index: `tenant_id + allowed_for_ai`

## construction_cases

施工事例レコメンド用のデータです。

- `id`
- `tenant_id`
- `source_url`
- `title`
- `description`
- `style_tags`
- `family_tags`
- `price_band_label`
- `area_label`
- `thumbnail_storage_path`
- `published_at`
- `allowed_for_recommendation`
- `created_at`
- `updated_at`
- index: `tenant_id`
- index: `tenant_id + allowed_for_recommendation`

## reservations

モデルホーム、オンライン相談、来場予約の予定です。

- `id`
- `tenant_id`
- `customer_id`
- `consultation_id`
- `reservation_type`: `model_home` / `online_consultation` / `office_visit` / `after_support`
- `preferred_dates`
- `confirmed_start_at`
- `confirmed_end_at`
- `status`: `requested` / `confirmed` / `cancelled` / `completed`
- `staff_user_id`
- `notes`
- `created_at`
- `updated_at`
- index: `tenant_id + customer_id`
- index: `tenant_id + status`

## 初期seed

`packages/db/seed/tenant_amamihome.sql` は以下だけを投入します。

- `id`: `tenant_amamihome`
- `slug`: `amamihome`
- `name`: `アマミホーム`
- `official_domain`: `amamihome.net`
- `status`: `active`

LINE token、OpenAI API key、Supabase service role keyなどのsecretはseedしません。

## TypeScript型とvalidation

`packages/domain/src/index.ts` に主要DB型とZod schemaを置いています。

主要型:

- `Tenant`
- `StaffUser`
- `Customer`
- `Message`
- `Consultation`
- `Alert`
- `KnowledgePage`
- `ConstructionCase`
- `Reservation`

主要schema:

- `tenantIdSchema`
- `responseModeSchema`
- `messageRoleSchema`
- `messageTypeSchema`
- `alertStatusSchema`
- `alertSeveritySchema`
- `customerCreateSchema`
- `messageCreateSchema`
- `alertCreateSchema`

## Supabase alerts/knowledge staging runtime plan

Loop 081では、stagingでcustomers/messagesのSupabase runtime smokeが通った後に、`alerts` と `knowledge_pages` をどうSupabase staging runtimeへ進めるかをdocs-onlyで整理しました。

- `alerts`: Supabase repositoryは存在するが、API runtimeにはまだ接続していない。
- `knowledge_pages`: Supabase repositoryは存在するが、RAG runtimeにはまだ接続していない。
- `knowledge_pages.allowed_for_ai` はRAG検索対象を絞るflagとして維持する。
- 次段階ではfake client testで `tenant_id` filter、`allowed_for_ai` filter、alert status update、error handlingを確認してからstaging smokeへ進む。
- RLS SQL、migration変更、Supabase接続、API runtime変更はLoop 081では未実装。

詳細は [docs/11_codex_tasks/081_supabase_alerts_knowledge_staging_runtime_plan.md](11_codex_tasks/081_supabase_alerts_knowledge_staging_runtime_plan.md) と [docs/15_runbooks/supabase_alerts_knowledge_staging_runtime_plan.md](15_runbooks/supabase_alerts_knowledge_staging_runtime_plan.md) を参照する。

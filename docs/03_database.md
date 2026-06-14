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

## ローカルmigration検証

Loop 026ではlocal migration testの手順を整理しました。現在の環境ではSupabase CLIはありますが、Docker daemonが使えず `psql` もないため、実DBへのmigration適用は未実行です。

代替として `tests/integration/database-schema.test.ts` のSQL validationを強化し、主要table、tenant-owned table、主要index、RLS SQL未混入を確認しています。

詳細は [docs/11_codex_tasks/026_supabase_local_migration_test.md](11_codex_tasks/026_supabase_local_migration_test.md) と [docs/15_runbooks/supabase_local_migration_test.md](15_runbooks/supabase_local_migration_test.md) を参照してください。

## staff/admin tenant context方針

Loop 027では、開発用 `x-tenant-id` から本番向けの認証済みstaff/admin tenant contextへ移行するための計画を追加しました。現時点ではschema変更、Supabase Auth実装、JWT検証、API差し替えは行っていません。

現在の `staff_users` は `tenant_id` を持つtenant-scoped tableです。後続Loopで `auth_user_id` やmembership tableの要否を決め、staff identityとtenant membershipを安全に結びます。

詳細は [docs/11_codex_tasks/027_supabase_auth_staff_tenant_context_plan.md](11_codex_tasks/027_supabase_auth_staff_tenant_context_plan.md) を参照してください。

## enum/check制約

PostgreSQL enumではなくcheck制約で初期表現しています。

- `customers.response_mode`: `bot_auto` / `human_required` / `human_active` / `emergency` / `closed`
- `messages.role`: `customer` / `bot` / `staff` / `system` / `ai`
- `messages.message_type`: `text` / `image` / `file` / `form` / `reservation` / `alert` / `summary`
- `alerts.status`: `open` / `notified` / `resolved` / `dismissed`
- `alerts.severity`: `low` / `medium` / `high` / `critical`

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
- `email`
- `display_name`
- `role`: `owner` / `manager` / `staff`
- `line_user_id`
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`
- unique: `tenant_id + email`

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

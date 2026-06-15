# Loop 065: Supabase Persistence Staging Plan

## Goal

社内確認版の最大リスクであるin-memory / 一時保存を、Supabase staging persistenceへ進めるための順番と安全条件をdocs-onlyで整理する。

今回のLoopではSupabase接続、`.env` 作成、migration apply、RLS SQL、runtime switchは行わない。

## Scope

- 現在のin-memory runtime状況を整理する。
- 既存Supabase repository実装状況を棚卸しする。
- データ別の現在の保存先、Supabase repository、migration/schema、優先度を整理する。
- local / staging / production の分離方針を整理する。
- env/key管理方針を整理する。
- migration apply前チェックリストを作る。
- RLS / service role / anon keyの扱いを整理する。
- 社内確認版からstaging検証版への後続Loopを小さく分ける。
- README、dev loop docs、社内確認runbook、dev log、docs testを更新する。

## Out of Scope

- Supabase本番接続
- Supabase staging接続
- `supabase link`
- migration apply
- RLS SQL実装
- `.env` 作成・変更
- 環境変数追加
- API runtime切替
- repository wiring変更
- DB schema変更
- migration変更
- Admin API route変更
- Admin UI変更
- LINE API実送信
- OpenAI API実接続
- selectedTenantId transport実装
- Supabase Auth/JWT実装
- production dev_header rejection
- 依存関係追加

## Current Runtime Status

現在のAdmin/API runtimeは、社内確認版としてin-memory repositoryを使う。

- `apps/api/src/index.ts` のdefault dependenciesは `InMemoryCustomerRepository`、`InMemoryMessageRepository`、`InMemoryAlertRepository`、`InMemoryKnowledgePageRepository`。
- demo seedは `POST /api/dev/seed-demo-data` でAPI process内へ投入する。
- API processを再起動するとdemo customers、messages、alerts、knowledge pagesは消える。
- LINE送信、担当者通知、AIはそれぞれ `MockLineClient`、`MockStaffNotifier`、`MockAiProvider`。
- Supabase repositoryは追加済みだが、Admin API runtimeにはまだ注入していない。

## Existing Supabase Repository Inventory

| Boundary | Location | Current state | Runtime connected |
| --- | --- | --- | --- |
| Supabase server client boundary | `packages/db/src/supabase/client.ts` | 追加済み | No |
| Supabase config boundary | `packages/db/src/supabase/config.ts` | 追加済み | No |
| Supabase Auth client boundary | `packages/db/src/supabase/auth-client.ts` | 追加済み | No |
| `SupabaseCustomerRepository` | `packages/db/src/supabase/repositories/customer-repository.ts` | 追加済み | No |
| `SupabaseMessageRepository` | `packages/db/src/supabase/repositories/message-repository.ts` | 追加済み | No |
| `SupabaseAlertRepository` | `packages/db/src/supabase/repositories/alert-repository.ts` | 追加済み | No |
| `SupabaseKnowledgePageRepository` | `packages/db/src/supabase/repositories/knowledge-page-repository.ts` | 追加済み | No |
| `SupabaseStaffAuthLookupRepository` | `packages/db/src/supabase/repositories/staff-auth-lookup-repository.ts` | 追加済み | No |

未実装または未接続:

- `TenantRepository` / settings repositoryはまだない。
- Supabase repositoriesはfake client testsで検証済みだが、本物Supabase projectへは接続していない。
- Admin APIのdefault runtimeはin-memoryのまま。
- RLS SQLは未実装。
- local migration applyは未実行。

## Data Persistence Inventory

| データ | 現在のruntime | Supabase repository | migration/schema | 優先度 | 備考 |
| --- | --- | --- | --- | --- | --- |
| `tenants` | config / fixed tenant resolver | なし | あり | P3 | 初期tenantはseedあり。tenant repositoryは後続で検討。 |
| `customers` | in-memory | あり | あり | P1 | 顧客一覧、詳細、timelineの起点。staging永続化の最優先。 |
| `messages` | in-memory | あり | あり | P1 | timeline、AI要約保存、staff reply保存に必須。 |
| `alerts` | in-memory | あり | あり | P2 | 未返信チェックとnotify-open検証に必要。 |
| `knowledge_pages` | in-memory / static seed | あり | あり | P2 | RAG source確認に必要。静的fixtureからstaging seedへ移す候補。 |
| `staff_users` | schema + fake/auth lookup tests | lookupあり | あり | P3 | Auth/JWT接続後にruntime利用。 |
| `staff_tenant_memberships` | schema + fake/auth lookup tests | lookupあり | あり | P3 | selected tenantとrole判定の前提。 |
| `tenant_settings` | runtimeなし | なし | `tenant_line_settings` / `tenant_ai_settings` としてあり | P3 | 単体 `tenant_settings` tableはなく、設定種別ごとに分かれている。 |
| AI summary results | `messages` に `role=ai` / `message_type=summary` でin-memory保存 | `messages` repository経由で対応可能 | あり | P1 | timelineに残るためmessages永続化と同時に扱う。 |
| AI reply draft results | response only | なし | なし | P4 | 現在は保存しない設計。保存する場合は別Loopでschema syncが必要。 |
| RAG answer draft results | response only | なし | なし | P4 | 現在は保存しない設計。sourceは `knowledge_pages` 由来。 |
| staff reply messages | `messages` に `role=staff` / `message_type=text` でin-memory保存 | `messages` repository経由で対応可能 | あり | P1 | 送信確認UI後も本物LINE送信ではなく、まずtimeline永続化が必要。 |

## Persistence Priority

### Phase A: customer timeline persistence

- `customers`
- `messages`
- customer detail / timeline
- staff reply message保存
- AI summary message保存

理由: 社内確認版の「再起動すると相談履歴が消える」問題を最短で解消する範囲。

### Phase B: alert and knowledge persistence

- `alerts`
- `knowledge_pages`

理由: 未返信チェック結果とRAG source確認をstagingで再現するため。Phase Aのtimeline永続化後に接続する。

### Phase C: staff and tenant settings persistence

- `staff_users`
- `staff_tenant_memberships`
- `tenant_line_settings`
- `tenant_ai_settings`

理由: Auth/JWT、role guard、selectedTenantId、tenant settings運用へ進む前提。社内確認stagingのdummy staffで検証する。

### Phase D: auth / RLS / production hardening

- Supabase Auth/JWT
- selectedTenantId transport
- production dev_header rejection
- RLS SQL and local/staging tests
- backup / rollback / audit

理由: production dataを扱う前の必須安全境界。本番化要件と混ぜず、個別Loopで進める。

## Local / Staging / Production Policy

| Environment | Data | DB access | Allowed use | Not allowed |
| --- | --- | --- | --- | --- |
| local | demo seed / dummy data | defaultはin-memory | 開発者確認、UI確認、mock確認 | 実顧客情報、production DB接続 |
| staging | dummy tenant / dummy customer only | separate Supabase staging project | migration dry-run、repository runtime switch検証、社内確認の永続化検証 | 実顧客情報、production key混入、無許可migration apply |
| production | real tenant / real customer data | separate production Supabase project | RLS/Auth/JWT/backup/rollback確認後のみ | `x-tenant-id` dev header依存、RLSなし運用、service role client露出 |

## Env / Key Policy

具体値はdocsに書かない。今回 `.env` は作成・変更しない。

想定env名:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

ルール:

- `.env` はgitに入れない。
- API key、service role key、anon keyの具体値をdocs、dev log、Codex promptに書かない。
- `SUPABASE_SERVICE_ROLE_KEY` はserver-side API / repository層だけで扱う。
- browser、LIFF、Next.js client componentにservice role keyを絶対に出さない。
- stagingとproductionのkeyを混ぜない。
- Codexに秘密情報を貼らない。
- `SUPABASE_DB_URL` はmigration/local検証用途として扱い、本番DBを自動test対象にしない。

## Migration Apply Pre-checklist

Supabase stagingへmigration applyする前に、少なくとも以下を確認する。

- Supabase projectがstaging用である。
- production projectではない。
- `supabase link` 先を人間が確認している。
- `packages/db/migrations/0001_initial_schema.sql` の内容をreview済み。
- RLS SQLが未実装である場合、staging検証目的に限定し、productionへ進まない。
- seed dataはdummyで、実顧客情報、LINE userId、API key、production logを含まない。
- service role keyはserver-sideだけで扱う。
- rollback方針を決めている。
- local SQL validation testが通っている。
- local Supabaseまたはtest DBでのmigration検証方針がある。
- repository runtime switchはstaging接続確認後の別Loopで行う。

## RLS / Service Role Policy

- 初期stagingでは、server-side service role accessでrepository検証する可能性がある。
- service roleはRLS bypass前提なので、repository層で `tenant_id` filter testを必ず維持する。
- productionではRLS/Auth/JWTが必要。
- RLSなしのままproductionへ進まない。
- browser / LIFFにservice role keyを出さない。
- anon keyを使う場合でもRLS前提にする。
- Admin UIはSupabase DBへ直接アクセスせず、Admin API経由を維持する。

## Why No Connection In This Loop

今回の目的はstaging persistenceへ進む順番と安全条件を固めること。Supabase接続、migration apply、runtime switchを同時に行うと、環境取り違え、RLS未検証、demo/production data混入、service role key露出のリスクが高い。

したがってLoop 065ではdocs/testだけを更新し、実装は後続Loopへ分割する。

## Follow-up Loop Candidates

```text
Loop 066: Supabase staging env readiness checklist
Loop 067: Supabase runtime switch boundary for customers/messages
Loop 068: Supabase repository integration tests with fake client
Loop 069: staging migration dry-run record
Loop 070: Supabase alerts/knowledge runtime switch plan
Loop 071: Supabase Auth/JWT selectedTenantId integration plan
Loop 072: production dev_header rejection plan refresh
```

## Test Plan

- `git status --short`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

Build is not required because this is docs/test only and does not change UI/runtime.

## Verification Result

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success, 10 packages
- `npx pnpm@10.12.1 test`: success, 41 files / 272 tests passed
- `npx pnpm@10.12.1 test:integration`: success, 41 files / 272 tests passed
- build: not run because this loop changed only docs and docs tests

## Risks

- Supabase migration has still not been applied to a real local/staging database.
- Runtime remains in-memory, so API process restart still clears demo data.
- RLS SQL is still not implemented.
- Supabase Auth/JWT, selectedTenantId transport, and production dev_header rejection are still not connected.
- Staging/prod env separation must be verified by a human before any future `supabase link` or migration apply.

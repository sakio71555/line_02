# Loop 020: Supabase Persistence Planning

## Goal

現在のin-memory repository構成を整理し、Supabase PostgreSQL backed repositoryへ安全に移行するためのdocs-only計画を作る。

## Status

Implemented in Loop 020. This loop is documentation only; no runtime code, Supabase client, repository implementation, env file, DB connection, or migration apply was added.

## Scope

- 現在のin-memory構成を整理する。
- Supabase化するrepository一覧と置き換え方針を整理する。
- `tenant_id` 分離、RLS、service role key、env、migration適用、test、local/staging/production分離の方針を整理する。
- README、dev loop docs、Obsidian dev logを必要最小限更新する。

## Out of scope

- Supabase client implementation
- Supabase connection
- Supabase CLI execution
- migration apply
- repository implementation
- API behavior changes
- apps changes
- domain model changes
- package changes
- new dependencies
- `.env` creation or update
- OpenAI API / LINE API calls
- Web crawling

## Current In-memory Structure

現在のruntimeは、API process内のin-memory repositoryを使います。API processを再起動するとdemo customer、message、alert、knowledge fixtureは消えます。

主なin-memory実装:

- `CustomerRepository` / `InMemoryCustomerRepository`
- `MessageRepository` / `InMemoryMessageRepository`
- `AlertRepository` / `InMemoryAlertRepository`
- `KnowledgePageRepository` / `InMemoryKnowledgePageRepository`

外部境界:

- `LineClient` と `MockLineClient` はLINE送信境界であり、Supabase repositoryではない。
- `StaffNotifier` と `MockStaffNotifier` は担当者通知境界であり、Supabase repositoryではない。
- `AiProvider` と `MockAiProvider` はAI生成境界であり、Supabase repositoryではない。

## Supabase Repository Targets

最初にSupabase化するrepository:

| Interface | Current implementation | Future implementation | Main table | Tenant rule | Planned loop |
| --- | --- | --- | --- | --- | --- |
| `CustomerRepository` | `InMemoryCustomerRepository` | `SupabaseCustomerRepository` | `customers` | all reads/writes require `tenant_id` | Loop 022 |
| `MessageRepository` | `InMemoryMessageRepository` | `SupabaseMessageRepository` | `messages` | all reads/writes require `tenant_id`; `customer_id` must belong to same tenant | Loop 022 |
| `AlertRepository` | `InMemoryAlertRepository` | `SupabaseAlertRepository` | `alerts` | all reads/writes require `tenant_id` | Loop 023 |
| `KnowledgePageRepository` | `InMemoryKnowledgePageRepository` | `SupabaseKnowledgePageRepository` | `knowledge_pages` | list/search by `tenant_id`; RAG only uses allowed pages | Loop 024 |

後続で検討するrepository:

- `StaffUserRepository`: `staff_users` と認証済みuserのtenant binding。
- tenant settings repositories: `tenants`、`tenant_line_settings`、`tenant_ai_settings`。
- `ConsultationRepository`: `consultations`。
- `ConstructionCaseRepository`: `construction_cases`。
- `ReservationRepository`: `reservations`。

## Replacement Policy

- 既存のrepository interfaceを維持し、実装だけSupabase backed classへ差し替える。
- API routeのrequest/response contractは原則変更しない。
- in-memory repositoryはunit test、local demo、mock integration用途として残す。
- Supabase repositoryはserver-side境界に閉じる。
- `tenant_id` 条件なしのselect/update/delete methodを作らない。
- repository contract testでin-memory実装とSupabase実装の振る舞いを揃える。
- demo seedとproduction seedを混ぜない。

## Tenant Isolation Rules

初期tenant:

- `tenant_id = tenant_amamihome`
- `tenant_slug = amamihome`
- `official_domain = amamihome.net`

将来他社販売できるように、初期tenantだけでもmulti-tenant前提を崩さない。

- 全主要テーブルは `tenant_id` を持つ。
- admin APIは最終的に認証済みtenant contextから `tenant_id` を決定する。
- 現在の開発用 `x-tenant-id` headerは本番認証の代替ではない。
- Supabase queryは必ず `tenant_id` で絞る。
- RAG検索はquery評価より先に `tenant_id` でknowledgeを絞る。
- AI providerへ他tenantの会話やknowledgeを渡さない。

## RLS Basic Policy

- tenant境界はDBレベルでも守る。
- RLS policyは後続Loopで個別設計・検証する。
- 初期実装では安全なserver-side repository境界を作ってからRLS検証に進む。
- `staff_users` と認証userを結び、所属tenantだけを操作可能にする。
- `platform_admin` とtenant staffの権限を分ける。
- browser / LIFF / client側からservice role keyを使わない。
- RLS testは専用Loopで扱い、production前に必ず通す。

## Service Role And Env Policy

今回 `.env` は作成・変更しない。docsには名前と扱いだけを記録する。

想定env:

- `SUPABASE_URL`: Supabase project URL。
- `SUPABASE_ANON_KEY`: RLS前提の公開可能key。client利用は慎重に扱う。
- `SUPABASE_SERVICE_ROLE_KEY`: server-side限定。browser、LIFF、client componentへ絶対に出さない。
- `SUPABASE_DB_URL`: migrationやlocal DB検証用。production DBをdefault testで使わない。

使い分け:

- local: local Supabaseまたはtest DBを明示flag付きで使う。
- staging: productionとは別project/keyを使う。
- production: 手動checklistとRLS検証後に接続する。
- service role keyは必要最小限のserver-side処理だけで使い、アプリ層でも `tenant_id` 条件を必須にする。

## Migration Policy

- migration SQLの追加・変更は専用Loopで行う。
- migration適用はlocal -> staging -> productionの順で確認する。
- production migration前にbackup、rollback、RLS、seed混入防止を確認する。
- demo seedは開発専用として扱い、production seedと分離する。
- migration SQL、domain型、Zod schema、repository実装の不整合を専用testで検出する。

## Test Policy

- 現在のin-memory unit/integration testは残す。
- Supabase repository testは後続Loopでintegration testとして分ける。
- default `npx pnpm@10.12.1 test` は本番DBへ接続しない。
- Supabase local/test DBは明示flag付きでのみ使う。
- 本番DBにはテストを当てない。
- tenant分離テストを必須にする。
- RLSテストは専用Loopで扱う。
- LINE API、OpenAI APIは引き続きmock境界で扱う。

## Local / Staging / Production Separation

- local: in-memoryまたはlocal Supabaseだけを使う。
- staging: productionと別project、別key、別tenant dataを使う。
- production: RLS、auth、backup、migration checklistが揃ってから接続する。
- `.env`、API key、production log、実顧客情報はdocsやdev logへ書かない。

## Risks

- `tenant_id` 条件漏れによるtenant leakage。
- service role keyの過剰利用。
- RLS未検証のままproduction dataを扱う。
- local/staging/production envの取り違え。
- demo seedとproduction seedの混同。
- LINE userId、相談内容、住宅写真などの個人情報をログやtest fixtureへ入れる。
- migration SQL、domain型、Zod schema、runtime repositoryの不整合。

## Acceptance Criteria

- Supabase persistence導入計画がtask docにまとまっている。
- repository mappingがtask docにある。
- `tenant_id` 分離とRLS方針が明記されている。
- secrets/env方針が明記されている。
- default testsでは実Supabaseへ接続しない方針が明記されている。
- dev logにLoop 020が追記されている。

## Test requirements

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## External API / DB policy

- LINE API、OpenAI API、Supabaseには接続しない。
- `.env` を作らない。
- 実DB testは実行しない。

## Next loop

```text
Loop 021: Supabase client boundary
Loop 022: Supabase customer/message repository
Loop 023: Supabase alert repository
Loop 024: Supabase knowledge repository
Loop 025: Supabase RLS policy plan
Loop 026: Supabase local migration test
```

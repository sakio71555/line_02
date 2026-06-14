# Loop 023: Supabase Alert Repository

## Goal

既存の `AlertRepository` interfaceに対応するSupabase版repositoryを追加する。既存API routeにはまだ接続せず、in-memory実行経路を維持する。

## Scope

- `SupabaseAlertRepository`
- AlertRepository method mapping
- fake Supabase clientを使ったunit/integration test
- README更新
- Obsidian dev log更新

## Out of scope

- 既存API routeをSupabase AlertRepositoryへ差し替える。
- admin UI / LIFF UIからSupabaseを直接使う。
- Supabase本番接続。
- `.env` 作成・変更。
- migration SQL変更。
- RLS policy実装。
- CustomerRepository / MessageRepository の追加変更。
- `KnowledgePageRepository` 実装。
- OpenAI API呼び出し。
- LINE API呼び出し。
- Webクロール。
- build前提のUI変更。

## Added Repository Location

- `packages/db/src/supabase/repositories/alert-repository.ts`
- `packages/db/src/supabase/repositories/index.ts`

`packages/db/src/supabase/index.ts` からexport済みのrepositories indexに追加し、`@amami-line-crm/db` 経由で参照できるようにした。

## AlertRepository Mapping

| Interface method | Supabase table | Query / write policy |
| --- | --- | --- |
| `create(alert)` | `alerts` | payload includes `tenant_id` |
| `listByTenant(tenantId)` | `alerts` | `tenant_id = tenantId`; `created_at asc` |
| `listOpenByTenant(tenantId)` | `alerts` | `tenant_id = tenantId` and `status = open`; `created_at asc` |
| `findActiveByCustomerAndType(tenantId, customerId, alertType)` | `alerts` | `tenant_id = tenantId`, `customer_id = customerId`, `alert_type = alertType`, `status in (open, notified)` |
| `updateStatus(input)` | `alerts` | update by `tenant_id = input.tenant_id` and `id = input.alert_id` |

Repository method内で `tenant_id` が空の場合はエラーにする。Supabaseから返った行も防御的に `tenant_id` で確認し、別tenant行は返さない。

## Tenant Isolation

- 全read queryで `tenant_id` 条件を必須にする。
- `customer_id` 単体ではalertを検索しない。
- open alert取得は `tenant_id + status` で絞る。
- notified更新は `tenant_id + alert_id` で絞る。
- active alert重複防止は `tenant_id + customer_id + alert_type + status(open/notified)` で判定する。

## Supabase Client Boundary

Loop 021のserver-side Supabase client boundaryを前提に、repositoryはSupabase client相当をconstructor injectionで受け取る。今回のtestではfake clientだけを使い、本物のSupabaseへ接続しない。

Service role clientはserver-side repository層で使う前提とし、browser、LIFF、Next.js client componentから直接使わない。

## Test Summary

追加テスト:

- importだけではenv validationやnetwork accessが走らない。
- alert create payloadに `tenant_id` が入る。
- list queryで `tenant_id` 条件が付く。
- open alert queryで `tenant_id + status = open` 条件が付く。
- active alert queryで `tenant_id + customer_id + alert_type + status in (open, notified)` 条件が付く。
- updateStatusで `tenant_id + alert_id` 条件が付く。
- 別tenant alert rowを返さない。
- Supabase errorを `SupabaseRepositoryError` として扱う。

## Schema / Domain Differences

`Alert` domain型と `packages/db/migrations/0001_initial_schema.sql` の `alerts` tableは、今回のmapping対象fieldでは整合している。migration変更は行っていない。

## Runtime Status

今回も既存API routeには接続していない。runtimeはまだin-memory repositoryのまま。

## Next Loop

Loop 024: Supabase knowledge repository

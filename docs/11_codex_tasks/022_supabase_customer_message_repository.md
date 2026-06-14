# Loop 022: Supabase Customer/Message Repository

## Goal

既存の `CustomerRepository` / `MessageRepository` interfaceに対応するSupabase版repositoryを追加する。既存API routeにはまだ接続せず、in-memory実行経路を維持する。

## Scope

- `SupabaseCustomerRepository`
- `SupabaseMessageRepository`
- Supabase repository error wrapper
- fake Supabase clientを使ったunit/integration test
- README更新
- Obsidian dev log更新

## Out of scope

- 既存API routeをSupabase repositoryへ差し替える。
- admin UI / LIFF UIからSupabase clientを直接使う。
- Supabase本番接続。
- `.env` 作成・変更。
- migration SQL変更。
- RLS policy実装。
- `AlertRepository` 実装。
- `KnowledgePageRepository` 実装。
- OpenAI API呼び出し。
- LINE API呼び出し。
- Webクロール。
- build前提のUI変更。

## Added Repository Location

- `packages/db/src/supabase/repositories/customer-repository.ts`
- `packages/db/src/supabase/repositories/message-repository.ts`
- `packages/db/src/supabase/repositories/errors.ts`
- `packages/db/src/supabase/repositories/index.ts`

`packages/db/src/supabase/index.ts` からexportし、`@amami-line-crm/db` 経由で参照できるようにした。

## Dependency Note

`@amami-line-crm/db` がdomain repository interface型を参照するため、workspace内部依存として `@amami-line-crm/domain` を追加した。外部packageの新規追加はない。

## CustomerRepository Mapping

| Interface method | Supabase table | Query / write policy |
| --- | --- | --- |
| `findByIdForTenant(tenantId, customerId)` | `customers` | `tenant_id = tenantId` and `id = customerId` |
| `findByTenantAndLineUserId(tenantId, lineUserId)` | `customers` | `tenant_id = tenantId` and `line_user_id = lineUserId` |
| `listByTenant(tenantId)` | `customers` | `tenant_id = tenantId` |
| `save(customer)` | `customers` | payload includes `tenant_id` and `last_customer_message_at`; upsert by `id` |

Repository method内で `tenant_id` が空の場合はエラーにする。Supabaseから返った行も防御的に `tenant_id` で確認し、別tenant行は返さない。

## MessageRepository Mapping

| Interface method | Supabase table | Query / write policy |
| --- | --- | --- |
| `insert(message)` | `messages` | payload includes `tenant_id` |
| `findLatestByCustomerIds(tenantId, customerIds)` | `messages` | `tenant_id = tenantId` and `customer_id in customerIds`; latest by `created_at desc` |
| `listByCustomer(tenantId, customerId)` | `messages` | `tenant_id = tenantId` and `customer_id = customerId`; timeline by `created_at asc` |

`customer_id` 単体でtenant横断検索しない。fake client testでも別tenant rowや別customer rowが混ざらないことを確認した。

## Supabase Client Boundary

Loop 021のserver-side Supabase client boundaryを前提に、repositoryはSupabase client相当をconstructor injectionで受け取る。今回のtestではfake clientだけを使い、本物のSupabaseへ接続しない。

Service role clientはserver-side repository層で使う前提とし、browser、LIFF、Next.js client componentから直接使わない。

## Test Summary

追加テスト:

- importだけではenv validationやnetwork accessが走らない。
- customer find/list/saveで `tenant_id` 条件またはpayloadが付く。
- message insert/list/latestで `tenant_id` 条件またはpayloadが付く。
- 別tenantのcustomer/message rowを返さない。
- timelineは `created_at` 昇順。
- latest messageはcustomerごとの最新だけを返す。
- Supabase errorを `SupabaseRepositoryError` として扱う。
- `customerIds` が空の場合はSupabase queryを投げない。

## Schema / Domain Differences

- Loop 022時点ではdomain `Customer.last_customer_message_at` とmigration schemaに差異があった。
- Loop 022.1で `customers.last_customer_message_at timestamptz` を初期migrationへ追加し、Supabase write rowにも含める形に同期済み。

## External API / DB Policy

- 本番Supabaseには接続しない。
- `.env` は作成・変更しない。
- OpenAI API、LINE APIは呼ばない。
- 既存runtimeはin-memory repositoryのまま。

## Next Loop

Loop 023: Supabase alert repository

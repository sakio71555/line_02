# Loop 022.1: Customer Schema Sync

## Goal

Loop 022で判明した `Customer.last_customer_message_at` のdomain/schema差異を解消し、Supabase CustomerRepositoryをAPIへ接続する前のschema整合を取る。

## Scope

- `packages/db/migrations/0001_initial_schema.sql`
- `SupabaseCustomerRepository` mapping
- schema / repository tests
- README更新
- dev log更新

## Out of scope

- 既存API routeをSupabase repositoryへ差し替える。
- Supabase本番接続。
- `.env` 作成・変更。
- RLS policy実装。
- `AlertRepository` 実装。
- `KnowledgePageRepository` 実装。
- admin UI / LIFF UI変更。
- OpenAI API呼び出し。
- LINE API呼び出し。
- Webクロール。
- build前提のUI変更。

## Schema / Domain Difference

Loop 022時点では、domain `Customer` に `last_customer_message_at` がある一方で、初期migrationの `customers` tableには同名columnがなかった。

## Migration Change

`customers` tableへ以下を追加した。

```sql
last_customer_message_at timestamptz
```

`last_message_at` / `last_staff_reply_at` と同系統のnullable timestampとして扱う。既存seedには必須値を追加しない。

このprojectではまだSupabase本番適用をしていない初期migration段階のため、追加migrationではなく `0001_initial_schema.sql` を同期修正した。将来、適用済みmigrationができた後は履歴migration方式に切り替える。

## CustomerRepository Mapping Impact

`SupabaseCustomerRepository` のwrite rowに `last_customer_message_at` を含め、domain `Customer` とDB schemaのmappingを揃えた。

## Test Summary

- `database-schema.test.ts` で `customers.last_customer_message_at timestamptz` を確認。
- `supabase-customer-message-repository.test.ts` でcustomer upsert payloadに `last_customer_message_at` が入ることを確認。
- 外部DBには接続しない。

## Runtime Status

今回も既存API routeには接続していない。runtimeはまだin-memory repositoryのまま。

## Next Loop

Loop 023: Supabase alert repository

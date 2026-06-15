# Loop 068: Supabase Repository Integration Tests with Fake Client

## Goal

Supabase実DBへ接続する前に、`SupabaseCustomerRepository` / `SupabaseMessageRepository` のtenant filter、mapping、timeline order、error handlingをfake Supabase clientで厚めに固定する。

今回のLoopではSupabaseへ接続しない。`.env` は作らない。migration apply、RLS SQL、API runtime switchも行わない。

## Scope

- customers/messages repositoryのfake client integration testsを追加する。
- `tenant_id` filterとwrite payloadの `tenant_id` を確認する。
- customer read/write mappingを確認する。
- message read/write mappingを確認する。
- timeline / latest message取得に必要なfilterとorderを確認する。
- Supabase errorを `SupabaseRepositoryError` として扱い、secret値やURL値をerrorに出さないことを確認する。
- runtime bundleからSupabase repositoriesをfake clientで組み立てられることを確認する。
- README、dev loop docs、staging runbook、dev logを更新する。

## Out of Scope

- Supabase実接続
- staging Supabase接続
- production Supabase接続
- `.env` / `.env.local` / `.env.example` 作成・変更
- 実key入力
- migration apply
- migration SQL変更
- RLS SQL実装
- API runtime switch
- repository runtime wiring変更
- Admin API route変更
- Admin UI変更
- alerts / knowledge_pages / staff auth runtime switch
- LINE API実送信
- OpenAI API実接続
- selectedTenantId transport実装
- Supabase Auth/JWT実装
- production dev_header rejection
- 依存関係追加

## Target Repositories

- `SupabaseCustomerRepository`
- `SupabaseMessageRepository`

対象外:

- `SupabaseAlertRepository`
- `SupabaseKnowledgePageRepository`
- `SupabaseStaffAuthLookupRepository`

## Fake Client Test Policy

追加したhelper:

```text
tests/helpers/fake-supabase-client.ts
```

fake clientは既存repositoryが使う範囲だけを表現する。

- `from(table)`
- `select()`
- `insert()`
- `upsert()`
- `update()`
- `eq()`
- `in()`
- `order()`
- `single()`
- `maybeSingle()`
- promise-like list execution
- error return

本物Supabase client、実env、実DB、network accessは使わない。

## Tenant Filter Checks

- customer `listByTenant` は `tenant_id` で絞る。
- customer `save` payloadには `tenant_id` が入る。
- message `insert` payloadには `tenant_id` が入る。
- message `listByCustomer` は `tenant_id + customer_id` で絞る。
- message `findLatestByCustomerIds` は `tenant_id + customer_id in (...)` で絞る。
- fake resultに別tenant rowが混ざっていても、repository返却時に除外する。

## Customer Mapping Checks

確認したfield:

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
- `response_mode`
- `status`
- `last_message_at`
- `last_customer_message_at`
- `last_staff_reply_at`
- `created_at`
- `updated_at`

`interest_tags` がDB row側で `null` の場合はdomain側で `[]` として扱う。

## Message Mapping Checks

確認したfield:

- `id`
- `tenant_id`
- `customer_id`
- `consultation_id`
- `line_message_id`
- `role`
- `message_type`
- `body`
- `media_storage_path`
- `staff_user_id`
- `ai_generated`
- `sent_to_line_at`
- `created_at`

timeline用途では `created_at` 昇順、latest用途では `created_at` 降順queryとrepository側の防御的sortを確認する。

## Error Mapping Checks

`SupabaseRepositoryError` は以下を満たす。

- `table` と `operation` が分かる。
- Supabase error codeは安全な文字だけにsanitizeして表示する。
- Supabase errorのraw `message` / `details` / `hint` はerror messageへ出さない。
- service role key相当の値やURL値をerror message / `causeError` に出さない。

## Implementation Changes

`packages/db/src/supabase/repositories/errors.ts` を小さく修正し、Supabaseから返るraw error内容を外へ出さないようにした。

API route、repository interface、migration、runtime wiringは変更していない。

## Test Coverage

追加テスト:

```text
tests/integration/supabase-customer-message-repositories-fake-client.test.ts
```

確認内容:

- customer write payload mapping
- customer tenant filter and null `interest_tags` mapping
- message write payload mapping
- timeline filter and ascending order
- latest message filter and descending order
- Supabase error secret / URL leak prevention
- runtime bundleからfake clientでSupabase repositoriesを利用できること

既存test:

- `tests/integration/supabase-customer-message-repository.test.ts`
- `tests/integration/customer-message-runtime-boundary.test.ts`

## Why No Supabase Connection In This Loop

今回の目的は、実DB接続前にrepository境界の挙動をfake clientで固定すること。ここでSupabase接続、`.env` 作成、migration apply、API runtime switchを同時に行うと、secret露出、project取り違え、tenant境界漏れを切り分けにくくなる。

## Verification Result

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success
- `npx pnpm@10.12.1 test`: success
- `npx pnpm@10.12.1 test:integration`: success
- `npx pnpm@10.12.1 build`: success

## Remaining Risks

- Supabase実DBでのintegration testは未実施。
- API runtimeはまだSupabase repositoryへ接続していない。
- staging project / env / dummy seedは未設定。
- migration apply、RLS SQL、Supabase Auth/JWTは未実装。
- alerts / knowledge_pages / staff auth runtime switchは対象外。

## Next Loop Candidates

```text
Loop 069: staging migration dry-run record
Loop 070: Supabase alerts/knowledge runtime switch plan
Loop 071: Supabase customer/message API runtime switch plan
```

# Loop 067: Supabase Runtime Switch Boundary for Customers/Messages

## Goal

`customers` / `messages` を将来in-memory runtimeからSupabase repositoryへ切り替えるための、最小のruntime mode / bundle / factory境界を追加する。

今回のLoopではSupabaseへ接続しない。`.env` は作らない。migration apply、RLS SQL、API route差し替えも行わない。

## Scope

- `customers` / `messages` 用のrepository runtime mode型を追加する。
- `CustomerRepository` と `MessageRepository` をまとめるbundle型を追加する。
- defaultでin-memory repositoryを返すfactoryを追加する。
- Supabase repositoryをfake clientまたはenv boundaryから組み立てるfactoryを追加する。
- Supabase modeでenv不足またはURL不正の場合、secret値を出さずに明確なerrorを返す。
- testでdefault in-memory、Supabase fake client、env不足error、network未接続を固定する。
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
- API routeのSupabase差し替え
- alerts / knowledge_pages / staff auth runtime switch
- Admin UI変更
- LINE API実送信
- OpenAI API実接続
- selectedTenantId transport実装
- Supabase Auth/JWT実装
- production dev_header rejection
- 依存関係追加

## Current Runtime Status

- `apps/api` のdefault runtimeは引き続きin-memory。
- demo seedはAPI process内の `InMemoryCustomerRepository` / `InMemoryMessageRepository` に書き込む。
- Supabase版 `CustomerRepository` / `MessageRepository` は存在するが、Admin API runtimeにはまだ接続しない。
- `apps/api` は現時点で `@amami-line-crm/db` に依存していないため、今回のLoopではpackage依存を追加せず、切替境界を `packages/db` に保持する。

## Added Boundary

追加場所:

```text
packages/db/src/runtime/customer-message-repositories.ts
```

主なexport:

```text
RepositoryRuntimeMode = "in_memory" | "supabase"
CustomerMessageRepositoryBundle
createInMemoryCustomerMessageRepositories
createSupabaseCustomerMessageRepositories
createSupabaseCustomerMessageRepositoriesFromEnv
createCustomerMessageRepositoriesForRuntime
SupabaseRuntimeNotConfiguredError
```

## In-memory Default

`createCustomerMessageRepositoriesForRuntime()` はmode未指定なら必ず `in_memory` を返す。

このdefault pathでは以下を行わない。

- Supabase env validation
- Supabase client生成
- network access
- `.env` 要求

## Supabase Mode Boundary

Supabase modeは明示指定された場合だけ使う。

安全な使い方:

- fake clientを注入してtestする。
- 実envを読ませる場合も、boundary関数を明示的に呼ぶ。
- service role clientはserver-side repository層だけで扱う。
- browser / LIFF / Next client componentからこの境界を直接使わない。

今回、API runtimeからSupabase modeを有効化する設定はまだ追加していない。

## Env Error Policy

Supabase modeでenv不足またはURL不正の場合は `SupabaseRuntimeNotConfiguredError` をthrowする。

error messageにはenv名だけを含める。

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

error messageに実key、URL値、DB URL値を出さない。

## API Runtime Connection

今回のLoopでは、Admin API runtimeへSupabase repositoryを接続していない。

理由:

- `apps/api` は現在 `@amami-line-crm/db` に依存していない。
- 今回は依存追加禁止であり、API route挙動を変えないことがScope。
- demo seed / local demo / internal review editionを壊さないため、default runtimeはin-memoryのまま維持する。

後続LoopでAPI runtime switchを行う場合は、`apps/api` の依存関係、runtime mode設定、rollback方針、staging dummy data確認を1つずつ扱う。

## Test Coverage

- default runtime modeが `in_memory`。
- in-memory factoryが `CustomerRepository` / `MessageRepository` を返す。
- Supabase factoryがfake clientから `SupabaseCustomerRepository` / `SupabaseMessageRepository` を組み立てられる。
- fake envからSupabase boundaryを作ってもnetwork accessしない。
- Supabase modeでenv不足なら `supabase_runtime_not_configured` になる。
- error messageにsecret値やURL値が含まれない。
- package importだけではenv validationもnetwork accessも走らない。

## Verification Result

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success
- `npx pnpm@10.12.1 test`: success
- `npx pnpm@10.12.1 test:integration`: success
- `npx pnpm@10.12.1 build`: success

## Remaining Risks

- API runtimeはまだSupabase repositoryへ接続していない。
- staging Supabase project / env / dummy seedはまだ未設定。
- migration applyは未実行。
- RLS SQL、Supabase Auth/JWT、production dev_header rejectionは未実装。
- `alerts` / `knowledge_pages` のruntime switchは今回対象外。

## Next Loop Candidates

```text
Loop 068: Supabase repository integration tests with fake client
Loop 069: staging migration dry-run record
Loop 070: Supabase alerts/knowledge runtime switch plan
Loop 071: Supabase customer/message API runtime switch plan
```

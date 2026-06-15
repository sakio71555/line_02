# Loop 066: Supabase Staging Env Readiness Checklist

## Goal

Supabase staging projectへ接続する前に、env / key / project / migration / dummy data / runtime switchの安全条件をdocs-onlyで固定する。

今回のLoopではSupabaseへ接続しない。`.env` は作らない。migration apply、RLS SQL、runtime switchも行わない。

## Scope

- 現在のSupabase / in-memory状況を整理する。
- 既存コードで参照されているSupabase env名を名前だけ整理する。
- key管理ルールを整理する。
- staging / production project分離ルールを整理する。
- `.env` 運用方針を整理する。
- migration apply前チェックリストを具体化する。
- dummy seed / 実顧客情報禁止ルールを整理する。
- runtime switch前チェックを整理する。
- Supabase CLI / Docker / psql などtool readiness方針を整理する。
- README、dev loop docs、staging persistence runbook、社内確認runbook、dev log、docs testを更新する。

## Out of Scope

- Supabaseへ接続
- `supabase link`
- `supabase db push`
- migration apply
- migration SQL変更
- RLS SQL実装
- `.env` 作成
- `.env.local` 作成
- `.env.example` 変更
- 実key入力
- service role key入力
- anon key入力
- API runtime switch
- repository wiring変更
- Admin API route変更
- Admin UI変更
- 本番Supabase接続
- staging Supabase接続
- LINE API実送信
- OpenAI API実接続
- selectedTenantId transport実装
- Supabase Auth/JWT実装
- production dev_header rejection実装
- 依存関係追加

## Current State

| Area | State |
| --- | --- |
| runtime | in-memory |
| Customer repository | Supabase版あり、runtime未接続 |
| Message repository | Supabase版あり、runtime未接続 |
| Alert repository | Supabase版あり、runtime未接続 |
| KnowledgePage repository | Supabase版あり、runtime未接続 |
| StaffAuthLookup repository | Supabase版あり、runtime未接続 |
| Supabase client boundary | server client config、service role server client、anon server clientあり |
| Supabase Auth client boundary | auth server client、auth browser clientあり |
| Admin API runtime | Supabase repositoryへ未接続 |
| RAG runtime | Supabase repositoryへ未接続 |
| real DB | 未接続 |
| migration apply | 未実行 |
| RLS SQL | 未実装 |
| Supabase Auth/JWT | 未接続 |
| selectedTenantId transport | 未実装 |

## Required Env Names

実値は書かない。既存コードで参照しているenv名だけを正とする。

| env名 | 用途 | 使用場所 | stagingで必要か | productionで必要か | browserに出してよいか |
| --- | --- | --- | --- | --- | --- |
| `SUPABASE_URL` | Supabase project URL | `packages/db/src/supabase/config.ts`, `auth-config.ts`, server/auth client boundary | yes | yes | yes/限定。Auth browser clientでは使う可能性があるが、直接DB accessは当面しない |
| `SUPABASE_ANON_KEY` | anon client / Auth client用 | `packages/db/src/supabase/config.ts`, `auth-config.ts`, anon server client, auth client boundary | yes | yes | yes/公開前提だが扱い注意。RLS前提でのみ使う |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side repository用 | `packages/db/src/supabase/config.ts`, service role server client | yes | yes | no。browser / LIFF / client componentへ絶対に出さない |
| `SUPABASE_DB_URL` | migration / local DB検証用 | `packages/db/src/supabase/config.ts`, migration runbook | maybe | maybe | no |

Auth boundaryは `SUPABASE_URL` と `SUPABASE_ANON_KEY` だけを読み、service role keyは読まない。repository用server configは4つすべてをvalidationする。

## Key Management Rules

- 実keyをdocsに書かない。
- 実keyをCodexに貼らない。
- 実keyをREADMEに書かない。
- 実keyをdev logに書かない。
- `.env` をgitに入れない。
- `.env.local` をgitに入れない。
- service role keyはserver-sideだけで扱う。
- service role keyをbrowser / LIFF / Next.js client componentへ出さない。
- staging keyとproduction keyを混ぜない。
- production keyをlocal検証に使わない。
- keyが漏れた可能性がある場合は即rotateする。
- terminal historyにkey値が残るコマンドを避ける。

## Staging / Production Project Separation

### Staging project conditions

- project名または識別子でstagingと分かる。
- dummy tenantのみ。
- dummy customerのみ。
- 実顧客情報なし。
- LINE userIdなし。
- 本番LINE channelとは接続しない。
- OpenAI本番課金APIとは接続しない。
- migration apply前にproject refを声出し確認する。

### Production project conditions

- 本番データ用。
- 実顧客情報を扱う可能性がある。
- Supabase Auth/JWT必須。
- RLS必須。
- production dev_header rejection必須。
- 運用、バックアップ、監査が必要。

### Prohibited mixing

- staging検証でproduction projectを使わない。
- production keyをstaging docsに貼らない。
- dummy seedに実顧客情報を混ぜない。
- 実LINE userIdをstaging fixtureに使わない。

## `.env` Operation Policy

- 今回 `.env` は作らない。
- `.env` はlocal developerごとに作る。
- `.env` はgit管理しない。
- `.env.local` もgit管理しない。
- `.env.example` を作るかどうかは別Loopで判断する。
- staging用とproduction用を分ける。
- key値はdocsに残さない。
- terminal historyに残るコマンドにも注意する。

## Migration Apply Pre-checklist

Supabase stagingへmigration applyする前に、以下を確認する。

- Supabase projectがstagingであることを確認する。
- production projectではないことを確認する。
- project refを声出し確認する。
- `supabase link` 先を人間が確認する。
- migration SQLを確認する。
- schema差分を確認する。
- dummy seedだけを使う。
- 実顧客情報が含まれていない。
- LINE userIdが含まれていない。
- service role keyの保存場所を確認する。
- rollback方針を確認する。
- RLS有無を確認する。
- RLSなしでproductionへ進まない。
- apply前に `git status --short` がcleanである。
- apply前にlint / typecheck / testが成功している。
- apply結果をdev logに秘密情報なしで記録する。

## Dummy Seed Policy

### Allowed in staging dummy seed

- 架空の顧客名。
- 架空の問い合わせ。
- 架空のmessage。
- `tenant_amamihome` のdummy tenant。
- 静的knowledge fixture。
- 実在URLを使う場合も個人情報なし。

### Not allowed in staging dummy seed

- 実顧客名。
- 電話番号。
- 住所。
- LINE userId。
- メールアドレス。
- 契約情報。
- 本番ログ。
- API key。

## Runtime Switch Pre-check

Supabaseへ接続したあと、runtime switchへ進む前に以下を確認する。

- customers/messages repository integration testがある。
- tenant_id filterが効いている。
- demo seed相当のstaging seed方針がある。
- API route単位でin-memoryとSupabaseを切り替える境界がある。
- fallback / rollback方針がある。
- loggingでkeyや個人情報が出ない。
- test dataだけで確認する。
- RLSなしの状態をproductionへ持ち込まない。

## Tool Readiness Policy

今回tool確認コマンドは実行しない。Loop 026の記録を現在の前提として扱う。

Loop 026 result:

| Tool | Recorded state |
| --- | --- |
| Supabase CLI | available: `2.90.0` |
| Docker CLI | available: `29.4.3` |
| Docker daemon | unavailable |
| `psql` | not found |
| `supabase/` config | not found |

次に実接続やmigration検証へ進むLoopでは、接続前にtool状態を再確認する。ただし、production projectへ接続しない。

## Why No Connection In This Loop

今回の目的は、接続作業に入る前の安全条件を固定すること。ここでSupabase接続、`.env` 作成、実key入力、migration apply、runtime switchを同時に行うと、project取り違えやsecret露出、dummy dataとproduction dataの混入を防ぎにくい。

そのためLoop 066ではdocs/testのみを更新する。

## Follow-up Loop Candidates

```text
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
- `npx pnpm@10.12.1 test`: success, 41 files / 277 tests passed
- `npx pnpm@10.12.1 test:integration`: success, 41 files / 277 tests passed
- build: not run because this loop changed only docs and docs tests

## Risks

- Supabase staging projectはまだ接続していない。
- `.env` / `.env.local` / `.env.example` はまだ作っていない。
- migration applyはまだ未実行。
- runtimeは引き続きin-memory。
- RLS SQL、Supabase Auth/JWT、selectedTenantId transport、production dev_header rejectionは未実装。

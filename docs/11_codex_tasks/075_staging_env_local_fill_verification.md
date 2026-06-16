# Loop 075: Staging Env Local Fill Verification

## Goal

作業者がローカルで入力した `.env.staging` を、値を表示せずに検証する。Supabase stagingへ接続する前に、必須Supabase envのpresence、LINE/OpenAIの安全flag、repository runtimeの安全状態だけを確認する。

今回のLoopではSupabase接続、migration apply、runtime switch、LINE API送信、OpenAI API接続は行わない。

## Initial Git State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Initial `git status --short`: clean
- Initial branch: `main...origin/main [ahead 6]`
- Latest commit before Loop 075: `b9db5ef docs: add staging env template`

Loop 069〜074 are committed locally and intentionally not pushed. Loop 075 also does not push.

## Scope

- `.env.staging` が存在し、git管理外であることを確認する。
- 値を表示しないstaging env verification scriptを追加する。
- fake fixtureだけを使うintegration testを追加する。
- README / dev loop / staging env runbooks / dev logを更新する。
- `node scripts/dev-loop/verify-staging-env.mjs --file .env.staging` を実行し、値を表示せずに結果だけ記録する。
- commitする。

## Out Of Scope

- `.env.staging` の中身表示
- Supabase接続
- `supabase link`
- `supabase db push`
- migration apply / reset / repair
- RLS SQL実装
- API runtime switch
- repository wiring変更
- API / UI / DB変更
- LINE API実送信
- OpenAI API実接続
- Supabase Auth/JWT実装
- production dev_header rejection実装
- 依存関係追加
- package.json / pnpm-lock変更
- git push

## Why Safe Verification Is Needed

`.env.staging` にはSupabase URL、service role key、DB URLなどのsecretや接続情報が入る可能性がある。値をterminal、docs、README、dev log、Codex prompt、commitに出すと漏洩リスクがある。

そのため、今回のscriptは値そのものを表示せず、keyごとのpresent/missing/unsafeと安全flagの固定値だけを出す。

## Added Script

```text
scripts/dev-loop/verify-staging-env.mjs
```

Usage:

```bash
node scripts/dev-loop/verify-staging-env.mjs --file .env.staging
```

The script:

- reads `.env.staging` locally.
- prints key names only for secrets.
- prints safe flag values only.
- exits `0` when required values and safety flags are OK.
- exits `1` when required values are missing, placeholders remain, unsafe flags are detected, or the file is missing.
- does not connect to Supabase, LINE, OpenAI, or any external service.

## Checks

### Required Supabase Values

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

Each must be non-empty and must not be a placeholder such as `<...>`, `[YOUR-PASSWORD]`, `FILL_ME`, `TODO`, or `CHANGE_ME`.

### Required Safety Flags

- `LINE_MESSAGING_ENABLED=false`
- `LINE_REAL_PUSH_ENABLED=false`
- `AI_PROVIDER=mock`
- `REPOSITORY_RUNTIME=in_memory`
- `APP_ENV=staging`
- `TENANT_ID=tenant_amamihome`
- `TENANT_SLUG=amamihome`

### Optional Provider Values

The following may be blank or present. If present, the script only prints that the key is present and still disabled/mock:

- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_WEBHOOK_SECRET_PATH`
- `STAFF_LINE_GROUP_ID`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Secret Leak Prevention

- The script never prints raw `.env.staging` content.
- The script never prints values for Supabase, LINE, OpenAI, or DB URL fields.
- Error output contains key names only.
- Tests assert that fake fixture values are not emitted to stdout/stderr.
- Real `.env.staging` is not read by tests.

## Local Verification Result

- staging env verification: passed.
- required Supabase values: present.
- LINE real push: disabled.
- AI provider: mock.
- repository runtime: in_memory.
- `.env.staging` git ignore: ignored by `.gitignore`.

## Verification Result

- `git diff --check`: passed.
- `node scripts/dev-loop/verify-staging-env.mjs --file .env.staging`: passed without printing values.
- `npx pnpm@10.12.1 lint`: passed.
- `npx pnpm@10.12.1 typecheck`: passed.
- `npx pnpm@10.12.1 test`: passed, 50 files / 346 tests.
- `npx pnpm@10.12.1 test:integration`: passed, 50 files / 346 tests.
- `npx pnpm@10.12.1 build`: passed, 10 packages successful. Existing Next.js ESLint plugin warning appeared.

## Why No Connection In This Loop

This Loop only verifies local env readiness without leaking values. Connecting to Supabase, applying migrations, enabling LINE real push, or switching repository runtime changes operational risk and must happen in separate explicit Loops.

## Remaining Risks

- `.env.staging` values are present locally but not validated by connecting to Supabase.
- Supabase staging project / project ref are intentionally not recorded.
- RLS SQL remains unimplemented.
- API runtime remains in-memory.
- LINE/OpenAI provider flags are still safety placeholders and are not runtime wiring.
- Loop 069〜075 are not pushed.

## Next Loop Candidates

```text
Loop 076: Supabase staging migration apply execution with explicit approval
Loop 077: Supabase staging apply rollback/recovery runbook
Loop 078: Supabase customer/message API runtime switch plan
```

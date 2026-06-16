# Loop 074: Staging Env Template And Provider Flags

## Goal

Supabase stagingへ進む前に、作業者がローカルで実値を入力するための `.env.staging.example` を用意し、LINE / OpenAI / repository runtimeの安全な初期flagを整理する。

今回のLoopでは実 `.env` を作らない。Supabase、LINE、OpenAIへ接続しない。runtime / API / UI / DB schemaも変更しない。

## Initial Git State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Initial `git status --short`: clean
- Initial branch: `main...origin/main [ahead 5]`
- Latest commit before Loop 074: `1d53ad5 docs: add Supabase migration apply execution gate`

Loop 069 / 070 / 071 / 072 / 073 are committed locally and intentionally not pushed. Loop 074 also does not push.

## Scope

- 既存env参照を棚卸しする。
- `.env.staging.example` を作成する。
- `.gitignore` で実envをignoreし、`.env.staging.example` はtrackできるようにする。
- staging env setup runbookを作成する。
- README / dev loop / Supabase runbooks / LINE safety doc / dev logを更新する。
- docs/templateの静的testを追加する。
- commitする。

## Out Of Scope

- Supabase接続
- `supabase link`
- `supabase db push`
- migration apply / reset / repair
- staging / production Supabase接続
- `.env` / `.env.local` / `.env.staging` / `.env.production` 作成
- 実key、project ref、URL、DB URL、LINE token、OpenAI API keyの記入
- migration SQL変更
- RLS SQL実装
- API runtime switch
- repository wiring変更
- Admin API / Admin UI変更
- LINE API実送信
- OpenAI API実接続
- Supabase Auth/JWT実装
- 依存関係追加
- git push

## Existing Env References Checked

Search command used without reading `.env` values:

```bash
rg --glob '!.env' --glob '!.env.*' --glob '!**/.env' --glob '!**/.env.*' "process\\.env|SUPABASE_|LINE_|OPENAI_|AI_PROVIDER|REAL_PUSH|MESSAGING" .
```

Current code/docs references:

| Area | Env names |
| --- | --- |
| Supabase repository/client boundary | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` |
| Supabase Auth boundary | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| App runtime/config | `APP_ENV`, `TENANT_ID`, `TENANT_SLUG`, `APP_BASE_URL`, `API_BASE_URL`, `LIFF_BASE_URL` |
| LINE webhook/config | `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_WEBHOOK_SECRET_PATH` |
| Staff notification docs | `STAFF_LINE_GROUP_ID` |
| OpenAI config | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Runtime boundary docs/code | repository runtime remains default `in_memory` |

`LINE_MESSAGING_ENABLED`, `LINE_REAL_PUSH_ENABLED`, and `AI_PROVIDER` are included in the template as disabled/mock safety placeholders. They are not wired into runtime in this Loop.

## Created Template

Created:

```text
.env.staging.example
```

The template contains names only, with blank values or safe defaults. It does not contain real Supabase values, project refs, LINE tokens, OpenAI keys, DB URLs, or production logs.

### Supabase Items

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
```

Rules:

- `SUPABASE_SERVICE_ROLE_KEY` is server-side only.
- Do not expose it to browser, LIFF, or Next.js client components.
- `SUPABASE_DB_URL` is for migration / DB verification only.
- Do not write real values to docs, README, dev logs, Codex prompts, or commits.

### LINE Items

```env
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_WEBHOOK_SECRET_PATH=
STAFF_LINE_GROUP_ID=
LINE_MESSAGING_ENABLED=false
LINE_REAL_PUSH_ENABLED=false
```

Rules:

- Use a staging/test channel only.
- Do not use production LINE channel values.
- Keep real push disabled by default.
- Real LINE sending remains a later Loop.

### OpenAI Items

```env
OPENAI_API_KEY=
OPENAI_MODEL=
AI_PROVIDER=mock
```

Rules:

- OpenAI API is not called in this Loop.
- `AI_PROVIDER=mock` is the default staging-safe state.
- Real API key stays blank until a later Loop explicitly enables it.

### Runtime Safety Flags

```env
APP_ENV=staging
REPOSITORY_RUNTIME=in_memory
```

`APP_ENV` is already read by config/dev seed safety. `REPOSITORY_RUNTIME` documents the intended default and keeps runtime switch as a future explicit Loop.

## `.gitignore` Result

`.gitignore` includes:

- `.env`
- `.env.*`
- `.env.local`
- `.env.staging`
- `.env.production`
- `!.env.staging.example`

This keeps real local env files out of git while allowing the staging example template to be committed.

## Why LINE / OpenAI Stay Disabled

The current product is still in local/staging preparation. Real LINE sending and OpenAI calls can affect external users or billing and require separate safety, auth, tenant, and operational gates. This Loop only prepares names and safe defaults.

## Test Coverage

Added `tests/integration/staging-env-template.test.ts` to verify:

- `.env.staging.example` exists.
- Supabase, LINE, OpenAI, and runtime safety env names are present.
- LINE real push is disabled by default.
- AI provider defaults to mock.
- template values do not look like real secrets.
- `.gitignore` ignores `.env.staging` and allows `.env.staging.example`.
- README links to the staging env setup runbook.
- runbook tells operators not to write real keys to docs / README / dev log / Codex.

Tests do not read real `.env` files and do not call external APIs.

## Verification Result

- `git diff --check`: passed.
- `npx pnpm@10.12.1 lint`: passed.
- `npx pnpm@10.12.1 typecheck`: passed.
- `npx pnpm@10.12.1 test`: passed, 49 files / 341 tests.
- `npx pnpm@10.12.1 test:integration`: passed, 49 files / 341 tests.

Build is not required because this Loop changes docs, an env example template, and static tests only.

## Remaining Risks

- `.env.staging` is still not created in this repo and must be filled locally by a human later.
- Supabase staging project / project ref / real keys are not configured in repo.
- LINE / OpenAI provider flags are not wired into runtime.
- API runtime remains in-memory.
- RLS SQL is still not implemented.
- Loop 069 / 070 / 071 / 072 / 073 / 074 are not pushed.

## Next Loop Candidates

```text
Loop 075: Supabase staging env local fill checklist
Loop 076: Supabase staging migration apply execution with explicit approval
Loop 077: Supabase staging apply rollback/recovery runbook
Loop 078: Supabase customer/message API runtime switch plan
```

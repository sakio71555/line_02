# Production Runtime Wiring Remediation

Loop: 151

Date: 2026-06-27

## Purpose

API startupで、外部境界の実装をenvに応じて安全に切り替えられるようにした。

このrunbookは、runtime wiringの現在地、default safety、後続の実接続Loopに進む前の確認項目を記録する。

## Current Runtime Switches

| Area | Switch | Safe default | Real boundary |
| --- | --- | --- | --- |
| Repository | `REPOSITORY_RUNTIME` | `in_memory` | `supabase` |
| AI | `AI_PROVIDER` | `mock` | `openai` |
| LINE push/reply | `LINE_REAL_PUSH_ENABLED` | `false` | `true` |

`LINE_WEBHOOK_SECRET_PATH` はLINE receive routeのpath解決に使う。`LINE_WEBHOOK_SECRET` はactive envとして使わない。

## Safe Defaults

```txt
default_data_backend=in_memory
default_ai_provider=mock
default_line_real_push_enabled=false
health_external_connections=disabled
production_readiness=production_no_go
```

env未設定でもAPIは起動できる。

## Repository Runtime

Implemented:

- `createRuntimeRepositories(config)`
- API startupからruntime repository bundleを作成
- Supabase selected時のrequired env fail-fast
- Supabase repository bundle selection without migration/RLS apply

Not performed:

- Supabase real connection
- Supabase migration apply
- RLS change
- production data write

Required env names when selected:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

Values are not recorded.

## AI Runtime

Implemented:

- `createRuntimeAiProvider(config)`
- `MockAiProvider` default
- `OpenAiProvider` runtime selection
- `FetchOpenAiResponsesTransport`
- required env fail-fast

Not performed:

- OpenAI real API smoke
- paid model request
- AI auto-send

Required env names when selected:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Values are not recorded.

## LINE Runtime

Implemented:

- `createRuntimeLineClient(config)`
- `MockLineClient` default
- `RealLineClient` runtime selection
- `FetchLineMessagingTransport`
- `LINE_REAL_PUSH_ENABLED=false` keeps mock mode even if token is configured
- required access token fail-fast only when real push is enabled

Not performed:

- LINE real push
- LINE real reply
- LINE group notification real send
- Official Account auto-response OFF verification

Required env name when real push is selected:

- `LINE_CHANNEL_ACCESS_TOKEN`

Values are not recorded.

## API Startup

`createApiApp()` now applies the following priority:

1. Explicit test dependency injection
2. Runtime factory from env
3. Safe default

`/health` remains lightweight and does not call Supabase, OpenAI, or LINE Messaging API.

## Local Validation

Required commands:

```bash
git diff --check
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
```

## VPS Status

This Loop may be redeployed after local validation.

If redeployed, preserve these safety boundaries:

- no Nginx config change
- no Nginx reload/restart
- no DNS/certbot change
- keep `LINE_REAL_PUSH_ENABLED=false`
- do not display env values
- invalid-signature LINE dry-run must not return 2xx, 5xx, or 404

## Readiness Flags

```txt
https_ready_for_review=true
line_webhook_verify_success=true
line_receive_ready=true
runtime_wiring_ready=true
supabase_ready=false
openai_ready=false
line_reply_push_ready=false
production_readiness=production_no_go
```

## Remaining No-Go Reasons

- Supabase real connection has not been re-enabled through production startup.
- OpenAI real API controlled smoke has not been approved or run.
- LINE real reply/push single-message smoke has not been approved or run.
- LINE Official Account auto-response OFF has not been confirmed.
- final operator Go/No-Go is not complete.

## Rollback Notes

If runtime wiring causes startup failure:

1. Restore the previous deployed source.
2. Restart only amami-line-crm API/Admin services.
3. Confirm direct `/health` and HTTPS `/api/health`.
4. Keep production readiness as `production_no_go`.

## Next

Loop 152 candidate: Supabase staging connection execution.

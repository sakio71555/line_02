# VPS Dry Deployment No-Go Checklist

## Purpose

Use this checklist before any real VPS deployment execution for `admin.taiyolabel.site` and `api.taiyolabel.site`.

Loop 108 only records this checklist. It does not connect to the VPS or run commands.

## No-Go Conditions

Stop if any item is true:

- DNS `admin.taiyolabel.site` does not resolve to `160.251.174.201`.
- DNS `api.taiyolabel.site` does not resolve to `160.251.174.201`.
- Port `3002` is already in use.
- Port `8788` is already in use.
- nginx status is not active.
- Existing `sites-enabled` differs from expected `default`, `ehime-portal`, `line-transport` without explanation.
- Existing `app.ajnl.net` / `api.ajnl.net` certificate state is expired, unknown, or at risk.
- `/var/www/amami-line-crm` already exists and is not a known release.
- Node major version is unexpected.
- `git` is not available.
- `npx pnpm@10.12.1` is not available.
- dependency install fails.
- build fails.
- local service smoke fails.
- nginx config test fails.
- certbot fails.
- secret env values are missing.
- Supabase production/staging env choice is not finalized.
- Admin real login smoke is not complete.
- LINE safe test user or group is not finalized.
- OpenAI cost/rate limit policy is not finalized.
- rollback owner and rollback steps are unclear.
- Any step requires showing secrets to Codex, ChatGPT, docs, screenshots, or commit messages.

## Must Remain Disabled Until Later Approval

- `LINE_MESSAGING_ENABLED=false`
- `LINE_REAL_PUSH_ENABLED=false`
- `AI_PROVIDER=mock`
- `OPENAI_REAL_API_ENABLED=false`

## Production Readiness

Even if every preflight item passes in a later Loop, production remains No-Go until deployment, SSL, external smoke, Admin real login smoke, LINE safe smoke, OpenAI real smoke, and rollback verification are completed.

```text
production_no_go
```

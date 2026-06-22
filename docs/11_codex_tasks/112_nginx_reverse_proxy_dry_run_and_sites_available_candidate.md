# Loop 112: Nginx reverse proxy dry-run and sites-available candidate

## Purpose

VPS localhost-only review環境で確認済みのAdmin/APIを、将来Nginx reverse proxyで公開する直前段階まで進める。今回はrepo内template/runbookに加えて、VPSの `/etc/nginx/sites-available/` へ候補設定を配置し、`nginx -t` のみ実行する。

This Loop does not publish the app.

## Starting State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Start branch: `main...origin/main`
- Start status: clean
- Latest commit at start: `021c25d docs: add Nginx reverse proxy dry-run plan`
- VPS review deploy path: `/var/www/amami-line-crm`
- VPS runtime source before this Loop: `176cb34fc6059ecabfb9826daacaabc2a437bebe`
- Admin upstream: `127.0.0.1:3002`
- API upstream: `127.0.0.1:8788`
- Runtime remains `in_memory`
- Production readiness remains `production_no_go`

## Scope

- Confirm existing docs/runbooks and Admin/API path behavior.
- Keep the repo-local reverse proxy example safe and placeholder-based.
- Add/keep static tests for the Nginx example and docs.
- Run local quality gates before VPS candidate placement.
- Confirm VPS state without showing secrets.
- Place a candidate config at `/etc/nginx/sites-available/amami-line-crm.conf`.
- Back up an existing same-name candidate if present.
- Run `sudo nginx -t` only.
- Update docs, production readiness, and dev log.
- Commit and push if all checks pass.

## Out of Scope

- `/etc/nginx/sites-enabled` symlink creation.
- Nginx reload / restart.
- certbot / HTTPS.
- DNS changes.
- firewall changes or public port additions.
- public external smoke.
- `.env` creation or modification.
- secret display.
- API contract, Auth, RLS, migration, LINE real push, OpenAI real API, or Supabase runtime changes.

## Proxy Path Decision

Admin uses `API_BASE_URL` and builds API paths such as `/api/admin/customers`, `/api/admin/alerts`, and `/api/admin/rag/answer-draft`. API routes are served by Hono under `/api/admin/...`, `/api/dev/...`, and `/api/line/webhook/...`, with health at `/health`.

For a single public host, the reverse proxy can safely use:

| external path | upstream | reason |
| --- | --- | --- |
| `/` | `127.0.0.1:3002` | Next.js Admin UI |
| `/api/` | `127.0.0.1:8788` | Hono API routes preserve `/api/...` path |
| `/api/health` | `127.0.0.1:8788/health` | public-style health smoke without changing API route |

The proxy must pass `Host`, `X-Real-IP`, `X-Forwarded-*`, `Upgrade`, and `Connection` headers so cookie, Authorization, and selected tenant transport are not stripped. Nginx does not need to inspect or log token values.

## Reverse Proxy Template

Repo example:

```text
deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example
```

Safety characteristics:

- contains `server_name _CHANGE_ME_;`
- uses `127.0.0.1:3002` for Admin
- uses `127.0.0.1:8788` for API
- does not hard-code a real domain
- does not contain HTTPS/certbot settings
- does not contain secrets or env values
- is not an enabled VPS config

## Local Verification

Before VPS candidate placement, run:

```bash
git diff --check
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
git status --short
```

Proceed to VPS candidate placement only if all commands pass.

Loop result before VPS candidate placement:

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success
- `npx pnpm@10.12.1 test`: success, 98 files passed / 1 skipped, 651 tests passed / 4 skipped
- `npx pnpm@10.12.1 test:integration`: success, 98 files passed / 1 skipped, 651 tests passed / 4 skipped
- `npx pnpm@10.12.1 build`: success, 10 packages successful

## VPS Current State Confirmation

Required read-only checks:

- release path exists: `/var/www/amami-line-crm`
- release is copy-based without `.git`
- `DEPLOYED_COMMIT` is recorded
- API/Admin services are active
- API/Admin bind only on `127.0.0.1:8788` and `127.0.0.1:3002`
- no public bind for review ports
- API `/health` returns `200`
- Admin `/login` returns `200`
- `sites-enabled/amami-line-crm` is absent
- current Nginx summary does not route amami-line-crm public traffic

Do not show `.env`, tokens, database URLs, Authorization headers, LINE identifiers, or production logs.

Loop result:

- hostname: `vm-227d8253-eb`
- release path: `/var/www/amami-line-crm`
- release style: copy-based release without `.git`
- `DEPLOYED_COMMIT`: `176cb34fc6059ecabfb9826daacaabc2a437bebe`
- `nginx`: active
- `amami-line-crm-api.service`: active
- `amami-line-crm-admin.service`: active
- API `/health`: `200`
- Admin `/login`: `200`
- review ports `3002` / `8788`: localhost-bound only
- unexpected public bind for review ports: none
- `/etc/nginx/sites-enabled/amami-line-crm`: absent
- `/etc/nginx/sites-enabled/amami-line-crm.conf`: absent
- `/etc/nginx/sites-available/amami-line-crm.conf`: absent before candidate placement

## Sites-available Candidate Placement

Target:

```text
/etc/nginx/sites-available/amami-line-crm.conf
```

Candidate server name:

```text
amami-line-crm.invalid
```

Reason:

- the real domain is not confirmed in this Loop
- `.invalid` is a reserved non-production placeholder
- it avoids a catch-all `server_name _;`
- it lets `nginx -t` parse a concrete server name

If an existing candidate file exists, back it up as:

```text
/etc/nginx/sites-available/amami-line-crm.conf.loop112-backup-YYYYMMDD-HHMMSS
```

Do not create or modify anything under:

```text
/etc/nginx/sites-enabled/
```

Loop result:

- candidate path written: `/etc/nginx/sites-available/amami-line-crm.conf`
- backup: none, because no existing same-name candidate was present
- candidate server name: `amami-line-crm.invalid`
- candidate contains Admin upstream `127.0.0.1:3002`
- candidate contains API upstream `127.0.0.1:8788`
- candidate is not active in `nginx -T` because it is not symlinked/enabled

## Nginx Test Result

Allowed command:

```bash
sudo nginx -t
```

Loop result:

```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Important limitation:

- because the candidate file is placed only in `sites-available` and is not symlinked into `sites-enabled`, `sudo nginx -t` validates the active Nginx config and confirms the candidate did not affect the running config.
- candidate syntax is guarded locally by static tests and by using a normal `server` block intended for the existing `sites-enabled` include pattern.
- a later Loop must explicitly stage/include the candidate for full Nginx config validation before reload.

Never run:

```bash
sudo systemctl reload nginx
sudo systemctl restart nginx
sudo ln -s /etc/nginx/sites-available/amami-line-crm.conf /etc/nginx/sites-enabled/
certbot
```

## Rollback

If this Loop needs rollback, remove only the candidate file:

```bash
sudo rm -f /etc/nginx/sites-available/amami-line-crm.conf
```

If a backup was created, restore it only if it was the pre-existing candidate for this app:

```bash
sudo cp /etc/nginx/sites-available/amami-line-crm.conf.loop112-backup-YYYYMMDD-HHMMSS /etc/nginx/sites-available/amami-line-crm.conf
```

No Nginx reload is needed because this Loop does not enable the site.

## Secret Scan

Secret scan checks names and obvious token patterns. Existing expected hits are docs placeholders, env examples, fake test fixtures, and static tests. Any real-looking secret value is a stop condition.

## Production Readiness

Still:

```text
production_no_go
```

Reasons:

- sites-enabled symlink not created
- Nginx reload/restart not performed
- HTTPS/certbot not performed
- DNS not changed
- public external smoke not performed
- LINE/OpenAI/Supabase real connections not enabled
- final domain and HTTPS policy remain pending

## Result

Record the actual VPS result after execution:

- candidate placement result: `/etc/nginx/sites-available/amami-line-crm.conf` written
- backup file path: none
- `sudo nginx -t` result: successful
- proof that `sites-enabled` was not changed: both `amami-line-crm` and `amami-line-crm.conf` absent under `sites-enabled`
- proof that Nginx was not reloaded/restarted: no reload/restart command was run; `systemctl is-active nginx` remained `active`
- HTTPS/DNS/certbot/public exposure: not performed
- LINE/OpenAI/Supabase real connection: not performed

## Next Loop Candidates

1. Loop 113: Nginx sites-enabled enable dry-run final gate
2. Loop 114: Domain/DNS/HTTPS readiness checklist
3. Loop 115: LINE webhook production dry-run checklist
4. Loop 116: Supabase staging connection preflight

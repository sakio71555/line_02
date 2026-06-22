# Nginx Reverse Proxy Dry-run Plan

## Purpose

This runbook prepares the step before public Nginx exposure for `amami-line-crm`.

The current VPS review environment is localhost-only:

- Admin: `127.0.0.1:3002`
- API: `127.0.0.1:8788`

Loop 112 documents the reverse proxy dry-run path and adds a repo-local example config. It does not enable public access.

## Current Public Status

Current judgment remains:

```text
production_no_go
```

Loop 112 does not:

- create `/etc/nginx/sites-available/amami-line-crm`
- create `/etc/nginx/sites-enabled/amami-line-crm`
- run `nginx -t` against a new app config
- reload or restart Nginx
- run certbot
- change DNS
- change firewall or public ports
- register LINE webhook
- connect LINE/OpenAI/Supabase real services

## Local Preconditions

Run from:

```text
/Users/sakio/Desktop/PROJECT/amami-line-crm
```

Before any future Nginx public-enable Loop, run:

```bash
git status --short
git diff --check
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
```

Do not proceed if local checks fail.

## Secret Handling

Never print or copy these values into docs, terminal snippets, logs, screenshots, commits, or prompts:

- LINE channel access token
- LINE channel secret
- OpenAI API key
- Supabase URL/key/project ref/DB URL/password
- Authorization Bearer token
- JWT values
- real LINE userId
- real customer information
- `.env` file contents

Presence checks are allowed only when values are not printed.

## VPS Read-only Audit

Use a read-only command set before staging any Nginx file.

Expected checks:

```bash
hostname
whoami
test -d /var/www/amami-line-crm && echo release_dir_present
test -f /var/www/amami-line-crm/DEPLOYED_COMMIT && sed -n '1p' /var/www/amami-line-crm/DEPLOYED_COMMIT
systemctl is-active nginx || true
systemctl is-active amami-line-crm-api.service || true
systemctl is-active amami-line-crm-admin.service || true
ss -ltnp | grep -E ':(3002|8788|80|443)\b' || true
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8788/health
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3002/login
test -e /etc/nginx/sites-enabled/amami-line-crm && echo amami_site_enabled_present || echo amami_site_enabled_absent
```

For Nginx inspection, summarize only non-secret routing metadata such as `server_name`, `listen`, `proxy_pass`, and app port references. Do not dump unrelated configs into docs.

No-Go if:

- API/Admin services are inactive.
- `/health` does not return `200`.
- Admin `/login` does not return `200`.
- `3002` or `8788` is bound to `0.0.0.0` or `::`.
- `sites-enabled/amami-line-crm` already exists unexpectedly.
- existing Nginx routes conflict with the intended host.

## Repo-local Example Config

Example file:

```text
deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example
```

It is intentionally not a production-ready filename and contains:

```text
server_name _CHANGE_ME_;
```

Do not copy this file directly to `sites-enabled`. Do not enable it without replacing `_CHANGE_ME_` in a later approved Loop.

## Routing Shape

The dry-run example uses one host with path-based API routing:

| external path | upstream | note |
| --- | --- | --- |
| `/` | `http://127.0.0.1:3002` | Admin UI |
| `/api/` | `http://127.0.0.1:8788/api/` | Hono API routes |
| `/api/health` | `http://127.0.0.1:8788/health` | health smoke path |

The example preserves common proxy headers:

- `Host`
- `X-Real-IP`
- `X-Forwarded-For`
- `X-Forwarded-Proto`
- `X-Forwarded-Host`
- `X-Forwarded-Port`
- websocket `Upgrade` / `Connection`

## Future Staged Dry-run Procedure

Loop 112 stops before this procedure. A future explicit Loop may do the following:

1. Confirm local checks and secret scan.
2. Confirm VPS read-only audit is still healthy.
3. Copy the example to a staging-only filename under `/etc/nginx/sites-available`.
4. Replace `_CHANGE_ME_` with the approved host.
5. Do not create a `sites-enabled` symlink yet.
6. Run Nginx config test.
7. If the config test fails, stop and remove the staged file.
8. If the config test passes, record the result and stop.

The symlink and Nginx reload must be a later explicit public-enable Loop.

## Future Host-header Smoke

Only after a config has been staged and tested in a later Loop:

```bash
curl -sS -H 'Host: _CHANGE_ME_' http://127.0.0.1/api/health
curl -sS -I -H 'Host: _CHANGE_ME_' http://127.0.0.1/
```

Expected:

- `/api/health` returns `200`.
- `/` returns Admin HTML or a redirect expected by the Admin app.
- No secret values appear in output.

## Public-enable Gate

Do not enable public reverse proxy until all of the following are true:

- approved host is final.
- DNS target is understood and does not collide with existing apps.
- local quality gates pass.
- VPS read-only audit is healthy.
- reverse proxy config test passes.
- rollback command is ready.
- production Auth/session behavior is intentionally accepted for the target environment.
- LINE/OpenAI/Supabase real-service status is intentionally accepted and documented.

If any condition is unclear, keep:

```text
production_no_go
```

## Rollback for a Later Enablement Loop

If a later Loop enables the site and needs rollback, limit changes to amami-line-crm:

```bash
sudo rm -f /etc/nginx/sites-enabled/amami-line-crm
sudo nginx -t
sudo systemctl reload nginx
```

If the config test fails during rollback, do not reload. Escalate with the exact failure message after redacting any secrets.

## What Loop 112 Confirmed

Loop 112 records:

- localhost-only API/Admin review services are the current assumption.
- VPS release path is `/var/www/amami-line-crm`.
- VPS deployed commit is `176cb34fc6059ecabfb9826daacaabc2a437bebe`.
- API `/health` returned `200`.
- Admin `/login` returned `200`.
- review ports `3002` / `8788` were not public-bound.
- `/etc/nginx/sites-enabled/amami-line-crm` and `/etc/nginx/sites-available/amami-line-crm` were absent.
- reverse proxy example is repo-local only.
- `_CHANGE_ME_` prevents accidental production use.
- no Nginx enable/reload/restart/certbot/DNS/public exposure is performed.
- production readiness remains `production_no_go`.

## Next

- Loop 113: Nginx reverse proxy staged config test
- Loop 114: LINE webhook production dry-run checklist
- Loop 115: Supabase production runtime preflight

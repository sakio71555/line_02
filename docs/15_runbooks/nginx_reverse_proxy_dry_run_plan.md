# Nginx Reverse Proxy Dry-run Plan

## Purpose

This runbook prepares the step before public Nginx exposure for `amami-line-crm`.

The current VPS review environment is localhost-only:

- Admin: `127.0.0.1:3002`
- API: `127.0.0.1:8788`

Loop 112 documents the reverse proxy dry-run path, adds a repo-local example config, and may place a candidate file under `sites-available` for `nginx -t` confirmation only. It does not enable public access.

## Current Public Status

Current judgment remains:

```text
production_no_go
```

Loop 112 does not:

- create `/etc/nginx/sites-enabled/amami-line-crm`
- reload or restart Nginx
- run certbot
- change DNS
- change firewall or public ports
- register LINE webhook
- connect LINE/OpenAI/Supabase real services

Loop 112 may:

- create or replace `/etc/nginx/sites-available/amami-line-crm.conf` as a candidate file
- back up an existing same-name candidate
- run `sudo nginx -t` only

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

## Candidate File

The VPS candidate file is:

```text
/etc/nginx/sites-available/amami-line-crm.conf
```

Use the repo-local example as the source, but replace the example-only host with:

```text
server_name amami-line-crm.invalid;
```

Rationale:

- the real production domain is not confirmed in this Loop.
- `.invalid` is a reserved placeholder and should not resolve publicly.
- it is safer than a catch-all `server_name _;`.
- it keeps the candidate parseable without hard-coding a real public host.

If a same-name candidate already exists, back it up first:

```bash
sudo cp -a /etc/nginx/sites-available/amami-line-crm.conf \
  /etc/nginx/sites-available/amami-line-crm.conf.loop112-backup-YYYYMMDD-HHMMSS
```

Never create a `sites-enabled` symlink in this Loop.

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

## Sites-available Candidate Procedure

Loop 112 may do the following:

1. Confirm local checks and secret scan.
2. Confirm VPS read-only audit is still healthy.
3. Copy the example to `/etc/nginx/sites-available/amami-line-crm.conf`.
4. Replace `_CHANGE_ME_` with `amami-line-crm.invalid`.
5. Do not create a `sites-enabled` symlink.
6. Run `sudo nginx -t`.
7. If the config test fails, stop and remove or fix only the candidate file.
8. If the config test passes, record the result and stop.

The symlink and Nginx reload must be a later explicit public-enable Loop.

Important limitation:

- A file under `sites-available` is not active unless included or symlinked by the VPS Nginx configuration.
- Therefore `sudo nginx -t` primarily verifies the active Nginx configuration remains healthy after candidate placement.
- Full validation of the candidate as an included config must happen in a later explicit staged-enable Loop before any reload.

## Future Host-header Smoke

Only after a config has been staged into the active Nginx include path in a later Loop:

```bash
curl -sS -H 'Host: _CHANGE_ME_' http://127.0.0.1/api/health
curl -sS -I -H 'Host: _CHANGE_ME_' http://127.0.0.1/
curl -sS -I -H 'Host: _CHANGE_ME_' http://127.0.0.1/login
curl -sS -I -H 'Host: _CHANGE_ME_' http://127.0.0.1/select-tenant
curl -sS -I -H 'Host: _CHANGE_ME_' http://127.0.0.1/customers
curl -sS -I -H 'Host: _CHANGE_ME_' http://127.0.0.1/alerts
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

For Loop 112 candidate-only rollback:

```bash
sudo rm -f /etc/nginx/sites-available/amami-line-crm.conf
```

If a backup was created from a pre-existing candidate:

```bash
sudo cp /etc/nginx/sites-available/amami-line-crm.conf.loop112-backup-YYYYMMDD-HHMMSS \
  /etc/nginx/sites-available/amami-line-crm.conf
```

No reload is required because this Loop does not enable the site.

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
- `/etc/nginx/sites-enabled/amami-line-crm` and `/etc/nginx/sites-enabled/amami-line-crm.conf` were absent.
- reverse proxy example is repo-local only.
- `_CHANGE_ME_` prevents accidental production use.
- candidate placement created `/etc/nginx/sites-available/amami-line-crm.conf`.
- backup was not needed because no same-name candidate existed.
- candidate uses `server_name amami-line-crm.invalid;`.
- `sudo nginx -t` passed.
- candidate is not active in `nginx -T` because it is not symlinked/enabled.
- no Nginx enable/reload/restart/certbot/DNS/public exposure is performed.
- production readiness remains `production_no_go`.

## What Loop 113 Confirmed

Loop 113 records:

- local `git diff --check`, lint, typecheck, test, test:integration, and build passed before VPS work.
- VPS release path remained `/var/www/amami-line-crm`.
- VPS deployed commit remained `176cb34fc6059ecabfb9826daacaabc2a437bebe`.
- candidate file `/etc/nginx/sites-available/amami-line-crm.conf` was present.
- `/etc/nginx/sites-enabled/amami-line-crm.conf` was absent before dry-run.
- temporary symlink `/etc/nginx/sites-enabled/amami-line-crm.conf` was created only for the include dry-run.
- `sudo nginx -t` passed while the candidate was included.
- `sudo nginx -T` summary showed `amami-line-crm.invalid`, `127.0.0.1:8788`, and `127.0.0.1:3002`.
- temporary symlink was removed.
- post-cleanup `sudo nginx -t` passed.
- API `/health` returned `200` and Admin `/login` returned `200`.
- review ports `3002` / `8788` remained localhost-bound.
- no Nginx reload/restart/certbot/DNS/public exposure was performed.
- production readiness remains `production_no_go`.

## What Loop 114 Confirmed

Loop 114 records:

- local `git diff --check`, lint, typecheck, test, test:integration, and build passed before VPS reload work.
- candidate file `/etc/nginx/sites-available/amami-line-crm.conf` remained present.
- `/etc/nginx/sites-enabled/amami-line-crm.conf` was absent before dry-run.
- temporary symlink `/etc/nginx/sites-enabled/amami-line-crm.conf` was created.
- `sudo nginx -t` passed while included.
- `sudo systemctl reload nginx` was executed with the temporary symlink.
- Host header smoke used only `Host: amami-line-crm.invalid` on localhost.
- `/api/health` through Nginx returned `404`, so the result is No-Go.
- temporary symlink was removed.
- post-remove `sudo nginx -t` passed.
- rollback `sudo systemctl reload nginx` was executed.
- API `/health` returned `200` and Admin `/login` returned `200` directly after rollback.
- review ports `3002` / `8788` remained localhost-bound.
- real domain, DNS, certbot/HTTPS, external smoke, LINE/OpenAI/Supabase real connections, and permanent public enablement were not performed.
- production readiness remains `production_no_go`.

## What Loop 115 Confirmed

Loop 115 records:

- Loop 114 commit `76b6914` was pushed before new diagnosis work.
- direct Admin/API upstreams were healthy.
- direct API `/health` returned `200`, while direct API `/api/health` returned `404`.
- standalone localhost-only Nginx on `127.0.0.1:18080` returned `200` for `/api/health` through the candidate mapping.
- this confirms the candidate route shape maps `/api/health` to upstream `/health` correctly when the request reaches that server block.
- the repo-local example now includes `X-Amami-Line-Crm-Proxy` as a non-secret diagnostic header.
- the VPS candidate can be refreshed from the repo example and included with a temporary `sites-enabled` symlink for `sudo nginx -t` only.
- system Nginx reload/restart, real domain, DNS, HTTPS/certbot execution, public exposure, LINE/OpenAI/Supabase real connections, and permanent enablement were not performed.
- production readiness remains `production_no_go`.

## What Loop 116 Confirmed

Loop 116 records:

- canonical Admin/API hostname is still undecided.
- historical `admin.taiyolabel.site` / `api.taiyolabel.site` and single-host `/api/` routing are both treated as candidates until explicitly approved.
- `_CHANGE_ME_` remains the safe repo-template placeholder.
- `amami-line-crm.invalid` remains dry-run only and must not be used for public DNS.
- placeholder HTTP bootstrap and HTTPS examples were added for future review.
- read-only preflight helper was added; it does not perform HTTP requests or system changes.
- VPS read-only inventory showed Nginx active, public 80/443 listeners, app localhost listeners on `127.0.0.1:3002` / `127.0.0.1:8788`, certbot installed, and no enabled amami-line-crm include.
- real domain, DNS, HTTPS/certbot execution, public exposure, LINE/OpenAI/Supabase real connections, and permanent enablement were not performed.
- production readiness remains `production_no_go`.

## Next

- Loop 117: real domain decision and DNS provider confirmation plan
- Loop 118: real domain Nginx enable plan
- Loop 119: HTTPS issuance dry-run approval gate

# VPS Deployment Runbook: taiyolabel.site

## Purpose

`admin.taiyolabel.site` の同一オリジン配下でAdmin UIとAPIを運用するためのVPS deployment planです。

Loop 106ではこのrunbookとtemplatesを追加するだけです。VPSへSSHせず、nginx、systemd、certbot、LINE webhook、OpenAI、Supabase productionには触りません。

## Current Audit

User-side read-only audit result:

| item | result |
| --- | --- |
| VPS | `160.251.174.201` |
| OS | Ubuntu 24.04.3 LTS |
| Node | v20.20.2 |
| corepack | 0.34.6 |
| pnpm | global commandなし |
| git | 2.43.0 |
| nginx | active/running |
| restart state | system restart required表示あり。Loop 106ではrestart禁止 |

DNS:

- `admin.taiyolabel.site` -> `160.251.174.201`
- DNS management: お名前.com
- name servers: `01.dnsv.jp`, `02.dnsv.jp`, `03.dnsv.jp`, `04.dnsv.jp`

Existing ports:

- `80`: nginx
- `443`: nginx
- `8080`: nginx / ehime-portal系
- `127.0.0.1:8001`: line-transport API / uvicorn
- `127.0.0.1:3100`: ehime crawler admin / node

Existing nginx:

- sites-enabled: `default`, `ehime-portal`, `line-transport`
- conf.d: `ehime-subsidy-route-map.conf`

Existing systemd:

- `ehime-crawler-admin.service`
- `line-transport-api.service`
- `nginx.service`

Existing SSL:

- `/etc/letsencrypt/live/app.ajnl.net`
- certificate domains: `app.ajnl.net`, `api.ajnl.net`
- `taiyolabel.site` certificate is not created yet.

Existing `/var/www`:

- `ehime-hojo`
- `ehime-portal`
- `ehime-scraper`
- `interior-estimator`
- `line-transport`
- `html`

Planned new placement:

- `/var/www/amami-line-crm`

## Planned Routes

| public host | nginx upstream | app |
| --- | --- | --- |
| `admin.taiyolabel.site/` | `127.0.0.1:3100` | Admin UI |
| `admin.taiyolabel.site/api/` | `127.0.0.1:8788/api/` | API |
| `admin.taiyolabel.site/api/health` | `127.0.0.1:8788/health` | API health |

Planned conflict check from audit:

- port `3100`: current Admin upstream boundary
- port `8788`: 空き
- systemd service name `amami-line-crm-*`: 未使用
- `/var/www/amami-line-crm`: 未使用

## Template Files

- `deploy/vps/taiyolabel/nginx/amami-line-crm-http-bootstrap.conf.template`
- `deploy/vps/taiyolabel/nginx/amami-line-crm-ssl.conf.template`
- `deploy/vps/taiyolabel/systemd/amami-line-crm-api.service.template`
- `deploy/vps/taiyolabel/systemd/amami-line-crm-admin.service.template`
- `deploy/vps/taiyolabel/env/api.env.example`
- `deploy/vps/taiyolabel/env/admin.env.example`

These are templates only. Do not install them directly without a new deploy Loop.

## Repo Start/Port Boundary

Loop 106 recorded repo-level deployment blockers:

- production start scripts were missing。
- API planned port `8788` was not wired into runtime code。

Loop 107 resolved those repo-level start/port blockers:

- `@amami-line-crm/api` has review/mock `start: tsx src/index.ts` to avoid Node ESM extensionless import issues until a dedicated compiled API runtime Loop。
- `@amami-line-crm/admin` has `start: next start --hostname 127.0.0.1`。
- API production binding resolves `API_HOST` / `HOST` and `API_PORT` / `PORT` with safe default `127.0.0.1:8788`。
- Admin production binding uses an explicit Next.js localhost hostname and `PORT=3100`。
- systemd templates now call `npx pnpm@10.12.1 --filter ... start`。

Still do not deploy directly from this runbook. Before real VPS deployment, run a dedicated Loop for:

- production build/start local smoke without production secrets。
- VPS read-only preflight。
- systemd install/start plan。
- nginx `nginx -t` / reload plan。
- SSL/certbot plan。
- rollback owner and external smoke approval。

Loop 108 adds the dry deployment preflight command pack for those steps:

- `docs/15_runbooks/vps_dry_deployment_preflight_commands.md`
- `docs/15_runbooks/vps_dry_deployment_rollback.md`
- `docs/15_runbooks/vps_dry_deployment_no_go_checklist.md`
- `deploy/vps/taiyolabel/preflight/`

The command pack is documentation only. It is not executed in Loop 108.

Loop 109 executes only the localhost mock subset: `/var/www/amami-line-crm`, `/etc/amami-line-crm/*.env`, `amami-line-crm-api.service`, `amami-line-crm-admin.service`, and local curl smoke. It still does not install nginx config, reload nginx, run certbot, configure LINE webhook, or connect to LINE/OpenAI/Supabase.

## Future Deployment Steps

Do not run these commands in Loop 106. They are a future operator checklist.

1. Read-only preflight on VPS:
   - verify OS, node, corepack, git, nginx status。
   - verify ports `3100` and `8788` are still free。
   - verify `/var/www/amami-line-crm` is still unused。
   - verify `amami-line-crm-*` systemd services are still unused。
2. Backup current nginx config:
   - archive `/etc/nginx/sites-enabled`, `/etc/nginx/sites-available`, and relevant `conf.d` files。
   - do not modify existing `default`, `ehime-portal`, or `line-transport` files in place。
3. Create `/var/www/amami-line-crm` only after confirming it is still unused。
4. Clone or rsync a release into `/var/www/amami-line-crm`。
5. Manually create `/etc/amami-line-crm/api.env` and `/etc/amami-line-crm/admin.env` from examples.
   - fill secrets only on the VPS。
   - do not paste values into docs, screenshots, prompts, or commits。
6. Install dependencies with `npx pnpm@10.12.1 install` or corepack-managed pnpm after verifying the VPS pnpm setup。
7. Build the repo。
8. Confirm Loop 107 start/port boundary tests pass。
9. Create systemd services from templates only in a dedicated deployment Loop。
10. Start local services on `127.0.0.1:3100` and `127.0.0.1:8788`。
11. Run local curl smoke against local upstreams。
12. Add nginx HTTP bootstrap config for `admin.taiyolabel.site`, routing `/api/` to the API upstream。
13. Run `nginx -t`。
14. Reload nginx only if `nginx -t` passes。
15. Issue certbot certificate with cert name `amami-line-crm-taiyolabel`.
    - Check certbot behavior before execution。
    - Do not reuse existing `app.ajnl.net` certificate。
16. Install SSL nginx config.
17. Run `nginx -t` again。
18. Reload nginx only if `nginx -t` passes。
19. Run external curl smoke for admin/API hosts。
20. Configure LINE webhook URL only after API host smoke passes。
21. Keep LINE real push and OpenAI real API gates disabled until explicit smoke approval。

## SSL / Certbot Plan

Planned certificate name:

```text
amami-line-crm-taiyolabel
```

Planned certificate paths after successful issue:

```text
/etc/letsencrypt/live/amami-line-crm-taiyolabel/fullchain.pem
/etc/letsencrypt/live/amami-line-crm-taiyolabel/privkey.pem
```

Before running certbot:

- confirm HTTP bootstrap config is active and reachable。
- confirm nginx does not route these hosts through existing apps。
- confirm certbot command syntax on the VPS。
- confirm no existing certificate should be overwritten。

## Secret Handling

Never place filled secrets in git.

Allowed in repo:

- env variable names。
- empty values in `*.env.example`。
- disabled/mock defaults。

Forbidden in repo/docs/dev log:

- LINE channel access token。
- LINE channel secret。
- OpenAI API key。
- Supabase service role key。
- Supabase DB URL。
- Supabase project URL実値。
- Supabase anon key実値。
- JWT / Bearer token。
- database password。
- project ref。

## LINE Webhook Plan

Code route currently is:

```text
POST /api/line/webhook/:webhookSecret
```

Future public URL shape:

```text
https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
```

The real webhook secret path must be set only in the LINE console / server env and must not be written into docs.

Do not configure the LINE webhook until:

- API service is running locally on the VPS。
- nginx + SSL smoke passes。
- LINE channel secret/access token are manually set outside git。
- safe test procedure is approved。

## No-Go Conditions

Stop before deploy if any of these are true:

- port `3100` or `8788` is already in use。
- `/var/www/amami-line-crm` already exists with unknown content。
- `amami-line-crm-*` systemd service already exists。
- production start script tests fail。
- API cannot bind to planned `127.0.0.1:8788` upstream。
- Admin cannot bind to planned `127.0.0.1:3100` upstream。
- `nginx -t` fails。
- existing `app.ajnl.net`, `api.ajnl.net`, `ehime-portal`, `line-transport`, or other VPS apps might break。
- certbot dry-run or issue fails。
- env secrets are missing。
- Supabase production/staging env choice is not finalized。
- Admin real login/session smoke is incomplete。
- LINE safe test recipient is not finalized。
- OpenAI cost/rate limit policy is not finalized。
- rollback owner and steps are not confirmed。

## Rollback

Future rollback should only remove new amami-line-crm assets.

1. Stop and disable new services:
   - `amami-line-crm-api.service`
   - `amami-line-crm-admin.service`
2. Remove new systemd service files only after backup.
3. Remove new nginx site symlink for amami-line-crm only.
4. Run `nginx -t`。
5. Reload nginx only if `nginx -t` passes。
6. Decide whether to keep or revoke the newly issued `amami-line-crm-taiyolabel` certificate.
7. Move `/var/www/amami-line-crm` aside instead of deleting immediately.
8. Do not touch existing `default`, `ehime-portal`, `line-transport`, or `conf.d` route-map files unless a separate rollback owner approves.

## Production Readiness Impact

Progress in Loop 106:

- DNS readiness recorded。
- VPS audit recorded。
- admin/API host and internal port plan documented。
- nginx/systemd/env templates added。
- SSL, secret, LINE webhook, rollback, and No-Go procedures documented。

Progress in Loop 107:

- production start scripts added。
- API planned port `8788` wired to runtime boundary。
- Admin planned port `3100` represented by `HOSTNAME` / `PORT`。
- systemd/env templates synchronized with real package scripts。

Progress in Loop 108:

- dry deployment preflight command pack added。
- rollback runbook added。
- No-Go checklist added。
- secret injection, nginx, systemd, certbot, and external smoke checks documented。

Final status remains:

```text
production_no_go
```

Reasons:

- no real VPS deployment。
- no nginx/certbot/systemd changes。
- no production start scripts。
- API planned port `8788` is not wired in runtime code yet。
- no real LINE webhook configuration。
- no OpenAI real API smoke。
- no production Supabase connection。

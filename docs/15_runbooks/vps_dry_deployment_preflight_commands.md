# VPS Dry Deployment Preflight Commands

## Purpose

This runbook prepares the command order for a future dry deployment to the existing VPS for:

- `admin.taiyolabel.site`
- `https://admin.taiyolabel.site/api/`

Loop 108 does not execute these commands. Do not SSH to the VPS, do not create files on the VPS, do not run nginx, systemd, certbot, LINE, OpenAI, or Supabase commands in this Loop.

## Preconditions

- DNS `admin.taiyolabel.site` points to `160.251.174.201`.
- API traffic uses the same `admin.taiyolabel.site` origin under `/api/`.
- DNS NS are `01.dnsv.jp`, `02.dnsv.jp`, `03.dnsv.jp`, `04.dnsv.jp`.
- Existing apps run on the same VPS.
- Do not overwrite existing nginx config.
- Do not delete existing `sites-enabled` entries.
- Do not reuse existing `app.ajnl.net` / `api.ajnl.net` certificates.
- Planned release directory is `/var/www/amami-line-crm`.
- Admin local upstream is `127.0.0.1:3100`.
- API local upstream is `127.0.0.1:8788`.

## Known VPS State From User Audit

| item | value |
| --- | --- |
| VPS IP | `160.251.174.201` |
| OS | Ubuntu 24.04.3 LTS |
| Node | v20.20.2 |
| corepack | 0.34.6 |
| pnpm | global commandなし |
| git | 2.43.0 |
| nginx | active/running |
| restart state | system restart required表示あり |

Existing ports:

- `80`: nginx
- `443`: nginx
- `8080`: nginx / ehime-portal系
- `8001`: line-transport API / uvicorn
- `3100`: ehime crawler admin / node

Existing nginx sites:

- `/etc/nginx/sites-enabled/default`
- `/etc/nginx/sites-enabled/ehime-portal`
- `/etc/nginx/sites-enabled/line-transport`

Existing systemd services:

- `ehime-crawler-admin.service`
- `line-transport-api.service`
- `nginx.service`

## Execution Order For A Future Loop

Do not execute these phases in Loop 108.

1. Phase 0: Read-only audit。
2. Phase 1: Release directory preparation。
3. Phase 2: Secret env file creation。
4. Phase 3: Dependency install / build。
5. Phase 4: Local service smoke。
6. Phase 5: systemd service registration。
7. Phase 6: nginx HTTP bootstrap。
8. Phase 7: certbot SSL issue。
9. Phase 8: HTTPS nginx config。
10. Phase 9: external smoke。
11. Phase 10: LINE webhook URL registration。
12. Phase 11: OpenAI/LINE real gates still disabled。

## Phase 0: Read-only Audit Commands

These commands are for a later VPS execution Loop only.

```bash
hostname
whoami
cat /etc/os-release
ss -tulpn | grep -E ':(80|443|8788|8080|8001|3100)\b' || true
sudo systemctl status nginx --no-pager
ls -la /etc/nginx/sites-enabled
ls -la /etc/nginx/sites-available
ls -la /etc/nginx/conf.d
sudo certbot certificates 2>/dev/null || true
node -v || true
corepack --version || true
pnpm -v || true
git --version || true
```

No-Go if `3100` or `8788` is already in use, nginx is not active, or the existing site/service inventory differs from the user audit without explanation.

## Backup Commands For A Future Loop

Do not execute these commands in Loop 108.

Use a real timestamp at execution time. Keep `<timestamp>` as a placeholder in docs.

```bash
sudo mkdir -p /root/deploy-backups/amami-line-crm/<timestamp>
sudo cp -a /etc/nginx/sites-available /root/deploy-backups/amami-line-crm/<timestamp>/
sudo cp -a /etc/nginx/sites-enabled /root/deploy-backups/amami-line-crm/<timestamp>/
sudo cp -a /etc/nginx/conf.d /root/deploy-backups/amami-line-crm/<timestamp>/
sudo systemctl list-units --type=service --state=running > /root/deploy-backups/amami-line-crm/<timestamp>/running-services.txt
```

## Phase 1: Release Directory Plan

Planned directory:

```text
/var/www/amami-line-crm
```

Rules:

- Do not touch `/var/www/ehime-portal`.
- Do not touch `/var/www/line-transport`.
- Do not touch `/var/www/html`.
- If `/var/www/amami-line-crm` already exists, stop and decide whether it is a known previous release or a No-Go.
- Prefer a release/backup decision before any deletion.

## Phase 2: Env Secret Injection Checklist

Loop 108 does not create env files. A future Loop may create:

```text
/etc/amami-line-crm/api.env
/etc/amami-line-crm/admin.env
```

Rules:

- Do not create `.env.production` in the repository.
- Store server env files outside git.
- Restrict file permissions, for example owner-readable only.
- Use a server-side owner appropriate for the systemd service.
- Do not paste values into ChatGPT, Codex, docs, screenshots, or commit messages.
- Avoid writing secrets directly into shell history.
- Fill values manually on the VPS or via an approved secret manager.
- Keep real LINE/OpenAI gates disabled initially.

Safe initial flags:

```text
LINE_MESSAGING_ENABLED=false
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OPENAI_REAL_API_ENABLED=false
```

## Phase 3: Dependency Install / Build Plan

The VPS audit says global `pnpm` is not available.

Preferred command style, matching this repo:

```bash
npx pnpm@10.12.1 install --frozen-lockfile
npx pnpm@10.12.1 build
```

Alternative, only if explicitly approved in a later Loop:

```text
corepack-managed pnpm
```

Loop 108 does not run install or build on the VPS.

## Phase 4: Local Service Smoke Plan

Before systemd registration in a later Loop, verify local binding on the VPS:

- API: `127.0.0.1:8788`
- Admin: `127.0.0.1:3100`

API has a `/health` route in `apps/api/src/index.ts`.

Future smoke examples:

```bash
curl -sS http://127.0.0.1:8788/health || true
curl -sS http://127.0.0.1:3100/ || true
```

Do not call LINE, OpenAI, Supabase production, or mutation endpoints as part of this smoke.

## Phase 5: systemd Service Plan

Planned services:

- `amami-line-crm-api.service`
- `amami-line-crm-admin.service`

Template sources:

- `deploy/vps/taiyolabel/systemd/amami-line-crm-api.service.template`
- `deploy/vps/taiyolabel/systemd/amami-line-crm-admin.service.template`

Rules:

- Register services only after read-only audit, backup, env creation, install/build, and local smoke pass.
- Do not touch `ehime-crawler-admin.service`.
- Do not touch `line-transport-api.service`.
- Confirm `ExecStart` uses `npx pnpm@10.12.1 --filter ... start`.
- Confirm the VPS can execute `npx pnpm@10.12.1`.
- Start/enable systemd only in a later approved execution Loop.

Loop 109 executes only the localhost-bound service subset. It creates and starts `amami-line-crm-api.service` and `amami-line-crm-admin.service`, but still does not enable them and still does not touch Nginx or certbot.

## Phase 6: nginx HTTP Bootstrap Plan

Planned future nginx files:

```text
/etc/nginx/sites-available/amami-line-crm
/etc/nginx/sites-enabled/amami-line-crm
```

Template source:

```text
deploy/vps/taiyolabel/nginx/amami-line-crm-http-bootstrap.conf.template
```

Rules:

- Do not use `default_server`.
- Do not modify existing `default`, `ehime-portal`, or `line-transport` files.
- Use only `admin.taiyolabel.site` in `server_name` and route `/api/` separately.
- If `nginx -t` fails in a future Loop, do not reload nginx.
- Keep HTTP bootstrap separate from SSL config.

## Phase 7: certbot SSL Plan

Future certificate name:

```text
amami-line-crm-taiyolabel
```

Future domains:

```text
admin.taiyolabel.site
```

Future command shape, to be verified in the execution Loop:

```bash
sudo certbot --nginx --cert-name amami-line-crm-taiyolabel -d admin.taiyolabel.site
```

Rules:

- Do not reuse the existing `app.ajnl.net` / `api.ajnl.net` certificate.
- Do not modify the existing ajnl certificate.
- Confirm HTTP bootstrap works for both hosts before certbot.
- If certbot fails, restore nginx config from backup or remove the new amami-line-crm site.

## Phase 8: HTTPS nginx Config

Template source:

```text
deploy/vps/taiyolabel/nginx/amami-line-crm-ssl.conf.template
```

The template uses:

```text
/etc/letsencrypt/live/amami-line-crm-taiyolabel/fullchain.pem
/etc/letsencrypt/live/amami-line-crm-taiyolabel/privkey.pem
```

Run `nginx -t` before reload in a future Loop. Do not reload if the test fails.

## Phase 9: External Smoke Plan

Future external smoke only after nginx and SSL are intentionally installed:

```bash
curl -I https://admin.taiyolabel.site/
curl -sS https://admin.taiyolabel.site/api/health || true
```

Do not call LINE webhook, LINE push, OpenAI, Supabase mutation, or customer data endpoints in the first external smoke.

## Phase 10: LINE Webhook URL Plan

The actual API route is:

```text
POST /api/line/webhook/:webhookSecret
```

Future public URL shape:

```text
https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
```

Do not write the real webhook secret path into docs. Do not register this URL in LINE Developers during Loop 108.

## Phase 11: Real API Gates Stay Disabled

Initial production env must keep:

```text
LINE_MESSAGING_ENABLED=false
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OPENAI_REAL_API_ENABLED=false
```

Real LINE push and real OpenAI API require separate explicit approval Loops.

## Final Status

Loop 108 only prepares command packs and checklists. Final status remains:

```text
production_no_go
```

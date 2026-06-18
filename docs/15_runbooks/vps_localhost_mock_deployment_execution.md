# VPS Localhost Mock Deployment Execution

## Purpose

Loop 109 deploys `amami-line-crm` to the existing VPS for localhost-only review. This is not public production deployment.

The services bind to:

- API: `127.0.0.1:8788`
- Admin: `127.0.0.1:3002`

User review happens through SSH tunnel. Nginx, certbot, LINE webhook, LINE API, OpenAI API, and Supabase production/staging connections are not used in this Loop.

## Preconditions Checked Locally

Before touching the VPS, run:

```bash
pwd
git status --short
git status --short --branch
git log --oneline -12
git diff --check
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
```

Proceed only if the local tree is clean at start and all commands pass.

## VPS Audit Summary

Read-only audit confirmed:

- OS: Ubuntu 24.04.3 LTS
- Node: v20.20.2
- corepack: 0.34.6
- `pnpm`: no global command
- `npx`: available
- git: 2.43.0
- nginx: active/running
- Existing ports: `80`, `443`, `8080`, `127.0.0.1:8001`, `127.0.0.1:3100`
- `3002` and `8788` were free before deployment.
- `/var/www/amami-line-crm` and `/etc/amami-line-crm` were absent before deployment.
- No existing `amami-line-crm-*` service was registered.

Existing assets are not modified:

- `/etc/nginx/sites-enabled/default`
- `/etc/nginx/sites-enabled/ehime-portal`
- `/etc/nginx/sites-enabled/line-transport`
- `/var/www/ehime-portal`
- `/var/www/line-transport`
- `/var/www/html`
- existing `app.ajnl.net` / `api.ajnl.net` certificate

## Backup

Backup path from this Loop:

```text
/root/deploy-backups/amami-line-crm/20260618-200205
```

The backup includes current Nginx site directories, `conf.d`, running service list, and certbot certificate listing.

## Deployment Paths

Release directory:

```text
/var/www/amami-line-crm
```

Review env directory:

```text
/etc/amami-line-crm
```

Env files:

```text
/etc/amami-line-crm/api.env
/etc/amami-line-crm/admin.env
```

Permissions:

```text
/etc/amami-line-crm: 750
*.env: 640
```

## Review / Mock Env Policy

The env files contain no real secrets. The intended flags are:

```text
APP_ENV=development
REPOSITORY_RUNTIME=in_memory
AUTH_SESSION_VERIFIER=fake
LINE_MESSAGING_ENABLED=false
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OPENAI_REAL_API_ENABLED=false
```

Admin uses:

```text
API_BASE_URL=http://127.0.0.1:8788
ADMIN_API_INCLUDE_DEV_TENANT_HEADER=true
```

Do not add real LINE, OpenAI, Supabase, JWT, Bearer token, database password, project ref, or customer data to these files in this Loop.

## Start Boundary Correction

The VPS smoke found and fixed two localhost review blockers:

- API start script now uses review/mock `tsx src/index.ts` because the current compiled API output still contains extensionless ESM relative imports.
- API runtime package exports for `ai`, `config`, `domain`, `line`, and `rag` now point to `dist/<package>/src/index.js`.
- Admin start script now passes `next start --hostname 127.0.0.1`.

This keeps the localhost-only review service compatible with the existing monorepo source layout without adding new external dependencies or changing runtime provider behavior. A dedicated later Loop should decide whether to emit Node-ready compiled API output.

## Systemd Services

Created services:

```text
amami-line-crm-api.service
amami-line-crm-admin.service
```

Rules:

- `systemctl start` only.
- Do not `enable` in this Loop.
- Do not change existing services.
- Do not use Nginx in this Loop.

## Smoke Checks

Expected final checks:

```bash
systemctl status amami-line-crm-api.service --no-pager
systemctl status amami-line-crm-admin.service --no-pager
ss -tulpn | grep -E ':(3002|8788)\b' || true
curl -sS -I http://127.0.0.1:3002/
curl -sS http://127.0.0.1:8788/health
```

Success criteria:

- API is active on `127.0.0.1:8788`.
- Admin is active on `127.0.0.1:3002`.
- Neither service listens on `0.0.0.0` or public IP.
- `/health` returns JSON with `external_connections: "disabled"`.
- Admin root returns HTTP 200.

## User Review Tunnel

Mac側の別ターミナルで:

```bash
ssh -L 3002:127.0.0.1:3002 -L 8788:127.0.0.1:8788 root@160.251.174.201
```

ブラウザで:

```text
http://localhost:3002
```

Review targets:

- `/login`
- `/select-tenant`
- `/customers`
- customer detail and timeline
- staff reply mock
- AI summary / reply draft mock
- RAG answer draft mock
- `/alerts`

## Explicitly Not Done

- Nginx config install.
- `nginx -t`.
- Nginx reload/restart.
- certbot / HTTPS.
- LINE webhook setting.
- LINE API calls.
- OpenAI API calls.
- Supabase production/staging connection.
- production DB connection.
- real secret insertion.

## Rollback

Stop and remove only amami-line-crm assets:

```bash
sudo systemctl stop amami-line-crm-api.service 2>/dev/null || true
sudo systemctl stop amami-line-crm-admin.service 2>/dev/null || true
sudo rm -f /etc/systemd/system/amami-line-crm-api.service
sudo rm -f /etc/systemd/system/amami-line-crm-admin.service
sudo systemctl daemon-reload
```

Optional asset retreat:

```bash
ROLLBACK_DIR="/root/deploy-backups/amami-line-crm/rollback-$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$ROLLBACK_DIR"
sudo mv /var/www/amami-line-crm "$ROLLBACK_DIR/" 2>/dev/null || true
sudo mv /etc/amami-line-crm "$ROLLBACK_DIR/" 2>/dev/null || true
```

Nginx rollback is not needed because Nginx is not touched in Loop 109.

## Production Readiness

Still:

```text
production_no_go
```

## Loop 110 Local UI Note

Loop 110でAdmin UIをモバイルファーストに刷新したが、このrunbookで作成したVPS localhost-only review環境にはまだ再配置していない。VPS上のAdmin/APIはLoop 109時点の旧commitのままであり、Loop 110の下部ナビ、顧客カード、タイムライン、アラートカードを確認するには別Loopで再配置する。

Next:

- Loop 111: VPS localhost-only redeploy for mobile UI review

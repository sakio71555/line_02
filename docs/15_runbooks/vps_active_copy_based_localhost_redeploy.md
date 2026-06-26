# VPS active copy-based localhost redeploy

## Purpose

This runbook records the approved localhost-only shape for updating `/var/www/amami-line-crm` when the VPS release directory is copy-based and has no `.git`.

It does not approve public production enablement.

## Hard Safety Boundary

Allowed:

- Create a local release archive from a clean `origin/main`.
- Exclude `.env*`, `.git`, and `node_modules` from the archive.
- Validate the archive in `/root/deploy-staging/amami-line-crm/`.
- Backup active source to `/root/deploy-backups/amami-line-crm/`.
- Preserve active `.env*` files by rsync excludes.
- Update `/var/www/amami-line-crm` only after staging install/lint/typecheck/test/test:integration/build pass.
- Restart only existing `amami-line-crm-api.service` and `amami-line-crm-admin.service`.
- Smoke only `127.0.0.1:8788` and `127.0.0.1:3002`.

Forbidden:

- `.env` display, modification, or secret copy.
- Nginx `sites-enabled` changes.
- Nginx reload/restart.
- DNS changes, certbot, HTTPS enablement, external public smoke.
- LINE/OpenAI/Supabase real connections.
- API/Auth/RLS/runtime/migration behavior changes.
- dependency additions or lockfile changes.

## Release Archive

Use project-local `tmp/releases/`.

```bash
RELEASE_CANDIDATE="$(git rev-parse HEAD)"
RELEASE_SHORT="$(git rev-parse --short HEAD)"
RELEASE_DIR="tmp/releases/loop122-${RELEASE_SHORT}"
ARCHIVE="amami-line-crm-${RELEASE_CANDIDATE}.tar"

mkdir -p "$RELEASE_DIR"
git archive --format=tar --output="${RELEASE_DIR}/${ARCHIVE}" HEAD -- . ':(exclude).env*'
( cd "$RELEASE_DIR" && shasum -a 256 "$ARCHIVE" > "${ARCHIVE}.sha256" )
```

Verify:

```bash
tar -tf "${RELEASE_DIR}/${ARCHIVE}" | grep -E '(^|/)\.env($|\.|/)' && exit 1 || true
tar -tf "${RELEASE_DIR}/${ARCHIVE}" | grep -E '(^|/)\.git($|/)' && exit 1 || true
tar -tf "${RELEASE_DIR}/${ARCHIVE}" | grep -E '(^|/)node_modules($|/)' && exit 1 || true
```

## VPS Staging Validation

Transfer the archive, checksum, and manifest to `/root/deploy-staging/amami-line-crm/`.

In a timestamped staging directory:

```bash
shasum -a 256 -c amami-line-crm-<commit>.tar.sha256
tar -xf amami-line-crm-<commit>.tar -C "$STAGE_DIR/source"
cd "$STAGE_DIR/source"
npx pnpm@10.12.1 install --frozen-lockfile
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
```

No-Go if checksum, forbidden file scan, install, lint, typecheck, tests, or build fail.

## Active Backup

Before rsync, create a non-secret backup and evidence directory:

```bash
BACKUP_DIR="/root/deploy-backups/amami-line-crm/loop122-<timestamp>"
ACTIVE="/var/www/amami-line-crm"

mkdir -p "$BACKUP_DIR"
find "$ACTIVE" -maxdepth 1 -type f -name '.env*' -printf '%f\n' > "${BACKUP_DIR}/env-files-present-before.txt"

cd /var/www
tar \
  --exclude='amami-line-crm/.env' \
  --exclude='amami-line-crm/.env.*' \
  --exclude='amami-line-crm/node_modules' \
  --exclude='amami-line-crm/.next/cache' \
  --exclude='amami-line-crm/tmp' \
  -cf "${BACKUP_DIR}/active-source-before.tar" \
  amami-line-crm
```

Do not include env files, private keys, certs, DB dumps, `node_modules`, or build cache in the backup archive.

## Active Rsync

Proceed only after staging full validation passes.

```bash
rsync -a --delete \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules' \
  --exclude='.next/cache' \
  --exclude='tmp' \
  "${STAGE_DIR}/source/" \
  "${ACTIVE}/"
```

Then write markers:

```text
.deploy-source
.deploy-manifest.txt
```

The manifest must include release candidate, checksum, deploy method, localhost-only runtime, Admin/API ports, and `production_readiness=production_no_go`.

## Active Build

```bash
cd /var/www/amami-line-crm
npx pnpm@10.12.1 install --frozen-lockfile
npx pnpm@10.12.1 build
```

Do not continue to service restart if active build fails.

## Process Restart

Only existing services are approved:

```bash
sudo systemctl restart amami-line-crm-api.service amami-line-crm-admin.service
systemctl is-active amami-line-crm-api.service
systemctl is-active amami-line-crm-admin.service
```

Do not create new systemd units. Do not add pm2 registrations.

## Localhost Smoke

```bash
curl -sS -o /dev/null -w "api /health %{http_code}\n" http://127.0.0.1:8788/health
curl -sS -o /dev/null -w "admin /login %{http_code}\n" http://127.0.0.1:3002/login
curl -sS -o /dev/null -w "admin /select-tenant %{http_code}\n" http://127.0.0.1:3002/select-tenant
curl -sS -o /dev/null -w "admin /customers %{http_code}\n" http://127.0.0.1:3002/customers
curl -sS -o /dev/null -w "admin /alerts %{http_code}\n" http://127.0.0.1:3002/alerts
```

Listener expectations:

- Admin: `127.0.0.1:3002`.
- API: `127.0.0.1:8788`.
- `18080` absent.
- `sites-enabled` app include absent.
- No new public app bind.

## Loop 122 Evidence

```text
release_candidate=2a9a746940b5f7a707af4c042bb9225d3dea258b
rollback_candidate=176cb34fc6059ecabfb9826daacaabc2a437bebe
archive_sha256=9ca1d4e5794e5741c0e4767cad69e0d45c95b102297f1d6e355bcb17d0d73939
staging_path=/root/deploy-staging/amami-line-crm/loop122-extract-20260626-190958/source
backup_evidence_path=/root/deploy-backups/amami-line-crm/loop122-20260626-190958
active_source_after=2a9a746940b5f7a707af4c042bb9225d3dea258b
active_deploy_updated=yes
active_build=success
service_restart=success
api_health=200
admin_login=200
admin_select_tenant=200
admin_customers=200
admin_alerts=200
nginx_reload_restart=no
external_smoke=no
production_readiness=production_no_go
```

## Rollback

Run only with explicit approval:

```bash
ACTIVE="/var/www/amami-line-crm"
BACKUP_DIR="/root/deploy-backups/amami-line-crm/loop122-20260626-190958"
RESTORE_DIR="/root/deploy-staging/amami-line-crm/loop122-rollback-<timestamp>"

mkdir -p "$RESTORE_DIR"
tar -xf "${BACKUP_DIR}/active-source-before.tar" -C "$RESTORE_DIR"
rsync -a --delete \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules' \
  --exclude='.next/cache' \
  --exclude='tmp' \
  "${RESTORE_DIR}/amami-line-crm/" \
  "${ACTIVE}/"

cd "$ACTIVE"
npx pnpm@10.12.1 install --frozen-lockfile
npx pnpm@10.12.1 build
sudo systemctl restart amami-line-crm-api.service amami-line-crm-admin.service
```

Smoke localhost routes after rollback and keep Nginx unchanged unless a separate explicit Loop approves otherwise.

## Production Readiness

```text
production_readiness=production_no_go
```

Loop 122 aligned the localhost-only review source with latest main. It did not approve Nginx public enablement, DNS, HTTPS, external smoke, LINE/OpenAI/Supabase real connections, or production secret injection.

## Loop 123 Reload Smoke Follow-up

Loop 123 used the Loop 122 active source for a corrected Nginx candidate reload smoke:

```text
active_source=2a9a746940b5f7a707af4c042bb9225d3dea258b
candidate_host=amami-line-crm.invalid
evidence_path=/root/deploy-backups/amami-line-crm/loop123-20260626-200424
temporary_symlink=created
nginx_t=success
nginx_reload=completed
nginx_api_health=404
diagnostic_header=absent_on_404_response
sites_enabled_after=absent
rollback_reload=completed_by_trap
post_rollback_direct_api_health=200
post_rollback_direct_admin_login=200
production_readiness=production_no_go
```

The result remains No-Go for public enablement. The active app source is aligned and healthy on localhost, but live Nginx server selection or routing for the candidate still needs diagnosis.

# VPS copy-based release archive redeploy

## Purpose

This runbook describes the approved shape for updating the localhost-only VPS review environment when `/var/www/amami-line-crm` is copy-based and does not contain `.git`.

It does not approve public production enablement.

## Safety Boundary

Allowed:

- Create a release archive from clean local `origin/main`.
- Store local temporary files under project `tmp/releases/`.
- Transfer the archive to `/root/deploy-staging/amami-line-crm/`.
- Store non-secret evidence and active-source backups under `/root/deploy-backups/amami-line-crm/`.
- Build/test the staged source before touching active deploy.
- Update `/var/www/amami-line-crm` only after all Go conditions pass.
- Preserve active `.env*` files with rsync excludes.
- Restart only existing `amami-line-crm-api.service` and `amami-line-crm-admin.service` after successful active update.
- Smoke only `127.0.0.1:8788` and `127.0.0.1:3002`.

Forbidden:

- `.env` display, modification, or secret copy.
- Nginx `sites-enabled` change.
- Nginx reload/restart.
- DNS change, certbot, HTTPS, external smoke.
- LINE/OpenAI/Supabase real connections.
- API/Auth/RLS/runtime/migration/UI code changes.
- dependency additions or lockfile changes.

## Release Archive Procedure

```text
RELEASE_CANDIDATE=$(git rev-parse HEAD)
RELEASE_SHORT=$(git rev-parse --short HEAD)
RELEASE_DIR=tmp/releases/loop121-${RELEASE_SHORT}
```

The Loop 121 archive was created from `HEAD`, but `.env*` files were excluded from the archive. Active VPS `.env*` files are preserved by rsync excludes and never displayed.

```text
release_candidate_commit=e1eeb2d7be37074258aa5aade48d7b03a1cd7ac1
archive_sha256=f5ab2e23ef8de82a97c0b858b8099ea693474e3b90b4209892f137d85297f98e
archive_env_policy=.env* excluded from archive; active .env* preserved on VPS
```

## VPS Staging Procedure

1. Create a timestamped backup and staging path.
2. Save non-secret preflight evidence.
3. Backup active source while excluding `.env*`, `node_modules`, `.next/cache`, and `tmp`.
4. Transfer archive, checksum, and manifest to staging.
5. Verify checksum.
6. Extract to staging source.
7. Confirm extracted source contains no `.env*`.
8. Run:

```text
npx pnpm@10.12.1 install --frozen-lockfile
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
```

## Active Deploy Go Conditions

Proceed to active deploy only if all are true:

- local quality gates passed.
- release archive checksum matches in VPS staging.
- extracted staging source has no `.env*`.
- VPS staging `install --frozen-lockfile`, `lint`, `typecheck`, `test`, `test:integration`, and `build` all pass.
- active backup exists.
- active `.env*` files are preserved.
- Nginx reload/restart is not needed.
- no public smoke is needed.

No-Go if any command fails.

## Loop 121 Result

Loop 121 stopped before active deploy.

```text
result=NO-GO
reason=VPS staging full test failed before active deploy
backup_path=/root/deploy-backups/amami-line-crm/loop121-20260626-180347
staging_path=/root/deploy-staging/amami-line-crm/loop121-20260626-180347
active_deploy_updated=no
rsync_to_active=no
systemd_restart=no
nginx_reload_restart=no
public_smoke=no
```

Staging succeeded:

- archive checksum verification.
- `.env*` exclusion check.
- `install --frozen-lockfile`.
- `lint`.
- `typecheck`.
- `build`.

Staging failed:

- `test`.
- `test:integration` was not run after `test` failed.

Known compatibility issues:

- copy-based staging source has no `.git`, while some dev-loop tests expect git context.
- archive excludes `.env*`, while `.env.staging.example` tests expect the tracked template.
- VPS Node.js 20.20.2 has no default global WebSocket; Supabase client boundary tests need an approved Node/runtime compatibility path.

## Rollback

No rollback was needed in Loop 121 because active deploy was not updated.

If a future loop updates active source and then fails, restore from the recorded `active-source-before.tar` backup while preserving active `.env*` files, rerun localhost-only smoke, and do not touch Nginx.

## Production Readiness

```text
production_readiness=production_no_go
```

Loop 121 does not approve public production enablement.

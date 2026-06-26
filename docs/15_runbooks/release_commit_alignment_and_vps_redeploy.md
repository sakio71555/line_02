# Release commit alignment and VPS reproducible redeploy

## Purpose

This runbook records how to align the localhost-only VPS review environment with a selected release commit while keeping public production enablement blocked.

Loop 120 used this runbook shape to check the current VPS source and found that the release directory is copy-based without `.git`. Therefore, fast-forward redeploy was not performed.

## Safety Boundary

Allowed:

- Inspect local and VPS source state.
- Select release candidate and rollback candidate commits.
- Fetch and fast-forward a VPS git worktree if it already exists and is clean.
- Build/test on the VPS.
- Restart only the existing Admin/API localhost-only review processes after a successful source update.
- Smoke only `127.0.0.1:3002` and `127.0.0.1:8788`.
- Store non-secret evidence under `/root/deploy-backups/amami-line-crm/`.

Forbidden:

- `git reset`, `git stash`, `git rebase`, force push.
- Nginx `sites-enabled` changes.
- Nginx reload/restart.
- DNS changes, DNS provider API, TXT query, certbot, HTTPS, external HTTP/HTTPS smoke.
- firewall changes or public port additions.
- LINE webhook changes, LINE API calls, OpenAI API calls, Supabase real connections.
- `.env` creation, modification, display, or copy.
- dependency additions, lockfile changes, API/Auth/RLS/runtime/migration/UI code changes.

## Release Candidate Selection

Use the latest clean `origin/main` commit only after local quality gates pass.

Loop 120 selected:

```text
release_candidate_commit=5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db
release_candidate_reason=latest origin/main with Loop 119 domain and release approval evidence
config_source_commit=5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db
```

## Rollback Candidate Selection

Prefer the last known VPS source that passed localhost-only smoke.

Loop 120 selected:

```text
rollback_candidate_commit=176cb34fc6059ecabfb9826daacaabc2a437bebe
rollback_candidate_reason=last known VPS localhost-only review source with successful smoke before release alignment
```

## VPS Deployed Source Check

Expected deploy path:

```text
/var/www/amami-line-crm
```

Check shape without showing secrets:

```text
hostname
date -Is
test -d /var/www/amami-line-crm/.git && echo release_git_present || echo release_git_absent
test -f /var/www/amami-line-crm/DEPLOYED_COMMIT && sed -n '1p' /var/www/amami-line-crm/DEPLOYED_COMMIT
systemctl is-active amami-line-crm-api.service || true
systemctl is-active amami-line-crm-admin.service || true
curl -sS -o /dev/null -w "api /health %{http_code}\n" http://127.0.0.1:8788/health
curl -sS -o /dev/null -w "admin /login %{http_code}\n" http://127.0.0.1:3002/login
```

Loop 120 result:

```text
vps_release_git_worktree=absent
vps_before_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
vps_after_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
fast_forward_attempted=no
no_go_reason=release directory is copy-based without git worktree
```

## Fast-forward Only Procedure

Use this only when `/var/www/amami-line-crm/.git` exists, the branch is expected, and the worktree is clean.

```text
git fetch --prune origin
git status --short
git status --short --branch
git pull --ff-only origin main
git status --short
git status --short --branch
git rev-parse HEAD
```

No-Go if any of these are true:

- release directory is not a git worktree.
- worktree is dirty.
- branch or remote is unknown.
- `git pull --ff-only` fails.
- resulting HEAD does not match the release candidate.

Do not replace this with `git reset`, `git stash`, `git rebase`, or an ad-hoc archive deploy unless a later Loop explicitly approves that deployment shape.

## Build And Test Procedure

After a successful source update:

```text
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
```

Do not run `pnpm install` unless a later approved runbook explicitly requires `npx pnpm@10.12.1 install --frozen-lockfile` and lockfile changes are impossible.

Loop 120 did not run VPS build/test because source alignment did not proceed.

## Process Restart Procedure

After a successful source update and build/test, restart only the existing review services:

```text
systemctl restart amami-line-crm-api.service
systemctl restart amami-line-crm-admin.service
```

Do not create new systemd units. Do not enable services in a new way. Do not touch Nginx.

Loop 120 did not restart Admin/API because source alignment did not proceed.

## Localhost Smoke Procedure

```text
ss -ltnp | grep -E ':3002|:8788|:80|:443|:18080' || true
curl -sS -o /dev/null -w "api /health %{http_code}\n" http://127.0.0.1:8788/health
curl -sS -o /dev/null -w "admin /login %{http_code}\n" http://127.0.0.1:3002/login
curl -sS -o /dev/null -w "admin /select-tenant %{http_code}\n" http://127.0.0.1:3002/select-tenant
curl -sS -o /dev/null -w "admin /customers %{http_code}\n" http://127.0.0.1:3002/customers
curl -sS -o /dev/null -w "admin /alerts %{http_code}\n" http://127.0.0.1:3002/alerts
```

Expected:

- API `/health`: `200`.
- Admin `/login`: `200`.
- Admin app routes: `200` or an expected auth redirect.
- `3002` and `8788` are localhost-only.
- `18080` is absent.
- no new public listener is added.

Loop 120 existing-source smoke:

```text
api /health 200
admin /login 200
admin /select-tenant 200
admin /customers 200
admin /alerts 200
3002_8788_bind=localhost_only
18080=absent
sites_enabled_candidate=absent
```

## Evidence Path

Use:

```text
/root/deploy-backups/amami-line-crm/loop<loop>-<yyyymmdd-hhmmss>
```

Loop 120 evidence:

```text
/root/deploy-backups/amami-line-crm/loop120-20260626-174138
```

Evidence must not include:

- `.env`.
- secrets or token values.
- private keys or certificates.
- node_modules.
- database dumps.
- production logs that may contain customer data.

## Rollback Plan

No rollback is needed if source alignment did not happen.

If a future approved release updates source and must roll back, use a reviewed rollback branch/tag or an approved copy-based restore. Avoid leaving the deployed app in detached HEAD unless a dedicated rollback runbook approves it.

Rollback triggers:

- API health fail.
- Admin login fail.
- process bind wrong.
- public port exposure.
- build/test fail.
- tenant leakage suspicion.
- secret exposure.
- LINE/OpenAI/Supabase real connection accidentally enabled.

## Production Readiness

```text
production_readiness=production_no_go
```

Loop 120 keeps No-Go because latest main was not deployed to VPS, DNS/HTTPS/public smoke are not approved, and ownership/rollback/certificate/maintenance approvals are still unknown.

## Loop 121 Copy-Based Archive Attempt

Loop 121 explicitly tested the copy-based archive redeploy shape for the localhost-only review environment.

```text
release_candidate_commit=e1eeb2d7be37074258aa5aade48d7b03a1cd7ac1
previous_vps_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
archive_sha256=f5ab2e23ef8de82a97c0b858b8099ea693474e3b90b4209892f137d85297f98e
backup_path=/root/deploy-backups/amami-line-crm/loop121-20260626-180347
staging_path=/root/deploy-staging/amami-line-crm/loop121-20260626-180347
active_deploy_updated=no
systemd_restart=no
nginx_reload_restart=no
```

Result: No-Go. The archive transferred and built in VPS staging, but full `test` failed before active deploy. The active review source stayed on `176cb34fc6059ecabfb9826daacaabc2a437bebe`; no active rsync or service restart was performed.

Known compatibility items before retry:

- copy-based staging source has no `.git`, while dev-loop tests expect git context.
- release archive excludes `.env*`, while staging env template tests expect `.env.staging.example`.
- VPS Node.js 20.20.2 has no default global WebSocket, which affects Supabase client boundary tests.

See [vps_copy_based_release_archive_redeploy.md](vps_copy_based_release_archive_redeploy.md).

## Loop 121.1 Copy-Based Staging Compatibility Retry

Loop 121.1 tested a patched working-tree archive in VPS staging only.

```text
patch_id=loop1211-20260626-185306
base_commit=86e2f45c8a6fb07f6b37e7c1f818614b71fd03ab
archive_sha256=ca6d1283323db65dc1778b8045c3a009a5279c17459aafc70f2cdf0a04f22c4b
staging_path=/root/deploy-staging/amami-line-crm/loop1211-20260626-185306
active_source_before_after=176cb34fc6059ecabfb9826daacaabc2a437bebe
active_deploy_updated=no
systemd_restart=no
nginx_reload_restart=no
```

VPS staging passed `install --frozen-lockfile`, `lint`, `typecheck`, `test`, `test:integration`, and `build`. This removes the Loop 121 staging test blocker, but it does not align the active VPS review source with latest main. Active copy-based redeploy still needs a separate explicit Go loop.

## Loop 122 Active Copy-Based Localhost Redeploy

Loop 122 aligned the active VPS localhost-only review source with latest main using a release archive.

```text
release_candidate=2a9a746940b5f7a707af4c042bb9225d3dea258b
rollback_candidate=176cb34fc6059ecabfb9826daacaabc2a437bebe
archive_sha256=9ca1d4e5794e5741c0e4767cad69e0d45c95b102297f1d6e355bcb17d0d73939
staging_path=/root/deploy-staging/amami-line-crm/loop122-extract-20260626-190958/source
backup_evidence_path=/root/deploy-backups/amami-line-crm/loop122-20260626-190958
active_source_after=2a9a746940b5f7a707af4c042bb9225d3dea258b
active_deploy_updated=yes
service_restart=existing amami-line-crm-api/admin services
localhost_smoke=api health and admin routes 200
nginx_reload_restart=no
external_smoke=no
production_readiness=production_no_go
```

This is still a localhost-only review deployment. It does not approve public Nginx enablement, DNS, HTTPS, external smoke, LINE/OpenAI/Supabase real connections, or production secret injection.

See [copy_based_release_staging_test_compatibility.md](copy_based_release_staging_test_compatibility.md).

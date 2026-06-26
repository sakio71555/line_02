# Loop 115: Nginx Host-header routing diagnosis and local stage fix

## Purpose

Loop 114で `Host: amami-line-crm.invalid` の `/api/health` が `404` になった原因を、公開せずに切り分ける。system Nginx reload/restartは行わず、standalone Nginxを `127.0.0.1:18080` にだけ立てて、candidate route shapeとHost header routingを確認する。

## Starting State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Start branch: `main...origin/main`
- Start status: clean
- Unpushed commit at start: `76b6914 docs: record Nginx reload rollback dry-run`
- Loop 114 commit push result: pushed to `origin/main`
- VPS host used for diagnosis: `root@160.251.174.201`
- VPS hostname: `vm-227d8253-eb`
- VPS release path: `/var/www/amami-line-crm`
- Candidate config: `/etc/nginx/sites-available/amami-line-crm.conf`
- Temporary include path: `/etc/nginx/sites-enabled/amami-line-crm.conf`
- Candidate server name: `amami-line-crm.invalid`
- Admin upstream: `127.0.0.1:3002`
- API upstream: `127.0.0.1:8788`
- Production readiness remains `production_no_go`

## Scope

- Push the already-reviewed Loop 114 docs-only commit before new work.
- Audit Obsidian-compatible logs and project logs for Loops 109-114.
- Confirm direct Admin/API routes on VPS without displaying secrets.
- Diagnose Host header routing with standalone localhost-only Nginx on `127.0.0.1:18080`.
- Add a diagnostic response header to the repo Nginx example:
  - `X-Amami-Line-Crm-Proxy: amami-line-crm`
- Update the VPS `sites-available` candidate from the repo example.
- Run temporary `sites-enabled symlink` + `sudo nginx -t` only.
- Remove the temporary symlink and confirm `sudo nginx -t` still passes.
- Update docs, runbook, dev log, production readiness, and static tests.
- Commit and push if all local checks pass.

## Out of Scope

- system Nginx reload/restart.
- Real domain server name.
- DNS changes.
- HTTPS or certbot execution.
- Firewall changes or public port additions.
- Public external smoke.
- `.env` creation, modification, or display.
- Secret, token, Authorization header, LINE identifier, or production log display.
- API contract, Auth, RLS, migration, LINE real push, OpenAI real API, Supabase runtime, or UI changes.

## Diagnosis Result

Direct upstream checks showed:

- Admin direct routes, including `/login`, `/customers`, and `/alerts`, returned `200`.
- Admin direct routes also returned `200` when called with `Host header: amami-line-crm.invalid`.
- API direct `/health` returned `200`.
- API direct `/api/health` returned `404`, which is expected because the Hono route is `/health`.

Standalone Nginx on `127.0.0.1:18080` using the same path mapping showed:

- `/`, `/login`, `/select-tenant`, `/customers`, `/alerts`, `/permission-denied`, and `/session-expired` returned `200`.
- `/api/health` returned `200` through the proxy mapping to upstream `/health`.

This indicates the route shape in the candidate is valid. The Loop 114 `404` likely came from active system Nginx server selection or insufficient evidence that requests reached the intended candidate server block. The diagnostic header makes future Host header smoke distinguish candidate hits from another server block.

## Candidate Change

The repo-local example remains placeholder-based:

```text
server_name _CHANGE_ME_;
```

It now includes:

```text
add_header X-Amami-Line-Crm-Proxy "amami-line-crm" always;
```

The VPS candidate uses `server_name amami-line-crm.invalid;`. The real production host remains unset.

## VPS Verification

Allowed VPS verification:

- standalone localhost-only Nginx on `127.0.0.1:18080`.
- `sudo nginx -t`.
- temporary `sites-enabled symlink` for config inclusion only.

Required final state:

- standalone Nginx stopped.
- no listener on `127.0.0.1:18080`.
- `/etc/nginx/sites-enabled/amami-line-crm.conf` absent.
- system Nginx reload/restart was not executed.
- production readiness remains `production_no_go`.

Execution result:

- standalone config syntax test passed.
- standalone localhost-only Nginx listened only on `127.0.0.1:18080`.
- `/`, `/login`, `/select-tenant`, `/customers`, `/alerts`, `/permission-denied`, `/session-expired`, and `/api/health` returned `200`.
- `/api/health` returned `X-Amami-Line-Crm-Proxy: amami-line-crm`.
- static asset smoke through standalone proxy returned `308`, indicating the request reached the Admin app path and was redirected by the app/static route handling.
- standalone Nginx was stopped and `127.0.0.1:18080` was absent after cleanup.
- existing candidate was backed up as `/etc/nginx/sites-available/amami-line-crm.conf.loop115-backup-20260626-135905`.
- VPS candidate was refreshed with the diagnostic header.
- temporary `sites-enabled symlink` was created for `sudo nginx -t` only, then removed.
- final `sudo nginx -t` passed.
- direct API `/health` and direct Admin `/login` remained `200`.

## Test Coverage

Added static integration coverage for:

- placeholder-based Nginx example.
- diagnostic `X-Amami-Line-Crm-Proxy` header.
- `/api/health` path mapping to upstream `/health`.
- standalone localhost-only diagnosis docs.
- `sites-enabled symlink` + `sudo nginx -t` only boundary.
- production readiness remains `production_no_go`.

## Log Audit

No dedicated repo-local `.obsidian` vault was found. The Obsidian-compatible record remains `docs/14_dev_logs/`.

Loop 109-114 records exist across:

- `docs/14_dev_logs/2026-06-18.md`
- `docs/14_dev_logs/2026-06-22.md`
- `docs/14_dev_logs/2026-06-26.md`
- related `docs/11_codex_tasks/` task docs
- related `docs/15_runbooks/`
- `docs/15_runbooks/production_readiness_final.md`

Loop completion logging was tightened to include commit hash, push status, safety boundary, production readiness, residual risks, and next Loop.

## Judgment

```text
production_no_go
```

Reasons:

- The candidate is still `.invalid`.
- system Nginx reload/restart was not executed in Loop 115.
- no real domain, DNS, HTTPS, certbot command, public smoke, LINE/OpenAI/Supabase real connection, or permanent public enablement was performed.
- Loop 114 Host header 404 requires a future explicitly approved reload Loop to re-test with the diagnostic header.

## Next Loop Candidates

1. Loop 116: Domain/DNS/HTTPS readiness checklist
2. Loop 117: real domain Nginx enable plan
3. Loop 118: LINE webhook production dry-run checklist

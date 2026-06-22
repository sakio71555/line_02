# Loop 113: Nginx sites-enabled include dry-run final gate

## Purpose

Loop 112でVPSの `/etc/nginx/sites-available/amami-line-crm.conf` に配置したcandidateを、Nginx include tree全体で一時的に検証する。今回は `sites-enabled` に一時symlinkを作成して `sudo nginx -t` を実行し、確認後に必ずsymlinkを削除する。

This Loop does not publish the app.

## Starting State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Start branch: `main...origin/main`
- Start status: clean
- Latest commit at start: `f7842fa docs: add Nginx reverse proxy dry-run candidate`
- VPS host used for execution: `root@160.251.174.201`
- VPS hostname: `vm-227d8253-eb`
- VPS release path: `/var/www/amami-line-crm`
- VPS deployed source: `176cb34fc6059ecabfb9826daacaabc2a437bebe`
- Candidate config: `/etc/nginx/sites-available/amami-line-crm.conf`
- Candidate server name: `amami-line-crm.invalid`
- Admin upstream: `127.0.0.1:3002`
- API upstream: `127.0.0.1:8788`
- Production readiness remains `production_no_go`

## Scope

- Confirm Loop 112 docs and Nginx candidate state.
- Run local quality gates before any VPS change.
- Confirm VPS services and candidate state without showing secrets.
- Temporarily create `/etc/nginx/sites-enabled/amami-line-crm.conf` symlink.
- Run `sudo nginx -t` while the candidate is included.
- Summarize `sudo nginx -T` for only non-secret routing lines.
- Remove the temporary symlink.
- Confirm the symlink is removed and `sudo nginx -t` still passes.
- Update docs, runbook, dev log, and static tests.
- Commit and push if all checks pass.

## Out of Scope

- Leaving a `sites-enabled` symlink in place.
- Nginx reload / restart.
- certbot / HTTPS.
- DNS changes.
- firewall changes or public port additions.
- public external smoke.
- `.env` creation or modification.
- secret display.
- API contract, Auth, RLS, migration, LINE real push, OpenAI real API, or Supabase runtime changes.

## Local Verification Before VPS

Commands:

```bash
git diff --check
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
git status --short
```

Result:

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success
- `npx pnpm@10.12.1 test`: success, 98 files passed / 1 skipped, 651 tests passed / 4 skipped
- `npx pnpm@10.12.1 test:integration`: success, 98 files passed / 1 skipped, 651 tests passed / 4 skipped
- `npx pnpm@10.12.1 build`: success, 10 packages successful
- `git status --short`: clean before VPS work

## VPS Read-only Confirmation

Result:

- hostname: `vm-227d8253-eb`
- release path: `/var/www/amami-line-crm`
- release style: copy-based release without `.git`
- `DEPLOYED_COMMIT`: `176cb34fc6059ecabfb9826daacaabc2a437bebe`
- `nginx`: active
- `amami-line-crm-api.service`: active
- `amami-line-crm-admin.service`: active
- candidate file: present at `/etc/nginx/sites-available/amami-line-crm.conf`
- `/etc/nginx/sites-enabled/amami-line-crm.conf`: absent before dry-run
- `/etc/nginx/sites-enabled/amami-line-crm`: absent before dry-run
- API `/health`: `200`
- Admin `/login`: `200`
- review ports `3002` / `8788`: localhost-bound only
- existing public ports are Nginx `80` / `443`
- active Nginx config did not include `amami-line-crm` before the temporary symlink

Secret values, `.env`, Authorization headers, LINE identifiers, and production logs were not displayed.

## Temporary Sites-enabled Include Dry-run

Temporary link:

```text
/etc/nginx/sites-enabled/amami-line-crm.conf -> /etc/nginx/sites-available/amami-line-crm.conf
```

Result:

- candidate existed before symlink creation
- `sites-enabled` same-name path was absent before symlink creation
- temporary symlink was created
- `sudo nginx -t` with the temporary symlink: successful
- `sudo nginx -T` summary showed:
  - config file: `/etc/nginx/sites-enabled/amami-line-crm.conf`
  - `server_name amami-line-crm.invalid;`
  - API health upstream: `127.0.0.1:8788/health`
  - API upstream: `127.0.0.1:8788/api/`
  - Admin upstream: `127.0.0.1:3002`
- temporary symlink was removed
- post-cleanup `sudo nginx -t`: successful

No Nginx reload or restart was run.

## Post Dry-run Confirmation

Result:

- `/etc/nginx/sites-enabled/amami-line-crm.conf`: absent
- `/etc/nginx/sites-enabled/amami-line-crm`: absent
- `sudo nginx -t`: successful
- API `/health`: `200`
- Admin `/login`: `200`
- API/Admin remained localhost-only on `127.0.0.1:8788` and `127.0.0.1:3002`
- `nginx`: active
- `amami-line-crm-api.service`: active
- `amami-line-crm-admin.service`: active

## Production Readiness

Still:

```text
production_no_go
```

Reasons:

- `sites-enabled` symlink was removed and is not active.
- Nginx reload/restart was not performed.
- HTTPS/certbot was not performed.
- DNS was not changed.
- public external smoke was not performed.
- LINE/OpenAI/Supabase real connections were not enabled.
- final real domain and HTTPS policy remain pending.

## Rollback

Because the temporary symlink was removed, no runtime rollback is required.

If a leftover symlink is ever found from this Loop, remove only the app symlink:

```bash
sudo rm -f /etc/nginx/sites-enabled/amami-line-crm.conf
sudo nginx -t
```

Do not reload Nginx unless a future explicit public-enable Loop authorizes it after a passing config test.

## Test Coverage

Added a static integration test for the Loop 113 task doc and runbook. It verifies:

- task doc and runbook exist
- temporary symlink flow is documented
- cleanup and post-cleanup `nginx -t` are documented
- reload/restart, certbot, DNS, HTTPS, and public exposure remain forbidden
- `production_no_go` is maintained
- rollback and secret handling are documented

## Residual Risks

- The candidate is syntactically valid when included, but it is not active after this Loop.
- Real domain selection is still pending.
- HTTPS/certbot is still pending.
- DNS and external smoke are still pending.
- Production Auth/session and LINE/OpenAI/Supabase real-service gates remain separate concerns.

## Next Loop Candidates

1. Loop 114: actual Nginx enable + reload final approval gate
2. Loop 115: Domain/DNS/HTTPS readiness checklist
3. Loop 116: LINE webhook production dry-run checklist
4. Loop 117: Supabase staging connection preflight

# Loop 114: Nginx actual enable + reload rollbackable dry-run

## Purpose

Loop 113で確認した `/etc/nginx/sites-available/amami-line-crm.conf` candidateを、`server_name amami-line-crm.invalid;` のまま一時的に `sites-enabled` へ入れ、Nginx reload後のlocalhost + Host header smokeを確認する。

This Loop must end with the temporary symlink removed and Nginx reloaded back to the non-enabled state.

## Starting State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Start branch: `main...origin/main`
- Start status: clean
- Latest commit at start: `0c2df32 docs: record Nginx sites-enabled include dry-run`
- VPS host used for execution: `root@160.251.174.201`
- VPS hostname: `vm-227d8253-eb`
- VPS release path: `/var/www/amami-line-crm`
- VPS deployed source: `176cb34fc6059ecabfb9826daacaabc2a437bebe`
- Candidate config: `/etc/nginx/sites-available/amami-line-crm.conf`
- Temporary symlink: `/etc/nginx/sites-enabled/amami-line-crm.conf`
- Candidate server name: `amami-line-crm.invalid`
- Admin upstream: `127.0.0.1:3002`
- API upstream: `127.0.0.1:8788`
- Production readiness remains `production_no_go`

## Scope

- Run local quality gates before VPS reload work.
- Confirm VPS candidate state, services, ports, and direct localhost smokes without showing secrets.
- Temporarily create `/etc/nginx/sites-enabled/amami-line-crm.conf`.
- Run `sudo nginx -t` while included.
- Run `sudo systemctl reload nginx`.
- Run localhost + `Host: amami-line-crm.invalid` smoke.
- Remove the temporary symlink.
- Run `sudo nginx -t` and `sudo systemctl reload nginx` again to rollback the active Nginx config.
- Confirm post-rollback direct localhost smoke.
- Record No-Go findings in docs and dev log.

## Out of Scope

- Real domain use.
- DNS changes.
- certbot / HTTPS.
- firewall changes or public port additions.
- Leaving the `sites-enabled` symlink in place.
- API contract, Auth, RLS, migration, LINE real push, OpenAI real API, or Supabase runtime changes.
- `.env` creation, modification, or display.
- Secret, token, Authorization header, LINE identifier, or production log display.

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

Initial result before VPS work:

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success
- `npx pnpm@10.12.1 test`: success, 99 files passed / 1 skipped, 655 tests passed / 4 skipped
- `npx pnpm@10.12.1 test:integration`: success, 99 files passed / 1 skipped, 655 tests passed / 4 skipped
- `npx pnpm@10.12.1 build`: success, 10 packages successful

## VPS Preflight

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
- `sudo nginx -t`: successful
- direct API `/health`: `200`
- direct Admin `/login`: `200`
- review ports `3002` / `8788`: localhost-bound only
- existing public ports remained Nginx `80` / `443`
- active Nginx config did not include `amami-line-crm` before the temporary symlink

Secret values, `.env`, Authorization headers, LINE identifiers, and production logs were not displayed.

## Temporary Enable + Reload Dry-run

Temporary link:

```text
/etc/nginx/sites-enabled/amami-line-crm.conf -> /etc/nginx/sites-available/amami-line-crm.conf
```

Result:

- candidate existed before symlink creation
- temporary symlink was created
- `sudo nginx -t` with the temporary symlink: successful
- `nginx -T` summary showed:
  - `/etc/nginx/sites-enabled/amami-line-crm.conf`
  - `server_name amami-line-crm.invalid;`
  - `proxy_pass http://127.0.0.1:8788/health;`
  - `proxy_pass http://127.0.0.1:8788/api/;`
  - `proxy_pass http://127.0.0.1:3002;`
- `sudo systemctl reload nginx`: executed after successful `nginx -t`

Host header smoke after reload:

| path | status |
| --- | ---: |
| `/` | `200` |
| `/login` | `404` |
| `/select-tenant` | `404` |
| `/customers` | `404` |
| `/alerts` | `404` |
| `/api/health` | `404` |

`/api/health` was expected to return `200`, so the smoke result is No-Go.

## Rollback

Rollback was completed in the same execution:

- temporary symlink was removed
- post-remove `sudo nginx -t`: successful
- rollback `sudo systemctl reload nginx`: executed
- `/etc/nginx/sites-enabled/amami-line-crm.conf`: absent after rollback
- `/etc/nginx/sites-enabled/amami-line-crm`: absent after rollback
- direct API `/health`: `200`
- direct Admin `/login`: `200`
- `nginx`: active
- API/Admin remained localhost-only on `127.0.0.1:8788` and `127.0.0.1:3002`

## Judgment

```text
production_no_go
```

Reasons:

- Host header smoke through Nginx did not reach the expected Admin/API routes.
- `/api/health` with `Host: amami-line-crm.invalid` returned `404` instead of `200`.
- The temporary symlink was removed and the rollback reload completed.
- Real domain, DNS, HTTPS/certbot, external smoke, LINE/OpenAI/Supabase real connections, and permanent public enablement were not performed.

## Residual Risks

- The candidate is syntactically valid and reloadable, but Host header routing is not yet functionally correct.
- The next Loop should inspect Nginx server selection / location matching without exposing secrets or changing real domains.
- Real domain, DNS, HTTPS, external smoke, and production secret injection remain pending.

## Next Loop Candidates

1. Loop 115: Nginx Host-header routing diagnosis
2. Loop 116: Domain/DNS/HTTPS readiness checklist
3. Loop 117: real domain Nginx enable plan
4. Loop 118: LINE webhook production dry-run checklist

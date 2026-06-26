# Nginx Actual Enable + Reload Rollbackable Dry-run

## Purpose

This runbook records Loop 114: a temporary Nginx enable + reload dry-run using only:

```text
server_name amami-line-crm.invalid;
```

It does not publish a real domain. It must always end by removing the temporary `sites-enabled` symlink and reloading Nginx back to the previous non-enabled state.

## Current Judgment

```text
production_no_go
```

## Boundaries

Allowed in this Loop:

- temporarily create `/etc/nginx/sites-enabled/amami-line-crm.conf`
- run `sudo nginx -t`
- run `sudo systemctl reload nginx`
- run localhost + `Host: amami-line-crm.invalid` smoke
- remove the temporary symlink
- run `sudo nginx -t` and `sudo systemctl reload nginx` again
- record evidence without secrets

Forbidden in this Loop:

- real domain server_name
- DNS change
- certbot / HTTPS
- firewall change or public port addition
- `.env` display or edit
- secret, token, Authorization header, LINE identifier, or production log display
- LINE/OpenAI/Supabase real connection
- leaving the temporary symlink enabled

## Preconditions

- local quality gates pass
- VPS services are active
- candidate exists at `/etc/nginx/sites-available/amami-line-crm.conf`
- `/etc/nginx/sites-enabled/amami-line-crm.conf` is absent
- `sudo nginx -t` passes before the temporary symlink
- direct API `/health` returns `200`
- direct Admin `/login` returns `200`
- API/Admin ports `8788` / `3002` are localhost-only

## Loop 114 Execution Result

### Local

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success
- `npx pnpm@10.12.1 test`: success, 99 files passed / 1 skipped, 655 tests passed / 4 skipped
- `npx pnpm@10.12.1 test:integration`: success, 99 files passed / 1 skipped, 655 tests passed / 4 skipped
- `npx pnpm@10.12.1 build`: success, 10 packages successful

### VPS Preflight

- host: `root@160.251.174.201`
- hostname: `vm-227d8253-eb`
- deployed source: `176cb34fc6059ecabfb9826daacaabc2a437bebe`
- release style: copy-based release without `.git`
- Nginx/API/Admin services: active
- candidate: present
- temporary symlink: absent before dry-run
- `sudo nginx -t`: success
- direct API `/health`: `200`
- direct Admin `/login`: `200`
- `127.0.0.1:8788` and `127.0.0.1:3002`: localhost-only

### Temporary Enable

- temporary symlink was created:

```text
/etc/nginx/sites-enabled/amami-line-crm.conf -> /etc/nginx/sites-available/amami-line-crm.conf
```

- `sudo nginx -t`: success
- `nginx -T` summary included:
  - `server_name amami-line-crm.invalid;`
  - `proxy_pass http://127.0.0.1:8788/health;`
  - `proxy_pass http://127.0.0.1:8788/api/;`
  - `proxy_pass http://127.0.0.1:3002;`
- `sudo systemctl reload nginx`: executed

### Host Header Smoke

Using `Host: amami-line-crm.invalid` on `http://127.0.0.1`:

| path | result |
| --- | ---: |
| `/` | `200` |
| `/login` | `404` |
| `/select-tenant` | `404` |
| `/customers` | `404` |
| `/alerts` | `404` |
| `/api/health` | `404` |

This is a No-Go because `/api/health` should return `200` through the candidate reverse proxy.

### Rollback

- temporary symlink removed
- `sudo nginx -t`: success after removal
- `sudo systemctl reload nginx`: executed after removal
- `/etc/nginx/sites-enabled/amami-line-crm.conf`: absent
- `/etc/nginx/sites-enabled/amami-line-crm`: absent
- direct API `/health`: `200`
- direct Admin `/login`: `200`
- Nginx/API/Admin services: active
- `127.0.0.1:8788` and `127.0.0.1:3002`: localhost-only

## No-Go Reason

The candidate is parseable and reloadable, but functional Host header routing is not correct yet. The smoke responses strongly suggest the request did not reach the expected API/Admin route shape for `amami-line-crm.invalid`.

Do not proceed to real domain, DNS, HTTPS, or external smoke until a follow-up Loop diagnoses and fixes the candidate routing.

## Loop 115 Follow-up

Loop 115 diagnosed the route shape without system Nginx reload/restart:

- direct API `/health` returned `200`.
- direct API `/api/health` returned `404`, confirming the API contract is `/health`.
- standalone localhost-only Nginx on `127.0.0.1:18080` returned `200` for `/api/health` through the candidate mapping.
- the repo-local example and VPS candidate now include `X-Amami-Line-Crm-Proxy` so a future Host header smoke can prove whether the candidate server block handled the request.
- production readiness remains `production_no_go`.

The next reload-capable Loop should check the diagnostic header before considering real domain, DNS, HTTPS, or external smoke.

## Loop 123 Follow-up

Loop 123 retried the corrected candidate after Loop 122 aligned the active localhost-only review source to latest main:

- active source was `2a9a746940b5f7a707af4c042bb9225d3dea258b`.
- candidate still used `server_name amami-line-crm.invalid;`.
- the approved review/admin hostname `admin.taiyolabel.site` was not used as a Host header.
- temporary `/etc/nginx/sites-enabled/amami-line-crm.conf` symlink was created.
- `sudo nginx -t` passed.
- `sudo systemctl reload nginx` was executed.
- localhost Host header smoke returned `/` as `200`, but `/api/health` as `404`.
- `X-Amami-Line-Crm-Proxy` was absent on the `404` response.
- cleanup trap removed the temporary symlink.
- rollback `sudo nginx -t` and rollback reload completed.
- direct API `/health` and Admin `/login` returned `200` after rollback.
- production readiness remains `production_no_go`.

Evidence path:

```text
/root/deploy-backups/amami-line-crm/loop123-20260626-200424
```

The next Loop should diagnose live Nginx server selection before any real-domain work.

## Recovery Command If A Symlink Is Ever Found

Use only the app symlink path:

```bash
sudo rm -f /etc/nginx/sites-enabled/amami-line-crm.conf
sudo nginx -t
sudo systemctl reload nginx
```

Then confirm:

```bash
test ! -e /etc/nginx/sites-enabled/amami-line-crm.conf
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8788/health
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3002/login
```

## Next

- Loop 116: Domain/DNS/HTTPS readiness checklist
- Loop 117: real domain Nginx enable plan

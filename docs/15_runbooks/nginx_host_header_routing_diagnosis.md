# Nginx Host-header Routing Diagnosis

## Purpose

This runbook records Loop 115. It diagnoses the Loop 114 `Host header` 404 without public exposure and without changing runtime code.

The safe diagnostic method is a standalone localhost-only Nginx process bound to:

```text
127.0.0.1:18080
```

system Nginx reload/restart was not executed.

## Current Judgment

```text
production_no_go
```

## Boundary

Allowed:

- read-only VPS service and port checks.
- direct Admin/API localhost smoke.
- standalone localhost-only Nginx on `127.0.0.1:18080`.
- update the `sites-available` candidate after local and standalone confirmation.
- create a temporary `sites-enabled symlink`.
- run `sudo nginx -t`.
- remove the temporary symlink.
- record non-secret routing evidence.

Forbidden:

- system Nginx reload/restart.
- real domain server name.
- DNS changes.
- HTTPS/certbot execution.
- firewall changes or public port additions.
- public external smoke.
- `.env` display or edit.
- secret, token, Authorization header, LINE identifier, or production log display.
- LINE/OpenAI/Supabase real connection.

## Diagnosis Summary

Direct upstream observations:

- API `/health` on `127.0.0.1:8788` returned `200`.
- API `/api/health` on `127.0.0.1:8788` returned `404`.
- Admin routes on `127.0.0.1:3002` returned `200`, including with `Host header: amami-line-crm.invalid`.

The API observation confirms the reverse proxy must map:

```text
/api/health -> http://127.0.0.1:8788/health
```

Standalone localhost-only Nginx on `127.0.0.1:18080` confirmed:

- Admin routes returned `200`.
- `/api/health` returned `200`.
- the candidate path shape is valid when the request reaches that server block.

Loop 114's `404` is therefore treated as a server-selection / active-config diagnosis issue rather than an API route contract change.

## Candidate Diagnostic Header

The repo-local example now includes:

```text
add_header X-Amami-Line-Crm-Proxy "amami-line-crm" always;
```

Future Host header smoke should check this header to prove the request reached the intended candidate server block.

## VPS Candidate Update

Candidate file:

```text
/etc/nginx/sites-available/amami-line-crm.conf
```

The candidate should be generated from:

```text
deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example
```

with only this placeholder replaced:

```text
server_name _CHANGE_ME_;
```

to:

```text
server_name amami-line-crm.invalid;
```

Do not replace it with a real domain in this Loop.

## Temporary Include Test

Only this class of action is allowed:

1. create a temporary `sites-enabled symlink`.
2. run `sudo nginx -t`.
3. summarize non-secret active routing lines.
4. remove the temporary symlink.
5. run `sudo nginx -t` again.

Expected final state:

- `sites-enabled symlink` absent.
- standalone Nginx stopped.
- no listener on `127.0.0.1:18080`.
- API/Admin direct localhost smoke still healthy.
- production readiness remains `production_no_go`.

## What Loop 115 Confirms

- Loop 114 commit `76b6914` was reviewed and pushed before new changes.
- Loop 109-114 logs exist in `docs/14_dev_logs/` and related task/runbook docs.
- No dedicated repo-local `.obsidian` vault was found.
- The Obsidian-compatible log source is `docs/14_dev_logs/`.
- The route shape for `/api/health` is valid in standalone localhost-only Nginx.
- Standalone route smoke returned `200` for `/`, `/login`, `/select-tenant`, `/customers`, `/alerts`, `/permission-denied`, `/session-expired`, and `/api/health`.
- `/api/health` included `X-Amami-Line-Crm-Proxy: amami-line-crm`.
- The static asset smoke reached the Admin app and returned `308`.
- The candidate now has `X-Amami-Line-Crm-Proxy` for future diagnostics.
- The VPS candidate was updated and included with a temporary `sites-enabled symlink` for `sudo nginx -t` only.
- The temporary symlink was removed, final `sudo nginx -t` passed, and `127.0.0.1:18080` was absent after cleanup.
- system Nginx reload/restart was not executed.

## Still Not Production

Still not done:

- real domain.
- DNS.
- HTTPS/certbot execution.
- public external smoke.
- permanent Nginx enablement.
- LINE real push.
- OpenAI real API.
- Supabase production connection.

Keep:

```text
production_no_go
```

## Next

- Loop 116: Domain/DNS/HTTPS readiness checklist
- Loop 117: real domain Nginx enable plan
- Loop 118: LINE webhook production dry-run checklist

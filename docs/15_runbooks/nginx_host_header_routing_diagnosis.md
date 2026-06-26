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

## Loop 123 Follow-up

Loop 123 used the corrected candidate in the system Nginx include path with a temporary symlink and reload. It still used only `Host: amami-line-crm.invalid`; `admin.taiyolabel.site` was not used as a Host header.

Result:

- `nginx -T` with the temporary include confirmed the candidate lines.
- `sudo nginx -t` passed.
- system Nginx reload completed in Loop 123.
- `/` returned `200`, but `/api/health` returned `404`.
- the `X-Amami-Line-Crm-Proxy` diagnostic header was absent on the `404` response.
- cleanup trap removed the temporary symlink.
- rollback `sudo nginx -t` and rollback reload completed.
- direct API `/health` and Admin `/login` returned `200` after rollback.
- production readiness remains `production_no_go`.

Interpretation: the standalone route shape is valid, but live system Nginx server selection or active routing is still not proven. Do not proceed to real domain, DNS, HTTPS/certbot, or external smoke until the live server-selection behavior is explained.

## Loop 124 Follow-up

Loop 124 inspected the system Nginx include tree without reload/restart:

- `sites-enabled/*` is included by `nginx.conf`.
- `conf.d/*.conf` is included by `nginx.conf`.
- `sites-available` is not directly included.
- the current active config has no amami candidate while the symlink is absent.
- a temporary symlink makes the amami candidate appear in `nginx -T` with the expected invalid host, upstreams, diagnostic header, and `/api/health` mapping.
- current active localhost curl with `Host: amami-line-crm.invalid` returns `/=200`, `/api/health=404`, and `/login=404` without the diagnostic header.

This strengthens the hypothesis that Loop 123's reload smoke behaved like the no-symlink active default server, not like the included candidate.

## Loop 125 Diagnostic Probe Result

Loop 125 used a minimal probe block with no upstream:

- `server_name amami-line-crm.invalid`
- `location = /__amami_probe`
- `X-Amami-Line-Crm-Probe: loop125`

The probe appeared in `nginx -T`, but reload smoke still returned:

```text
/__amami_probe = 404
X-Amami-Line-Crm-Probe = absent
/ = 200
/api/health = 404
server_selection=probe_not_reached
```

The probe symlink and candidate were removed, rollback reload completed, and production readiness stayed `production_no_go`.

## Loop 127 Listen / Server Name Result

Loop 127 repeated the probe with dedicated logs and multiple curl variants:

- `Host: amami-line-crm.invalid` was the only test Host.
- real domain and `admin.taiyolabel.site` Host header were not used.
- before the probe, active curl variants returned `404` through the existing default/catch-all behavior.
- after enabling the probe and reloading, `-H`, `--resolve`, and `--connect-to` variants all returned `204`.
- each successful probe response included `X-Amami-Line-Crm-Probe: loop127`.
- the probe access log recorded the requests.
- `/api/health` on the probe returned `404` with `X-Amami-Line-Crm-Probe: loop127-catchall`.
- `result=probe_reached`.

Interpretation: Host header transport and curl method are not the likely blocker. Continue with candidate placement/listen remediation before any real-domain, DNS, HTTPS/certbot, or external smoke work.

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

## Loop 116 Follow-up

Loop 116 added the domain/DNS/HTTPS readiness inventory without changing active Nginx. It keeps canonical hostname, DNS provider, domain ownership, ACME method, certificate names, and LINE webhook public URL undecided. Use `docs/15_runbooks/domain_dns_https_readiness_checklist.md` before any real-domain enablement Loop.

## Next

- Loop 117: real domain decision and DNS provider confirmation plan
- Loop 118: real domain Nginx enable plan
- Loop 119: HTTPS issuance dry-run approval gate

## Loop 128 App Candidate Result

Loop 128 completed the candidate placement/listen remediation gate for the `.invalid` app path:

```text
evidence_dir=/root/deploy-backups/amami-line-crm/loop128-20260626-235834
test_host=amami-line-crm.invalid
real_domain_used=no
admin_taiyolabel_host_used=no
normalized_matches_repo=true
candidate_change=none_candidate_already_matched_repo_template_except_server_name
app_api_health_status=200
app_api_health_proxy_header=amami-line-crm
invalid_host_candidate_smoke=success
app_symlink_after=absent
rollback_nginx_t=success
rollback_reload=completed
production_readiness=production_no_go
```

Next work should move to ACME/HTTPS dry-run planning or owner approval records. Do not use this result as permission to enable the real domain or run external smoke.

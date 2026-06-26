# Corrected Nginx Candidate Reload Smoke

## Purpose

This runbook records Loop 123: a corrected Nginx candidate reload smoke using only the dry-run host:

```text
amami-line-crm.invalid
```

It does not approve real-domain public exposure.

## Current Judgment

```text
production_no_go
```

## Hard Boundary

Allowed:

- Use the existing VPS candidate at `/etc/nginx/sites-available/amami-line-crm.conf`.
- Temporarily create `/etc/nginx/sites-enabled/amami-line-crm.conf`.
- Run `sudo nginx -t`.
- Run `sudo systemctl reload nginx`.
- Smoke only localhost with `Host: amami-line-crm.invalid`.
- Remove the temporary symlink.
- Run rollback `sudo nginx -t` and `sudo systemctl reload nginx`.
- Record non-secret routing evidence.

Forbidden:

- Use `admin.taiyolabel.site` as the Host header for this dry-run.
- Use any real client-facing domain.
- Change DNS.
- Run certbot or HTTPS issuance.
- Run external public smoke.
- Change firewall rules or public app ports.
- Display or edit `.env` values.
- Connect LINE/OpenAI/Supabase real services.
- Change API/Auth/RLS/runtime/migration behavior.
- Leave `/etc/nginx/sites-enabled/amami-line-crm.conf` enabled.

## Preconditions

- Local quality gates pass.
- VPS active source is latest localhost-only review source.
- Direct API `/health` on `127.0.0.1:8788` returns `200`.
- Direct Admin `/login` on `127.0.0.1:3002` returns `200`.
- App listeners are localhost-only.
- `/etc/nginx/sites-enabled/amami-line-crm.conf` is absent before the smoke.
- `sudo nginx -t` passes before the temporary reload.

## Loop 123 Evidence

```text
evidence_path=/root/deploy-backups/amami-line-crm/loop123-20260626-200424
active_source=2a9a746940b5f7a707af4c042bb9225d3dea258b
candidate_path=/etc/nginx/sites-available/amami-line-crm.conf
test_host=amami-line-crm.invalid
approved_review_host=admin.taiyolabel.site
approved_review_host_used_as_host_header=no
real_domain_used=no
production_readiness=production_no_go
```

Candidate non-secret routing:

```text
server_name amami-line-crm.invalid;
add_header X-Amami-Line-Crm-Proxy "amami-line-crm" always;
proxy_pass http://127.0.0.1:8788/health;
proxy_pass http://127.0.0.1:8788/api/;
proxy_pass http://127.0.0.1:3002;
```

Temporary include inspection:

```text
nginx_T_temporary_include=confirmed
real_domain_count=0
invalid_host_count=1
```

Temporary reload:

```text
temporary_symlink=created
sudo_nginx_t=success
sudo_systemctl_reload_nginx=completed
```

Host header smoke with `Host: amami-line-crm.invalid`:

```text
nginx-admin /=200
nginx-admin /login=404
nginx-admin /select-tenant=404
nginx-admin /customers=404
nginx-admin /alerts=404
nginx-admin /permission-denied=404
nginx-admin /session-expired=404
nginx-api /api/health=404
diagnostic_header=absent_on_404_response
no_go_reason=api_health_404
```

Rollback:

```text
sites_enabled_after=absent
rollback_cleanup=trap_completed
rollback_nginx_t=success
rollback_reload=completed_by_trap
post_rollback_direct_api_health=200
post_rollback_direct_admin_login=200
external_smoke=not_run
```

## No-Go Reason

The corrected candidate still returned `404` for `/api/health` after system Nginx reload. The response did not include `X-Amami-Line-Crm-Proxy`, so the smoke did not prove the request reached the intended candidate server block.

The result is No-Go for real domain, DNS, HTTPS/certbot, and external smoke.

## Loop 124 Server Selection Follow-up

Loop 124 diagnosed Nginx server selection without reload/restart:

- `/etc/nginx/nginx.conf` includes `/etc/nginx/conf.d/*.conf` and `/etc/nginx/sites-enabled/*`.
- `sites-available` is not directly included.
- current active config does not include `amami-line-crm` because the symlink is absent.
- temporary symlink + `nginx -T` did include the candidate, `amami-line-crm.invalid`, `127.0.0.1:3002`, `127.0.0.1:8788`, `X-Amami-Line-Crm-Proxy`, and `/api/health` mapping.
- no reload/restart was run.
- the temporary symlink was removed and final `nginx -t` passed.
- current active curl without the symlink returned `/=200`, `/api/health=404`, `/login=404`, with diagnostic header absent.

Interpretation: the candidate appears correctly in disk config when included. Loop 123's reload smoke still matched the current no-symlink active behavior, so live reload application/server selection remains the unresolved issue.

## Recovery Command If A Symlink Is Ever Found

Use only the app symlink path:

```bash
sudo rm -f /etc/nginx/sites-enabled/amami-line-crm.conf
sudo nginx -t
sudo systemctl reload nginx
```

Then confirm direct localhost review health:

```bash
curl -sS -o /dev/null -w "api /health %{http_code}\n" http://127.0.0.1:8788/health
curl -sS -o /dev/null -w "admin /login %{http_code}\n" http://127.0.0.1:3002/login
```

## Next Gate

Before another reload smoke or real-domain work, diagnose why the live Nginx server selection did not return the diagnostic header. Keep the test host `.invalid` until `/api/health` and Admin routes pass through the intended candidate after reload.

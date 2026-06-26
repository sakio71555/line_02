# Loop 128: corrected app Nginx candidate proxy remediation

## Goal

Confirm the existing app Nginx candidate against the repo template, run a localhost-only invalid-host reload smoke, and record whether the app candidate can proxy Admin and API routes after Loop 127 proved basic server selection works.

## Scope

- Compare repo reverse proxy template with the VPS candidate.
- Backup the VPS candidate and save non-secret evidence.
- Keep `server_name amami-line-crm.invalid;`.
- Temporarily enable `/etc/nginx/sites-enabled/amami-line-crm.conf`.
- Run `sudo nginx -t`, `sudo systemctl reload nginx`, localhost Host-header smoke, symlink cleanup, rollback `nginx -t`, and rollback reload.
- Update docs, runbook, dev log, production readiness, and static integration tests.
- Commit and push.

## Out Of Scope

- Real domain use.
- `admin.taiyolabel.site` Host header use.
- DNS changes.
- certbot / HTTPS.
- External public smoke.
- Firewall changes.
- LINE webhook changes.
- LINE/OpenAI/Supabase real connection.
- `.env` display or mutation.
- API/Auth/RLS/runtime/migration/UI changes.
- Dependency or lockfile changes.
- Production enablement.

## Start State

- Local repo: `/Users/sakio/Desktop/PROJECT/amami-line-crm`.
- Branch: `main`.
- Start status: clean.
- Start HEAD: `6da2305 docs: diagnose Nginx listen server selection`.
- VPS active source: `2a9a746940b5f7a707af4c042bb9225d3dea258b`.
- Admin service: `127.0.0.1:3002`.
- API service: `127.0.0.1:8788`.
- App candidate: `/etc/nginx/sites-available/amami-line-crm.conf`.
- App symlink before smoke: absent.
- Production readiness: `production_no_go`.

## Loop 127 Handoff

Loop 127 proved:

```txt
result=probe_reached
probe_h1_status=204
probe_h1_header=X-Amami-Line-Crm-Probe: loop127
probe_access_log_lines=4
rollback_reload=completed
production_readiness=production_no_go
```

That means basic Nginx listener ownership, `server_name` selection, Host header transport, and reload reflection worked for a minimal probe. Loop 128 therefore focused on the existing app candidate.

## Repo Template Check

Template checked:

```txt
deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example
```

Relevant mapping:

- `server_name _CHANGE_ME_;`
- `/api/health -> http://127.0.0.1:8788/health`
- `/api/ -> http://127.0.0.1:8788/api/`
- `/ -> http://127.0.0.1:3002`
- `X-Amami-Line-Crm-Proxy: amami-line-crm`
- forwarded headers and WebSocket upgrade headers.

Loop 128 added a comment that the diagnostic header is for invalid-host dry-runs and must be removed or explicitly approved before public production enablement.

## VPS Candidate Before

VPS candidate summary:

```txt
candidate=/etc/nginx/sites-available/amami-line-crm.conf
server_name=amami-line-crm.invalid
real_domain_found=no
admin_taiyolabel_host_found=no
api_health_mapping=127.0.0.1:8788/health
api_mapping=127.0.0.1:8788/api/
admin_mapping=127.0.0.1:3002
diagnostic_header=X-Amami-Line-Crm-Proxy: amami-line-crm
```

Repo-vs-VPS comparison:

```txt
normalized_matches_repo=true
diff=server_name _CHANGE_ME_ -> server_name amami-line-crm.invalid
```

Because the candidate already matched the repo template except for the dry-run host, no VPS candidate content change was applied.

## Backup / Evidence

Evidence path:

```txt
/root/deploy-backups/amami-line-crm/loop128-20260626-235834
```

Candidate backup:

```txt
/root/deploy-backups/amami-line-crm/loop128-20260626-235834/amami-line-crm.conf.before
```

Candidate after:

```txt
/root/deploy-backups/amami-line-crm/loop128-20260626-235834/amami-line-crm.conf.after
```

Candidate change:

```txt
candidate_change=none_candidate_already_matched_repo_template_except_server_name
```

## Nginx Include / Reload Smoke

Temporary symlink:

```txt
/etc/nginx/sites-enabled/amami-line-crm.conf -> /etc/nginx/sites-available/amami-line-crm.conf
```

Checks:

```txt
nginx_t_with_symlink=success
nginx_T_candidate_present=yes
nginx_T_api_health_mapping_present=yes
reload=completed
test_host=amami-line-crm.invalid
```

Smoke result:

```txt
app_root_status=200
app_root_proxy_header=amami-line-crm
app_login_status=200
app_login_proxy_header=amami-line-crm
app_select_tenant_status=200
app_select_tenant_proxy_header=amami-line-crm
app_customers_status=200
app_customers_proxy_header=amami-line-crm
app_alerts_status=200
app_alerts_proxy_header=amami-line-crm
app_api_health_status=200
app_api_health_proxy_header=amami-line-crm
invalid_host_candidate_smoke=success
```

## Rollback / Cleanup

Rollback result:

```txt
app_symlink_after=absent
rollback_nginx_t=success
rollback_reload=completed
api-direct /health 200
admin-direct /login 200
3002_8788=localhost_only
18080=absent
```

## Safety Boundary

```txt
real_domain_used=no
admin_taiyolabel_host_used=no
dns_change=no
certbot_https=no
external_smoke=no
line_openai_supabase_connection=no
production_readiness=production_no_go
```

Additional safety notes:

- DNS was not changed.
- certbot was not run.
- HTTPS was not enabled.
- External public smoke was not performed.
- Firewall was not changed.
- `.env` was not displayed or changed.
- API/Auth/RLS/runtime/migration/UI was not changed.

## Interpretation

The app candidate works for the invalid-host localhost reload smoke. The prior `/api/health=404` failure is not reproduced after Loop 127/128. The candidate did not need content remediation; it needed a fresh controlled reload smoke with evidence.

This still does not approve production enablement because the real domain, owner approvals, HTTPS, external smoke, and production secret injection are not complete.

## Next Loop Candidates

1. Loop 129: ACME selected-method dry-run plan.
2. Loop 130: real-domain Nginx enable approval gate.
3. Loop 131: LINE webhook production URL dry-run checklist.
4. Loop 132: owner approval record update.
5. Loop 133: Supabase staging connection preflight.

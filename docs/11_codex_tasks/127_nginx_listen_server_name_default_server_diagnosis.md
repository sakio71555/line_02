# Loop 127: Nginx listen / server_name / default_server diagnosis

## Goal

Diagnose system Nginx listener, reload reflection, server_name selection, default_server/catch-all behavior, and Host header handling before changing the existing Amami reverse proxy candidate.

Loop 127 follows Loop 125, where the diagnostic probe did not appear to be reached. This Loop adds stronger evidence with Nginx service status, process/listener checks, curl variants, reload reflection diagnostics, and a probe-specific access log.

## Scope

- Read local repo and previous Loop docs.
- Run local baseline quality checks before VPS work.
- Confirm Nginx service, PID, worker process, listener, and active config state.
- Confirm current active Host-header behavior without a probe symlink.
- Create a diagnostic-only probe candidate with dedicated `access_log` and `error_log`.
- Temporarily enable the probe with a `sites-enabled` symlink.
- Verify inclusion with `nginx -T`.
- Run Nginx reload.
- Smoke localhost-only curl variants with `Host: amami-line-crm.invalid`.
- Confirm whether the probe access log receives requests.
- Remove the probe symlink, delete the probe candidate, run `nginx -t`, rollback reload, and confirm local app health.
- Save non-secret evidence on the VPS.
- Update docs, runbook, production readiness, dev log, and static integration tests.
- Commit and push.

## Out Of Scope

- Real domain use.
- `admin.taiyolabel.site` Host header use.
- Existing app candidate `/etc/nginx/sites-available/amami-line-crm.conf` modification.
- `/api/health` proxy remediation.
- Admin/API proxy remediation.
- DNS changes.
- certbot or HTTPS.
- External public smoke.
- Firewall changes.
- Public port changes.
- LINE webhook changes.
- LINE/OpenAI/Supabase real connection.
- `.env` display or mutation.
- API/Auth/RLS/runtime/migration/UI changes.
- Dependency or lockfile changes.

## Start State

- Local repo: `/Users/sakio/Desktop/PROJECT/amami-line-crm`.
- Branch: `main`.
- Start status: clean.
- Start HEAD: `ba87935 docs: record Nginx diagnostic probe`.
- VPS active source: `2a9a746940b5f7a707af4c042bb9225d3dea258b`.
- Admin service: `127.0.0.1:3002`.
- API service: `127.0.0.1:8788`.
- App symlink: `/etc/nginx/sites-enabled/amami-line-crm.conf` absent.
- Probe symlink: `/etc/nginx/sites-enabled/amami-line-crm-probe.conf` absent.
- Probe candidate before Loop 127: absent.
- Production readiness: `production_no_go`.

## Loop 125 Handoff

Loop 125 showed:

```txt
nginx_T_probe_present=yes
reload=completed
probe_status=404
probe_header=
root_status=200
api_health_status=404
server_selection=probe_not_reached
probe_symlink_after=absent
app_symlink_after=absent
candidate_final_state=deleted
rollback_reload=completed
production_readiness=production_no_go
```

Loop 127 re-tested with dedicated probe logs to determine whether the request reached the temporary server block.

## Local Baseline

Before VPS work, the following passed:

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

Result:

- Test files: `111 passed | 1 skipped`
- Tests: `711 passed | 4 skipped`
- Build: success

## VPS Evidence

Evidence path:

```txt
/root/deploy-backups/amami-line-crm/loop127-20260626-224235
```

## Nginx Service / PID / Listener Check

Preflight result:

```txt
nginx_service_status=active
main_pid=426936
port80_process=nginx
active_source=2a9a746940b5f7a707af4c042bb9225d3dea258b
api-direct /health 200
admin-direct /login 200
```

Listener summary:

- Nginx listens on public `0.0.0.0:80`, `[::]:80`, `0.0.0.0:443`, `[::]:443`, and `0.0.0.0:8080` from existing site configuration.
- Admin remains `127.0.0.1:3002`.
- API remains `127.0.0.1:8788`.
- `18080` is absent.

## Active Config Summary

Before the probe symlink:

```txt
active_amami_count=0
active_invalid_host_count=0
active_default_server_count=4
active_listen80_count=5
```

Relevant active server behavior:

- `/etc/nginx/sites-enabled/default` has `listen 80 default_server;`.
- It also has `listen [::]:80 default_server;`.
- It uses `server_name _;`.
- It serves `root /var/www/html;`.
- It uses `try_files $uri $uri/ =404;`.

This explains the current active catch-all shape before a probe candidate is enabled.

## Current Active Request Target

Before enabling the probe, all curl variants against `amami-line-crm.invalid` went to the current default/catch-all behavior:

```txt
current_h1_probe_status=404
current_h1_api_health_status=404
current_h10_probe_status=404
current_resolve_probe_status=404
current_connect_to_probe_status=404
```

This suggests the Host header variants were consistent and not obviously affected by local proxy or curl behavior.

## Probe With Dedicated Access Log

Probe candidate:

```txt
/etc/nginx/sites-available/amami-line-crm-probe.conf
```

Probe symlink:

```txt
/etc/nginx/sites-enabled/amami-line-crm-probe.conf
```

Probe logs:

```txt
probe_access_log_path=/root/deploy-backups/amami-line-crm/loop127-20260626-224235/probe-access.log
probe_error_log_path=/root/deploy-backups/amami-line-crm/loop127-20260626-224235/probe-error.log
```

The probe used:

- `listen 80`
- `server_name amami-line-crm.invalid`
- `location = /__amami_probe`
- `X-Amami-Line-Crm-Probe: loop127`
- no upstream
- no real domain
- no secret

## `nginx -T` Include Result

With the temporary probe symlink present:

```txt
nginx_T_probe_present=yes
```

The `nginx -T` summary showed:

- probe file path
- `listen 80`
- `server_name amami-line-crm.invalid`
- probe `access_log`
- probe `error_log`
- `/__amami_probe`
- `X-Amami-Line-Crm-Probe`

## Reload Reflection Diagnostics

Reload result:

```txt
reload=completed
after_reload_service_status=active
after_reload_main_pid=426936
journal_error_count_since_reload=0
```

Worker process timestamps changed after reload:

- before reload workers: `474549`, `474550`, `474551` from `21:38:32`.
- after reload workers: `474929`, `474930`, `474931` from `22:42:35`.

This supports that reload was applied.

## Curl Variants After Reload

After reload, all probe curl variants reached the probe:

```txt
probe_h1_status=204
probe_h1_header=X-Amami-Line-Crm-Probe: loop127
probe_resolve_status=204
probe_resolve_header=X-Amami-Line-Crm-Probe: loop127
probe_connect_to_status=204
probe_connect_to_header=X-Amami-Line-Crm-Probe: loop127
probe_api_health_status=404
probe_api_health_header=X-Amami-Line-Crm-Probe: loop127-catchall
```

## Probe Access Log Result

Dedicated access log result:

```txt
probe_access_log_lines=4
probe_error_log_lines=0
```

Requests recorded in the probe access log:

- `GET /__amami_probe` returned `204` for the three curl variants.
- `GET /api/health` returned `404` through the probe catch-all.

This proves the request reached the diagnostic server block in Loop 127.

## Diagnosis Matrix

| Hypothesis | Result | Evidence | Next action |
|---|---|---|---|
| Port 80 is not Nginx | fail | `port80_process=nginx` and `ss` showed Nginx on `:80` / `[::]:80` | No action for port ownership |
| Reload did not apply | fail | `after_reload_service_status=active`, worker PIDs changed, journal had no error, probe reached | No reload remediation yet |
| Probe not included | fail | `nginx_T_probe_present=yes` and probe access log recorded requests | No include-path remediation yet |
| Host header not sent | fail | `-H`, `--resolve`, and `--connect-to` variants all returned `204` with probe header | No curl/Host remediation |
| IPv4/IPv6 listener mismatch | fail | IPv4 `127.0.0.1` and Host variants reached `listen 80` probe | No IPv4/IPv6 remediation |
| default_server captures request | fail after probe enabled | default/catch-all captured before probe; after probe reload the named probe won | Existing candidate placement should be re-tested |
| duplicate server_name conflict | unknown | No duplicate `amami-line-crm.invalid` in active config before probe; probe worked when enabled | Re-check before candidate remediation |
| curl proxy/intercept issue | fail | `--noproxy '*'` and multiple curl variants were consistent | No curl remediation |

## Result Classification

```txt
result=probe_reached
```

## Cleanup / Rollback

Cleanup and rollback were completed:

```txt
probe_symlink_after=absent
app_symlink_after=absent
candidate_final_state=deleted
rollback_nginx_t=success
rollback_reload=completed
```

Post-rollback checks:

- API direct `/health`: `200`.
- Admin direct `/login`: `200`.
- `127.0.0.1:3002` remained localhost-only.
- `127.0.0.1:8788` remained localhost-only.
- `18080` remained absent.

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

Loop 127 proves that system Nginx can select a temporary `amami-line-crm.invalid` server block after reload, and that the Host header curl methods are valid.

The prior Loop 125 not-reached result is superseded by the stronger access-log evidence in Loop 127. The remaining issue is likely in the existing app candidate placement/content or reload-smoke procedure, not in fundamental port 80 ownership, Host header transport, or Nginx reload reflection.

## Next Loop Candidates

1. Loop 128: candidate placement/listen remediation if probe reached.
2. Loop 130: default_server/catch-all remediation if candidate still loses.
3. Loop 131: ACME selected-method dry-run plan.
4. Loop 132: LINE webhook production URL dry-run checklist.

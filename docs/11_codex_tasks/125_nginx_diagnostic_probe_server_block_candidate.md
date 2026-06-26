# Loop 125: Nginx diagnostic probe server block candidate

## Goal

Diagnose whether system Nginx selects a temporary diagnostic server block for the test Host header `amami-line-crm.invalid` after a real `nginx reload`, without touching the existing Amami reverse proxy candidate or the real domain.

## Scope

- Create a temporary diagnostic-only Nginx server block on the VPS.
- Use only `server_name amami-line-crm.invalid`.
- Expose a single Nginx-native probe endpoint: `/__amami_probe`.
- Add the fixed diagnostic header `X-Amami-Line-Crm-Probe`.
- Temporarily enable the probe with a `sites-enabled` symlink.
- Run `nginx -t`, inspect `nginx -T`, then reload Nginx for localhost Host-header smoke only.
- Remove the probe symlink, delete the probe candidate, run `nginx -t`, and rollback reload.
- Save evidence under the VPS deploy backup directory.
- Update docs, runbook, dev log, production readiness, and static integration tests.

## Out Of Scope

- Real domain use.
- `admin.taiyolabel.site` Host header use.
- Existing `/etc/nginx/sites-available/amami-line-crm.conf` modification.
- `/api/health` proxy remediation.
- Admin/API proxy remediation.
- DNS changes.
- certbot or HTTPS.
- External public smoke.
- Firewall changes.
- LINE webhook changes.
- LINE/OpenAI/Supabase real connection.
- `.env` display or mutation.
- API/Auth/RLS/runtime/migration/UI changes.
- Dependency or lockfile changes.

## Start State

- Local repo: `/Users/sakio/Desktop/PROJECT/amami-line-crm`.
- Branch: `main`.
- Start status: clean.
- Start HEAD: `c52285c docs: diagnose Nginx server selection`.
- VPS active source: `2a9a746940b5f7a707af4c042bb9225d3dea258b`.
- Admin service: `127.0.0.1:3002`.
- API service: `127.0.0.1:8788`.
- App symlink: `/etc/nginx/sites-enabled/amami-line-crm.conf` absent.
- Probe symlink: `/etc/nginx/sites-enabled/amami-line-crm-probe.conf` absent.
- Probe candidate before Loop 125: absent.
- Production readiness: `production_no_go`.

## Loop 124 Handoff

Loop 124 proved that:

- `/etc/nginx/nginx.conf` includes both `conf.d/*.conf` and `sites-enabled/*`.
- The Amami candidate appears in `nginx -T` while a temporary `sites-enabled` symlink exists.
- The candidate contains `amami-line-crm.invalid`, upstreams `127.0.0.1:3002` / `127.0.0.1:8788`, diagnostic header, and `/api/health` mapping.
- Current active config without symlink routes `Host: amami-line-crm.invalid` to the existing active/default behavior:
  - `/ = 200`
  - `/api/health = 404`
  - `/login = 404`
  - diagnostic header absent
- Loop 124 did not run Nginx reload/restart.

Loop 125 intentionally used a probe server block with no upstream proxy so that server selection could be diagnosed separately from the existing candidate proxy mapping.

## Probe Server Block Design

Path:

```txt
/etc/nginx/sites-available/amami-line-crm-probe.conf
```

Temporary symlink:

```txt
/etc/nginx/sites-enabled/amami-line-crm-probe.conf
```

Server name:

```txt
amami-line-crm.invalid
```

Endpoint:

```txt
/__amami_probe
```

Expected diagnostic response:

```txt
204
X-Amami-Line-Crm-Probe: loop125
```

Catch-all expected response when the probe server block is selected:

```txt
404
X-Amami-Line-Crm-Probe: loop125-catchall
```

The probe block used no upstream, no certificate, no HTTPS, no real domain, and no secret.

## Local Baseline

Before VPS work, the following local commands passed:

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

Result:

- Test files: `110 passed | 1 skipped`
- Tests: `706 passed | 4 skipped`
- Build: success

## VPS Preflight

Evidence path:

```txt
/root/deploy-backups/amami-line-crm/loop125-20260626-213832
```

Preflight result:

- Hostname: `vm-227d8253-eb`.
- Active source: `2a9a746940b5f7a707af4c042bb9225d3dea258b`.
- Deploy manifest runtime: `localhost-only review`.
- `sudo nginx -t`: success.
- Direct API `/health`: `200`.
- Direct Admin `/login`: `200`.
- `127.0.0.1:3002`: present.
- `127.0.0.1:8788`: present.
- `18080`: absent.
- Existing app symlink: absent.
- Probe symlink before run: absent.
- Probe candidate before run: absent.

## `nginx -T` Include Result

The temporary probe symlink was created and `nginx -T` contained:

- `/etc/nginx/sites-enabled/amami-line-crm-probe.conf`
- `listen 80`
- `server_name amami-line-crm.invalid`
- `location = /__amami_probe`
- `X-Amami-Line-Crm-Probe`
- `X-Amami-Line-Crm-Server-Name`

`nginx -t` succeeded before reload.

## Reload Smoke Result

This was a localhost-only reload smoke.

Nginx reload result:

```txt
reload=completed
```

Smoke used localhost only:

```txt
Host: amami-line-crm.invalid
```

Real domain was not used:

```txt
real_domain_used=no
admin_taiyolabel_host_used=no
```

Results:

```txt
/__amami_probe = 404
X-Amami-Line-Crm-Probe on /__amami_probe = absent
/ = 200
X-Amami-Line-Crm-Probe on / = absent
/api/health = 404
X-Amami-Line-Crm-Probe on /api/health = absent
```

Evidence summary:

```txt
evidence_dir=/root/deploy-backups/amami-line-crm/loop125-20260626-213832
probe_status=404
probe_header=
root_status=200
root_header=
api_health_status=404
api_health_header=
server_selection=probe_not_reached
```

## Server Selection Judgment

The probe was not reached.

This means that after reload, `Host: amami-line-crm.invalid` did not reach the temporary diagnostic server block even though the probe appeared in `nginx -T` before reload.

The next diagnosis should focus on live Nginx server selection, listen/default/catch-all behavior, and reload-applied config evidence rather than changing the existing candidate proxy mapping.

## Cleanup / Rollback

Cleanup and rollback were completed in the same Loop:

- Probe symlink removed.
- App symlink remained absent.
- Probe candidate deleted from `sites-available` because it was diagnostic-only and did not exist before the Loop.
- `nginx -t` after cleanup: success.
- Rollback reload: completed.
- Direct API `/health` after rollback: `200`.
- Direct Admin `/login` after rollback: `200`.
- `127.0.0.1:3002` and `127.0.0.1:8788` remained localhost-only.
- `18080` remained absent.

Final evidence:

```txt
probe_symlink_after=absent
app_symlink_after=absent
candidate_final_state=deleted
rollback_nginx_t=success
rollback_reload=completed
production_readiness=production_no_go
```

## Safety Boundary

- Real domain: not used.
- `admin.taiyolabel.site` Host header: not used.
- DNS changes: not performed.
- certbot/HTTPS: not performed.
- External public smoke: not performed.
- Firewall changes: not performed.
- LINE/OpenAI/Supabase real connection: not performed.
- `.env`: not displayed or changed.
- API/Auth/RLS/runtime/migration/UI: not changed.
- Production readiness: `production_no_go`.

## Next Cause Hypotheses

1. The active system Nginx reload is not selecting the new `sites-enabled` server block despite `nginx -T` including it before reload.
2. A `default_server` / catch-all server block may be winning for `Host: amami-line-crm.invalid`.
3. The reload-applied config may differ from the pre-reload `nginx -T` evidence or an existing worker/config state is still influencing the result.
4. Listen/server_name behavior should be isolated with stronger server-order and `default_server` diagnostics before any real-domain or proxy remediation.

## Tests

Added:

```txt
tests/integration/nginx-diagnostic-probe-server-block.test.ts
```

The test checks that Loop 125 docs and runbook record:

- The probe host and endpoint.
- `X-Amami-Line-Crm-Probe`.
- Temporary symlink and `nginx -T`.
- Reload smoke and rollback reload.
- Probe-not-reached conclusion.
- Forbidden real-domain, DNS, HTTPS, certbot, external smoke, LINE/OpenAI/Supabase, and secret/private-key boundaries.
- `production_no_go`.

## Next Loop Candidates

1. Loop 127: listen/server_name/default_server diagnosis if probe fails.
2. Loop 126: candidate location/proxy remediation if a later probe proves server selection succeeds.
3. Loop 128: ACME selected-method dry-run plan.
4. Loop 129: LINE webhook production URL dry-run checklist.
5. Loop 130: owner approval record update.

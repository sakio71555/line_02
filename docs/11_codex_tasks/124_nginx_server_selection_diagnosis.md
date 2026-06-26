# Loop 124: Nginx server selection diagnosis

## Goal

Diagnose why Loop 123 returned `404` for `Host: amami-line-crm.invalid` `/api/health` after a corrected candidate reload smoke, without changing active Nginx config and without running reload/restart.

## Scope

- Confirm local repo state and Loop 123 evidence.
- Run local quality gates before VPS diagnostics.
- Inspect the VPS Nginx include tree.
- Temporarily create `/etc/nginx/sites-enabled/amami-line-crm.conf`.
- Run `sudo nginx -t`.
- Inspect `sudo nginx -T` summaries while the temporary symlink exists.
- Remove the temporary symlink and confirm `sudo nginx -t` again.
- Curl current active Nginx on localhost with `Host: amami-line-crm.invalid`.
- Build a server block map and root-cause hypothesis table.
- Record docs, runbook, dev log, production readiness, and static tests.

## Out of Scope

- Nginx active config changes.
- Nginx reload/restart.
- Real domain Host header use.
- `admin.taiyolabel.site` Host header use.
- DNS changes.
- certbot/HTTPS.
- External public smoke.
- Firewall changes or public port additions.
- LINE/OpenAI/Supabase real connections.
- `.env` display or modification.
- API/Auth/RLS/runtime/migration/UI changes.
- Dependency or lockfile changes.

## Start State

```text
local_path=/Users/sakio/Desktop/PROJECT/amami-line-crm
local_branch=main...origin/main
local_start_status=clean
local_head=aa1f88c docs: record corrected Nginx reload smoke
vps_host=root@160.251.174.201
vps_hostname=vm-227d8253-eb
active_path=/var/www/amami-line-crm
active_source=2a9a746940b5f7a707af4c042bb9225d3dea258b
candidate_path=/etc/nginx/sites-available/amami-line-crm.conf
sites_enabled_amami_before=absent
api_listener=127.0.0.1:8788
admin_listener=127.0.0.1:3002
standalone_diagnosis_listener_18080=absent
test_host=amami-line-crm.invalid
approved_review_host=admin.taiyolabel.site
production_readiness=production_no_go
```

## Loop 123 Handoff

Loop 123 proved:

- candidate reload smoke used `Host: amami-line-crm.invalid`.
- temporary symlink was created.
- `nginx -t` passed.
- system Nginx reload was executed in that Loop.
- `/` returned `200`.
- `/api/health` returned `404`.
- `X-Amami-Line-Crm-Proxy` was absent.
- cleanup trap removed the symlink.
- rollback `nginx -t` and rollback reload completed.
- direct API `/health` and Admin `/login` returned `200`.

The next step was server selection diagnosis before changing the candidate.

## Local Baseline

Before VPS work, the local baseline passed:

```text
git diff --check=success
lint=success
typecheck=success
test=109 passed / 1 skipped files, 701 passed / 4 skipped tests
test_integration=109 passed / 1 skipped files, 701 passed / 4 skipped tests
build=success
```

## VPS Preflight

```text
hostname=vm-227d8253-eb
active_source=2a9a746940b5f7a707af4c042bb9225d3dea258b
deploy_method=copy_archive_loop122
runtime=localhost-only review
admin=127.0.0.1:3002
api=127.0.0.1:8788
nginx_t=success
sites_enabled_amami_before=absent
api_direct_health=200
admin_direct_login=200
```

Listeners confirmed:

- Nginx listens on public `80`, `443`, and `8080` for existing sites.
- Amami API is bound to `127.0.0.1:8788`.
- Amami Admin is bound to `127.0.0.1:3002`.
- `127.0.0.1:18080` was absent.

## Nginx Include Tree

`/etc/nginx/nginx.conf` includes:

```text
include /etc/nginx/conf.d/*.conf;
include /etc/nginx/sites-enabled/*;
```

Findings:

```text
sites_enabled_include_count=1
conf_d_include_count=1
sites_available_direct_include_count=0
active_amami_count=0
active_invalid_host_count=0
active_admin_upstream_count=0
active_api_upstream_count=0
listen80_count=7
default_server_count=4
```

Interpretation:

- `sites-enabled/*` is included.
- `conf.d/*.conf` is included.
- `sites-available` is not directly included.
- Current active config does not include the amami candidate because its symlink is absent.

## Temporary Symlink + `nginx -T` Result

Loop 124 temporarily created:

```text
/etc/nginx/sites-enabled/amami-line-crm.conf -> /etc/nginx/sites-available/amami-line-crm.conf
```

No reload/restart was run.

Result while the symlink existed:

```text
temporary_symlink_created=yes
nginx_t_with_symlink=success
candidate_in_temp_nginx_T=yes
temp_amami_count=4
temp_invalid_host_count=1
temp_admin_upstream_count=1
temp_api_upstream_count=2
temp_diagnostic_header_count=1
temp_api_health_location_count=1
```

Important candidate lines appeared in `nginx -T`:

```text
server_name amami-line-crm.invalid;
add_header X-Amami-Line-Crm-Proxy "amami-line-crm" always;
proxy_pass http://127.0.0.1:8788/health;
proxy_pass http://127.0.0.1:8788/api/;
proxy_pass http://127.0.0.1:3002;
```

After inspection:

```text
temporary_symlink_removed=yes
sites_enabled_amami_after=absent
post_cleanup_nginx_t=success
reload_restart=not_run
```

## Server Block Map

### Current Active Config

| Order | Listen | default_server | server_name | Source file | Root/Proxy/Return summary | Notes |
|---:|---|---|---|---|---|---|
| 1 | `80`, `[::]:80` | yes | `_` | `/etc/nginx/sites-enabled/default` | `root /var/www/html`, `try_files $uri $uri/ =404` | Current catch-all/default for unknown HTTP hosts. |
| 2 | `8080` | no | `_` | `/etc/nginx/sites-enabled/ehime-portal` | redirect to `https://ehime-hojokin.jp`, portal static/API routes | Not on port 80. |
| 3 | `443` | no | `app.ajnl.net` | `/etc/nginx/sites-enabled/line-transport` | static root `/var/www/line-transport/apps/web/dist` | HTTPS app site. |
| 4 | `443` | no | `api.ajnl.net` | `/etc/nginx/sites-enabled/line-transport` | proxy to `127.0.0.1:8001` | HTTPS API site. |
| 5 | `80`, `[::]:80` | no | `app.ajnl.net` | `/etc/nginx/sites-enabled/line-transport` | certbot-managed HTTP return/404 | Host-specific, not amami host. |
| 6 | `80`, `[::]:80` | no | `api.ajnl.net` | `/etc/nginx/sites-enabled/line-transport` | certbot-managed HTTP return/404 | Host-specific, not amami host. |

### With Temporary Amami Include

| Order | Listen | default_server | server_name | Source file | Root/Proxy/Return summary | Notes |
|---:|---|---|---|---|---|---|
| 1 | `80`, `[::]:80` | no | `amami-line-crm.invalid` | `/etc/nginx/sites-enabled/amami-line-crm.conf` | `/api/health -> 127.0.0.1:8788/health`, `/api/ -> 127.0.0.1:8788/api/`, `/ -> 127.0.0.1:3002` | Candidate appears before the default block in `nginx -T`. |
| 2 | `80`, `[::]:80` | yes | `_` | `/etc/nginx/sites-enabled/default` | `root /var/www/html`, `try_files $uri $uri/ =404` | Would catch unmatched hosts. |
| 3 | `8080` | no | `_` | `/etc/nginx/sites-enabled/ehime-portal` | redirect/static portal routes | Not on port 80. |
| 4 | `443` | no | `app.ajnl.net` | `/etc/nginx/sites-enabled/line-transport` | static transport app | HTTPS only. |
| 5 | `443` | no | `api.ajnl.net` | `/etc/nginx/sites-enabled/line-transport` | proxy to `127.0.0.1:8001` | HTTPS only. |
| 6 | `80`, `[::]:80` | no | `app.ajnl.net` | `/etc/nginx/sites-enabled/line-transport` | certbot-managed HTTP return/404 | Host-specific. |
| 7 | `80`, `[::]:80` | no | `api.ajnl.net` | `/etc/nginx/sites-enabled/line-transport` | certbot-managed HTTP return/404 | Host-specific. |

## Current Active Curl Result

Current active config was checked without the amami symlink and without reload:

| Request | Headers observed | Result |
|---|---|---:|
| `Host: amami-line-crm.invalid` `/` | `Server: nginx/1.24.0`, `Content-Type: text/html`, no diagnostic header | `200` |
| `Host: amami-line-crm.invalid` `/api/health` | `Server: nginx/1.24.0`, `Content-Type: text/html`, no diagnostic header | `404` |
| `Host: amami-line-crm.invalid` `/login` | `Server: nginx/1.24.0`, `Content-Type: text/html`, no diagnostic header | `404` |

This current active behavior matches the Loop 123 failure shape. Because the symlink is absent now, this is expected to be handled by the default `_` server.

## Root Cause Hypotheses

| ID | Hypothesis | Evidence | Counter Evidence | Likelihood | Next diagnostic action |
|---|---|---|---|---|---|
| A | `sites-enabled` is not included by `nginx.conf` | None. | `nginx.conf` includes `/etc/nginx/sites-enabled/*`; temp symlink appears in `nginx -T`. | Low | No include-path fix needed for `sites-enabled`. |
| B | Symlink was included in `nginx -T` but not active after reload | Loop 123 response shape matched current no-symlink active config; diagnostic header absent. | Loop 123 reported reload completed while symlink existed. | High | In next Loop, capture pre/post reload `nginx -T` summary, master PID, and diagnostic header with the symlink still present. |
| C | Candidate `server_name` did not match Host header | None. | Candidate has `server_name amami-line-crm.invalid;`; curl Host used the same value. | Low | Keep exact Host header in future smoke. |
| D | Another server block captured the request | Current active default `_` block returns the same `/=200`, `/api/health=404`, `/login=404` shape. | With candidate included, exact `server_name` should win if active. | Medium-High | Add a diagnostic-only Nginx response for the invalid host to prove selected server after reload. |
| E | default_server/catch-all returned the 404 | Current active default server has `root /var/www/html` and `try_files ... =404`; current active curl matches. | Candidate should bypass default if active and matching. | Medium-High | Probe candidate server block selection before upstream proxying. |
| F | Candidate file is stale or missing diagnostic header | None. | Temp `nginx -T` shows `X-Amami-Line-Crm-Proxy` and expected proxy mappings. | Low | Optional checksum the candidate against repo template. |
| G | Candidate location mapping differs from repo template | None. | Temp `nginx -T` shows `/api/health -> 127.0.0.1:8788/health`. | Low | Keep mapping unchanged. |
| H | listen address / IPv4 / IPv6 mismatch | None for IPv4 curl. | Candidate listens on `80` and `[::]:80`; curl target is `127.0.0.1`. | Low | Future probe can curl both `127.0.0.1` and `[::1]` only if needed. |
| I | Reload did not apply expected config | Loop 123 looked exactly like current no-symlink active behavior; diagnostic header absent. | Need direct reload-time evidence; Loop 123 recorded reload success. | High | Next reload-capable Loop should record Nginx master PID, config include summary, and smoke before cleanup. |
| J | curl target / Host header method issue | None. | Same curl method reaches current active Nginx and Host value matches candidate. | Low | Keep curl command but add a pure Nginx diagnostic probe. |
| K | Other | Existing Nginx has several unrelated active sites and public listeners. | No direct conflict with exact invalid host found in config summary. | Medium | Inspect service reload behavior and active worker generation in a later read-only/reload-approved Loop. |

## Proposed Fixes Not Applied

### Candidate 1: include path remediation

Only needed if a future check proves `sites-enabled/*` is not active. Loop 124 currently shows `sites-enabled/*` is included. Alternative placement under `conf.d` should not be used unless a later Loop proves include behavior differs at reload time.

### Candidate 2: server name / listen conflict remediation

Candidate `listen 80;` and `server_name amami-line-crm.invalid;` are not conflicting in the static map. Do not change to a real domain until the invalid-host probe passes.

### Candidate 3: diagnostic-only probe server block

Add an invalid-host-only probe such as `location = /__amami_probe` returning a fixed non-secret body/header from Nginx itself. This would prove server block selection before involving the Admin/API upstreams.

Risk: it must remain invalid-host-only and must be removed or disabled before public production enablement.

### Candidate 4: candidate refresh / checksum

Regenerate `/etc/nginx/sites-available/amami-line-crm.conf` from the repo template and record a checksum before the next reload smoke. Loop 124 evidence suggests the candidate content is already current, so this is lower priority than proving live server selection.

## Evidence Path

```text
/root/deploy-backups/amami-line-crm/loop124-20260626-204631
real_domain_used=no
admin_taiyolabel_host_used=no
reload_restart=not_run
temporary_symlink_removed=yes
production_readiness=production_no_go
```

Files saved on VPS:

- `loop124-evidence-summary.txt`
- `nginx-test.txt`
- `listeners.txt`
- `sites-enabled-amami.txt`
- `curl-invalid-root.txt`
- `curl-invalid-api-health.txt`
- `active-nginx-summary.txt`
- `temporary-include-nginx-summary.txt`

No full `nginx -T` dump was saved.

## Safety Boundary

- Nginx reload/restart was not run.
- Temporary symlink was removed.
- Final `sudo nginx -t` passed.
- Real domain was not used.
- `admin.taiyolabel.site` was not used as a Host header.
- DNS changes were not made.
- certbot/HTTPS was not run.
- External smoke was not run.
- Firewall changes were not made.
- LINE/OpenAI/Supabase real connections were not run.
- `.env` values were not displayed or changed.
- API/Auth/RLS/runtime/migration/UI code was not changed.
- Production readiness remains `production_no_go`.

## Remaining Risks

- Loop 124 did not fix the Nginx server selection issue.
- Loop 123's reload behavior is still unexplained.
- DNS owner is unknown.
- DNS rollback owner is unknown.
- Nginx enable approver is unknown.
- Certificate approver is unknown.
- Maintenance window is unknown.
- ACME method is undecided.
- Client-facing final hostname is undecided.
- Real-domain smoke is not done.
- HTTPS is not done.
- External smoke is not done.
- Production secret injection is not done.

## Next Loop Candidates

1. Loop 125: Nginx include path remediation plan.
2. Loop 126: diagnostic probe server block candidate.
3. Loop 127: corrected candidate placement into actual include path.
4. Loop 128: ACME selected-method dry-run plan.
5. Loop 129: LINE webhook production URL dry-run checklist.

# Loop 123: corrected Nginx candidate reload smoke

## Goal

Verify the corrected Nginx candidate with a temporary reload smoke after Loop 122 aligned the active localhost-only review source with latest main.

This Loop used only the dry-run host:

```text
amami-line-crm.invalid
```

The approved review/admin hostname `admin.taiyolabel.site` was not used as a Host header in this Loop.

## Scope

- Confirm the VPS active source and local quality gates.
- Confirm `/etc/nginx/sites-available/amami-line-crm.conf` uses `server_name amami-line-crm.invalid;`.
- Temporarily create `/etc/nginx/sites-enabled/amami-line-crm.conf`.
- Run `sudo nginx -t`.
- Run `sudo systemctl reload nginx`.
- Run localhost Host header smoke with `Host: amami-line-crm.invalid`.
- Remove the temporary symlink.
- Run rollback `sudo nginx -t` and `sudo systemctl reload nginx`.
- Confirm direct localhost API/Admin smoke after rollback.
- Record non-secret evidence in docs and tests.

## Out of Scope

- Real domain Host header smoke.
- DNS changes.
- HTTPS/certbot.
- External public smoke.
- Firewall changes.
- LINE/OpenAI/Supabase real connections.
- `.env` display or modification.
- API/Auth/RLS/runtime/migration changes.
- Dependency or lockfile changes.

## Start State

```text
local_start_status=clean
local_branch=main...origin/main
local_head_before=bf50c85
vps_host=root@160.251.174.201
vps_hostname=vm-227d8253-eb
active_path=/var/www/amami-line-crm
active_source=2a9a746940b5f7a707af4c042bb9225d3dea258b
api_listener=127.0.0.1:8788
admin_listener=127.0.0.1:3002
standalone_diagnosis_listener_18080=absent
sites_enabled_before=absent
production_readiness=production_no_go
```

## Candidate Check

Candidate file:

```text
/etc/nginx/sites-available/amami-line-crm.conf
```

Important non-secret candidate lines:

```text
listen 80;
listen [::]:80;
server_name amami-line-crm.invalid;
add_header X-Amami-Line-Crm-Proxy "amami-line-crm" always;
location = /api/health -> proxy_pass http://127.0.0.1:8788/health;
location /api/ -> proxy_pass http://127.0.0.1:8788/api/;
location / -> proxy_pass http://127.0.0.1:3002;
```

Candidate checks:

```text
invalid_host_count=1
real_domain_count=0
nginx_T_temporary_include=confirmed
```

## VPS Evidence

Evidence path:

```text
/root/deploy-backups/amami-line-crm/loop123-20260626-200424
```

The evidence recorded only non-secret routing and smoke metadata. `.env.staging.example` and `.env.example` file names were visible, but `.env` values were not displayed.

## Temporary Reload Smoke Result

Loop 123 created the temporary symlink and reloaded Nginx:

```text
temporary_symlink=created
sudo_nginx_t_before_reload=success
sudo_systemctl_reload_nginx=completed
host_header=amami-line-crm.invalid
real_domain_used=no
```

Host header smoke through `http://127.0.0.1`:

| target | result |
| --- | ---: |
| `nginx-admin /` | `200` |
| `nginx-admin /login` | `404` |
| `nginx-admin /select-tenant` | `404` |
| `nginx-admin /customers` | `404` |
| `nginx-admin /alerts` | `404` |
| `nginx-admin /permission-denied` | `404` |
| `nginx-admin /session-expired` | `404` |
| `nginx-api /api/health` | `404` |

The `/api/health` smoke was expected to return `200`. It returned `404`.

The `X-Amami-Line-Crm-Proxy` diagnostic header was absent on the `404` response:

```text
diagnostic_header=absent_on_404_response
no_go_reason=api_health_404
```

## Rollback

The cleanup trap removed the temporary symlink and reloaded Nginx back to the non-enabled state:

```text
sites_enabled_after=absent
rollback_cleanup=trap_completed
rollback_nginx_t=success
rollback_reload=completed_by_trap
post_rollback_direct_api_health=200
post_rollback_direct_admin_login=200
external_smoke=not_run
```

The app review services remained localhost-only after rollback:

```text
api_listener=127.0.0.1:8788
admin_listener=127.0.0.1:3002
standalone_diagnosis_listener_18080=absent
```

## Safety Boundary

- `admin.taiyolabel.site` was not used as a Host header.
- DNS was not changed.
- certbot/HTTPS was not run.
- External public smoke was not run.
- LINE/OpenAI/Supabase real connections were not run.
- `.env` values and secrets were not displayed or changed.
- API/Auth/RLS/runtime/migration behavior was not changed.
- Production readiness remains `production_no_go`.

## Remaining Risk

The candidate is parseable and reloadable, and Loop 115 proved the route shape works in standalone localhost-only Nginx. However, the corrected candidate still did not handle the live localhost Host header smoke after system reload. The absent diagnostic header on the `404` response suggests a live server selection or active routing issue remains.

Do not proceed to real domain, DNS, HTTPS/certbot, or external smoke until a follow-up Loop explains and fixes the live server selection behavior.

## Next Loop Candidates

- Loop 124: Nginx server selection diagnosis.
- Loop 125: corrected candidate reload smoke retry after server-selection fix.

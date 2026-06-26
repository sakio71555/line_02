# Nginx Server Selection Diagnosis

## Purpose

Diagnose Nginx server selection and active include behavior before another reload smoke or real-domain enablement.

This runbook is for read-only diagnosis plus temporary `sites-enabled` include inspection. It does not authorize reload/restart.

## Current Judgment

```text
production_no_go
```

## Forbidden Operations

- Nginx active config changes.
- `sudo systemctl reload nginx`.
- `sudo systemctl restart nginx`.
- Real domain Host header use.
- `admin.taiyolabel.site` Host header use.
- DNS changes.
- certbot/HTTPS issuance.
- External public smoke.
- Firewall changes or public port additions.
- `.env` display or modification.
- LINE/OpenAI/Supabase real connections.
- API/Auth/RLS/runtime/migration/UI changes.

## Include Tree Checklist

Read-only commands:

```bash
sudo grep -nE 'include|conf.d|sites-enabled|sites-available' /etc/nginx/nginx.conf
sudo find /etc/nginx -maxdepth 2 -type f | sort
sudo nginx -T 2>/dev/null \
  | grep -E 'configuration file|listen |server_name|default_server|proxy_pass|return |root |try_files|include '
```

Record only a summary:

- whether `/etc/nginx/sites-enabled/*` is included.
- whether `/etc/nginx/conf.d/*.conf` is included.
- whether `sites-available` is directly included.
- whether the amami candidate appears in active config.
- current port 80 `default_server`.
- catch-all `server_name _` blocks.

Do not paste full `nginx -T` output into docs.

## Temporary Symlink + `nginx -T`

Allowed only without reload/restart:

```bash
CANDIDATE="/etc/nginx/sites-available/amami-line-crm.conf"
LINK="/etc/nginx/sites-enabled/amami-line-crm.conf"

cleanup() {
  if [ -L "$LINK" ]; then
    sudo rm -f "$LINK"
  fi
}

trap cleanup EXIT
test -f "$CANDIDATE"
test ! -e "$LINK"
sudo ln -s "$CANDIDATE" "$LINK"
sudo nginx -t
sudo nginx -T 2>/dev/null \
  | grep -E 'amami-line-crm|amami-line-crm.invalid|127\.0\.0\.1:3002|127\.0\.0\.1:8788|X-Amami-Line-Crm-Proxy|location = /api/health|location /api/|location /'
sudo rm -f "$LINK"
trap - EXIT
test ! -e "$LINK"
sudo nginx -t
```

Expected for the candidate:

- `server_name amami-line-crm.invalid;`
- `X-Amami-Line-Crm-Proxy`
- `/api/health -> 127.0.0.1:8788/health`
- `/api/ -> 127.0.0.1:8788/api/`
- `/ -> 127.0.0.1:3002`

## Host Header Curl

Use only localhost and the invalid host:

```bash
curl -sS -H 'Host: amami-line-crm.invalid' -D - -o /dev/null http://127.0.0.1/
curl -sS -H 'Host: amami-line-crm.invalid' -D - -o /dev/null http://127.0.0.1/api/health
curl -sS -H 'Host: amami-line-crm.invalid' -D - -o /dev/null http://127.0.0.1/login
```

Record only:

- HTTP status.
- `Server`.
- `Content-Type`.
- `Location` if present.
- `X-Amami-Line-Crm-Proxy` if present.

Do not record full HTML, cookies, Authorization headers, logs, or secrets.

## Server Block Map

Build a compact table:

```md
| Order | Listen | default_server | server_name | Source file | Root/Proxy/Return summary | Notes |
|---:|---|---|---|---|---|---|
```

Record:

- port 80 default server.
- catch-all server names such as `_`.
- host-specific server names.
- source file for each block.
- whether the candidate appears before or after default server when temporarily included.

## Loop 124 Findings

### Include Tree

```text
sites_enabled_include_count=1
conf_d_include_count=1
sites_available_direct_include_count=0
active_amami_count=0
active_invalid_host_count=0
active_admin_upstream_count=0
active_api_upstream_count=0
```

### Temporary Include

```text
temporary_symlink_created=yes
nginx_t_with_symlink=success
candidate_in_temp_nginx_T=yes
temp_invalid_host_count=1
temp_admin_upstream_count=1
temp_api_upstream_count=2
temp_diagnostic_header_count=1
temp_api_health_location_count=1
temporary_symlink_removed=yes
post_cleanup_nginx_t=success
reload_restart=not_run
```

### Current Active Curl

Current active config without the amami symlink:

```text
Host: amami-line-crm.invalid / = 200
Host: amami-line-crm.invalid /api/health = 404
Host: amami-line-crm.invalid /login = 404
X-Amami-Line-Crm-Proxy=absent
```

This matches Loop 123's failure shape. With the symlink absent, the likely current active handler is the default `_` server from `/etc/nginx/sites-enabled/default`.

## Root Cause Classification

| ID | Hypothesis | Likelihood | Loop 124 result |
|---|---|---|---|
| A | `sites-enabled` not included | Low | `nginx.conf` includes `sites-enabled/*`; temp candidate appears in `nginx -T`. |
| B | Symlink included on disk but not active after reload | High | Loop 123 looked like current no-symlink active behavior. |
| C | Candidate `server_name` mismatch | Low | Host header and candidate both use `amami-line-crm.invalid`. |
| D | Another server block captured the request | Medium-High | Current active default server shape matches `/=200`, `/api/health=404`. |
| E | default_server/catch-all returned 404 | Medium-High | Default `_` block uses `try_files ... =404`. |
| F | Candidate stale or missing diagnostic header | Low | Temp `nginx -T` shows diagnostic header. |
| G | Candidate mapping differs from repo template | Low | Temp `nginx -T` shows expected mappings. |
| H | listen address mismatch | Low | Candidate listens on `80` and `[::]:80`; curl uses `127.0.0.1`. |
| I | Reload did not apply expected config | High | Loop 123 response matched current no-symlink active config. |
| J | Curl target / Host method issue | Low | Host header value is exact and current Nginx responds. |
| K | Other | Medium | Existing Nginx hosts remain unrelated but active. |

## Next Remediation Gates

### Option 1: include path remediation plan

Only if a later Loop proves reload-time include behavior differs from `nginx -T`. Current static evidence does not require moving to `conf.d`.

### Option 2: diagnostic probe server block candidate

Add an invalid-host-only Nginx probe such as:

```text
location = /__amami_probe
```

returning a fixed non-secret status/header from Nginx itself. This proves server block selection before upstream proxying.

### Option 3: reload smoke retry with stronger evidence

In a reload-approved Loop, record:

- pre-reload `nginx -T` summary with candidate included.
- Nginx master PID and worker generation before/after reload.
- smoke while the symlink is still present.
- diagnostic header for both `/__amami_probe` and `/api/health`.

### Option 4: candidate checksum refresh

Regenerate candidate from the repo template and record checksum. Loop 124 suggests this is lower priority than server-selection proof.

## Loop 124 Evidence Path

```text
/root/deploy-backups/amami-line-crm/loop124-20260626-204631
real_domain_used=no
admin_taiyolabel_host_used=no
reload_restart=not_run
temporary_symlink_removed=yes
production_readiness=production_no_go
```

Saved evidence is non-secret and summarized. No full `nginx -T` dump was saved.

## Production Readiness

```text
production_no_go
```

Reasons:

- Nginx server selection root cause is not fixed.
- DNS owner and rollback owner are unknown.
- Nginx enable approver is unknown.
- Certificate approver is unknown.
- Maintenance window is unknown.
- ACME method is undecided.
- client-facing final hostname is undecided.
- real-domain smoke is not done.
- HTTPS is not done.
- external smoke is not done.
- production secret injection is not done.

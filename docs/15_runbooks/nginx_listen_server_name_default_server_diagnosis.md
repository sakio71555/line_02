# Nginx Listen / Server Name / Default Server Diagnosis Runbook

## Purpose

Diagnose whether system Nginx reload, listener ownership, `server_name` matching, and `default_server` behavior are working before changing the Amami reverse proxy candidate.

This runbook uses a temporary diagnostic server block with a dedicated `access_log` and `error_log`. It is not a public enablement runbook.

## Forbidden Operations

- Do not use a real domain.
- Do not use `admin.taiyolabel.site` as a Host header.
- Do not modify `/etc/nginx/sites-available/amami-line-crm.conf`.
- Do not fix `/api/health` proxy mapping in this runbook.
- Do not change DNS.
- Do not run certbot.
- Do not enable HTTPS.
- Do not run external public smoke.
- Do not change firewall rules.
- Do not connect to LINE, OpenAI, or Supabase.
- Do not display or modify `.env`.
- Do not change API/Auth/RLS/runtime/migration/UI code.
- Keep production readiness as `production_no_go`.

## Preflight

Check service, PID, listener, symlink, and app health:

```bash
hostname
date -Is
cd /var/www/amami-line-crm
sed -n '1,20p' .deploy-source
sed -n '1,120p' .deploy-manifest.txt
sudo nginx -t
systemctl is-active nginx
systemctl show nginx -p MainPID -p ActiveState -p SubState -p ExecReload
cat /run/nginx.pid
ps -eo pid,ppid,user,lstart,cmd | grep -E 'nginx: master|nginx: worker'
ss -ltnp | grep -E ':80|:443|:3002|:8788|:18080' || true
ls -la /etc/nginx/sites-enabled/amami-line-crm.conf || true
ls -la /etc/nginx/sites-enabled/amami-line-crm-probe.conf || true
curl --noproxy '*' -sS -o /dev/null -w "api-direct /health %{http_code}\n" http://127.0.0.1:8788/health
curl --noproxy '*' -sS -o /dev/null -w "admin-direct /login %{http_code}\n" http://127.0.0.1:3002/login
```

No-Go if:

- Nginx is inactive.
- MainPID is missing.
- port 80 is not owned by Nginx.
- direct API/Admin smoke fails.
- app symlink or probe symlink already exists.
- unexpected public app port appears.
- `nginx -t` fails.

## Active Config Summary

Use summarized `nginx -T` output only:

```bash
sudo nginx -T 2>/dev/null \
  | grep -E 'configuration file|listen |server_name|default_server|root |return |try_files|proxy_pass|access_log|error_log' \
  || true
```

Do not paste full `nginx -T` output into docs.

Loop 127 active summary:

```txt
active_amami_count=0
active_invalid_host_count=0
active_default_server_count=4
active_listen80_count=5
```

The active default server was the Ubuntu default site:

- `listen 80 default_server;`
- `listen [::]:80 default_server;`
- `server_name _;`
- `root /var/www/html;`
- `try_files $uri $uri/ =404;`

## Current Active Curl Variants

Use `--noproxy '*'` and avoid saving response bodies:

```bash
HOST="amami-line-crm.invalid"

curl --noproxy '*' --http1.1 -H "Host: ${HOST}" -D - -o /dev/null \
  -w "current-h1 127.0.0.1 /__amami_probe %{http_code}\n" \
  "http://127.0.0.1/__amami_probe"

curl --noproxy '*' --http1.1 -H "Host: ${HOST}" -D - -o /dev/null \
  -w "current-h1 127.0.0.1 /api/health %{http_code}\n" \
  "http://127.0.0.1/api/health"

curl --noproxy '*' --http1.0 -H "Host: ${HOST}" -D - -o /dev/null \
  -w "current-h10 127.0.0.1 /__amami_probe %{http_code}\n" \
  "http://127.0.0.1/__amami_probe"

curl --noproxy '*' --http1.1 --resolve "${HOST}:80:127.0.0.1" -D - -o /dev/null \
  -w "current-resolve ${HOST} /__amami_probe %{http_code}\n" \
  "http://${HOST}/__amami_probe"

curl --noproxy '*' --http1.1 --connect-to "${HOST}:80:127.0.0.1:80" -D - -o /dev/null \
  -w "current-connect-to ${HOST} /__amami_probe %{http_code}\n" \
  "http://${HOST}/__amami_probe"
```

Loop 127 current active result:

```txt
current_h1_probe_status=404
current_h1_api_health_status=404
current_h10_probe_status=404
current_resolve_probe_status=404
current_connect_to_probe_status=404
```

## Probe With Dedicated Logs

Create a temporary diagnostic candidate:

```nginx
server {
    listen 80;
    server_name amami-line-crm.invalid;

    access_log /root/deploy-backups/amami-line-crm/loop127-<timestamp>/probe-access.log combined;
    error_log /root/deploy-backups/amami-line-crm/loop127-<timestamp>/probe-error.log notice;

    location = /__amami_probe {
        add_header X-Amami-Line-Crm-Probe "loop127" always;
        add_header X-Amami-Line-Crm-Server-Name "amami-line-crm.invalid" always;
        return 204;
    }

    location / {
        add_header X-Amami-Line-Crm-Probe "loop127-catchall" always;
        return 404;
    }
}
```

Enable only as a temporary symlink:

```bash
sudo ln -s /etc/nginx/sites-available/amami-line-crm-probe.conf /etc/nginx/sites-enabled/amami-line-crm-probe.conf
sudo nginx -t
sudo nginx -T 2>/dev/null \
  | grep -E 'amami-line-crm-probe|amami-line-crm.invalid|__amami_probe|X-Amami-Line-Crm-Probe|probe-access|probe-error|listen 80|server_name' \
  || true
```

## Reload Reflection Diagnostics

Before and after reload, record a summary:

```bash
systemctl show nginx -p MainPID -p ActiveState -p SubState -p ExecReload
cat /run/nginx.pid
ps -eo pid,ppid,user,lstart,cmd | grep -E 'nginx: master|nginx: worker'
RELOAD_MARK="$(date -Is)"
sudo systemctl reload nginx
sleep 1
systemctl show nginx -p MainPID -p ActiveState -p SubState -p ExecReload
journalctl -u nginx --since "${RELOAD_MARK}" --no-pager -n 60
```

Loop 127 reload reflection:

```txt
after_reload_service_status=active
after_reload_main_pid=426936
journal_error_count_since_reload=0
```

Worker PIDs changed, which supports that reload applied.

## Probe Curl Variants

After reload:

```bash
HOST="amami-line-crm.invalid"

curl --noproxy '*' --http1.1 -H "Host: ${HOST}" -D - -o /dev/null \
  -w "probe-h1 127.0.0.1 /__amami_probe %{http_code}\n" \
  "http://127.0.0.1/__amami_probe"

curl --noproxy '*' --http1.1 --resolve "${HOST}:80:127.0.0.1" -D - -o /dev/null \
  -w "probe-resolve ${HOST} /__amami_probe %{http_code}\n" \
  "http://${HOST}/__amami_probe"

curl --noproxy '*' --http1.1 --connect-to "${HOST}:80:127.0.0.1:80" -D - -o /dev/null \
  -w "probe-connect-to ${HOST} /__amami_probe %{http_code}\n" \
  "http://${HOST}/__amami_probe"
```

Loop 127 result:

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

## Probe Access Log

Access log result:

```txt
probe_access_log_lines=4
probe_error_log_lines=0
result=probe_reached
```

The access log proves that the requests entered the diagnostic server block.

## Diagnosis Matrix

| Hypothesis | Result | Evidence | Next action |
|---|---|---|---|
| Port 80 is not Nginx | fail | `port80_process=nginx` | No port remediation |
| Reload did not apply | fail | reload active, worker PIDs changed, probe reached | No reload remediation yet |
| Probe not included | fail | `nginx_T_probe_present=yes` and access log lines exist | No include remediation |
| Host header not sent | fail | all curl variants reached probe | No curl remediation |
| IPv4/IPv6 listener mismatch | fail | IPv4 localhost curl reached probe | No listener mismatch remediation |
| default_server captures request | fail after probe enabled | named probe won after reload | Re-test existing candidate |
| duplicate server_name conflict | unknown | no active duplicate before probe; probe worked | Re-check during candidate remediation |
| curl proxy/intercept issue | fail | `--noproxy '*'` variants matched | No curl remediation |

## Cleanup / Rollback

Always cleanup and rollback:

```bash
sudo rm -f /etc/nginx/sites-enabled/amami-line-crm-probe.conf
test ! -e /etc/nginx/sites-enabled/amami-line-crm-probe.conf
sudo nginx -t
sudo systemctl reload nginx
sudo rm -f /etc/nginx/sites-available/amami-line-crm-probe.conf
sudo nginx -t
```

Loop 127 final state:

```txt
probe_symlink_after=absent
app_symlink_after=absent
candidate_final_state=deleted
rollback_nginx_t=success
rollback_reload=completed
production_readiness=production_no_go
```

## Evidence Template

Evidence path:

```txt
/root/deploy-backups/amami-line-crm/loop127-20260626-224235
```

Important evidence files:

- `loop127-evidence-summary.txt`
- `preflight.txt`
- `active-config-summary.txt`
- `current-active-curl-summary.txt`
- `probe-nginx-T-summary.txt`
- `before-reload.txt`
- `after-reload.txt`
- `probe-curl-after-reload-summary.txt`
- `probe-access.log`
- `probe-error.log`
- `post-rollback.txt`
- `post-candidate-delete.txt`

## Next Remediation Gate

Because `result=probe_reached`, the next Loop may inspect candidate placement/listen settings or re-run a corrected app candidate with dedicated access logs.

Do not proceed to real domain, DNS, HTTPS, certbot, or external smoke until the `.invalid` candidate path proves stable and owner approvals are complete.

## Loop 128 App Candidate Follow-up

Loop 128 re-tested the existing app candidate after Loop 127 proved that named `.invalid` server blocks can win selection after reload.

Result:

```txt
evidence_dir=/root/deploy-backups/amami-line-crm/loop128-20260626-235834
normalized_matches_repo=true
candidate_change=none_candidate_already_matched_repo_template_except_server_name
nginx_t_with_symlink=success
nginx_T_candidate_present=yes
nginx_T_api_health_mapping_present=yes
reload=completed
app_root_status=200
app_login_status=200
app_select_tenant_status=200
app_customers_status=200
app_alerts_status=200
app_api_health_status=200
app_api_health_proxy_header=amami-line-crm
invalid_host_candidate_smoke=success
app_symlink_after=absent
rollback_nginx_t=success
rollback_reload=completed
production_readiness=production_no_go
```

Interpretation: the app candidate placement/listen/proxy shape works for `Host: amami-line-crm.invalid` after a controlled temporary include and reload. This does not approve real-domain enablement; owner approvals, ACME/HTTPS planning, external smoke, and production secret injection remain separate gates.

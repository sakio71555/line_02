# Corrected App Nginx Candidate Proxy Remediation Runbook

## Purpose

Compare the repo reverse proxy template with the VPS app candidate, then run a rollbackable invalid-host reload smoke for the existing app candidate.

This runbook is not a real-domain enablement runbook.

## Forbidden Operations

- Do not use a real domain.
- Do not use `admin.taiyolabel.site` as a Host header.
- Do not change DNS.
- Do not run certbot.
- Do not enable HTTPS.
- Do not run external public smoke.
- Do not change firewall rules.
- Do not connect to LINE, OpenAI, or Supabase.
- Do not display or modify `.env`.
- Do not change API/Auth/RLS/runtime/migration/UI code.
- Keep production readiness as `production_no_go`.

## Repo Template / VPS Candidate Comparison

Repo template:

```txt
deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example
```

Expected repo template shape:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _CHANGE_ME_;

    client_max_body_size 10m;

    # Temporary diagnostic marker for invalid-host dry-runs.
    # Remove or explicitly approve this header before public production enablement.
    add_header X-Amami-Line-Crm-Proxy "amami-line-crm" always;

    location = /api/health {
        proxy_pass http://127.0.0.1:8788/health;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8788/api/;
    }

    location / {
        proxy_pass http://127.0.0.1:3002;
    }
}
```

Loop 128 comparison:

```txt
normalized_matches_repo=true
diff=server_name _CHANGE_ME_ -> server_name amami-line-crm.invalid
candidate_change=none_candidate_already_matched_repo_template_except_server_name
```

## Proxy Mapping Notes

- `/api/health` must proxy to `http://127.0.0.1:8788/health`.
- `/api/` currently preserves the `/api/` prefix with `proxy_pass http://127.0.0.1:8788/api/;`.
- `/` proxies to Admin at `http://127.0.0.1:3002`.
- `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-Port` must be forwarded.
- WebSocket upgrade headers are present for future compatibility.
- The `X-Amami-Line-Crm-Proxy` header is a diagnostic marker and must be removed or explicitly approved before public production enablement.

## Backup

Before reload smoke:

```bash
BACKUP_ROOT="/root/deploy-backups/amami-line-crm"
STAMP="$(date +%Y%m%d-%H%M%S)"
EVIDENCE_DIR="${BACKUP_ROOT}/loop128-${STAMP}"
mkdir -p "$EVIDENCE_DIR"

CANDIDATE="/etc/nginx/sites-available/amami-line-crm.conf"
sudo cp -a "$CANDIDATE" "${EVIDENCE_DIR}/amami-line-crm.conf.before"
sudo nginx -t > "${EVIDENCE_DIR}/nginx-test-before.txt" 2>&1
```

Loop 128 evidence:

```txt
evidence_dir=/root/deploy-backups/amami-line-crm/loop128-20260626-235834
candidate_backup_path=/root/deploy-backups/amami-line-crm/loop128-20260626-235834/amami-line-crm.conf.before
candidate_after_path=/root/deploy-backups/amami-line-crm/loop128-20260626-235834/amami-line-crm.conf.after
```

## Invalid Host Reload Smoke

Use only:

```txt
Host: amami-line-crm.invalid
```

Workflow:

```bash
CANDIDATE="/etc/nginx/sites-available/amami-line-crm.conf"
LINK="/etc/nginx/sites-enabled/amami-line-crm.conf"

test -f "$CANDIDATE"
test ! -e "$LINK"

sudo ln -s "$CANDIDATE" "$LINK"
sudo nginx -t
sudo nginx -T 2>/dev/null | grep -E 'amami-line-crm.invalid|/api/health|X-Amami-Line-Crm-Proxy|127\.0\.0\.1:3002|127\.0\.0\.1:8788|proxy_pass|server_name'
sudo systemctl reload nginx
```

Smoke:

```bash
HOST="amami-line-crm.invalid"
curl --noproxy '*' --http1.1 -H "Host: ${HOST}" -D - -o /dev/null http://127.0.0.1/api/health
curl --noproxy '*' --http1.1 -H "Host: ${HOST}" -D - -o /dev/null http://127.0.0.1/login
curl --noproxy '*' --http1.1 -H "Host: ${HOST}" -D - -o /dev/null http://127.0.0.1/customers
curl --noproxy '*' --http1.1 -H "Host: ${HOST}" -D - -o /dev/null http://127.0.0.1/alerts
```

Loop 128 result:

```txt
app_root_status=200
app_login_status=200
app_select_tenant_status=200
app_customers_status=200
app_alerts_status=200
app_api_health_status=200
app_api_health_proxy_header=amami-line-crm
invalid_host_candidate_smoke=success
```

## Rollback

Always remove the temporary symlink and reload back to the previous active include tree:

```bash
sudo rm -f /etc/nginx/sites-enabled/amami-line-crm.conf
test ! -e /etc/nginx/sites-enabled/amami-line-crm.conf
sudo nginx -t
sudo systemctl reload nginx
```

Loop 128 rollback:

```txt
app_symlink_after=absent
rollback_nginx_t=success
rollback_reload=completed
api-direct /health 200
admin-direct /login 200
3002_8788=localhost_only
18080=absent
```

## Evidence Template

Save:

- `loop128-evidence-summary.txt`
- `amami-line-crm.conf.before`
- `amami-line-crm.conf.after`
- `candidate-grep-before.txt`
- `nginx-test-before.txt`
- `nginx-test-with-symlink.txt`
- `nginx-T-app-candidate-summary.txt`
- `reload-smoke-summary.txt`
- `nginx-test-after-symlink-remove.txt`
- `rollback-reload-explicit.txt`
- `app-symlink-after.txt`
- `listeners-after.txt`
- `api-health-after.txt`
- `admin-login-after.txt`

Do not save response bodies, cookies, `.env` values, tokens, or full unrelated `nginx -T` output.

## Production Readiness

Loop 128 keeps:

```txt
production_no_go
```

Reasons:

- real domain smoke is not done.
- DNS owner is unknown.
- DNS rollback owner is unknown.
- Nginx enable approver is unknown.
- Certificate approver is unknown.
- Maintenance window is unknown.
- ACME method is undecided.
- client-facing final hostname is undecided.
- HTTPS is not done.
- external smoke is not done.
- production secret injection is not done.

## Next Gate

Because `invalid_host_candidate_smoke=success`, the next Loop can move to an ACME selected-method dry-run plan or owner approval update. Do not jump directly to public enablement.

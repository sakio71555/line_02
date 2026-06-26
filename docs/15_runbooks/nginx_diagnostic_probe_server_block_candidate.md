# Nginx Diagnostic Probe Server Block Candidate Runbook

## Purpose

Use a temporary diagnostic-only Nginx server block to verify whether `Host: amami-line-crm.invalid` reaches a specific server block after `sudo systemctl reload nginx`.

This runbook isolates server selection from upstream proxy behavior. It must not be used for public enablement.

## Safety Boundary

- Use only `amami-line-crm.invalid` as the test Host header.
- Do not use the real domain.
- Do not use `admin.taiyolabel.site` as a Host header.
- Do not modify the existing Amami candidate `/etc/nginx/sites-available/amami-line-crm.conf`.
- Do not change DNS.
- Do not run certbot.
- Do not enable HTTPS.
- Do not perform external public smoke.
- Do not change firewall rules.
- Do not connect to LINE, OpenAI, or Supabase.
- Do not display or modify `.env`.
- Keep production readiness as `production_no_go`.

## Probe Candidate

Candidate path:

```txt
/etc/nginx/sites-available/amami-line-crm-probe.conf
```

Temporary symlink:

```txt
/etc/nginx/sites-enabled/amami-line-crm-probe.conf
```

Probe server block:

```nginx
server {
    listen 80;
    server_name amami-line-crm.invalid;

    location = /__amami_probe {
        add_header X-Amami-Line-Crm-Probe "loop125" always;
        add_header X-Amami-Line-Crm-Server-Name "amami-line-crm.invalid" always;
        return 204;
    }

    location / {
        add_header X-Amami-Line-Crm-Probe "loop125-catchall" always;
        return 404;
    }
}
```

The probe candidate uses no upstream proxy. That is intentional.

## Preflight

Before creating the probe candidate:

```bash
hostname
date -Is
cd /var/www/amami-line-crm
pwd
sed -n '1,20p' .deploy-source
sed -n '1,120p' .deploy-manifest.txt
sudo nginx -t
ss -ltnp | grep -E ':80|:443|:3002|:8788|:18080' || true
ls -la /etc/nginx/sites-enabled/amami-line-crm.conf || true
ls -la /etc/nginx/sites-enabled/amami-line-crm-probe.conf || true
curl -sS -o /dev/null -w "api-direct /health %{http_code}\n" http://127.0.0.1:8788/health
curl -sS -o /dev/null -w "admin-direct /login %{http_code}\n" http://127.0.0.1:3002/login
```

No-Go if:

- `nginx -t` fails.
- Direct API `/health` is not `200`.
- Direct Admin `/login` is not `200`.
- The normal app symlink already exists.
- The probe symlink already exists.
- `18080` is present unexpectedly.
- `3002` or `8788` is not localhost-only.

## Temporary Symlink And `nginx -T`

```bash
sudo ln -s /etc/nginx/sites-available/amami-line-crm-probe.conf /etc/nginx/sites-enabled/amami-line-crm-probe.conf
sudo nginx -t
sudo nginx -T 2>/dev/null \
  | grep -E 'amami-line-crm-probe|amami-line-crm.invalid|__amami_probe|X-Amami-Line-Crm-Probe|listen 80|server_name' \
  || true
```

Expected evidence:

- `amami-line-crm-probe.conf`.
- `amami-line-crm.invalid`.
- `/__amami_probe`.
- `X-Amami-Line-Crm-Probe`.
- `nginx -t` success.

Do not reload until this check passes.

## Reload Smoke

This procedure is a localhost-only reload smoke.

```bash
HOST="amami-line-crm.invalid"

sudo systemctl reload nginx

curl -sS -H "Host: ${HOST}" -D - -o /dev/null \
  -w "probe /__amami_probe %{http_code}\n" \
  "http://127.0.0.1/__amami_probe"

curl -sS -H "Host: ${HOST}" -D - -o /dev/null \
  -w "probe / %{http_code}\n" \
  "http://127.0.0.1/"

curl -sS -H "Host: ${HOST}" -D - -o /dev/null \
  -w "probe /api/health %{http_code}\n" \
  "http://127.0.0.1/api/health"
```

Expected if the server block is selected:

```txt
/__amami_probe = 204
X-Amami-Line-Crm-Probe: loop125
/ = 404
X-Amami-Line-Crm-Probe: loop125-catchall
/api/health = 404
X-Amami-Line-Crm-Probe: loop125-catchall
```

## Loop 125 Result

Actual result:

```txt
evidence_dir=/root/deploy-backups/amami-line-crm/loop125-20260626-213832
/__amami_probe = 404
X-Amami-Line-Crm-Probe on /__amami_probe = absent
/ = 200
X-Amami-Line-Crm-Probe on / = absent
/api/health = 404
X-Amami-Line-Crm-Probe on /api/health = absent
server_selection=probe_not_reached
```

Diagnosis:

The probe server block did not receive the request after reload. The next investigation should focus on listen/server_name/default_server behavior or reload-applied config state, not on `/api/health` proxy mapping yet.

## Cleanup And Rollback Reload

Always remove the temporary symlink and rollback reload:

```bash
sudo rm -f /etc/nginx/sites-enabled/amami-line-crm-probe.conf
test ! -e /etc/nginx/sites-enabled/amami-line-crm-probe.conf
sudo nginx -t
sudo systemctl reload nginx
```

The diagnostic candidate may be deleted after evidence is saved:

```bash
sudo rm -f /etc/nginx/sites-available/amami-line-crm-probe.conf
sudo nginx -t
```

Loop 125 final state:

```txt
probe_symlink_after=absent
app_symlink_after=absent
candidate_final_state=deleted
rollback_nginx_t=success
rollback_reload=completed
production_readiness=production_no_go
```

## Evidence Template

Save evidence under:

```txt
/root/deploy-backups/amami-line-crm/loop125-<timestamp>
```

Minimum files:

- `loop125-evidence-summary.txt`
- `preflight.txt`
- `probe-nginx-T-summary.txt`
- `probe-status.txt`
- `probe-response-headers.txt`
- `root-status.txt`
- `root-response-headers.txt`
- `api-health-status.txt`
- `api-health-response-headers.txt`
- `post-rollback.txt`
- `nginx-test-after.txt`
- `listeners-after.txt`
- `probe-symlink-after.txt`
- `app-symlink-after.txt`
- `api-health-after.txt`
- `admin-login-after.txt`

Loop 125 evidence path:

```txt
/root/deploy-backups/amami-line-crm/loop125-20260626-213832
```

## Forbidden Operations

- Real domain Host header.
- `admin.taiyolabel.site` Host header.
- DNS mutation.
- certbot/HTTPS.
- External public smoke.
- Firewall mutation.
- LINE/OpenAI/Supabase real connection.
- `.env` display or mutation.
- API/Auth/RLS/runtime/migration/UI changes.

## Result Interpretation

If `/__amami_probe` returns `204` with `X-Amami-Line-Crm-Probe: loop125`:

- Server selection is working.
- The next Loop should remediate the existing candidate location/proxy mapping.

If `/__amami_probe` does not return `204` or the probe header is absent:

- Server selection is not proven.
- The next Loop should diagnose listen/server_name/default_server/reload-applied config behavior.

Loop 125 fell into the second case.

# Nginx Sites-enabled Include Dry-run Final Gate

## Purpose

This runbook validates that the `amami-line-crm` reverse proxy candidate can be included in the Nginx active include tree without publishing the app.

It temporarily creates a `sites-enabled` symlink, runs `sudo nginx -t`, summarizes the included app routing, removes the symlink, and confirms `sudo nginx -t` still passes.

It does not reload or restart Nginx.

## Current Judgment

```text
production_no_go
```

## Loop 114 Follow-up

Loop 114 did run an explicitly approved temporary enable + `sudo systemctl reload nginx` dry-run with `server_name amami-line-crm.invalid;`.

Result:

- temporary symlink was created and `sudo nginx -t` passed.
- Nginx reload was executed.
- Host header smoke returned `200` for `/`, but `404` for `/api/health`.
- because `/api/health` did not return `200`, the result is No-Go.
- the temporary symlink was removed.
- post-remove `sudo nginx -t` passed.
- rollback Nginx reload was executed.
- `/etc/nginx/sites-enabled/amami-line-crm.conf` remains absent.
- direct API `/health` and Admin `/login` remained `200` after rollback.
- production readiness remains `production_no_go`.

## Current Assumptions

- VPS host: `root@160.251.174.201`
- VPS release path: `/var/www/amami-line-crm`
- VPS deployed source: `176cb34fc6059ecabfb9826daacaabc2a437bebe`
- Candidate config: `/etc/nginx/sites-available/amami-line-crm.conf`
- Temporary symlink: `/etc/nginx/sites-enabled/amami-line-crm.conf`
- Candidate server name: `amami-line-crm.invalid`
- Admin upstream: `127.0.0.1:3002`
- API upstream: `127.0.0.1:8788`

## Never Do In This Gate

- Do not run `sudo systemctl reload nginx`.
- Do not run `sudo systemctl restart nginx`.
- Do not run `sudo service nginx reload`.
- Do not run `sudo service nginx restart`.
- Do not run certbot.
- Do not change DNS.
- Do not change firewall rules or public ports.
- Do not display `.env` values, tokens, Authorization headers, LINE identifiers, or production logs.
- Do not leave `/etc/nginx/sites-enabled/amami-line-crm.conf` in place.

## Local Preconditions

Run from:

```text
/Users/sakio/Desktop/PROJECT/amami-line-crm
```

Required local checks:

```bash
git status --short
git diff --check
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
```

Do not proceed to VPS if any command fails.

## VPS Read-only Precheck

Use summary-only commands. Do not print env files.

```bash
hostname
whoami
test -d /var/www/amami-line-crm && echo release_dir_present
test -f /var/www/amami-line-crm/DEPLOYED_COMMIT && sed -n '1p' /var/www/amami-line-crm/DEPLOYED_COMMIT
systemctl is-active nginx || true
systemctl is-active amami-line-crm-api.service || true
systemctl is-active amami-line-crm-admin.service || true
test -f /etc/nginx/sites-available/amami-line-crm.conf && echo candidate_present
test -e /etc/nginx/sites-enabled/amami-line-crm.conf && echo enabled_present || echo enabled_absent
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8788/health
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3002/login
ss -ltnp | grep -E ':(3002|8788|80|443)\b' || true
sudo nginx -T 2>/dev/null | grep -E 'server_name|proxy_pass|listen|amami|line|crm|3002|8788' || true
```

Go conditions:

- candidate file exists
- temporary symlink path is absent
- API/Admin services are active
- `/health` returns `200`
- Admin `/login` returns `200`
- `3002` and `8788` are localhost-only
- no secret values are needed to continue

## Temporary Include Dry-run

Run on the VPS:

```bash
set -euo pipefail

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

sudo nginx -T 2>/dev/null | grep -E "amami-line-crm|3002|8788|amami-line-crm.invalid" || true

cleanup
trap - EXIT

test ! -e "$LINK"

sudo nginx -t
```

Required observations:

- temporary symlink is created
- `sudo nginx -t` passes while the candidate is included
- `sudo nginx -T` summary shows `amami-line-crm.invalid`, `127.0.0.1:3002`, and `127.0.0.1:8788`
- temporary symlink is removed
- post-cleanup `sudo nginx -t` passes

## Post-check

Run on the VPS:

```bash
test -e /etc/nginx/sites-enabled/amami-line-crm.conf && echo enabled_present || echo enabled_absent
test -e /etc/nginx/sites-enabled/amami-line-crm && echo enabled_plain_present || echo enabled_plain_absent
sudo nginx -t
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8788/health
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3002/login
ss -ltnp | grep -E ':(3002|8788|80|443)\b' || true
systemctl is-active nginx || true
systemctl is-active amami-line-crm-api.service || true
systemctl is-active amami-line-crm-admin.service || true
```

Expected:

- `enabled_absent`
- `enabled_plain_absent`
- `sudo nginx -t` passes
- API `/health` returns `200`
- Admin `/login` returns `200`
- API/Admin remain localhost-only

## Loop 113 Result

- local gates passed before VPS work
- candidate file was present
- temporary symlink was absent before dry-run
- temporary symlink was created
- `sudo nginx -t` passed while included
- include summary showed:
  - `/etc/nginx/sites-enabled/amami-line-crm.conf`
  - `server_name amami-line-crm.invalid;`
  - `proxy_pass http://127.0.0.1:8788/health;`
  - `proxy_pass http://127.0.0.1:8788/api/;`
  - `proxy_pass http://127.0.0.1:3002;`
- temporary symlink was removed
- post-cleanup `sudo nginx -t` passed
- API `/health` returned `200`
- Admin `/login` returned `200`
- no Nginx reload/restart was run
- no certbot, HTTPS, DNS, firewall, or public exposure change was made
- no LINE/OpenAI/Supabase real connection was made
- production readiness remains `production_no_go`

## Rollback

Normal Loop 113 cleanup removes the symlink before finishing.

If a leftover symlink is found:

```bash
sudo rm -f /etc/nginx/sites-enabled/amami-line-crm.conf
sudo nginx -t
```

No reload is needed for cleanup if Nginx was not reloaded after symlink creation.

## Next Gate

Only a future explicit approval Loop may:

- replace `.invalid` with an approved real host
- keep the symlink in `sites-enabled`
- run `sudo nginx -t`
- run a controlled Nginx reload
- perform local Host-header smoke
- proceed to DNS/HTTPS/external smoke planning

Until then:

```text
production_no_go
```

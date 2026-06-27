# HTTP-01 HTTPS Enable and Rollback

## Purpose

Record the Loop 137-139 real-domain HTTP bootstrap, HTTP-01 certificate issuance, HTTPS enablement, smoke results, and rollback evidence for `admin.taiyolabel.site`.

This runbook is an execution record and rollback reference. It does not mark the system production-ready.

## Approved Boundary

```txt
host=admin.taiyolabel.site
acme_method=HTTP-01
fallback_acme_method=DNS-01 if HTTP-01 fails
certificate_target=admin.taiyolabel.site
wildcard_certificate=not_required
Project owner email configured; value not recorded
```

## Not Performed

- DNS changes.
- DNS provider API calls.
- TXT queries.
- DNS-01.
- Wildcard certificate.
- Firewall changes.
- LINE webhook registration.
- LINE production send.
- OpenAI real API.
- Supabase real connection.
- Supabase migration or RLS changes.
- Production secret injection.
- `.env` display or mutation.
- Private key display.
- API/Auth/RLS/runtime/migration/UI changes.
- production Go decision.

## DNS Read-only Evidence

```txt
admin.taiyolabel.site A 160.251.174.201
admin.taiyolabel.site AAAA no_answer
admin.taiyolabel.site CNAME no_answer
admin.taiyolabel.site CAA no_answer
taiyolabel.site CAA no_answer
taiyolabel.site NS 01.dnsv.jp,02.dnsv.jp,03.dnsv.jp,04.dnsv.jp
txt_query_executed=no
```

## VPS Preflight

```txt
vps=vm-227d8253-eb
active_path=/var/www/amami-line-crm
deployed_source=2a9a746940b5f7a707af4c042bb9225d3dea258b
nginx_test_before=success
api_direct_health=200
admin_direct_login=200
admin_local_bind=127.0.0.1:3002
api_local_bind=127.0.0.1:8788
certbot_version=2.9.0
sites_enabled_before=absent
```

## Evidence Directory

```txt
evidence_dir=/root/deploy-backups/amami-line-crm/loop137-139-20260627-135350
```

Saved evidence includes:

- Original Nginx config backup.
- HTTP bootstrap Nginx test output.
- HTTPS Nginx test output.
- Active HTTPS config copy.
- Listener snapshots.
- Certificate summary.
- HTTPS smoke output.
- Sites-enabled before/after snapshots.

## HTTP Bootstrap

Nginx HTTP bootstrap used:

- `listen 80`.
- `server_name admin.taiyolabel.site`.
- ACME webroot under `/var/www/amami-line-crm-acme`.
- `/api/health` proxied to the API health endpoint.
- `/api/` proxied to the local API service.
- `/` proxied to the local Admin service.
- No HTTPS config and no certificate path during bootstrap.

Result:

```txt
nginx_http_enable=success
nginx_reload_http=success
http_root=200
http_login=200
http_customers=200
http_alerts=200
http_api_health=200
http_acme_probe=200
```

## Certbot HTTP-01

```txt
certbot_http01_executed=yes
certbot_http01_result=success
certificate_path=/etc/letsencrypt/live/admin.taiyolabel.site/fullchain.pem
certificate_subject=CN=admin.taiyolabel.site
certificate_issuer=Let's Encrypt YE1
certificate_not_before=Jun 27 03:56:29 2026 GMT
certificate_not_after=Sep 25 03:56:28 2026 GMT
project_owner_email_recorded=no
private_key_content_displayed=no
private_key_path_recorded=no
```

## HTTPS Enable

HTTPS Nginx config uses:

- Port 80 ACME challenge path preserved.
- Port 80 non-ACME traffic redirected to HTTPS.
- Port 443 SSL for `admin.taiyolabel.site`.
- `/api/health` to the API health endpoint.
- `/api/` to the local API service.
- `/` to the local Admin service.
- HSTS intentionally disabled for this review stage.

Result:

```txt
nginx_https_enable=success
nginx_reload_https=success
https_root=200
https_login=200
https_customers=200
https_alerts=200
https_api_health=200
http_redirect=302 https://admin.taiyolabel.site/login
hsts_enabled=no
https_ready_for_review=true
```

## Rollback

If the real-domain HTTPS route must be disabled, use the saved backup from the evidence directory.

```bash
sudo cp -a /root/deploy-backups/amami-line-crm/loop137-139-20260627-135350/amami-line-crm.conf.before /etc/nginx/sites-available/amami-line-crm.conf
sudo rm -f /etc/nginx/sites-enabled/amami-line-crm.conf
sudo nginx -t
sudo systemctl reload nginx
```

Rollback was not executed because HTTPS smoke passed.

## Production Readiness

```txt
production_readiness=production_no_go
https_ready_for_review=true
```

No-Go reasons:

- LINE webhook is not registered.
- LINE real push is not approved.
- Supabase real connection has not executed.
- OpenAI real API has not executed.
- Production secret injection has not executed.

## Loop 140 HTTPS Review Update

The follow-up HTTPS review confirmed the public review URL remained reachable without rerunning certbot or reloading Nginx.

```txt
https_root=200
https_login=200
https_select_tenant=200
https_customers=200
https_alerts=200
https_api_health=200
http_root_redirect=302 https://admin.taiyolabel.site/
http_login_redirect=302 https://admin.taiyolabel.site/login
certificate_subject=CN=admin.taiyolabel.site
certificate_issuer=Let's Encrypt YE1
certificate_not_before=Jun 27 03:56:29 2026 GMT
certificate_not_after=Sep 25 03:56:28 2026 GMT
hsts_enabled=no
certbot_rerun=no
nginx_reload_restart=no
private_key_content_displayed=no
private_key_path_recorded=no
production_readiness=production_no_go
https_ready_for_review=true
```

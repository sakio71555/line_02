# Loop 137-139: HTTP-01 HTTPS enable bundle

## Goal

Enable `admin.taiyolabel.site` through the approved HTTP-01 path, issue the certificate, enable HTTPS, and record rollback evidence while keeping production readiness as No-Go.

## Scope

- Real-domain HTTP Nginx enable for `admin.taiyolabel.site`.
- Nginx reload for HTTP bootstrap.
- External HTTP smoke.
- HTTP-01 webroot probe.
- Certbot HTTP-01 certificate issuance.
- HTTPS Nginx enable.
- Nginx reload for HTTPS.
- External HTTPS smoke.
- HTTP to HTTPS redirect smoke.
- Rollback evidence and docs/test/dev log updates.

## Out of Scope

- DNS changes.
- DNS provider API usage.
- TXT queries.
- DNS-01.
- Wildcard certificate.
- Firewall changes.
- LINE webhook registration or LINE production sends.
- OpenAI real API.
- Supabase real connection, migration, RLS, or production secret injection.
- `.env` display or mutation.
- Private key display.
- API/Auth/RLS/runtime/migration/UI changes.
- production Go decision.

## Approved Values

```txt
review_admin_hostname=admin.taiyolabel.site
client_facing_final_hostname=admin.taiyolabel.site
acme_method=HTTP-01
fallback_acme_method=DNS-01 if HTTP-01 fails
certificate_target=admin.taiyolabel.site
wildcard_certificate=not_required
Project owner email configured; value not recorded
```

## DNS Read-only Result

```txt
host=admin.taiyolabel.site
a_record=160.251.174.201
aaaa_record=no_answer
cname_record=no_answer
host_caa=no_answer
zone_caa=no_answer
ns=01.dnsv.jp,02.dnsv.jp,03.dnsv.jp,04.dnsv.jp
txt_query_executed=no
```

## VPS Preflight

```txt
host=vm-227d8253-eb
active_path=/var/www/amami-line-crm
deployed_source=2a9a746940b5f7a707af4c042bb9225d3dea258b
nginx_test_before=success
api_direct_health=200
admin_direct_login=200
admin_bind=127.0.0.1:3002
api_bind=127.0.0.1:8788
certbot_installed=yes
sites_enabled_before=absent
```

## HTTP Bootstrap Result

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

## Certbot Result

```txt
certbot_http01_executed=yes
certbot_http01_result=success
certificate_path=/etc/letsencrypt/live/admin.taiyolabel.site/fullchain.pem
certificate_subject=CN=admin.taiyolabel.site
certificate_issuer=Let's Encrypt YE1
certificate_not_before=Jun 27 03:56:29 2026 GMT
certificate_not_after=Sep 25 03:56:28 2026 GMT
private_key_content_displayed=no
private_key_path_recorded=no
project_owner_email_recorded=no
```

## HTTPS Result

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

## Rollback Evidence

```txt
evidence_dir=/root/deploy-backups/amami-line-crm/loop137-139-20260627-135350
rollback_source=/root/deploy-backups/amami-line-crm/loop137-139-20260627-135350/amami-line-crm.conf.before
rollback_remove_sites_enabled=/etc/nginx/sites-enabled/amami-line-crm.conf
rollback_nginx_test=sudo nginx -t
rollback_reload=sudo systemctl reload nginx
rollback_executed=no
```

## Production Readiness

```txt
production_readiness=production_no_go
https_ready_for_review=true
```

Reasons:

- LINE webhook is not registered.
- LINE real push is not approved.
- Supabase real connection has not executed.
- OpenAI real API has not executed.
- Production secret injection has not executed.

## Test

- Static integration test checks docs, HTTP-01 decision, certbot result, HTTPS smoke, rollback plan, HSTS disabled state, No-Go readiness, and secret/email exclusion.

## Next Loop Candidates

1. Loop 140: LINE webhook dry-run with approved HTTPS URL.
2. Loop 141: Supabase staging secret injection checklist.
3. Loop 142: OpenAI provider production gate.
4. Loop 143: production readiness final Go/No-Go review.

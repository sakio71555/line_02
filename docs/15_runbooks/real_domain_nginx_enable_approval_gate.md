# Real-Domain Nginx Enable Approval Gate

## Purpose

This runbook records the approval gate before the project uses `admin.taiyolabel.site` as a real-domain Nginx `server_name`.

It does not enable the real domain.

## Proposed Candidate

```nginx
server_name admin.taiyolabel.site;
```

This is documentation only. The repo placeholder template remains placeholder-based and no active Nginx config is changed here.

## Required Human Approvals

| Approval | Current status | Required before |
| --- | --- | --- |
| DNS owner | Project owner / requestor | DNS change or ACME selection |
| DNS rollback owner | Project owner / requestor | Any DNS or real-domain enablement |
| Nginx enable approver | Project owner / requestor | `sites-enabled` or reload |
| Certificate approver | Project owner / requestor | certbot or certificate issuance |
| External smoke approver | Project owner / requestor | public HTTP/HTTPS smoke |
| Maintenance window approver | now / approved by Project owner | public-facing change |
| Final Go / No-Go owner | Project owner / requestor | production readiness change |

## Required Technical Checks

```txt
active_source_latest=required
invalid_host_candidate_smoke=success
a_record_match=required
aaaa_policy=required
caa_compatible=required
nginx_candidate_backup=required
diagnostic_header_public_policy=required
nginx_t_plan=required
temporary_real_domain_symlink_plan=required
reload_smoke_plan=required
rollback_reload_plan=required
external_smoke_plan=required
```

## Current Status

```txt
approved_review_admin_host=admin.taiyolabel.site
host_purpose=review/admin hostname
client_facing_final_hostname=admin.taiyolabel.site
separate_final_hostname=no
acme_method=HTTP-01
real_domain_enable_status=no_go
production_readiness=production_no_go
```

No-Go reasons:

- Real-domain Nginx controlled smoke has not executed.
- HTTP-01 challenge has not been tested.
- Certificate has not been issued.
- HTTPS has not been verified.
- External smoke has not completed.
- LINE webhook has not been registered.
- Supabase staging has not connected.
- Production secret injection has not completed.

## Forbidden Until Separate Execution Loop

- Set `server_name admin.taiyolabel.site` in active Nginx.
- Keep `/etc/nginx/sites-enabled/amami-line-crm.conf` enabled.
- Run Nginx reload/restart for real-domain.
- Run external smoke.
- Run certbot.
- Enable HTTPS.
- Register LINE webhook URL.
- Connect LINE/OpenAI/Supabase real services.
- Display or mutate `.env`.

## Rollback Gate Before Any Future Enablement

Before a future controlled smoke, record:

- candidate backup path.
- symlink rollback command.
- `nginx -t` before/after plan.
- rollback reload owner.
- direct localhost API/Admin smoke plan.
- external smoke rollback plan.
- log review owner.

## Next

Proceed only in a separate controlled smoke Loop that rechecks git status, DNS, active VPS source, candidate backup, rollback owner, maintenance window, and `production_no_go` before any Nginx enable/reload.

## Loop 137-139 Execution Update

The separate execution Loop was approved and completed for `admin.taiyolabel.site`.

```txt
real_domain_http_enable=success
nginx_reload_http=success
http_root=200
http_login=200
http_customers=200
http_alerts=200
http_api_health=200
http_acme_probe=200
nginx_reload_https=success
https_root=200
https_login=200
https_customers=200
https_alerts=200
https_api_health=200
http_redirect=302 https://admin.taiyolabel.site/login
hsts_enabled=no
https_ready_for_review=true
production_readiness=production_no_go
```

Still not performed:

- LINE webhook registration.
- LINE real push.
- OpenAI real API.
- Supabase real connection.
- Production secret injection.

# DNS / Nginx rollback owner checklist

## Purpose

Define the rollback ownership questions that must be answered before any DNS, Nginx, certificate, or public release operation.

This checklist is not an approval to execute changes.

## Current status

```text
production_readiness=production_no_go
approved_host=admin.taiyolabel.site
host_purpose=review/admin hostname
client_facing_final_hostname=undecided
rollback_owner=unknown
rollback_executor=unknown
```

## DNS rollback

| Item | Current value | Status | Notes |
| --- | --- | --- | --- |
| rollback owner | unknown | pending | Must be confirmed before DNS change. |
| previous A record | `admin.taiyolabel.site A 160.251.174.201` | recorded | Read-only inventory only; no DNS change yet. |
| previous AAAA record | no answer | recorded | Confirm before any AAAA addition. |
| previous CNAME | no answer | recorded | CNAME conflict not observed. |
| previous TTL | host A `3600`; zone NS/SOA `86400` | recorded | TTL after change is n/a until a change is approved. |
| rollback command owner | unknown | pending | Must review exact DNS rollback command outside Codex logs if provider UI/API is used. |
| rollback verification owner | unknown | pending | Must verify A/AAAA/CNAME after rollback without TXT disclosure. |
| propagation wait | unknown | pending | Should account for TTL and resolver cache. |
| rollback evidence | unknown | pending | Store screenshots or non-secret command output in the approved evidence location. |

No-Go if DNS rollback owner, rollback record, rollback command owner, or rollback verification owner is unknown.

## Nginx rollback

| Item | Current value | Status | Notes |
| --- | --- | --- | --- |
| sites-enabled symlink removal | not approved | pending | Future rollback would remove `/etc/nginx/sites-enabled/amami-line-crm.conf` if enabled. |
| previous candidate restore | unknown | pending | Need reviewed backup path before active changes. |
| `nginx -t` | required | pending | Must run before and after rollback. |
| reload approver | unknown | pending | Required before reload/restart. |
| reload executor | unknown | pending | Required before reload/restart. |
| direct localhost health | required | pending | Check API `/health` and Admin `/login` on localhost. |
| external smoke rollback check | not defined | pending | Must be approved before public smoke. |
| log review | not defined | pending | Need Nginx and app log review owner. |
| evidence location | unknown | pending | Store only non-secret evidence. |

No-Go if Nginx reload approver, executor, rollback command review, or smoke definition is missing.

## Certificate rollback

| Item | Current value | Status | Notes |
| --- | --- | --- | --- |
| certificate owner | unknown | pending | Required before certbot. |
| previous certificate path | unknown | pending | Do not paste private key material. |
| private key handling | unknown | pending | Never put private keys in repo/docs/logs. |
| certbot rollback approach | unknown | pending | Must be planned before issuance. |
| HTTPS disable fallback | unknown | pending | Needs Nginx and maintenance approval. |
| HTTP-only fallback | unknown | pending | Needs security review; not a default approval. |
| expiry monitoring | unknown | pending | Needs owner before production. |

No-Go if certificate owner, ACME method, private-key handling, or fallback plan is unknown.

## Application rollback

| Item | Current value | Status | Notes |
| --- | --- | --- | --- |
| release commit | `2a9a746940b5f7a707af4c042bb9225d3dea258b` | localhost-only review deployed | Loop 122 deployed this source to `/var/www/amami-line-crm` via copy-based archive after staging validation. |
| rollback commit | `176cb34fc6059ecabfb9826daacaabc2a437bebe` | recorded | Loop 120 selected the last known localhost-only smoke source as rollback candidate. |
| VPS deployed source | `2a9a746940b5f7a707af4c042bb9225d3dea258b` | recorded | Loop 122 confirmed active source after copy-based localhost-only redeploy. |
| copy-based archive attempt | `e1eeb2d7be37074258aa5aade48d7b03a1cd7ac1` | staged / not deployed | Loop 121 archive transferred and built in VPS staging, but full test failed before active deploy. |
| copy-based active redeploy | `2a9a746940b5f7a707af4c042bb9225d3dea258b` | localhost-only review deployed | Evidence path: `/root/deploy-backups/amami-line-crm/loop122-20260626-190958`. Nginx reload/restart and external smoke were not run. |
| corrected Nginx candidate reload smoke | `/api/health=404` | no-go | Loop 123 evidence path: `/root/deploy-backups/amami-line-crm/loop123-20260626-200424`. Temporary symlink was removed and rollback reload completed. |
| production start command | existing localhost-only boundary | partial | Public enablement still not approved. |
| healthcheck | localhost `/health` and `/login` known | partial | External smoke is still not approved. |
| LINE/OpenAI/Supabase gate state | real connections disabled/out of scope | pending | Must verify before any real enablement. |

## Rollback triggers

Trigger rollback review immediately if any of the following occurs:

- `/login` 404 / 5xx.
- `/api/health` 404 / 5xx.
- missing `X-Amami-Line-Crm-Proxy` diagnostic header during candidate Host header smoke.
- TLS certificate mismatch.
- redirect loop.
- static asset failure.
- login/session failure.
- tenant leakage suspicion.
- LINE webhook signature failure.
- secret exposure.
- unexpected public upstream port.
- external smoke failure.
- user approval revoked.

## No-Go if

- rollback owner is unknown.
- rollback record is unknown.
- rollback executor is unknown.
- rollback commands are not reviewed.
- rollback smoke is not defined.
- DNS owner is unknown.
- DNS rollback owner is unknown.
- Nginx reload approver is unknown.
- Certificate approver is unknown.
- LINE webhook approver is unknown.
- Maintenance window is unknown.
- public production enablement is requested before DNS/Nginx/cert owners are approved.
- external smoke or HTTPS is requested before an approved maintenance window and rollback owner exist.

## Forbidden until approval

- DNS変更禁止。
- DNS provider API利用禁止。
- TXT query禁止。
- Nginx reload/restart禁止。
- certbot禁止。
- certificate発行禁止。
- external HTTP/HTTPS smoke禁止。
- LINE webhook設定変更禁止。
- LINE/OpenAI/Supabase実接続禁止。

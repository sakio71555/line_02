# Owner Approval Status Matrix

## Purpose

Track the human owner and approver values required before public launch work can move from planning into execution.

Do not add secrets, credentials, `.env` values, private DNS notes, LINE user IDs, or production logs.

## Current Host Boundary

```txt
approved_review_admin_host=admin.taiyolabel.site
host_purpose=review/admin hostname
client_facing_final_hostname=admin.taiyolabel.site
separate_final_hostname=no
acme_method=HTTP-01
production_readiness=production_no_go
```

## Approval Matrix

| Owner / approver | Current value | Status | Required before |
| --- | --- | --- | --- |
| Domain owner | Project owner / requestor | recorded | domain use confirmation |
| DNS change owner | Project owner / requestor | recorded | any DNS mutation |
| DNS rollback owner | Project owner / requestor | recorded | DNS mutation or real-domain enablement |
| Nginx enable approver | Project owner / requestor | recorded | `sites-enabled`, reload, or restart |
| Certificate approver | Project owner / requestor | recorded | certbot or certificate issuance |
| ACME method approver | Project owner / requestor | recorded | HTTP-01 or DNS-01 decision |
| LINE webhook approver | Project owner / requestor | recorded | LINE Developers webhook registration |
| External smoke approver | Project owner / requestor | recorded | public HTTP/HTTPS smoke |
| Maintenance window approver | Project owner / requestor | recorded | any public-facing change |
| Final Go / No-Go owner | Project owner / requestor | recorded | production readiness change |
| Supabase staging approver | Project owner / requestor | recorded | staging real connection smoke |
| Production secret injection approver | Project owner / requestor | recorded | production secret injection |

## Owner approval gap matrix

| Area | Required value | Current status | Required before | Owner / approver | Evidence required | No-Go if missing |
|---|---|---|---|---|---|---|
| Domain | Domain owner | recorded | DNS change | Project owner / requestor | written approval | no |
| DNS | DNS change owner | recorded | A/CAA/TTL changes | Project owner / requestor | DNS console access confirmation | no |
| DNS | DNS rollback owner | recorded | DNS cutover | Project owner / requestor | rollback record + owner | no |
| Nginx | Enable approver | recorded | real-domain enable | Project owner / requestor | written approval | no |
| TLS | Certificate approver | recorded | certbot/ACME | Project owner / requestor | approval + SAN list | no |
| TLS | ACME method approver | recorded | HTTP-01 | Project owner / requestor | method decision | no |
| LINE | Webhook approver | recorded | LINE webhook registration | Project owner / requestor | LINE admin approval | no |
| Smoke | External smoke approver | recorded | public smoke | Project owner / requestor | test window approval | no |
| Ops | Maintenance window | recorded | reload/cutover | Project owner / requestor | scheduled window | no |
| Release | Final Go/No-Go owner | recorded | any public enable | Project owner / requestor | explicit Go | no |
| Supabase | Staging approver | recorded | Supabase connection | Project owner / requestor | staging project approval | no |
| Secrets | Secret injection approver | recorded | production env injection | Project owner / requestor | secret owner approval | no |
| Hostname | Client-facing final hostname | recorded | client-facing publication | Project owner / requestor | hostname decision | no |

## Human Intake Artifacts

- Human approval intake form: [human_approval_intake_form.md](human_approval_intake_form.md)
- Client / operations confirmation questions: [client_ops_confirmation_questions.md](client_ops_confirmation_questions.md)
- Client-facing approval request package: [client_facing_approval_request_package.md](client_facing_approval_request_package.md)

These files are intake templates only. They do not approve public enablement.

## Minimal Go Conditions

### Loop 135: client-facing approval request package

- Client / operations team gets a readable request package.
- `admin.taiyolabel.site` is explained as a review/admin hostname.
- DNS / HTTPS / LINE / Supabase approval questions are presented in a reply form.
- No public or external action is performed.

### Loop 136: ACME method decision after client approval

- ACME method approver is known.
- Certificate approver is known.
- DNS owner is known.
- DNS rollback owner is known.

### Loop 137: real-domain Nginx enable controlled smoke

- Nginx enable approver is known.
- Maintenance window is known.
- External smoke approver is known.
- DNS rollback owner is known.
- `admin.taiyolabel.site` use is explicitly approved.
- Rollback procedure is approved.

### Loop 138: LINE webhook dry-run with approved HTTPS URL

- LINE official account admin is known.
- LINE webhook approver is known.
- HTTPS URL is confirmed.
- Webhook secret path policy is confirmed.
- Real push remains disabled during dry-run.

### Loop 139: Supabase staging secret injection checklist

- Supabase staging project owner is known.
- Staging project URL is prepared outside docs.
- Secret injection owner is known.
- Service role key non-display policy is approved.
- RLS/migration reviewer is known.
- Rollback to `in_memory` is approved.

## Still No-Go

```txt
owner_approval_status=approved_values_recorded
production_readiness=production_no_go
```

Reasons production remains No-Go:

- Real-domain Nginx controlled smoke has not executed.
- HTTP-01 challenge has not been tested.
- Certificate has not been issued.
- HTTPS has not been verified.
- External smoke has not completed.
- LINE webhook has not been registered.
- Supabase staging has not connected.
- Production secret injection has not completed.

## Forbidden Until Separate Execution Gates Pass

- DNS changes.
- DNS provider API calls.
- certbot / HTTPS.
- real-domain Nginx enablement.
- Nginx reload/restart.
- external smoke.
- LINE webhook registration.
- LINE/OpenAI/Supabase real connections.
- `.env` display or mutation.

## Intake Template For Future Loop

```txt
Domain owner:
DNS change owner:
DNS rollback owner:
Nginx enable approver:
Certificate approver:
ACME method approver:
LINE webhook approver:
External smoke approver:
Maintenance window approver:
Final Go / No-Go owner:
Supabase staging approver:
Production secret injection approver:
Evidence location:
Approval date:
```

## Loop 136 Approval Values

```txt
review_admin_hostname=admin.taiyolabel.site
client_facing_final_hostname=admin.taiyolabel.site
separate_final_hostname=no
dns_owner=Project owner / requestor
dns_change_owner=Project owner / requestor
dns_rollback_owner=Project owner / requestor
nginx_enable_approver=Project owner / requestor
certificate_approver=Project owner / requestor
acme_method_approver=Project owner / requestor
acme_method=HTTP-01
fallback_acme_method=DNS-01 if HTTP-01 fails
line_webhook_approver=Project owner / requestor
external_smoke_approver=Project owner / requestor
maintenance_window=now / approved by Project owner
final_go_no_go_owner=Project owner / requestor
supabase_staging_approver=Project owner / requestor
production_secret_injection_approver=Project owner / requestor
```

These values unblock planning for future execution gates, but they do not perform DNS changes, Nginx enablement, certbot, HTTPS, external smoke, LINE registration, Supabase connection, or production secret injection in Loop 136.

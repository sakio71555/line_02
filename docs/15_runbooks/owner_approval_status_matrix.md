# Owner Approval Status Matrix

## Purpose

Track the human owner and approver values required before public launch work can move from planning into execution.

Do not add secrets, credentials, `.env` values, private DNS notes, LINE user IDs, or production logs.

## Current Host Boundary

```txt
approved_review_admin_host=admin.taiyolabel.site
host_purpose=review/admin hostname
client_facing_final_hostname=undecided
production_readiness=production_no_go
```

## Approval Matrix

| Owner / approver | Current value | Status | Required before |
| --- | --- | --- | --- |
| Domain owner | unknown | pending | domain use confirmation |
| DNS change owner | unknown | pending | any DNS mutation |
| DNS rollback owner | unknown | pending | DNS mutation or real-domain enablement |
| Nginx enable approver | unknown | pending | `sites-enabled`, reload, or restart |
| Certificate approver | unknown | pending | certbot or certificate issuance |
| ACME method approver | unknown | pending | HTTP-01 or DNS-01 decision |
| LINE webhook approver | unknown | pending | LINE Developers webhook registration |
| External smoke approver | unknown | pending | public HTTP/HTTPS smoke |
| Maintenance window approver | unknown | pending | any public-facing change |
| Final Go / No-Go owner | unknown | pending | production readiness change |
| Supabase staging approver | unknown | pending | staging real connection smoke |
| Production secret injection approver | unknown | pending | production secret injection |

## Still No-Go

```txt
owner_approval_status=pending
production_readiness=production_no_go
```

Reasons:

- All required owners remain unknown or pending.
- ACME method is undecided.
- Client-facing final hostname is undecided.
- Supabase staging project is not confirmed for this bundle.
- Production secret injection is not approved.

## Forbidden Until Owners Are Recorded

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

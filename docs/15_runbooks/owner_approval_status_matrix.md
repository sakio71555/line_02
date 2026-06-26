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

## Owner approval gap matrix

| Area | Required value | Current status | Required before | Owner / approver | Evidence required | No-Go if missing |
|---|---|---|---|---|---|---|
| Domain | Domain owner | unknown | DNS change | unknown | written approval | yes |
| DNS | DNS change owner | unknown | A/CAA/TTL changes | unknown | DNS console access confirmation | yes |
| DNS | DNS rollback owner | unknown | DNS cutover | unknown | rollback record + owner | yes |
| Nginx | Enable approver | unknown | real-domain enable | unknown | written approval | yes |
| TLS | Certificate approver | unknown | certbot/ACME | unknown | approval + SAN list | yes |
| TLS | ACME method approver | unknown | HTTP-01/DNS-01 | unknown | method decision | yes |
| LINE | Webhook approver | unknown | LINE webhook registration | unknown | LINE admin approval | yes |
| Smoke | External smoke approver | unknown | public smoke | unknown | test window approval | yes |
| Ops | Maintenance window | unknown | reload/cutover | unknown | scheduled window | yes |
| Release | Final Go/No-Go owner | unknown | any public enable | unknown | explicit Go | yes |
| Supabase | Staging approver | unknown | Supabase connection | unknown | staging project approval | yes |
| Secrets | Secret injection approver | unknown | production env injection | unknown | secret owner approval | yes |
| Hostname | Client-facing final hostname | undecided | client-facing publication | unknown | hostname decision | yes |

## Human Intake Artifacts

- Human approval intake form: [human_approval_intake_form.md](human_approval_intake_form.md)
- Client / operations confirmation questions: [client_ops_confirmation_questions.md](client_ops_confirmation_questions.md)

These files are intake templates only. They do not approve public enablement.

## Minimal Go Conditions

### Loop 135: ACME method decision after owner approval

- ACME method approver is known.
- Certificate approver is known.
- DNS owner is known.
- DNS rollback owner is known.

### Loop 136: real-domain Nginx enable controlled smoke

- Nginx enable approver is known.
- Maintenance window is known.
- External smoke approver is known.
- DNS rollback owner is known.
- `admin.taiyolabel.site` use is explicitly approved.
- Rollback procedure is approved.

### Loop 137: LINE webhook dry-run with approved HTTPS URL

- LINE official account admin is known.
- LINE webhook approver is known.
- HTTPS URL is confirmed.
- Webhook secret path policy is confirmed.
- Real push remains disabled during dry-run.

### Loop 138: Supabase staging secret injection checklist

- Supabase staging project owner is known.
- Staging project URL is prepared outside docs.
- Secret injection owner is known.
- Service role key non-display policy is approved.
- RLS/migration reviewer is known.
- Rollback to `in_memory` is approved.

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

# Production Domain Approval Sheet

## Purpose

This sheet is the human approval record required before any real-domain, DNS, HTTPS, or LINE webhook registration Loop.

Do not add secrets, tokens, credential values, `.env` contents, certificate secret material, private DNS notes, real LINE user IDs, or production logs.

## Approval Fields

```text
Production hostname: admin.taiyolabel.site
Base domain: taiyolabel.site
Hostname role: verification / admin management hostname and current final hostname
Host purpose: review/admin hostname
Client-facing final hostname: admin.taiyolabel.site
Separate final hostname: no
Expected VPS IPv4: 160.251.174.201
Admin public origin: https://admin.taiyolabel.site
API public origin: https://admin.taiyolabel.site/api
URL topology: same-host /api path candidate for read-only DNS confirmation
DNS provider: dnsv.jp / GMO DNS inferred from NS
DNS account owner: Project owner / requestor
DNS change owner: Project owner / requestor
DNS rollback owner: Project owner / requestor
A record target: 160.251.174.201
AAAA record target: none observed
CNAME status: no conflict observed
MX preservation needed: no MX answer observed
CAA status: no CAA answer observed
DS/DNSSEC status: no DS answer observed
DNS TTL: host A 3600 / zone NS 86400 / zone SOA 86400
ACME method: HTTP-01
ACME method approver: Project owner / requestor
Fallback ACME method: DNS-01 if HTTP-01 fails or operational blockers appear
Certificate names: admin.taiyolabel.site
LINE webhook URL: https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
Auth callback URL: unknown
Nginx enable approver: Project owner / requestor
Certificate approver: Project owner / requestor
LINE webhook approver: Project owner / requestor
Maintenance window: now / approved by Project owner
External smoke approver: Project owner / requestor
Rollback command owner: Project owner / requestor
Final Go / No-Go owner: Project owner / requestor
Supabase staging approver: Project owner / requestor
Production secret injection approver: Project owner / requestor
Final approver: Project owner / requestor
Approval date: 2026-06-27
```

## Approved Current URL Topology

Approved for future gated work, not executed in this Loop:

```text
same-origin /api path topology
https://admin.taiyolabel.site/
https://admin.taiyolabel.site/api/
https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
```

Loop 118 retry approved `admin.taiyolabel.site` / `taiyolabel.site` for read-only DNS confirmation only. The read-only DNS inventory found `admin.taiyolabel.site A 160.251.174.201` with TTL `3600`, no AAAA answer, and no CNAME conflict. This approval does not authorize DNS changes, Nginx enablement, certificate issuance, external smoke, or LINE webhook registration.

Loop 119 adds [domain_and_release_approval_record.md](domain_and_release_approval_record.md) and [dns_nginx_rollback_owner_checklist.md](dns_nginx_rollback_owner_checklist.md). All human owner / approver fields remain `unknown` / `pending`, so this sheet is still No-Go for actual enablement.

Loop 129-133 adds ACME selected-method planning, real-domain Nginx enable approval gate, LINE webhook production URL dry-run checklist, owner approval status matrix, and Supabase staging connection preflight plan. These are planning artifacts only; all approval fields above remain `unknown` / `pending`.

Loop 134 adds [human_approval_intake_form.md](human_approval_intake_form.md) and [client_ops_confirmation_questions.md](client_ops_confirmation_questions.md). These are intake artifacts only. They do not fill owner values, approve DNS/Nginx/HTTPS/LINE/Supabase work, or change production readiness.

Loop 136 records the returned owner approvals. `admin.taiyolabel.site` is approved as the review/admin hostname and current final hostname, with no separate final hostname planned. ACME is selected as HTTP-01 with DNS-01 fallback if HTTP-01 fails or an operational blocker appears. This approval record still does not execute DNS changes, certbot/HTTPS, Nginx real-domain enablement, external smoke, LINE webhook registration, Supabase connection, or production secret injection.

## Human Intake Links

- Owner approval status matrix: [owner_approval_status_matrix.md](owner_approval_status_matrix.md)
- Human approval intake form: [human_approval_intake_form.md](human_approval_intake_form.md)
- Client / operations confirmation questions: [client_ops_confirmation_questions.md](client_ops_confirmation_questions.md)

## No-Go Until Execution Gates Pass

```text
production_no_go
```

Do not proceed with:

- DNS changes.
- DNS provider API calls.
- Nginx active config changes.
- Nginx reload/restart.
- HTTPS issuance.
- external HTTP/HTTPS smoke.
- LINE webhook registration.
- LINE/OpenAI/Supabase real connections.

Current blockers:

- Real-domain Nginx controlled smoke has not executed.
- HTTP-01 challenge has not been tested.
- Certificate has not been issued.
- HTTPS has not been verified.
- External smoke has not completed.
- LINE webhook has not been registered.
- Supabase staging has not connected.
- Production secret injection has not completed.

# Production Domain Approval Sheet

## Purpose

This sheet is the human approval record required before any real-domain, DNS, HTTPS, or LINE webhook registration Loop.

Do not add secrets, tokens, credential values, `.env` contents, certificate secret material, private DNS notes, real LINE user IDs, or production logs.

## Approval Fields

```text
Production hostname: admin.taiyolabel.site
Base domain: taiyolabel.site
Hostname role: verification / admin management hostname, not the client final URL
Host purpose: review/admin hostname
Client-facing final hostname: undecided
Expected VPS IPv4: 160.251.174.201
Admin public origin: https://admin.taiyolabel.site
API public origin: https://admin.taiyolabel.site/api
URL topology: same-host /api path candidate for read-only DNS confirmation
DNS provider: dnsv.jp / GMO DNS inferred from NS, account owner unconfirmed
DNS account owner: unknown
DNS change owner: unknown
DNS rollback owner: unknown
A record target: 160.251.174.201
AAAA record target: none observed
CNAME status: no conflict observed
MX preservation needed: no MX answer observed
CAA status: no CAA answer observed
DS/DNSSEC status: no DS answer observed
DNS TTL: host A 3600 / zone NS 86400 / zone SOA 86400
ACME method: undecided
ACME method approver: unknown
Certificate names: unknown
LINE webhook URL: https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
Auth callback URL: unknown
Nginx enable approver: unknown
Certificate approver: unknown
LINE webhook approver: unknown
Maintenance window: unknown
External smoke approver: unknown
Rollback command owner: unknown
Final Go / No-Go owner: unknown
Supabase staging approver: unknown
Production secret injection approver: unknown
Final approver: unknown
Approval date: 2026-06-26
```

## Recommended Starting Point

Recommended for discussion, not approved:

```text
same-origin /api path topology
https://<production-host>/
https://<production-host>/api/
https://<production-host>/api/line/webhook/<webhookSecretPath>
```

Loop 118 retry approved `admin.taiyolabel.site` / `taiyolabel.site` for read-only DNS confirmation only. The read-only DNS inventory found `admin.taiyolabel.site A 160.251.174.201` with TTL `3600`, no AAAA answer, and no CNAME conflict. This approval does not authorize DNS changes, Nginx enablement, certificate issuance, external smoke, or LINE webhook registration.

Loop 119 adds [domain_and_release_approval_record.md](domain_and_release_approval_record.md) and [dns_nginx_rollback_owner_checklist.md](dns_nginx_rollback_owner_checklist.md). All human owner / approver fields remain `unknown` / `pending`, so this sheet is still No-Go for actual enablement.

Loop 129-133 adds ACME selected-method planning, real-domain Nginx enable approval gate, LINE webhook production URL dry-run checklist, owner approval status matrix, and Supabase staging connection preflight plan. These are planning artifacts only; all approval fields above remain `unknown` / `pending`.

## No-Go Until Approved

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

- DNS owner unknown.
- DNS rollback owner unknown.
- Nginx enable approver unknown.
- Certificate approver unknown.
- ACME method approver unknown.
- LINE webhook approver unknown.
- Maintenance window unknown.
- Final Go / No-Go owner unknown.
- Supabase staging approver unknown.
- Production secret injection approver unknown.
- Client-facing final hostname undecided.

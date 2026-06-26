# Production Domain Approval Sheet

## Purpose

This sheet is the human approval record required before any real-domain, DNS, HTTPS, or LINE webhook registration Loop.

Do not add secrets, tokens, credential values, `.env` contents, certificate secret material, private DNS notes, real LINE user IDs, or production logs.

## Approval Fields

```text
Production hostname: admin.taiyolabel.site
Base domain: taiyolabel.site
Hostname role: verification / admin management hostname, not the client final URL
Expected VPS IPv4: 160.251.174.201
Admin public origin: https://admin.taiyolabel.site
API public origin: https://admin.taiyolabel.site/api
URL topology: same-host /api path candidate for read-only DNS confirmation
DNS provider: dnsv.jp / GMO DNS inferred from NS, account owner unconfirmed
DNS account owner: unknown
DNS rollback owner: unknown
A record target: 160.251.174.201
AAAA record target: none observed
CNAME status: no conflict observed
MX preservation needed: no MX answer observed
CAA status: no CAA answer observed
DS/DNSSEC status: no DS answer observed
DNS TTL: host A 3600 / zone NS 86400 / zone SOA 86400
ACME method: undecided
Certificate names: unknown
LINE webhook URL: https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
Auth callback URL: unknown
Nginx enable approver: unknown
Certificate approver: unknown
LINE webhook approver: unknown
Maintenance window: unknown
External smoke approver: unknown
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

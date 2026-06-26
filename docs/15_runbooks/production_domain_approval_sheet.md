# Production Domain Approval Sheet

## Purpose

This sheet is the human approval record required before any real-domain, DNS, HTTPS, or LINE webhook registration Loop.

Do not add secrets, tokens, credential values, `.env` contents, certificate secret material, private DNS notes, real LINE user IDs, or production logs.

## Approval Fields

```text
Production hostname: unknown
Admin public origin: unknown
API public origin: unknown
URL topology: unknown
DNS provider: unknown
DNS account owner: unknown
DNS rollback owner: unknown
A record target: unknown
AAAA record target: unknown
CNAME status: unknown
MX preservation needed: unknown
CAA status: unknown
DS/DNSSEC status: unknown
ACME method: unknown
Certificate names: unknown
LINE webhook URL: unknown
Auth callback URL: unknown
Maintenance window: unknown
External smoke approver: unknown
Final approver: unknown
Approval date: unknown
```

## Recommended Starting Point

Recommended for discussion, not approved:

```text
same-origin /api path topology
https://<production-host>/
https://<production-host>/api/
https://<production-host>/api/line/webhook/<webhookSecretPath>
```

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

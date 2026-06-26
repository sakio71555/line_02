# Human approval intake form

## Purpose

This form is for human operators to fill before public launch work moves from planning into execution.

Do not write secrets, `.env` values, private keys, LINE user IDs, real customer information, or production logs in this file.

## Current Boundary

```txt
review_admin_hostname=admin.taiyolabel.site
client_facing_final_hostname=undecided
owner_approval_status=pending
production_readiness=production_no_go
```

## 1. Public URL

- Review/admin hostname:
  `admin.taiyolabel.site`
- Client-facing final hostname:
  `undecided`
- Is `admin.taiyolabel.site` acceptable as temporary review/admin URL?
  - [ ] yes
  - [ ] no
- Final hostname decision owner:
  `unknown`

## 2. DNS

- DNS provider:
  `unknown`
- DNS account owner:
  `unknown`
- DNS change owner:
  `unknown`
- DNS rollback owner:
  `unknown`
- Current A record:
  `160.251.174.201`
- AAAA policy:
  - [ ] no AAAA
  - [ ] IPv6 supported
  - [ ] undecided
- TTL change plan:
  `unknown`
- DNS rollback record:
  `unknown`
- DNS change approval:
  - [ ] approved
  - [ ] not approved

## 3. Nginx

- Nginx enable approver:
  `unknown`
- Real-domain enable approval:
  - [ ] approved
  - [ ] not approved
- Maintenance window:
  `unknown`
- Rollback executor:
  `unknown`
- External smoke approver:
  `unknown`

## 4. HTTPS / ACME

- Certificate approver:
  `unknown`
- ACME method:
  - [ ] HTTP-01
  - [ ] DNS-01
  - [ ] undecided
- Certificate SAN:
  `unknown`
- Private key owner:
  `unknown`
- Renewal owner:
  `unknown`
- CAA approval:
  - [ ] approved
  - [ ] not approved

## 5. LINE

- LINE official account admin:
  `unknown`
- LINE webhook approver:
  `unknown`
- Candidate webhook URL:
  `https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>`
- Webhook registration approval:
  - [ ] approved
  - [ ] not approved
- Real push approval:
  - [ ] approved
  - [ ] not approved

## 6. Supabase

- Supabase staging project owner:
  `unknown`
- Supabase staging approver:
  `unknown`
- Service role secret owner:
  `unknown`
- DB URL owner:
  `unknown`
- RLS/migration approver:
  `unknown`
- Staging connection approval:
  - [ ] approved
  - [ ] not approved

## 7. Final decision

- Final Go/No-Go owner:
  `unknown`
- Final status:
  - [ ] Go
  - [ ] No-Go
- Notes:
  `unknown`

## Safety Boundary

This intake form does not approve DNS changes, certbot/HTTPS, Nginx reload/restart, external smoke, LINE webhook registration, LINE/OpenAI/Supabase real connections, or production secret injection.

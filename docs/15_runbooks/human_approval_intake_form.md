# Human approval intake form

## Purpose

This form is for human operators to fill before public launch work moves from planning into execution.

Do not write secrets, `.env` values, private keys, LINE user IDs, real customer information, or production logs in this file.

## Current Boundary

```txt
review_admin_hostname=admin.taiyolabel.site
client_facing_final_hostname=admin.taiyolabel.site
separate_final_hostname=no
owner_approval_status=approved_values_recorded
acme_method=HTTP-01
acme_fallback=DNS-01 if HTTP-01 fails
production_readiness=production_no_go
```

## 1. Public URL

- Review/admin hostname:
  `admin.taiyolabel.site`
- Client-facing final hostname:
  `admin.taiyolabel.site`
- Is `admin.taiyolabel.site` acceptable as temporary review/admin URL?
  - [x] yes
  - [ ] no
- Final hostname decision owner:
  `Project owner / requestor`

## 2. DNS

- DNS provider:
  `dnsv.jp / GMO DNS inferred`
- DNS account owner:
  `Project owner / requestor`
- DNS change owner:
  `Project owner / requestor`
- DNS rollback owner:
  `Project owner / requestor`
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
  - [x] approved
  - [ ] not approved

## 3. Nginx

- Nginx enable approver:
  `Project owner / requestor`
- Real-domain enable approval:
  - [x] approved for future gated Loop
  - [ ] not approved
- Maintenance window:
  `now / approved by Project owner`
- Rollback executor:
  `Project owner / requestor`
- External smoke approver:
  `Project owner / requestor`

## 4. HTTPS / ACME

- Certificate approver:
  `Project owner / requestor`
- ACME method:
  - [x] HTTP-01
  - [ ] DNS-01
  - [ ] undecided
- Certificate SAN:
  `admin.taiyolabel.site`
- Private key owner:
  `server-side certificate owner, value not recorded`
- Renewal owner:
  `Project owner / requestor`
- CAA approval:
  - [ ] approved
  - [ ] not approved

## 5. LINE

- LINE official account admin:
  `Project owner / requestor`
- LINE webhook approver:
  `Project owner / requestor`
- Candidate webhook URL:
  `https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>`
- Webhook registration approval:
  - [x] approved for future dry-run planning
  - [ ] not approved
- Real push approval:
  - [ ] approved
  - [ ] not approved

## 6. Supabase

- Supabase staging project owner:
  `Project owner / requestor`
- Supabase staging approver:
  `Project owner / requestor`
- Service role secret owner:
  `Project owner / requestor`
- DB URL owner:
  `Project owner / requestor`
- RLS/migration approver:
  `Project owner / requestor`
- Staging connection approval:
  - [x] approved for future staging preflight planning
  - [ ] not approved

## 7. Final decision

- Final Go/No-Go owner:
  `Project owner / requestor`
- Final status:
  - [ ] Go
  - [x] No-Go until real-domain smoke, HTTPS, LINE webhook, and Supabase staging gates pass
- Notes:
  `production_no_go maintained`

## Safety Boundary

This intake form does not approve DNS changes, certbot/HTTPS, Nginx reload/restart, external smoke, LINE webhook registration, LINE/OpenAI/Supabase real connections, or production secret injection.

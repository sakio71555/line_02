# Client-facing approval request package

## Purpose

This package is written for the client / operations team so they can answer the minimum questions needed before public launch work continues.

It is a request package only. It does not approve production launch, DNS changes, HTTPS, Nginx reload/restart, LINE webhook registration, Supabase connection, or production secret injection.

## Current Status

```txt
review_admin_hostname=admin.taiyolabel.site
review_admin_hostname_purpose=internal review and admin operation confirmation
client_facing_final_hostname=admin.taiyolabel.site
separate_final_hostname=no
owner_approval_status=approved_values_recorded
acme_method=HTTP-01
production_readiness=production_no_go
```

## Returned Approval Values

Loop 136 records the returned owner approvals:

```txt
review_admin_hostname=admin.taiyolabel.site
client_facing_final_hostname=admin.taiyolabel.site
separate_final_hostname=no
dns_owner=Project owner / requestor
dns_rollback_owner=Project owner / requestor
nginx_enable_approver=Project owner / requestor
certificate_approver=Project owner / requestor
acme_method_approver=Project owner / requestor
acme_method=HTTP-01
fallback_acme_method=DNS-01 if HTTP-01 fails
line_webhook_approver=Project owner / requestor
supabase_staging_approver=Project owner / requestor
final_go_no_go_owner=Project owner / requestor
production_readiness=production_no_go
```

The approvals allow future gated planning for real-domain enablement, HTTP-01 certificate issuance, LINE webhook dry-run, and Supabase staging preflight. They do not execute or authorize automatic production launch in this Loop.

## What To Review On `admin.taiyolabel.site`

`admin.taiyolabel.site` is currently treated as the review/admin hostname.

Please use it to confirm:

- The admin screen is understandable for staff.
- The customer list and customer detail flow are clear.
- The alert page explains pending customer follow-up clearly.
- AI support areas are understandable as staff assistance, not automatic sending.
- Staff reply and notification flows are understood as controlled operations.

Important boundaries:

- `admin.taiyolabel.site` is now approved as the review/admin hostname and the current final hostname.
- It is still not an approved production launch URL until later gates pass.
- It does not by itself approve DNS changes, HTTPS certificate issuance, LINE webhook registration, or Supabase production/staging connection.

## Approval Areas

### 1. Domain / DNS

We need to know who can approve and perform DNS work.

Please answer:

- Who owns the domain / DNS account?
- Who can approve DNS record changes?
- Who can rollback DNS changes if something goes wrong?
- Can `admin.taiyolabel.site` continue as the review/admin URL?
- Will there be a separate client-facing final hostname?
- Should IPv6 / AAAA stay unused for now?
- Is CAA record change allowed if HTTPS requires it?

No DNS change will be made until these are approved.

### 2. HTTPS / Certificate

We need to choose the certificate issuance method safely.

Please answer:

- Who approves certificate issuance?
- Should ACME use HTTP-01 or DNS-01?
- Which hostname should be included in the certificate?
- Who is responsible for private-key storage?
- Who is responsible for renewal monitoring?

No certbot command, ACME challenge, certificate issuance, or HTTPS enablement will be run until these are approved.

### 3. Nginx / Public Enable

We need approval before turning the review/admin hostname into an active public reverse proxy route.

Please answer:

- Who approves real-domain Nginx enablement?
- What maintenance window should be used?
- Who performs or approves rollback?
- Who approves external smoke testing?
- What should happen if the public smoke test fails?

No active Nginx config change, `sites-enabled` change, reload, restart, or external smoke will be run until these are approved.

### 4. LINE

We need approval before registering a production webhook URL in LINE Developers.

Candidate URL:

```txt
https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
```

Please answer:

- Who manages the LINE official account?
- Who approves webhook URL registration?
- Who manages the webhook secret path?
- Should real LINE push remain disabled during the first webhook dry-run?
- When can real LINE sending be considered later?

No LINE Developers setting change, webhook URL registration, LINE API call, or real LINE send will be performed until these are approved.

### 5. Supabase

We need approval before any staging Supabase real connection.

Please answer:

- Who owns the Supabase staging project?
- Who approves staging connection tests?
- Who owns service-role secret handling?
- Who approves RLS / migration verification?
- Who approves rollback to `in_memory` if staging checks fail?

No Supabase connection, migration apply, RLS change, DB URL use, or service-role key injection will be performed until a separate execution Loop is approved.

## Reply Form

Please reply by filling the fields below.

```txt
1. Review/admin URL
Is admin.taiyolabel.site acceptable as a temporary review/admin URL?
[ ] yes
[ ] no
Notes:

2. Client-facing final hostname
Final hostname:
Decision owner:
Notes:

3. DNS
Domain / DNS account owner:
DNS change approver:
DNS rollback owner:
AAAA policy:
[ ] no AAAA for now
[ ] IPv6 supported
[ ] undecided
CAA change approval:
[ ] approved if needed
[ ] not approved
Notes:

4. HTTPS / ACME
Certificate approver:
ACME method:
[ ] HTTP-01
[ ] DNS-01
[ ] undecided
Certificate hostname / SAN:
Private-key owner:
Renewal owner:
Notes:

5. Nginx / public enable
Nginx enable approver:
Maintenance window:
Rollback executor / approver:
External smoke approver:
Failure rollback expectation:
Notes:

6. LINE
LINE official account admin:
LINE webhook approver:
Webhook secret path owner:
First dry-run keeps real push disabled:
[ ] yes
[ ] no
Real LINE send approval timing:
Notes:

7. Supabase
Supabase staging project owner:
Staging connection approver:
Service-role secret owner:
RLS / migration approver:
Rollback to in_memory approver:
Notes:

8. Final Go / No-Go
Final Go / No-Go owner:
Current decision:
[ ] Go after all prerequisites are ready
[ ] No-Go for now
Notes:
```

## Minimum Required Before Next Public Work

Loop 136 recorded the returned approvals. The next execution Loop must still recheck:

- `admin.taiyolabel.site` is the approved review/admin hostname and current final hostname.
- Separate final hostname is intentionally not planned now.
- DNS owner, DNS change owner, and DNS rollback owner are still reachable.
- Certificate approver and ACME method approver are still available.
- Nginx enable approver and maintenance window remain valid.
- External smoke approver is still available.
- LINE webhook approver is known, but webhook registration is not done.
- Supabase staging approver and secret handling owner are known, but staging connection is not done.
- Final Go / No-Go owner remains `Project owner / requestor`.

## Current No-Go

```txt
production_readiness=production_no_go
```

Reasons:

- Real-domain Nginx enable has not executed.
- certbot has not executed.
- HTTPS is not enabled.
- External smoke has not executed.
- LINE webhook is not registered.
- Supabase real connection has not executed.
- Production secret injection has not executed.
- OpenAI real API has not executed.

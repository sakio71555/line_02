# Loop 119: domain owner and rollback owner approval record

## Goal

Record the human approval, ownership, and rollback responsibility boundary required before any real-domain public enablement work.

Loop 119 is docs-only. It does not approve or execute DNS, Nginx, certificate, external smoke, LINE webhook, or production runtime changes.

## Scope

- Confirm Loop 118 read-only DNS inventory.
- Create `docs/15_runbooks/domain_and_release_approval_record.md`.
- Create `docs/15_runbooks/dns_nginx_rollback_owner_checklist.md`.
- Update production approval, DNS, domain decision, inventory, readiness, README, dev loop, and dev log docs.
- Add static integration tests for the approval record and rollback owner checklist.
- Keep `production_no_go`.

## Out of Scope

- DNS changes.
- DNS provider API calls.
- TXT record queries.
- nameserver or CAA changes.
- Nginx `sites-enabled` changes.
- Nginx reload/restart.
- certbot or certificate issuance.
- external HTTP/HTTPS smoke.
- LINE webhook changes.
- LINE/OpenAI/Supabase real connections.
- API/Auth/RLS/runtime/migration/UI changes.
- dependency changes or lockfile changes.
- `.env` creation, change, or display.

## Start State

```text
latest_commit=00e275a docs: record approved domain DNS inventory
branch=main...origin/main
worktree=clean
production_readiness=production_no_go
```

## Loop 118 Handoff

Approved values:

```text
approved_host=admin.taiyolabel.site
base_domain=taiyolabel.site
expected_vps_ipv4=160.251.174.201
host_purpose=review/admin hostname
client_facing_final_hostname=undecided
```

DNS inventory:

```text
a_record_match=yes
a_record_actual=160.251.174.201
a_record_expected=160.251.174.201
aaaa_present=no
cname_conflict=no
mx_present=no
caa_present=no
ds_dnssec_present=no
txt_records_fetched=no
dns_changed=no
inferred_dns_provider=dnsv.jp / GMO DNS
```

The DNS provider is inferred from NS records only. DNS account ownership is not confirmed.

## Unconfirmed Owners / Approvers

| Role | Status |
| --- | --- |
| Domain owner | unknown / pending |
| DNS change owner | unknown / pending |
| DNS rollback owner | unknown / pending |
| Nginx enable approver | unknown / pending |
| Certificate approver | unknown / pending |
| LINE webhook approver | unknown / pending |
| External smoke approver | unknown / pending |
| Maintenance window approver | unknown / pending |
| Rollback command owner | unknown / pending |
| Final Go / No-Go owner | unknown / pending |

## Approval Record

Created:

- `docs/15_runbooks/domain_and_release_approval_record.md`

The record keeps all missing human answers as `unknown` / `pending` and explicitly says `admin.taiyolabel.site` is a review/admin hostname, not the client-facing final hostname.

## Rollback Owner Checklist

Created:

- `docs/15_runbooks/dns_nginx_rollback_owner_checklist.md`

The checklist covers DNS rollback, Nginx rollback, certificate rollback, application rollback, rollback triggers, and No-Go conditions.

## Production Readiness

```text
production_readiness=production_no_go
```

Reasons:

- DNS owner is unknown.
- DNS rollback owner is unknown.
- Nginx enable approver is unknown.
- Certificate approver is unknown.
- ACME method is undecided.
- LINE webhook approver is unknown.
- Maintenance window is unknown.
- client-facing final hostname is undecided.

## Not Performed

- DNS changes.
- TXT record queries.
- Nginx active config changes.
- Nginx reload/restart.
- certbot or HTTPS issuance.
- external smoke.
- LINE/OpenAI/Supabase real connections.
- API/Auth/RLS/runtime/migration/UI changes.

## Tests

- Added `tests/integration/domain-release-approval-record.test.ts`.
- Confirmed approval docs exist and contain:
  - approved host.
  - review/admin host purpose.
  - client-facing final hostname undecided.
  - unknown/pending owner and approver states.
  - rollback triggers.
  - forbidden DNS/Nginx/certbot operations.
  - `production_no_go`.
  - no obvious secret/private-key values.

## Residual Risks

- Ownership and rollback authority are still not confirmed.
- Release commit and rollback commit are still not selected.
- ACME method and certificate owner are not selected.
- Public Nginx enablement and HTTPS remain No-Go.

## Next Loop Candidates

1. Loop 120: release commit alignment and VPS reproducible redeploy
2. Loop 121: corrected Nginx candidate reload smoke
3. Loop 122: ACME selected-method dry-run plan
4. Loop 123: LINE webhook production URL dry-run checklist
5. Loop 124: Supabase staging connection preflight

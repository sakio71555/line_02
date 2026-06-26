# Loop 118: approved domain read-only DNS confirmation

## Goal

Confirm the approved verification/admin management hostname with read-only DNS and VPS checks before any public Nginx, HTTPS, LINE webhook, or production enablement work.

Approved values for this Loop:

```text
APPROVED_PRODUCTION_HOST=admin.taiyolabel.site
APPROVED_BASE_DOMAIN=taiyolabel.site
EXPECTED_VPS_IPV4=160.251.174.201
```

`admin.taiyolabel.site` is recorded as a verification / admin management hostname. It is not the client final URL.

## Scope

- Read `AGENTS.md` and existing domain/DNS/production readiness docs.
- Keep work inside `/Users/sakio/Desktop/PROJECT/amami-line-crm`.
- Update the domain decision docs with the approved verification hostname.
- Run the standard quality gate before read-only DNS queries.
- Query only non-TXT DNS records for the approved base domain and host.
- Run VPS read-only checks without changing Nginx.
- Record DNS inventory, VPS read-only result, Go/No-Go, and residual risk.
- Add static tests that ensure the inventory exists and dangerous operations remain forbidden.
- Update README, dev loop docs, production readiness, approval docs, and dev log.

## Out of Scope

- TXT record queries.
- DNS changes or DNS provider API calls.
- DNS owner or rollback owner changes.
- Nginx `sites-enabled` changes.
- Nginx reload/restart.
- Certbot or certificate issuance.
- External HTTP/HTTPS smoke.
- LINE webhook registration.
- LINE/OpenAI/Supabase real connections.
- API/Auth/RLS/runtime/migration/UI changes.
- `.env` changes or secret display.

## Read-only DNS Result

```text
base_domain=taiyolabel.site
approved_host=admin.taiyolabel.site
expected_vps_ipv4=160.251.174.201
dns_query_executed=yes_non_txt_only
txt_query_executed=no
dns_changed=no
```

| record | result |
| --- | --- |
| `taiyolabel.site` NS | `01.dnsv.jp.`, `02.dnsv.jp.`, `03.dnsv.jp.`, `04.dnsv.jp.` TTL `86400` |
| `taiyolabel.site` SOA | `01.dnsv.jp. hostmaster.dnsv.jp. 1781759151 3600 900 604800 300` TTL `86400` |
| `taiyolabel.site` MX | no answer |
| `taiyolabel.site` CAA | no answer |
| `taiyolabel.site` DS | no answer |
| `admin.taiyolabel.site` A | `160.251.174.201` TTL `3600` |
| `admin.taiyolabel.site` AAAA | no answer |
| `admin.taiyolabel.site` CNAME | no answer |
| `admin.taiyolabel.site` CAA | no answer |

DNS provider is inferred from NS only:

```text
inferred_dns_provider=dnsv.jp / GMO DNS
```

This is an inference, not a confirmed DNS account owner.

## DNS Match Judgment

```text
a_record_match=yes
cname_conflict=no
aaaa_present=no
caa_present=no
ds_dnssec_present=no
mx_present=no
txt_records_fetched=no
```

`admin.taiyolabel.site` currently points to the expected VPS IPv4, but that does not authorize public enablement.

## VPS Read-only Result

Read-only SSH checks showed:

- Host: `vm-227d8253-eb`
- VPS time: `2026-06-26T17:17:16+09:00`
- `nginx -t`: success.
- Public `80` / `443` listeners are present for existing Nginx.
- App localhost listeners are present on `127.0.0.1:8788` and `127.0.0.1:3002`.
- `/etc/nginx/sites-available/amami-line-crm.conf` exists.
- `/etc/nginx/sites-enabled/amami-line-crm.conf` does not exist.
- `http://127.0.0.1:8788/health`: `200`.
- `http://127.0.0.1:3002/login`: `200`.

No `sites-enabled` change, reload, restart, certbot, or external smoke was run.

## Approval Fields Still Unknown

- DNS account owner: unknown.
- DNS rollback owner: unknown.
- Nginx enable approver: unknown.
- Certificate approver: unknown.
- LINE webhook approver: unknown.
- Maintenance window: unknown.
- ACME method: undecided.

## Tests

- Updated the Loop 117 approval gate test to allow the Loop 118 approved verification hostname while keeping production No-Go.
- Added `approved-domain-dns-inventory` static test coverage for:
  - approved host/base/IP.
  - TXT not fetched.
  - DNS unchanged.
  - Nginx reload/restart and certbot still forbidden.
  - `production_no_go` retained.
  - owner/rollback/approver unknowns retained.
  - no obvious secret patterns in docs.

## Go / No-Go

```text
production_readiness=production_no_go
dns_inventory_status=read_only_a_match_confirmed
public_enablement_status=not_approved
```

Loop 118 confirms DNS inventory only. It does not approve DNS changes, HTTPS issuance, Nginx public enablement, LINE webhook registration, or external smoke.

## Next Loop Candidates

- Loop 119: domain owner and rollback owner approval record.
- Loop 120: HTTPS / certificate issuance plan.
- Loop 121: Nginx real-domain enablement approval gate.

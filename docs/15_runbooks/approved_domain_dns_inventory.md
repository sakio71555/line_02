# Approved Domain DNS Inventory

## Purpose

Record the read-only DNS and VPS confirmation for the approved verification/admin management hostname before any public enablement work.

This runbook is a record, not an execution approval.

## Approved Values

```text
approved_production_host=admin.taiyolabel.site
approved_base_domain=taiyolabel.site
expected_vps_ipv4=160.251.174.201
hostname_role=verification / admin management hostname, not the client final URL
production_readiness=production_no_go
```

## Safety Boundary

Loop 118 did not do any of the following:

- TXT record query.
- DNS change.
- DNS provider API call.
- Nginx `sites-enabled` change.
- Nginx reload/restart.
- Certbot execution.
- Certificate issuance.
- External HTTP/HTTPS smoke.
- LINE webhook registration.
- LINE/OpenAI/Supabase real connection.
- `.env` creation or display.

## DNS Query Summary

Commands were limited to non-TXT read-only `dig` queries.

```text
txt_records_fetched=no
dns_changed=no
dns_provider_api_called=no
```

| name | type | answer | ttl |
| --- | --- | --- | --- |
| `taiyolabel.site` | NS | `01.dnsv.jp.` | `86400` |
| `taiyolabel.site` | NS | `02.dnsv.jp.` | `86400` |
| `taiyolabel.site` | NS | `03.dnsv.jp.` | `86400` |
| `taiyolabel.site` | NS | `04.dnsv.jp.` | `86400` |
| `taiyolabel.site` | SOA | `01.dnsv.jp. hostmaster.dnsv.jp. 1781759151 3600 900 604800 300` | `86400` |
| `taiyolabel.site` | MX | no answer | n/a |
| `taiyolabel.site` | CAA | no answer | n/a |
| `taiyolabel.site` | DS | no answer | n/a |
| `admin.taiyolabel.site` | A | `160.251.174.201` | `3600` |
| `admin.taiyolabel.site` | AAAA | no answer | n/a |
| `admin.taiyolabel.site` | CNAME | no answer | n/a |
| `admin.taiyolabel.site` | CAA | no answer | n/a |

## DNS Interpretation

```text
a_record_match=yes
a_record_expected=160.251.174.201
a_record_actual=160.251.174.201
aaaa_present=no
cname_conflict=no
mx_present=no
caa_present=no
ds_dnssec_present=no
ttl_host_a=3600
ttl_zone_ns=86400
ttl_zone_soa=86400
inferred_dns_provider=dnsv.jp / GMO DNS
```

The provider inference is based only on NS records. It does not confirm account ownership or rollback authority.

## Ownership / Approval State

```text
DNS owner: unknown
DNS rollback owner: unknown
Nginx enable approver: unknown
Certificate approver: unknown
LINE webhook approver: unknown
Maintenance window: unknown
ACME method: undecided
```

## VPS Read-only Confirmation

```text
vps_host=vm-227d8253-eb
vps_time=2026-06-26T17:17:16+09:00
nginx_test=success
sites_available_candidate=present
sites_enabled_candidate=absent
api_local_health=http_200
admin_local_login=http_200
```

Observed listeners:

- `0.0.0.0:80` and `0.0.0.0:443` for existing Nginx.
- `127.0.0.1:8788` for the API app.
- `127.0.0.1:3002` for the Admin app.

No Nginx active config change, reload, restart, certbot, or public smoke was performed.

## Go / No-Go

```text
dns_inventory_status=read_only_a_match_confirmed
public_enablement_status=not_approved
production_readiness=production_no_go
```

DNS inventory is sufficient to proceed to an approval-record Loop, but not sufficient to enable public production.

## Remaining Risks

- DNS owner is unknown.
- DNS rollback owner is unknown.
- ACME method is undecided.
- Certificate approver is unknown.
- Nginx enable approver is unknown.
- LINE webhook approver is unknown.
- External HTTPS smoke has not been run.
- LINE/OpenAI/Supabase real connections remain out of scope.
- Production readiness remains `production_no_go`.

## Next Loop Candidates

- Loop 119: domain owner and rollback owner approval record.
- Loop 120: HTTPS / certificate issuance plan.
- Loop 121: Nginx real-domain enablement approval gate.

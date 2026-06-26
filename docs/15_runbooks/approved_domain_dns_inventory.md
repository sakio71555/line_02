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
DNS change owner: unknown
DNS rollback owner: unknown
Nginx enable approver: unknown
Certificate approver: unknown
LINE webhook approver: unknown
External smoke approver: unknown
Maintenance window: unknown
ACME method: undecided
Final Go / No-Go owner: unknown
Client-facing final hostname: undecided
```

Loop 119 adds the approval owner record and rollback owner checklist, but these fields remain `unknown` / `pending` until a human fills them.

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

## Loop 120 Release Alignment Note

Loop 120 confirmed the release provenance without changing DNS or public Nginx state.

```text
release_candidate_commit=5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db
rollback_candidate_commit=176cb34fc6059ecabfb9826daacaabc2a437bebe
vps_before_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
vps_after_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
evidence_path=/root/deploy-backups/amami-line-crm/loop120-20260626-174138
fast_forward_attempted=no
```

The VPS review release directory is copy-based and has no `.git` worktree, so fast-forward-only redeploy did not proceed. DNS inventory remains unchanged.

## Go / No-Go

```text
dns_inventory_status=read_only_a_match_confirmed
public_enablement_status=not_approved
production_readiness=production_no_go
```

DNS inventory is sufficient to proceed to an approval-record Loop, but not sufficient to enable public production.

## Remaining Risks

- DNS owner is unknown.
- DNS change owner is unknown.
- DNS rollback owner is unknown.
- ACME method is undecided.
- Certificate approver is unknown.
- Nginx enable approver is unknown.
- LINE webhook approver is unknown.
- External smoke approver is unknown.
- Maintenance window is unknown.
- Final Go / No-Go owner is unknown.
- Client-facing final hostname is undecided.
- External HTTPS smoke has not been run.
- LINE/OpenAI/Supabase real connections remain out of scope.
- Production readiness remains `production_no_go`.

## Next Loop Candidates

- Loop 119: domain owner and rollback owner approval record.
- Loop 120: HTTPS / certificate issuance plan.
- Loop 121: Nginx real-domain enablement approval gate.

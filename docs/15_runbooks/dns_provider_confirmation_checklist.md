# DNS Provider Confirmation Checklist

## Purpose

Loop 117 records the DNS-provider confirmation steps that must happen before real-domain public enablement. This is a planning checklist only.

## Current Status

```text
canonical_hostname=admin.taiyolabel.site
base_domain=taiyolabel.site
expected_vps_ipv4=160.251.174.201
hostname_role=verification / admin management hostname, not the client final URL
dns_provider=dnsv.jp / GMO DNS inferred from NS, account owner unconfirmed
domain_owner=unknown
dns_change_owner=unknown
dns_rollback_owner=unknown
rollback_command_owner=unknown
dns_query_status=read_only_non_txt_completed
txt_query_status=not_fetched
production_readiness=production_no_go
```

## Hard Boundary

Forbidden in this checklist:

- DNS変更禁止。
- DNS provider API利用禁止。
- TXT query禁止。
- TXT record値の表示禁止。
- token、API key、secret、credential表示禁止。
- Nginx reload/restart禁止。
- certbot実行禁止。
- external HTTP/HTTPS smoke禁止。
- LINE webhook registration禁止。

## Confirmation Sheet

Fill only non-secret values.

```text
Canonical hostname: admin.taiyolabel.site
Base domain: taiyolabel.site
Expected VPS IPv4: 160.251.174.201
DNS provider: dnsv.jp / GMO DNS inferred from NS, account owner unconfirmed
DNS account owner: unknown
DNS change owner: unknown
DNS rollback owner: unknown
Approved A target: 160.251.174.201
Approved AAAA target: none observed
Existing CNAME status: no answer
Existing MX status: no answer
CAA status: no answer
DS/DNSSEC status: no answer
TTL before change: host A 3600 / zone NS 86400 / zone SOA 86400
TTL after change: n/a, no DNS change executed
Rollback contact:
Maintenance window:
Final Go / No-Go owner: unknown
Approval date: 2026-06-26
Approver: Loop 118 retry prompt
```

Do not write DNS credentials, API tokens, TXT values, certificate secret material, or `.env` values here.

## Read-only DNS Commands For A Future Loop

Run these only after a single canonical hostname is approved.

```bash
dig +short A <approved-hostname>
dig +short AAAA <approved-hostname>
dig +short CNAME <approved-hostname>
dig +short NS <approved-zone>
dig +short CAA <approved-zone>
dig +short DS <approved-zone>
```

Do not run TXT queries in Codex logs. If TXT records are needed for DNS-01, handle them outside the repo and do not paste values into docs or prompts.

## Loop 117 DNS Query Decision

Loop 117 did not run DNS queries.

Reason:

- Multiple candidates exist.
- No canonical hostname is approved.
- DNS provider is unknown.
- TXT queries are forbidden.

## Loop 118 Read-only DNS Result

Loop 118 retry ran only approved non-TXT DNS queries.

```text
txt_query_executed=no
dns_change_executed=no
dns_provider_api_called=no
a_record_match=yes
a_record_actual=160.251.174.201
a_record_expected=160.251.174.201
aaaa_present=no
cname_conflict=no
inferred_dns_provider=dnsv.jp / GMO DNS
```

DNS owner and rollback owner remain unknown. The inferred provider is based only on NS records and does not confirm account ownership.

## Loop 119 Approval Owner Record

Loop 119 adds owner / approver records but does not fill them with guessed values.

Required fields still pending:

- Domain owner.
- DNS change owner.
- DNS rollback owner.
- Rollback command owner.
- Maintenance window approver.
- Final Go / No-Go owner.

## Go / No-Go

Stay No-Go until:

- DNS provider and account owner are confirmed.
- DNS change owner is confirmed.
- rollback owner is confirmed.
- rollback command owner is confirmed.
- DNS record plan is reviewed.
- ACME method is approved.
- maintenance window is approved.
- final Go / No-Go owner is confirmed.
- a later Loop explicitly authorizes DNS changes, Nginx enablement, HTTPS issuance, and external smoke.

Current judgment:

```text
production_no_go
```

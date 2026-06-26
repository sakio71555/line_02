# DNS Provider Confirmation Checklist

## Purpose

Loop 117 records the DNS-provider confirmation steps that must happen before real-domain public enablement. This is a planning checklist only.

## Current Status

```text
canonical_hostname=unknown
dns_provider=unknown
domain_owner=unknown
dns_rollback_owner=unknown
dns_query_status=skipped_multiple_candidates_no_canonical_host
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
Canonical hostname:
DNS provider:
DNS account owner:
DNS rollback owner:
Approved A target:
Approved AAAA target:
Existing CNAME status:
Existing MX status:
CAA status:
DS/DNSSEC status:
TTL before change:
TTL after change:
Rollback contact:
Maintenance window:
Approval date:
Approver:
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

## Go / No-Go

Stay No-Go until:

- canonical hostname is approved.
- DNS provider and account owner are confirmed.
- rollback owner is confirmed.
- DNS record plan is reviewed.
- ACME method is approved.
- a later Loop explicitly authorizes read-only DNS confirmation or DNS changes.

Current judgment:

```text
production_no_go
```

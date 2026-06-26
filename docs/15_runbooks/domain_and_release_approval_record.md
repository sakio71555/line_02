# Domain and release approval record

## Purpose

Record the human approval and ownership boundary required before any real-domain DNS change, Nginx enablement, certificate issuance, external smoke, or LINE webhook registration.

This document is an approval record template. It does not approve production release by itself.

## Target hostname

- Approved host: `admin.taiyolabel.site`
- Base domain: `taiyolabel.site`
- Expected VPS IPv4: `160.251.174.201`
- Host purpose: review/admin hostname
- Client-facing final hostname: undecided

## DNS inventory summary

- A: `admin.taiyolabel.site -> 160.251.174.201`, TTL `3600`, expected IP match.
- AAAA: no answer.
- CNAME: no answer, no conflict observed.
- NS: `01.dnsv.jp.`, `02.dnsv.jp.`, `03.dnsv.jp.`, `04.dnsv.jp.`, TTL `86400`.
- SOA: `01.dnsv.jp. hostmaster.dnsv.jp. 1781759151 3600 900 604800 300`, TTL `86400`.
- MX: no answer.
- CAA: no answer.
- DS: no answer.
- TTL: host A `3600`; zone NS/SOA `86400`.
- Inferred DNS provider: `dnsv.jp / GMO DNS` from NS only.
- TXT queried: no.
- DNS changed: no.

## Required human approvals

| Role | Name / owner | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| Domain owner | unknown | pending |  | Must confirm account ownership or delegated authority. |
| DNS change owner | unknown | pending |  | Must confirm who can change A/AAAA/CNAME/CAA records. |
| DNS rollback owner | unknown | pending |  | Must be reachable during the maintenance window. |
| Nginx enable approver | unknown | pending |  | Required before `sites-enabled`, reload, or restart work. |
| Certificate approver | unknown | pending |  | Required before certbot or certificate issuance. |
| LINE webhook approver | unknown | pending |  | Required before LINE Developers webhook URL changes. |
| External smoke approver | unknown | pending |  | Required before public HTTP/HTTPS smoke. |
| Maintenance window approver | unknown | pending |  | Required before any public-facing change. |
| Final Go / No-Go owner | unknown | pending |  | Required before moving from `production_no_go`. |

## Approval checklist

- [ ] Domain owner confirmed
- [ ] DNS provider access confirmed
- [ ] DNS rollback owner confirmed
- [ ] DNS rollback record confirmed
- [ ] Nginx enable approver confirmed
- [ ] Certificate approver confirmed
- [ ] ACME method selected
- [ ] Maintenance window approved
- [ ] External smoke approver confirmed
- [ ] LINE webhook approver confirmed
- [ ] Release commit approved
- [ ] Rollback command owner confirmed
- [ ] Final Go / No-Go owner confirmed

## Loop 120 release provenance record

Loop 120 recorded the release and rollback candidate commits, but it did not approve public production enablement.

```text
release_candidate_commit=5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db
rollback_candidate_commit=176cb34fc6059ecabfb9826daacaabc2a437bebe
config_source_commit=5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db
vps_before_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
vps_after_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
evidence_path=/root/deploy-backups/amami-line-crm/loop120-20260626-174138
fast_forward_attempted=no
restart_attempted=no
no_go_reason=VPS release directory is copy-based without .git worktree
```

The release commit is selected for review provenance only. The approval checklist above remains pending.

## Loop 121 copy-based archive record

Loop 121 created and transferred a copy-based release archive for staging validation, but it did not update the active VPS review source.

```text
release_candidate_commit=e1eeb2d7be37074258aa5aade48d7b03a1cd7ac1
previous_vps_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
archive_sha256=f5ab2e23ef8de82a97c0b858b8099ea693474e3b90b4209892f137d85297f98e
evidence_path=/root/deploy-backups/amami-line-crm/loop121-20260626-180347
active_deploy_updated=no
restart_attempted=no
no_go_reason=VPS staging full test failed before active deploy
```

The approval checklist above remains pending.

## No-Go status

Current status: `production_no_go`

Reason:

- DNS owner is unknown.
- DNS change owner is unknown.
- DNS rollback owner is unknown.
- Nginx enable approver is unknown.
- Certificate approver is unknown.
- LINE webhook approver is unknown.
- External smoke approver is unknown.
- Maintenance window is unknown.
- Final Go / No-Go owner is unknown.
- ACME method is undecided.
- client-facing final hostname is undecided.
- VPS latest-main alignment is incomplete because the review release directory is not a git worktree.
- Copy-based archive deploy is not yet usable because Loop 121 staging full test failed before active source update.

## Hard boundary

Until all required approvals are recorded:

- DNS変更禁止。
- DNS provider API利用禁止。
- TXT query禁止。
- nameserver変更禁止。
- CAA変更禁止。
- Nginx `sites-enabled` 変更禁止。
- Nginx reload/restart禁止。
- certbot禁止。
- certificate発行禁止。
- external HTTP/HTTPS smoke禁止。
- LINE webhook設定変更禁止。
- LINE/OpenAI/Supabase実接続禁止。
- `.env` 作成・変更・表示禁止。

## Next evidence to collect

- Domain owner name or team.
- DNS provider account owner.
- DNS rollback owner and emergency contact path.
- Reviewed rollback command owner.
- Approved maintenance window.
- ACME method and certificate owner.
- Nginx enable approver.
- External smoke approver.
- LINE webhook approver.
- Final Go / No-Go owner.

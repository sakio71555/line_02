# Loop 130: real-domain Nginx enable approval gate

## Goal

Define the approvals and Go/No-Go checks required before `admin.taiyolabel.site` is ever used as a real-domain `server_name`.

No Nginx config change, reload, restart, permanent symlink, real-domain Host-header smoke, DNS change, certbot, HTTPS, or external smoke is executed in this Loop.

## Scope

- Document the proposed real-domain candidate.
- List required human approvals.
- List required technical checks.
- Keep `real_domain_enable_status=no_go`.
- Keep `production_no_go`.

## Out of Scope

- Writing `server_name admin.taiyolabel.site;` to active Nginx config.
- Creating or keeping a `sites-enabled` symlink.
- Nginx reload/restart.
- certbot / HTTPS.
- External public smoke.
- LINE webhook registration.
- LINE/OpenAI/Supabase real connections.
- `.env` changes.
- API/Auth/RLS/runtime/migration/UI changes.

## Proposed Real-Domain Candidate

```nginx
server_name admin.taiyolabel.site;
```

This is a proposed future candidate only. It is not set in this Loop.

## Required Approvals

- DNS owner.
- DNS rollback owner.
- Nginx enable approver.
- Certificate approver.
- External smoke approver.
- Maintenance window approver.
- Final Go / No-Go owner.

## Required Technical Checks

- Active VPS source is latest and recorded.
- `invalid_host_candidate_smoke=success`.
- A record matches `160.251.174.201`.
- AAAA is absent or IPv6 policy is decided.
- CAA is absent or compatible with selected CA.
- Nginx candidate backup path is recorded.
- Diagnostic header removal or controlled public use is approved.
- `nginx -t` plan is reviewed.
- Temporary real-domain symlink plan is reviewed.
- Reload smoke plan is reviewed.
- Rollback reload plan is reviewed.
- External smoke plan is approved.

## Forbidden Until Approved

- `server_name admin.taiyolabel.site`.
- Permanent `sites-enabled` enablement.
- Nginx reload for real-domain.
- External smoke.
- certbot.
- HTTPS.
- LINE webhook registration.

## Go / No-Go

```txt
real_domain_enable_status=no_go
production_readiness=production_no_go
```

Reasons:

- DNS owner unknown.
- DNS rollback owner unknown.
- Nginx enable approver unknown.
- Certificate approver unknown.
- Maintenance window unknown.
- ACME method undecided.
- Client-facing final hostname undecided.

## Next

- Loop 134: owner approval values intake.
- Loop 136: real-domain Nginx enable controlled smoke after approval.

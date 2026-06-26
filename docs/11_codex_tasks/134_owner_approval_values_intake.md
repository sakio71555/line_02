# Loop 134: owner approval values intake

## Goal

Prepare the human intake material required before public launch work can move beyond planning.

This Loop does not fill owner values by guessing. It keeps `production_no_go`.

## Scope

- Audit the existing owner approval matrix.
- Keep unresolved owners and approvers visible as `unknown / pending`.
- Add a human approval intake form.
- Add client / operations confirmation questions.
- Define the minimum Go conditions for future public-launch Loops.
- Update README, dev loop docs, production readiness docs, and dev log.
- Add static integration tests.

## Out of Scope

- DNS changes.
- DNS provider API calls.
- TXT, NS, CAA, DNSSEC changes.
- certbot, ACME challenge, certificate issuance, or HTTPS enablement.
- Nginx active config changes, `sites-enabled` changes, reload, or restart.
- real-domain enablement or external HTTP/HTTPS smoke.
- LINE webhook registration, LINE API calls, or LINE production sends.
- OpenAI real API calls.
- Supabase real connection, migration, RLS, or production secret injection.
- `.env` creation, mutation, or display.
- API/Auth/RLS/runtime/migration/UI changes.
- Dependency or lockfile changes.

## Starting State

```txt
latest_commit_before_loop=a38b943
approved_review_admin_host=admin.taiyolabel.site
A_record=160.251.174.201
invalid_host_candidate_smoke=success
vps_active_source=2a9a746940b5f7a707af4c042bb9225d3dea258b
client_facing_final_hostname=undecided
ACME method=undecided
production_readiness=production_no_go
```

## Loop 129-133 Handoff

- Loop 129: ACME HTTP-01 / DNS-01 plan added; method remains `undecided`.
- Loop 130: real-domain Nginx enable gate added; enable status remains `no_go`.
- Loop 131: LINE webhook production URL checklist added; candidate URL remains unregistered.
- Loop 132: owner approval status matrix added; values remain `unknown / pending`.
- Loop 133: Supabase staging connection preflight plan added; staging status remains `no_go`.

## Current Unknown / Pending List

- Domain owner.
- DNS change owner.
- DNS rollback owner.
- Nginx enable approver.
- Certificate approver.
- ACME method approver.
- LINE webhook approver.
- External smoke approver.
- Maintenance window.
- Final Go / No-Go owner.
- Supabase staging approver.
- Production secret injection approver.
- Client-facing final hostname.

## Human Approval Intake Form

The intake form is [../15_runbooks/human_approval_intake_form.md](../15_runbooks/human_approval_intake_form.md).

It records empty or `unknown` fields only. It does not authorize production work.

## Client / Operations Confirmation Questions

The question list is [../15_runbooks/client_ops_confirmation_questions.md](../15_runbooks/client_ops_confirmation_questions.md).

Questions cover:

- Domain / DNS.
- HTTPS / ACME.
- Nginx / public enable.
- LINE.
- Supabase.

## Minimal Go Conditions

### Loop 135: ACME method decision after owner approval

- ACME method approver is known.
- Certificate approver is known.
- DNS owner is known.
- DNS rollback owner is known.

### Loop 136: real-domain Nginx enable controlled smoke

- Nginx enable approver is known.
- Maintenance window is known.
- External smoke approver is known.
- DNS rollback owner is known.
- `admin.taiyolabel.site` use is explicitly approved.
- Rollback procedure is approved.

### Loop 137: LINE webhook dry-run with approved HTTPS URL

- LINE official account admin is known.
- LINE webhook approver is known.
- HTTPS URL is confirmed.
- Webhook secret path policy is confirmed.
- Real push remains disabled during dry-run.

### Loop 138: Supabase staging secret injection checklist

- Supabase staging project owner is known.
- Staging project URL is prepared outside docs.
- Secret injection owner is known.
- Service role key non-display policy is approved.
- RLS/migration reviewer is known.
- Rollback to `in_memory` is approved.

## Production Readiness

```txt
production_readiness=production_no_go
```

## Not Performed

- DNS changes.
- certbot/HTTPS.
- Nginx reload/restart.
- external smoke.
- LINE/OpenAI/Supabase real connections.
- `.env` creation, mutation, or display.
- API/Auth/RLS/runtime/migration/UI changes.

## Remaining Risks

- Human owner and approver values are still not filled.
- Client-facing final hostname is still undecided.
- ACME method is still undecided.
- Public enablement remains blocked.

## Next Loop Candidates

1. Loop 135: ACME method decision after owner approval.
2. Loop 136: real-domain Nginx enable controlled smoke.
3. Loop 137: LINE webhook dry-run with approved HTTPS URL.
4. Loop 138: Supabase staging secret injection checklist.
5. Loop 139: production launch checklist finalization.

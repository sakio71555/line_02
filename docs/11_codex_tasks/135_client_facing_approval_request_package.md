# Loop 135: client-facing approval request package

## Goal

Create a client-facing approval request package that explains what the client / operations team must confirm before public launch work continues.

This Loop keeps `production_no_go`.

## Scope

- Create a clear client-facing request package.
- Explain what `admin.taiyolabel.site` is for.
- Explain which approvals are needed for DNS, HTTPS, LINE, and Supabase.
- Provide a reply form that the client / operations team can fill.
- Keep `admin.taiyolabel.site` as review/admin hostname.
- Keep client-facing final hostname as `undecided`.
- Keep production readiness as `production_no_go`.
- Update README, dev loop, production readiness, owner approval docs, and dev log.
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
latest_commit_before_loop=6f37cfb
review_admin_hostname=admin.taiyolabel.site
client_facing_final_hostname=undecided
owner_approval_status=pending
production_readiness=production_no_go
```

## Added Package

The request package is [../15_runbooks/client_facing_approval_request_package.md](../15_runbooks/client_facing_approval_request_package.md).

It explains:

- What to review on `admin.taiyolabel.site`.
- Why DNS owner / rollback owner approval is needed.
- Why HTTPS / ACME method approval is needed.
- Why Nginx enable / maintenance window approval is needed.
- Why LINE webhook approval is needed.
- Why Supabase staging and secret handling approval is needed.
- How to reply in a structured form.

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
- Public enablement remains blocked until written approvals are returned.

## Next Loop Candidates

1. Loop 136: ACME method decision after client approval.
2. Loop 137: real-domain Nginx enable controlled smoke after approval.
3. Loop 138: LINE webhook dry-run with approved HTTPS URL.
4. Loop 139: Supabase staging secret injection checklist.
5. Loop 140: production launch checklist finalization.

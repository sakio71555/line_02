# Loop 117: Real Domain Decision and DNS Provider Confirmation Plan

## Purpose

Loop 116 left the public domain, DNS provider, ownership, ACME method, and LINE webhook public URL undecided. Loop 117 adds a docs-only approval gate so those unknowns can be resolved safely before any public Nginx, DNS, HTTPS, or LINE configuration work.

## Scope

- Inventory repo-visible domain candidates and classify them.
- Keep canonical hostname, DNS provider, and ownership as `unknown` where not approved.
- Add a domain decision packet.
- Add a DNS provider confirmation checklist.
- Add a production domain approval sheet.
- Add static tests that keep templates placeholder-based and production readiness No-Go.
- Update README, dev loop docs, production readiness, and dev log.

## Out of Scope

- Deciding the canonical production hostname.
- DNS changes or DNS provider API usage.
- TXT DNS queries or TXT value handling.
- HTTPS issuance or certbot execution.
- Nginx active config changes, `sites-enabled` changes, reload, or restart.
- external HTTP/HTTPS smoke.
- LINE webhook registration.
- LINE/OpenAI/Supabase real connections.
- API/Auth/RLS/runtime/migration/UI changes.
- `.env` changes or secret display.

## Starting State

```text
work_folder=/Users/sakio/Desktop/PROJECT/amami-line-crm
start_git_status=clean
branch=main...origin/main
latest_commit=2d8a19c docs: add domain DNS HTTPS readiness inventory
production_readiness=production_no_go
canonical_hostname=unknown
dns_provider=unknown
domain_ownership=unknown
```

## Loop 116 Handoff

- `amamihome.net` is an official tenant/reference domain, not an approved deployment host.
- `admin.taiyolabel.site` and `api.taiyolabel.site` are historical separate-host candidates.
- `_CHANGE_ME_` and `amami-line-crm.invalid` are placeholders only.
- Existing `app.ajnl.net` / `api.ajnl.net` host/certificate belongs to another app and must not be reused.
- Loop 116 did not run DNS queries because no canonical hostname was approved.

## Candidate Classification

| candidate | classification | decision |
| --- | --- | --- |
| `<production-host>` | future approved hostname placeholder | unknown |
| `admin.taiyolabel.site` | historical separate Admin host candidate | ownership and DNS provider unknown |
| `api.taiyolabel.site` | historical separate API host candidate | ownership and DNS provider unknown |
| `amamihome.net` | tenant official/reference domain | not approved as Admin/API host |
| `_CHANGE_ME_` | template placeholder | not a real host |
| `amami-line-crm.invalid` | dry-run placeholder | not public DNS |
| `app.ajnl.net` / `api.ajnl.net` | existing other app host/certificate | do not reuse |

## URL Topology Recommendation

Recommended pending human approval:

```text
Option A: same-origin production hostname with /api/ path routing
```

Candidate shape:

```text
Admin: https://<production-host>/
API: https://<production-host>/api/
LINE webhook: https://<production-host>/api/line/webhook/<webhookSecretPath>
```

This is recommended because it matches the Loop 115 single-server-block route shape and avoids adding separate-origin CORS complexity. It is not a final decision.

Alternative:

```text
Option B: separate Admin/API hostnames
```

This keeps the older `admin.taiyolabel.site` / `api.taiyolabel.site` split, but ownership, DNS provider, CORS, and certificate names must be re-confirmed first.

## DNS Query Status

```text
dns_query_executed=no
reason=multiple_candidates_and_no_canonical_hostname
txt_query_executed=no
```

Loop 117 did not query public DNS. A later read-only DNS Loop may run A/AAAA/CNAME/NS/CAA/DS checks after a single canonical hostname is approved. TXT queries remain forbidden in Codex logs.

## Added / Updated Files

- `docs/15_runbooks/domain_decision_packet.md`
- `docs/15_runbooks/dns_provider_confirmation_checklist.md`
- `docs/15_runbooks/production_domain_approval_sheet.md`
- `deploy/vps/taiyolabel/preflight/check_domain_dns_https_readiness.sh`
- `tests/integration/production-domain-approval-gate.test.ts`

## Test Content

- Loop 117 docs exist.
- Approval sheet contains the required human confirmation fields.
- DNS checklist keeps DNS changes, TXT query, Nginx reload/restart, and certbot execution forbidden.
- Canonical hostname remains unknown.
- Nginx templates remain placeholder-based.
- Production readiness remains `production_no_go`.
- Preflight helper supports `--no-dns` and does not contain active publish commands.

## Not Done

- Real domain decision.
- DNS provider confirmation.
- DNS query.
- HTTPS issuance.
- Nginx public enablement.
- LINE webhook registration.
- LINE/OpenAI/Supabase real connection.

## Residual Risks

- A human still needs to approve the real production hostname and DNS owner.
- The DNS provider, A/AAAA target, CAA, DNSSEC, and rollback owner are unknown.
- LINE webhook URL and Auth callback URL are unknown.
- Production readiness remains No-Go.

## Next Loop Candidates

1. Loop 118: approved domain read-only DNS confirmation
2. Loop 119: real domain Nginx placeholder replacement plan
3. Loop 120: HTTPS issuance approval gate

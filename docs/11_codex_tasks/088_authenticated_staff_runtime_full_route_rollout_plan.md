# Loop 088: authenticated staff runtime full route rollout plan

## Goal

Loop 087で追加した `x-selected-tenant-id` / selectedTenantId boundaryを、全Admin routeへどう展開するかをdocs-onlyで固定する。

今回はroute実装を行わない。Supabase Auth/JWT、RLS SQL、production `dev_header` rejection、Admin UI selected tenant保存、LINE/OpenAI本接続も行わない。

## Scope

- 現在のAdmin API routeを棚卸しする。
- routeごとのruntime、tenant scope、AdminAction、role guard、selectedTenantId再検証要否を整理する。
- `dev_header` 互換をどこまで残し、production拒否をどのLoopで扱うか整理する。
- customer / alerts / RAG / dev seed / LINE webhook / health routeを分類する。
- 全route rolloutを小さいLoopへ分割する。
- Go/No-Go gateを定義する。
- runbook、README、database docs、dev loop docs、production hardening docs、dev logを更新する。
- docs integration testを追加する。

## Out of Scope

- Admin API route実装変更。
- authenticated_staff runtimeの全route接続。
- Supabase Auth/JWT本接続。
- RLS SQL実装。
- migration SQL変更。
- production `x-tenant-id` / `dev_header` rejection実装。
- Admin UI selected tenant保存。
- repository変更。
- `.env` 作成・変更。
- Supabase DB接続。
- LINE API / OpenAI API呼び出し。
- Webクロール。

## Starting State

Loop 087完了済み:

- authenticated_staff runtime向けに `x-selected-tenant-id` transport boundaryを追加。
- `selectedTenantId` は権限ではなくselectorとして扱う。
- active `staff_tenant_memberships` で再検証してから `AdminTenantContext.tenantId` を確定する。
- repository/serviceへ渡すtenantは検証済み `AdminTenantContext.tenantId` のみ。
- dev_header pathでは `x-selected-tenant-id` を使わず、既存 `x-tenant-id` 互換を維持する。
- `GET /api/admin/customers` はrepresentative routeとしてauthenticated_staff runtimeを確認済み。

未完了:

- authenticated_staff runtime full route rollout。
- production `dev_header` rejection。
- Supabase Auth/JWT本接続。
- RLS SQL。
- Admin UI selected tenant保存。
- LINE/OpenAI本接続。

## Admin Route Inventory

`apps/api/src/index.ts` 時点のroute:

| route | category | tenant scoped | current runtime |
| --- | --- | ---: | --- |
| `GET /health` | health/check | No | public/internal health |
| `POST /api/dev/seed-demo-data` | dev-only seed | Yes | non-production `dev_header` |
| `GET /api/admin/customers` | customer read | Yes | `dev_header` plus representative `authenticated_staff` path |
| `GET /api/admin/customers/:customerId` | customer read | Yes | `dev_header` |
| `GET /api/admin/customers/:customerId/timeline` | customer read | Yes | `dev_header` |
| `POST /api/admin/customers/:customerId/ai-summary` | customer AI write | Yes | `dev_header` |
| `POST /api/admin/customers/:customerId/ai-reply-draft` | customer AI draft | Yes | `dev_header` |
| `POST /api/admin/rag/search` | RAG read/search | Yes | `dev_header` |
| `POST /api/admin/rag/answer-draft` | RAG draft | Yes | `dev_header` |
| `POST /api/admin/customers/:customerId/reply` | customer write/LINE boundary | Yes | `dev_header` |
| `GET /api/admin/alerts` | alert read | Yes | `dev_header` |
| `POST /api/admin/alerts/check-unreplied` | alert write/checker | Yes | `dev_header` |
| `POST /api/admin/alerts/notify-open` | alert notification boundary | Yes | `dev_header` |
| `POST /api/line/webhook/:webhookSecret` | LINE webhook | Yes, by webhook tenant | LINE signature + webhook secret |

## Route Matrix

| route | current runtime | authenticated_staff required | selectedTenantId required | AdminAction | role guard | dev_header compatibility | rollout phase | notes |
| --- | --- | ---: | ---: | --- | --- | --- | --- | --- |
| `GET /api/admin/customers` | representative `authenticated_staff` + `dev_header` fallback | Yes | If multiple active memberships | `view_customers` | Enforce in authenticated path | Keep until production rejection | already representative, re-check in Loop 089 | Uses verified `AdminTenantContext.tenantId` in authenticated path |
| `GET /api/admin/customers/:customerId` | `dev_header` | Yes | If multiple active memberships | `view_customer_detail` | Required | Keep until production rejection | Loop 089 | Other-tenant customer remains 404 |
| `GET /api/admin/customers/:customerId/timeline` | `dev_header` | Yes | If multiple active memberships | `view_timeline` | Required | Keep until production rejection | Loop 089 | Messages must be filtered by tenant + customer |
| `POST /api/admin/customers/:customerId/reply` | `dev_header` | Yes | If multiple active memberships | `send_staff_reply` | Required | Keep until production rejection | Loop 090 | Real LINE push remains separately gated |
| `POST /api/admin/customers/:customerId/ai-summary` | `dev_header` | Yes | If multiple active memberships | `create_ai_summary` | Required | Keep until production rejection | Loop 090 | Saves AI summary message, so write/side-effect route |
| `POST /api/admin/customers/:customerId/ai-reply-draft` | `dev_header` | Yes | If multiple active memberships | `create_ai_reply_draft` | Required | Keep until production rejection | Loop 090 | Response-only draft, no message save |
| `GET /api/admin/alerts` | `dev_header` | Yes | If multiple active memberships | `view_alerts` | Required | Keep until production rejection | Loop 091 | Tenant-scoped alert list |
| `POST /api/admin/alerts/check-unreplied` | `dev_header` | Yes | If multiple active memberships | `check_unreplied_alerts` | Required | Keep until production rejection | Loop 091 | Creates tenant-scoped open alerts |
| `POST /api/admin/alerts/notify-open` | `dev_header` | Yes | If multiple active memberships | `notify_open_alerts` | Required | Keep until production rejection | Loop 091 | Uses MockStaffNotifier until real LINE notification gate |
| `POST /api/admin/rag/search` | `dev_header` | Yes | If multiple active memberships | `search_rag` | Required | Keep until production rejection | Loop 092 | Tenant knowledge and `allowed_for_ai=true` only |
| `POST /api/admin/rag/answer-draft` | `dev_header` | Yes | If multiple active memberships | `create_rag_answer_draft` | Required | Keep until production rejection | Loop 092 | Draft only; OpenAI real API remains gated |
| `POST /api/dev/seed-demo-data` | non-production `dev_header` | No | No | none; `run_dev_seed` not production-granted | Excluded | Reject in production/dev route hardening | Loop 093 or separate dev route hardening | Development utility only |
| `POST /api/line/webhook/:webhookSecret` | LINE webhook secret + signature | No | No | none | Excluded | Not applicable | Excluded | Tenant resolved from webhook path/settings, not staff session |
| `GET /health` | health/check | No | No | none | Excluded | Not applicable | Excluded | Must not expose secrets |

## Customer Routes Policy

Customer routes are tenant scoped and customer scoped.

Rules:

- All customer routes should support authenticated_staff runtime before production.
- `selectedTenantId` is accepted only as a selector and revalidated with active membership.
- repository/service receives only `AdminTenantContext.tenantId`.
- customer detail and timeline must keep other-tenant customer behavior as 404.
- `POST /reply` requires `send_staff_reply`.
- `POST /ai-summary` requires `create_ai_summary` because it saves an AI summary message.
- `POST /ai-reply-draft` requires `create_ai_reply_draft`; it remains response-only and does not send to LINE.
- Real LINE push and OpenAI real API remain separate gates.

## Alerts Routes Policy

Alerts routes are tenant scoped and operational.

Rules:

- `GET /api/admin/alerts` requires `view_alerts`.
- `POST /api/admin/alerts/check-unreplied` requires `check_unreplied_alerts`.
- `POST /api/admin/alerts/notify-open` requires `notify_open_alerts`.
- `notify-open` stays separated from real LINE group notification. Current boundary remains `MockStaffNotifier`.
- alert repository queries must use confirmed tenant scope only.
- open/notified status transitions must not cross tenant boundaries.

## RAG Routes Policy

RAG routes are tenant scoped AI support routes.

Rules:

- `POST /api/admin/rag/search` requires `search_rag`.
- `POST /api/admin/rag/answer-draft` requires `create_rag_answer_draft`.
- RAG search must continue to use tenant-scoped knowledge only.
- `allowed_for_ai=true` remains required.
- RAG answer draft is a draft only and is not sent to LINE.
- OpenAI real provider remains a later explicit gate.

## Dev Seed Routes Policy

`POST /api/dev/seed-demo-data` is excluded from authenticated_staff route rollout.

Rules:

- dev-only utility.
- disabled in production today.
- production hardening may add stricter rejection, but not in this Loop.
- do not treat `run_dev_seed` as a production role-granted action.
- do not connect Supabase Auth/JWT just to seed demo data.

## LINE Webhook Routes Policy

LINE webhook routes are not Admin staff routes.

Rules:

- `POST /api/line/webhook/:webhookSecret` remains outside authenticated_staff runtime.
- tenant is resolved from webhook secret/path and tenant LINE settings, not selectedTenantId.
- LINE signature verification remains the trust boundary.
- AdminAction and role guard do not apply.
- selectedTenantId is ignored.

## Health Routes Policy

`GET /health` is not tenant-owned Admin data.

Rules:

- authenticated_staff runtime is not required.
- selectedTenantId is not required.
- AdminAction and role guard do not apply.
- response must not expose secrets, tokens, project refs, or DB URLs.

## AdminAction / Role Guard Summary

Existing `packages/domain/src/admin-permissions.ts` and `apps/api/src/admin/role-guarded-handler.ts` already define the AdminAction candidates required for current Admin routes.

| route group | AdminAction | owner | manager | staff |
| --- | --- | ---: | ---: | ---: |
| customers list | `view_customers` | Yes | Yes | Yes |
| customer detail | `view_customer_detail` | Yes | Yes | Yes |
| customer timeline | `view_timeline` | Yes | Yes | Yes |
| staff reply | `send_staff_reply` | Yes | Yes | Yes |
| AI summary | `create_ai_summary` | Yes | Yes | No |
| AI reply draft | `create_ai_reply_draft` | Yes | Yes | Yes |
| RAG search | `search_rag` | Yes | Yes | Yes |
| RAG answer draft | `create_rag_answer_draft` | Yes | Yes | Yes |
| alerts list | `view_alerts` | Yes | Yes | Yes |
| check unreplied alerts | `check_unreplied_alerts` | Yes | Yes | No |
| notify open alerts | `notify_open_alerts` | Yes | Yes | No |

No new AdminAction is implemented in this Loop. If future routes require new actions, add them in a dedicated permission boundary Loop before route rollout.

## Rollout Phase Split

### Loop 089: authenticated_staff runtime rollout for customer read routes

- Purpose: connect authenticated_staff runtime to customer read routes.
- Routes: `GET /api/admin/customers`, `GET /api/admin/customers/:customerId`, `GET /api/admin/customers/:customerId/timeline`.
- Scope: Authorization path, `x-selected-tenant-id`, role guard, tenant/customer 404 tests.
- Out of Scope: write routes, AI/RAG actions, alerts, production dev_header rejection, real Auth/JWT.
- Tests: dev_header compatibility, authenticated owner/manager/staff allow, selectedTenantId membership checks, other-tenant customer 404.
- Stop condition: route response contract change required or raw selectedTenantId would reach repository.
- Done: read routes work through authenticated_staff runtime and current dev_header compatibility remains.

### Loop 090: authenticated_staff runtime rollout for customer write / AI routes

- Purpose: connect authenticated_staff runtime to reply and AI customer actions.
- Routes: `/reply`, `/ai-summary`, `/ai-reply-draft`.
- Scope: AdminAction guard, tenant/customer scope, no real LINE/OpenAI, summary write and draft response behavior.
- Out of Scope: alerts/RAG rollout, real LINE push, real OpenAI, production dev_header rejection.
- Tests: permission denial for staff on `create_ai_summary`, no message save on draft/provider failure, tenant isolation.
- Stop condition: real LINE/OpenAI connection needed.
- Done: customer write/AI routes accept authenticated_staff runtime without changing mock providers.

### Loop 091: authenticated_staff runtime rollout for alerts routes

- Purpose: connect authenticated_staff runtime to alert list/check/notify.
- Routes: `GET /api/admin/alerts`, `POST /api/admin/alerts/check-unreplied`, `POST /api/admin/alerts/notify-open`.
- Scope: role guard, tenant-scoped alert queries, MockStaffNotifier path.
- Out of Scope: real LINE group notification, scheduler, RLS SQL, production dev_header rejection.
- Tests: owner/manager allow, staff denied for check/notify, other-tenant alerts excluded, notified transition scoped.
- Stop condition: real notifier required or alert schema/runtime change required.
- Done: alert routes run authenticated_staff path and keep mock notification boundary.

### Loop 092: authenticated_staff runtime rollout for RAG routes

- Purpose: connect authenticated_staff runtime to RAG search and answer draft.
- Routes: `POST /api/admin/rag/search`, `POST /api/admin/rag/answer-draft`.
- Scope: role guard, selected tenant validation, tenant-scoped knowledge, `allowed_for_ai=true`.
- Out of Scope: OpenAI real API, embeddings, web crawl, RLS SQL.
- Tests: tenant A cannot see tenant B knowledge, disallowed knowledge excluded, permission mapping.
- Stop condition: OpenAI or vector search needed.
- Done: RAG routes accept authenticated_staff runtime and remain mock/source-grounded.

### Loop 093: production dev_header rejection

- Purpose: reject `x-tenant-id` / `dev_header` in production after authenticated route coverage exists.
- Routes: Admin routes and dev utility routes as scoped by the Loop.
- Scope: production env detection, error mapping, local/test compatibility.
- Out of Scope: RLS SQL, real Auth/JWT, UI token forwarding.
- Tests: production rejects dev_header, local/test remains compatible, Authorization path still works.
- Stop condition: authenticated route coverage incomplete.
- Done: production no longer trusts dev_header.

### Loop 094: Supabase Auth/JWT runtime connection

- Purpose: replace fake verifier with real server-side Auth/JWT boundary.
- Scope: Supabase Auth verifier, StaffAuthLookup wiring, no secrets in logs.
- Out of Scope: RLS SQL apply, Admin UI selected tenant persistence, LINE/OpenAI real providers.
- Tests: fake/local and real/staging-safe session verification split, expired/invalid/membership errors.
- Stop condition: secret exposure, real production DB dependency, or broad runtime switch needed.
- Done: authenticated_staff runtime can be backed by Supabase Auth in a controlled environment.

### Loop 095: RLS policy draft for tenant-scoped core tables

- Purpose: draft/review RLS SQL for core tenant-owned tables.
- Scope: SQL draft and tests/fixtures depending on the Loop approval.
- Out of Scope: production apply, LINE/OpenAI, UI.
- Tests: tenant A cannot read/write tenant B rows in local/staging test DB when apply Loop runs.
- Stop condition: Auth/JWT assumptions unresolved.
- Done: RLS SQL is ready for a dedicated apply/test Loop.

## Go / No-Go Gate

Go conditions before implementation rollout:

- selectedTenantId representative route tests pass.
- `AdminTenantContext.tenantId` is the only repository tenant filter.
- dev_header path compatibility remains explicitly preserved until production rejection Loop.
- route matrix is complete.
- AdminAction coverage is known.
- route role guard behavior is clear.
- production `dev_header` rejection is separately planned.

No-Go conditions:

- route tenant scope is unclear.
- AdminAction is missing or permission behavior is unknown.
- raw selectedTenantId would need to reach repository/service code.
- dev_header compatibility would be broken before production rejection.
- API response contract changes are required.
- Supabase Auth/JWT real connection is required.
- RLS SQL is required.
- real LINE/OpenAI connection is required.

## Why This Loop Does Not Implement Routes

Full route rollout touches all Admin data and side-effect routes. It also affects auth errors, role guard behavior, selected tenant transport, local/dev compatibility, and future production rejection.

Implementing everything in one pass would mix read routes, write routes, AI/RAG routes, alert notification routes, and production hardening. This violates loop engineering, so Loop 088 fixes the matrix and rollout order only.

## Test Result

Loop 088 adds docs integration coverage for:

- task doc and runbook existence.
- route matrix coverage.
- customer / alerts / RAG / dev seed / LINE webhook / health route policies.
- AdminAction and role guard summary.
- rollout phases and Go/No-Go gate.
- README/runbook links.
- no migration/RLS SQL/runtime implementation in this Loop.

## Residual Risks

- authenticated_staff runtime is still connected only to the representative `GET /api/admin/customers` route.
- Admin UI selected tenant persistence is not implemented.
- Supabase Auth/JWT real verification is not connected.
- production `dev_header` rejection is not implemented.
- RLS SQL is not implemented.
- LINE/OpenAI real providers remain disabled/mock.

## Next Loop

Loop 089: authenticated_staff runtime rollout for customer read routes.

# Authenticated Staff Runtime Route Rollout

## Purpose

Loop 087で追加した `x-selected-tenant-id` boundaryを、全Admin routeへ安全に広げるためのroute rollout runbookです。

このrunbookは計画書です。Admin API route実装、Supabase Auth/JWT本接続、RLS SQL、production `dev_header` rejection、LINE/OpenAI本接続はここでは行いません。

## Audience

- authenticated_staff runtimeをAdmin API routeへ接続する開発者
- selectedTenantId / role guard / production hardeningの境界を確認する人
- production readinessを判断する人

## Current State

| area | state |
| --- | --- |
| default runtime | `in_memory` |
| Admin local selector | `x-tenant-id` / `dev_header` |
| authenticated_staff route | Loop 089でcustomer read routesへ展開済み。Loop 090でcustomer write / AI routesへ展開済み |
| selectedTenantId transport | `x-selected-tenant-id` implemented in Loop 087 |
| selectedTenantId validation | tenant id format validation + active membership revalidation |
| role guard | AdminAction mapping exists; enforced only for authenticated_staff compatibility path |
| production dev_header rejection | not implemented |
| Supabase Auth/JWT | not connected |
| RLS SQL | not implemented |
| LINE/OpenAI real providers | disabled/mock |
| production readiness | No-Go |

## selectedTenantId Boundary

`selectedTenantId` is a selector, not permission.

Rules:

- `x-selected-tenant-id` is for authenticated_staff runtime.
- `x-tenant-id` remains the temporary dev_header selector.
- raw selectedTenantId must never be passed to repository/service filters.
- active `staff_tenant_memberships` is the authority.
- repositories receive only verified `AdminTenantContext.tenantId`.
- multiple active memberships without selection returns `tenant_selection_required`.
- selected tenant outside active memberships returns `tenant_membership_denied`.
- invalid tenant id format returns `invalid_selected_tenant_id`.

## Route Matrix

| route | category | authenticated_staff rollout | selectedTenantId | AdminAction | notes |
| --- | --- | --- | --- | --- | --- |
| `GET /api/admin/customers` | customer read | Loop 089 done | revalidate if provided | `view_customers` | dev_header fallback remains until production rejection |
| `GET /api/admin/customers/:customerId` | customer read | Loop 089 done | revalidate | `view_customer_detail` | other-tenant customer remains 404 |
| `GET /api/admin/customers/:customerId/timeline` | customer read | Loop 089 done | revalidate | `view_timeline` | tenant + customer scoped messages |
| `POST /api/admin/customers/:customerId/reply` | customer write | Loop 090 done | revalidate | `send_staff_reply` | real LINE push remains gated |
| `POST /api/admin/customers/:customerId/ai-summary` | AI write | Loop 090 done | revalidate | `create_ai_summary` | saves summary message; OpenAI real API remains gated |
| `POST /api/admin/customers/:customerId/ai-reply-draft` | AI draft | Loop 090 done | revalidate | `create_ai_reply_draft` | response-only draft |
| `GET /api/admin/alerts` | alert read | Loop 091 | revalidate | `view_alerts` | tenant-scoped list |
| `POST /api/admin/alerts/check-unreplied` | alert checker | Loop 091 | revalidate | `check_unreplied_alerts` | creates open alerts |
| `POST /api/admin/alerts/notify-open` | notification boundary | Loop 091 | revalidate | `notify_open_alerts` | MockStaffNotifier until real LINE gate |
| `POST /api/admin/rag/search` | RAG search | Loop 092 | revalidate | `search_rag` | tenant knowledge + `allowed_for_ai=true` |
| `POST /api/admin/rag/answer-draft` | RAG draft | Loop 092 | revalidate | `create_rag_answer_draft` | source-grounded draft only |
| `POST /api/dev/seed-demo-data` | dev-only | excluded | no | none | production disabled/dev hardening only |
| `POST /api/line/webhook/:webhookSecret` | LINE webhook | excluded | no | none | LINE signature + webhook tenant boundary |
| `GET /health` | health/check | excluded | no | none | no secrets in response |

## Route Classification

### Customer Routes

- tenant scoped and often customer scoped.
- authenticated_staff required before production.
- `selectedTenantId` must be revalidated.
- role guard actions: `view_customers`, `view_customer_detail`, `view_timeline`, `send_staff_reply`, `create_ai_summary`, `create_ai_reply_draft`.
- repository/service receives only verified tenant context.
- real LINE/OpenAI integrations stay separate.

Loop 089 completion note:

- `GET /api/admin/customers`, `GET /api/admin/customers/:customerId`, and `GET /api/admin/customers/:customerId/timeline` support authenticated_staff runtime.
- customer read routes accept `x-selected-tenant-id`, revalidate it through active membership, and use only verified `AdminTenantContext.tenantId` for repository/service calls.
- `dev_header` / `x-tenant-id` compatibility remains.

Loop 090 completion note:

- `POST /api/admin/customers/:customerId/reply`, `POST /api/admin/customers/:customerId/ai-summary`, and `POST /api/admin/customers/:customerId/ai-reply-draft` support authenticated_staff runtime.
- customer write / AI routes accept `x-selected-tenant-id`, revalidate it through active membership, and use only verified `AdminTenantContext.tenantId` for customer lookup, message write, LINE mock boundary, and AI mock provider input.
- other-tenant customers stay hidden behind `customer_not_found`.
- `dev_header` / `x-tenant-id` compatibility and default `in_memory` remain.
- real LINE push and OpenAI real API remain disconnected.

### Alerts Routes

- tenant scoped operational routes.
- authenticated_staff required before production.
- role guard actions: `view_alerts`, `check_unreplied_alerts`, `notify_open_alerts`.
- `notify-open` stays on MockStaffNotifier until a real LINE notification gate.
- open/notified status changes must be tenant scoped.

### RAG Routes

- tenant scoped knowledge search/draft routes.
- authenticated_staff required before production.
- role guard actions: `search_rag`, `create_rag_answer_draft`.
- `allowed_for_ai=true` remains mandatory.
- OpenAI real provider, embedding, and web crawl are separate gates.

### Dev Seed Route

- local/dev utility only.
- not part of production authenticated_staff rollout.
- do not treat `run_dev_seed` as production-granted access.
- production route rejection can be hardened separately.

### LINE Webhook Route

- not an Admin route.
- tenant is resolved from webhook secret/path/settings.
- LINE signature verification is the trust boundary.
- selectedTenantId and AdminAction do not apply.

### Health Route

- not tenant-owned Admin data.
- no authenticated_staff or selectedTenantId requirement.
- must not expose secrets or project identifiers.

## Role Guard Policy

Existing AdminAction coverage:

```text
view_customers
view_customer_detail
view_timeline
send_staff_reply
create_ai_summary
create_ai_reply_draft
search_rag
create_rag_answer_draft
view_alerts
check_unreplied_alerts
notify_open_alerts
```

Role direction:

- `owner`: all role-guarded Admin actions.
- `manager`: operational customer, AI/RAG, alert actions.
- `staff`: customer read, staff reply, AI reply draft, RAG, alert view.
- `staff` is denied for `create_ai_summary`, `check_unreplied_alerts`, and `notify_open_alerts`.

If a route needs an unknown AdminAction, stop and add the permission boundary in a separate Loop.

## dev_header Compatibility

Current `x-tenant-id` / `dev_header` remains for local/test compatibility until production rejection is implemented.

Rules:

- Do not treat dev_header as production auth.
- Do not remove dev_header while authenticated route rollout is incomplete.
- Production rejection is a separate hardening Loop.
- Authenticated path should use `Authorization: Bearer` plus `x-selected-tenant-id` when needed.

## Rollout Order

```text
Loop 089: authenticated_staff runtime rollout for customer read routes (done)
Loop 090: authenticated_staff runtime rollout for customer write/AI draft routes (done)
Loop 091: authenticated_staff runtime rollout for alerts routes
Loop 092: authenticated_staff runtime rollout for RAG routes
Loop 093: production dev_header rejection
Loop 094: Supabase Auth/JWT runtime connection
Loop 095: RLS policy draft for tenant-scoped core tables
```

Each rollout Loop must keep scope small, preserve current response contracts, and avoid real LINE/OpenAI/Supabase production connections.

## Go Conditions

- representative selectedTenantId tests pass.
- route matrix is complete.
- AdminAction mapping is known for every Admin route.
- selectedTenantId never goes directly to repository/service filters.
- `AdminTenantContext.tenantId` is the only trusted tenant scope.
- dev_header compatibility remains until a dedicated rejection Loop.
- production No-Go reasons remain visible.

## No-Go Conditions

- route tenant scope is unclear.
- AdminAction is missing.
- raw selectedTenantId would be needed in domain/repository code.
- response contract would need to change.
- real Supabase Auth/JWT, RLS SQL, LINE, or OpenAI is required.
- route implementation would mix read, write, RAG, alerts, and production hardening in one Loop.

## Do Not Do

- Do not connect all routes in one pass.
- Do not implement production dev_header rejection in a route rollout planning Loop.
- Do not add RLS SQL here.
- Do not use selectedTenantId as permission.
- Do not pass selectedTenantId to repositories.
- Do not expose service_role key or env values.
- Do not call LINE/OpenAI real APIs.

## Next Conditions

Proceed to Loop 091 only when:

- Loop 090 docs/tests/build pass.
- git status is clean after commit.
- customer read and customer write / AI route rollout remains limited to customer routes.
- alerts rollout scope is limited to `GET /api/admin/alerts`, `POST /api/admin/alerts/check-unreplied`, and `POST /api/admin/alerts/notify-open`.

## Related Docs

- [Loop 087: selectedTenantId transport boundary](../11_codex_tasks/087_selected_tenant_transport_boundary.md)
- [Loop 088: authenticated staff runtime full route rollout plan](../11_codex_tasks/088_authenticated_staff_runtime_full_route_rollout_plan.md)
- [Loop 089: authenticated_staff customer read routes](../11_codex_tasks/089_authenticated_staff_customer_read_routes.md)
- [Loop 090: authenticated_staff customer write / AI routes](../11_codex_tasks/090_authenticated_staff_customer_write_ai_routes.md)
- [Production Hardening Split Plan](production_hardening_split_plan.md)
- [RLS/Auth Production Readiness](rls_auth_production_readiness.md)

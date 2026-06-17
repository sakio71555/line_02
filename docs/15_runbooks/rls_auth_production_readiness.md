# RLS/Auth Production Readiness

## Purpose

Supabase stagingでcustomers/messagesの永続化smokeが通った後、productionへ進む前に必要なRLS、Supabase Auth/JWT、staff membership、selectedTenantId、role guard、外部送信gateを確認するためのrunbookです。

## Audience

- production readinessを判断する開発者
- RLS/Auth/JWT実装Loopを設計する人
- staging smokeからproduction hardeningへ進めるか判断する人

## Current Staging State

- `0001_initial_schema.sql` はstagingへ適用済み。
- `0002_service_role_postgrest_grants.sql` はstaging PostgREST/Data API smokeのために `service_role` 限定で適用済み。
- customers/messagesは、明示注入したSupabase runtime bundleでstaging smoke済み。
- alertsは、明示注入したSupabase runtime bundleでstaging smoke済み。
- knowledge_pages/RAGは、明示注入したSupabase runtime bundleでstaging smoke済み。
- staging拡張検証版100%相当。
- default runtimeは `in_memory` のまま。
- staff/auth runtimeはSupabase Auth/JWTへ未接続。
- RLS enabled tablesは `0/12`。
- LINE real pushはdisabled/mock。
- OpenAI APIはmock。
- production readiness: No-Go。

## Production Readiness No-Go

production readiness: No-Go

No-Go理由:

- RLS 未実装。RLS SQL draftはLoop 094Aで追加済み。ただし未apply・未検証。
- Supabase Auth/JWT 未接続。
- selectedTenantId transport boundaryはLoop 087で実装済み。
- Loop 088で全Admin route rollout planを整理済み。
- Loop 089でcustomer read routesへauthenticated_staff runtimeを展開済み。
- Loop 090でcustomer write / AI routesへauthenticated_staff runtimeを展開済み。
- Loop 091でalerts routesへauthenticated_staff runtimeを展開済み。
- Loop 092でRAG routesへauthenticated_staff runtimeを展開済み。
- Loop 093でproduction dev_header rejectionとdev seed route rejectionを実装済み。
- selectedTenantId membership再検証は現在の主要Admin routeまで確認済みだが、UI保存は未完了。
- Supabase Auth/JWT本接続 未実装。
- service_role grantsはstaging PostgREST smoke用で、production authorizationではない。
- LINE real push disabled。
- OpenAI mock。
- staff/auth runtimeは未完了。

## Production Hardening Split Plan

Loop 086では、staging拡張検証版100%相当の次に進む前にproduction hardeningを分割しました。RLS/Auth/JWT、selectedTenantId、production dev_header rejection、LINE real push、OpenAI real APIは一度に実装せず、小さいLoopへ分けます。

詳細は [Loop 086 task doc](../11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md) と [Production Hardening Split Plan](production_hardening_split_plan.md) を参照してください。

## RLS/Auth/JWT Checklist

Before production:

- [x] RLS SQL is drafted for core tables.
- [ ] RLS SQL is applied and verified in local/staging test DB.
- [ ] local or staging test DB verifies tenant A cannot read/write tenant B rows.
- [ ] Supabase Auth/JWT verification is connected to Admin API.
- [ ] `auth.uid()` maps to `staff_users.auth_user_id`.
- [ ] only active `staff_users` are allowed.
- [ ] only active `staff_tenant_memberships` grant tenant access.
- [ ] role is read from active membership.
- [ ] selectedTenantId is revalidated against active memberships.
- [x] production rejects `x-tenant-id` / `dev_header`.
- [ ] service_role usage is server-side only and minimized.
- [ ] browser / LIFF / Next client components do not receive service role keys.

## Table Policy Summary

| table | tenant_id | policy direction | production readiness |
| --- | ---: | --- | --- |
| `tenants` | No | authenticated staff reads only membership tenants; platform admin separate | RLS needed |
| `tenant_line_settings` | Yes | server/admin settings only; secrets never exposed | RLS and secret review needed |
| `tenant_ai_settings` | Yes | server/admin settings only | RLS needed |
| `customers` | Yes | active staff membership via API, tenant scoped | staging smoke done; RLS/Auth missing |
| `messages` | Yes | active staff membership via API, tenant/customer scoped | staging smoke done; RLS/Auth missing |
| `alerts` | Yes | active staff membership via API/checker/notifier | staging smoke done; authenticated route rollout done; RLS/Auth missing |
| `knowledge_pages` | Yes | tenant scoped and `allowed_for_ai` for RAG | staging smoke done; authenticated route rollout done; RLS/Auth missing |
| `staff_users` | Yes | maps Supabase Auth user to staff identity | Auth/RLS missing |
| `staff_tenant_memberships` | Yes | active membership decides tenant and role | critical before production |

## Loop 094A RLS Draft

Loop 094AでRLS SQL draftを追加しました。

```text
packages/db/migrations/0003_rls_core_tables.sql
scripts/dev-loop/verify-rls-migration-static.mjs
tests/integration/rls-core-tables-migration-static.test.ts
```

Draft方針:

- `authenticated` は `auth.uid()::text` を `staff_users.auth_user_id` と照合する。
- `staff_users.status = 'active'` と `staff_users.is_active = true` を必須にする。
- `staff_tenant_memberships.status = 'active'` を必須にする。
- tenant-owned tablesはactive membershipの `tenant_id` とrowの `tenant_id` を照合する。
- `knowledge_pages` は `allowed_for_ai = true` も必須にする。
- `anon` / `public` へのgrant/policyは作らない。
- `service_role` 既存grantは変更しない。
- `using true` / `with check true` / broad grantは静的検証で禁止する。

Loop 094Aではstaging applyをしていない。次Loopでlocal/staging test DBに限定してapplyし、tenant A/B境界、anon拒否、service_role bypass前提のrepository filterを確認する。

## Service Role Policy

service_role はserver-side onlyです。

- browser、LIFF、Next client componentに出さない。
- README、docs、dev log、terminal output、screenshotへ値を書かない。
- service_roleはRLS bypass前提のため、repositoryの `tenant_id` filter testを残す。
- staging検証では使用中だが、productionでは利用範囲を最小化し、監査対象にする。
- broad `anon` / `authenticated` table grantsは付けない。

## Role-based DB Access

| role | production policy |
| --- | --- |
| `service_role` | server-side only。RLS bypass前提のため、repository tenant filterと監査を必須にする。 |
| `anon` | CRM admin dataへ直接アクセスさせない。LIFFで使う場合も限定的にし、RLS前提にする。 |
| `authenticated` | Supabase Auth済みuser。`auth.uid()` を `staff_users.auth_user_id` へ接続し、active membershipでtenant/roleを決める。 |
| `postgres/admin` | migration/apply/maintenance用。runtimeでは使わない。 |

## Authenticated Staff Policy

Production Admin APIは、request headerの `x-tenant-id` ではなく認証済みstaff contextからtenantを決めます。

```text
Authorization Bearer token
-> Supabase Auth/JWT verification
-> auth_user_id
-> staff_users.auth_user_id
-> active staff check
-> staff_tenant_memberships active check
-> AdminTenantContext(source=authenticated_staff)
-> role guard
-> repository with confirmed tenant_id
```

Rules:

- inactive staff is denied.
- inactive membership is denied.
- membership role decides allowed AdminAction.
- `staff_users.tenant_id` is compatibility data, not production authority.
- `staff_tenant_memberships` is the production tenant/role source.

## selectedTenantId Revalidation

- `selectedTenantId` is not permission.
- It is only a requested tenant selector.
- Loop 087 uses `x-selected-tenant-id` as the authenticated_staff transport boundary.
- Loop 088 maps how that boundary should be rolled out to customer, alerts, and RAG Admin routes.
- Loop 089 applies that boundary to customer read routes.
- Loop 090 applies that boundary to customer write / AI routes while keeping LINE real push and OpenAI real API disconnected.
- Loop 091 applies that boundary to alerts routes while keeping MockStaffNotifier and real LINE notification disconnected.
- Loop 092 applies that boundary to RAG routes while keeping MockAiProvider and OpenAI real API disconnected.
- Loop 093 rejects production `x-tenant-id` / `dev_header` and keeps `x-selected-tenant-id` as selector only.
- `x-selected-tenant-id` is a selector, not authentication.
- `x-selected-tenant-id` is separate from dev-only `x-tenant-id`.
- If staff has multiple active memberships and no selected tenant, return `tenant_selection_required`.
- If selected tenant is outside active memberships, return `tenant_membership_denied`.
- Invalid selector format returns `invalid_selected_tenant_id`.
- Repositories receive only `AdminTenantContext.tenantId`.
- Raw selectedTenantId is never used as a data filter.

## Production Dev Header Rejection

- local/dev/test can keep `dev_header` compatibility.
- staging should limit dev_header to explicit dummy verification paths while authenticated runtime is tested.
- production mode is `APP_ENV=production` or `NODE_ENV=production`.
- production must reject `x-tenant-id` / `dev_header`.
- production requires `Authorization: Bearer` plus authenticated staff context.
- Expected errors include `dev_tenant_header_not_allowed`, `authenticated_staff_required`, `tenant_selection_required`, `tenant_membership_denied`, `permission_denied`, and `session_expired`.
- production dev seed route returns `dev_route_not_allowed`.
- Loop 093 implements this API gate, but real Supabase Auth/JWT verification remains a later Loop.

## LINE Real Send Preconditions

本物LINE送信前条件:

- Supabase Auth/JWT connected.
- authenticated staff context required.
- active staff membership required.
- `send_staff_reply` permission enforced.
- customer tenant and LINE user tenant match.
- selectedTenantId verified.
- send confirmation UI exists.
- `LINE_REAL_PUSH_ENABLED=true` is explicit.
- timeline/audit record is written.
- idempotency / duplicate-send prevention exists.

Do not connect real LINE send before these are implemented and tested.

## OpenAI Connection Preconditions

OpenAI接続前条件:

- `AI_PROVIDER=openai` is explicit.
- `OPENAI_API_KEY` is configured outside git/docs.
- tenant AI settings are checked.
- rate limits and cost awareness are documented.
- prompt safety rules are in place.
- RAG source verification is tenant-scoped.
- AI output remains draft/support content.
- AI does not auto-send to LINE.

Do not connect OpenAI API before these are implemented and tested.

## Next Conditions

Proceed only when:

- RLS policy SQL has a dedicated implementation Loop.
- Auth/JWT runtime has a dedicated implementation Loop.
- selectedTenantId transport has a dedicated boundary Loop.
- production dev_header rejection has a dedicated implementation plan.
- staging/local tests verify tenant isolation.
- no secrets, `.env` values, project refs, production logs, LINE userId, or real customer data are recorded.

## Do Not Do

- Do not add RLS SQL in a docs-only Loop.
- Do not modify migration SQL unless the Loop is explicitly migration-scoped.
- Do not connect production Supabase.
- Do not use production DB for tests.
- Do not expose service role key to client code.
- Do not treat `x-tenant-id` as production auth.
- Do not let selectedTenantId bypass membership validation.
- Do not enable real LINE send or OpenAI API in this readiness check.

## Related Docs

- [Loop 080: RLS/Auth Production Readiness Plan](../11_codex_tasks/080_rls_auth_production_readiness_plan.md)
- [Loop 081: Supabase Alerts/Knowledge Staging Runtime Plan](../11_codex_tasks/081_supabase_alerts_knowledge_staging_runtime_plan.md)
- [Supabase Staging Verification Final Record](supabase_staging_verification_final_record.md)
- [Supabase Alerts/Knowledge Staging Runtime Plan](supabase_alerts_knowledge_staging_runtime_plan.md)
- [Supabase Staging Rollback / Recovery](supabase_staging_rollback_recovery.md)
- [Supabase RLS Policy Plan](../11_codex_tasks/025_supabase_rls_policy_plan.md)
- [Authenticated Runtime Selected Tenant Transport Plan](../11_codex_tasks/055_authenticated_runtime_selected_tenant_transport_plan.md)
- [Loop 088: Authenticated Staff Runtime Full Route Rollout Plan](../11_codex_tasks/088_authenticated_staff_runtime_full_route_rollout_plan.md)
- [Loop 092: Authenticated Staff RAG Routes and Rollout Audit](../11_codex_tasks/092_authenticated_staff_rag_routes_and_rollout_audit.md)
- [Loop 093: Production Dev Header Rejection + Auth/JWT Boundary](../11_codex_tasks/093_production_dev_header_rejection_auth_jwt_boundary.md)
- [Loop 094A: RLS SQL Draft Review](../11_codex_tasks/094a_rls_sql_draft_review.md)
- [Authenticated Staff Runtime Route Rollout](authenticated_staff_runtime_route_rollout.md)
- [Authenticated Staff Route Rollout Completion Audit](authenticated_staff_route_rollout_completion_audit.md)

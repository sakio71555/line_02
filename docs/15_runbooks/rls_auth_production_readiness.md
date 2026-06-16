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
- default runtimeは `in_memory` のまま。
- alerts、knowledge、staff/auth runtimeはSupabaseへ切り替えていない。
- Loop 081でalerts/knowledge_pagesのstaging runtime planを追加したが、実装やruntime switchはまだ行っていない。
- RLS enabled tablesは `0/12`。
- LINE real pushはdisabled/mock。
- OpenAI APIはmock。
- production readiness: No-Go。

## Production Readiness No-Go

production readiness: No-Go

No-Go理由:

- RLS 未実装。
- Supabase Auth/JWT 未接続。
- selectedTenantId transport 未実装。
- selectedTenantId 再検証がproduction HTTP runtimeへ未接続。
- production dev_header rejection 未実装。
- service_role grantsはstaging PostgREST smoke用で、production authorizationではない。
- LINE real push disabled。
- OpenAI mock。
- Supabase runtime switch対象がcustomers/messagesに限定され、alerts/knowledge/staff/authが未完了。

## RLS/Auth/JWT Checklist

Before production:

- [ ] RLS SQL is designed per table.
- [ ] RLS SQL is implemented in a dedicated migration.
- [ ] local or staging test DB verifies tenant A cannot read/write tenant B rows.
- [ ] Supabase Auth/JWT verification is connected to Admin API.
- [ ] `auth.uid()` maps to `staff_users.auth_user_id`.
- [ ] only active `staff_users` are allowed.
- [ ] only active `staff_tenant_memberships` grant tenant access.
- [ ] role is read from active membership.
- [ ] selectedTenantId is revalidated against active memberships.
- [ ] production rejects `x-tenant-id` / `dev_header`.
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
| `alerts` | Yes | active staff membership via API/checker/notifier | runtime switch incomplete |
| `knowledge_pages` | Yes | tenant scoped and `allowed_for_ai` for RAG | runtime switch incomplete |
| `staff_users` | Yes | maps Supabase Auth user to staff identity | Auth/RLS missing |
| `staff_tenant_memberships` | Yes | active membership decides tenant and role | critical before production |

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
- If staff has multiple active memberships and no selected tenant, return `tenant_selection_required`.
- If selected tenant is outside active memberships, return `tenant_membership_denied`.
- Repositories receive only `AdminTenantContext.tenantId`.
- Raw selectedTenantId is never used as a data filter.

## Production Dev Header Rejection

- local/dev/test can keep `dev_header` compatibility.
- staging should limit dev_header to explicit dummy verification paths while authenticated runtime is tested.
- production must reject `x-tenant-id` / `dev_header`.
- production requires `Authorization: Bearer` plus authenticated staff context.
- Expected errors include `dev_tenant_header_not_allowed`, `authenticated_staff_required`, `tenant_selection_required`, `tenant_membership_denied`, `permission_denied`, and `session_expired`.

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

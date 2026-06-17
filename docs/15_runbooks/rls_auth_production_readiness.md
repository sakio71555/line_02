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
- `0003_rls_core_tables.sql` はLoop 095Bでstaging DBへ適用済み。
- Loop 095AでRLS staging apply前のGo/No-Go、verification、smoke、rollback/recovery planを追加済み。
- Loop 095BでRLS enabled `9/9`、FORCE RLS `9/9`、policies `14/14`、service_role grants維持、staging smoke成功を確認済み。
- Loop 096でauthenticated role / JWT claim相当のRLS smokeを実施済み。
- Loop 097でSupabase Auth/JWT connection planとstaging real Auth smoke方針を追加済み。
- Loop 098でSupabase Auth real verifier boundaryを追加済み。
- Loop 099でstaging real Auth user smokeを実施し、実Bearer token、`staff_users.auth_user_id`、selectedTenantId、RLS `auth.uid()` の接続をdummy dataで確認済み。
- customers/messagesは、明示注入したSupabase runtime bundleでstaging smoke済み。
- alertsは、明示注入したSupabase runtime bundleでstaging smoke済み。
- knowledge_pages/RAGは、明示注入したSupabase runtime bundleでstaging smoke済み。
- staging拡張検証版100%相当。
- default runtimeは `in_memory` のまま。
- staff/auth runtimeはstaging smokeで明示注入済みだが、production runtimeへは未接続。
- RLS core target tablesはLoop 095Bでenabled/forced `9/9`。
- authenticated role / JWT claim相当のRLS smokeはLoop 096で成功済み。
- LINE real pushはdisabled/mock。
- OpenAI APIはmock。
- production readiness: No-Go。

## Production Readiness No-Go

production readiness: No-Go

No-Go理由:

- RLS SQLはLoop 095Bでstaging apply済み。
- authenticated role / JWT claim相当のRLS smokeはLoop 096で成功済み。
- Loop 097でBearer token、Supabase Auth `user.id`、`staff_users.auth_user_id`、active membership、RLS `auth.uid()` の接続計画は整理済み。
- Loop 098でreal verifier boundaryは追加済み。
- Loop 099でstaging real Auth user smokeは成功済み。
- Supabase Auth/JWT production本接続は未実装。
- selectedTenantId transport boundaryはLoop 087で実装済み。
- Loop 088で全Admin route rollout planを整理済み。
- Loop 089でcustomer read routesへauthenticated_staff runtimeを展開済み。
- Loop 090でcustomer write / AI routesへauthenticated_staff runtimeを展開済み。
- Loop 091でalerts routesへauthenticated_staff runtimeを展開済み。
- Loop 092でRAG routesへauthenticated_staff runtimeを展開済み。
- Loop 093でproduction dev_header rejectionとdev seed route rejectionを実装済み。
- Loop 100でAdmin UI selectedTenantId persistenceを追加済み。
- Loop 101でAdmin UI token forwarding boundaryとproduction Auth runtime gateを追加済み。
- Loop 102でLINE real push gateを追加済み。ただし本物LINE送信は未実施。
- Supabase Auth/JWT production本接続 未実装。
- service_role grantsはstaging PostgREST smoke用で、production authorizationではない。
- LINE real push disabled。
- OpenAI mock。
- staff/auth runtimeのproduction接続は未完了。

## Production Hardening Split Plan

Loop 086では、staging拡張検証版100%相当の次に進む前にproduction hardeningを分割しました。RLS/Auth/JWT、selectedTenantId、production dev_header rejection、LINE real push、OpenAI real APIは一度に実装せず、小さいLoopへ分けます。

詳細は [Loop 086 task doc](../11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md) と [Production Hardening Split Plan](production_hardening_split_plan.md) を参照してください。

## RLS/Auth/JWT Checklist

Before production:

- [x] RLS SQL is drafted for core tables.
- [x] RLS staging apply plan / dry-run checklist is documented.
- [x] RLS SQL is applied and statically verified in staging DB.
- [x] authenticated role / JWT claim smoke verifies RLS behavior in staging.
- [x] staging test DB verifies tenant A cannot read/write tenant B rows with dummy data.
- [x] Supabase Auth/JWT connection plan and real Auth smoke Go/No-Go are documented.
- [x] Supabase Auth real verifier boundary is implemented with fake auth client tests.
- [x] staging real Auth user smoke verifies Bearer token, `staff_users.auth_user_id`, selectedTenantId, and RLS `auth.uid()` with dummy data.
- [ ] Supabase Auth/JWT verification is connected to Admin API runtime.
- [x] staging smoke verifies `auth.uid()` maps to `staff_users.auth_user_id`.
- [x] staging smoke verifies only active `staff_users` are allowed.
- [x] staging smoke verifies only active `staff_tenant_memberships` grant tenant access.
- [x] staging smoke verifies role is read from active membership.
- [x] staging smoke verifies selectedTenantId is revalidated against active memberships.
- [x] Admin UI can persist selectedTenantId as a selector and send `x-selected-tenant-id`.
- [x] Admin UI helper can forward a provider-supplied Bearer token without storing or displaying it.
- [x] production Auth runtime gate can use `SupabaseAuthSessionVerifier` when explicitly configured and injected.
- [x] LINE real push gate requires flags, authenticated_staff, selectedTenantId, permission, tenant match, confirmation, and idempotency.
- [ ] LINE real push uses a real safe transport in staging.
- [x] production rejects `x-tenant-id` / `dev_header`.
- [ ] production automatically wires real Supabase Auth client and StaffAuthLookup repository.
- [ ] service_role usage is server-side only and minimized.
- [ ] browser / LIFF / Next client components do not receive service role keys.

## Table Policy Summary

| table | tenant_id | policy direction | production readiness |
| --- | ---: | --- | --- |
| `tenants` | No | authenticated staff reads only membership tenants; platform admin separate | staging RLS applied; dummy and real Auth smoke done; production Auth/JWT pending |
| `tenant_line_settings` | Yes | server/admin settings only; secrets never exposed | staging RLS applied; dummy and real Auth smoke done; production Auth/JWT pending |
| `tenant_ai_settings` | Yes | server/admin settings only | staging RLS applied; dummy and real Auth smoke done; production Auth/JWT pending |
| `customers` | Yes | active staff membership via API, tenant scoped | staging smoke done; staging RLS applied; dummy and real Auth smoke done; production Auth/JWT pending |
| `messages` | Yes | active staff membership via API, tenant/customer scoped | staging smoke done; staging RLS applied; dummy and real Auth smoke done; production Auth/JWT pending |
| `alerts` | Yes | active staff membership via API/checker/notifier | staging smoke done; authenticated route rollout done; staging RLS applied; dummy and real Auth smoke done; production Auth/JWT pending |
| `knowledge_pages` | Yes | tenant scoped and `allowed_for_ai` for RAG | staging smoke done; authenticated route rollout done; staging RLS applied; dummy and real Auth smoke done; production Auth/JWT pending |
| `staff_users` | Yes | maps Supabase Auth user to staff identity | staging RLS applied; real Auth smoke done; production Auth/JWT pending |
| `staff_tenant_memberships` | Yes | active membership decides tenant and role | staging RLS applied; real Auth smoke done; production Auth/JWT pending |

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

Loop 094Aではstaging applyをしていない。Loop 095Aでapply前のGo/No-Go、verification、staging smoke、rollback/recoveryを整理した後、次Loopでlocal/staging test DBに限定してapply可否を判断する。

## Loop 095A RLS Staging Apply Plan

Loop 095AでRLS staging apply前の計画を追加しました。

```text
docs/11_codex_tasks/095a_rls_staging_apply_plan.md
docs/15_runbooks/rls_staging_apply_plan.md
```

整理したこと:

- apply対象migrationは `packages/db/migrations/0003_rls_core_tables.sql`。
- apply前Go/No-Go checklist。
- `.env.staging` とsecret値を表示しない運用。
- apply予定手順。
- apply後RLS verification checklist。
- customer/message、alerts、knowledge/RAG、authenticated_staff route smoke。
- `service_role` smokeだけではRLS確認にならないこと。
- rollback/recovery方針。

Loop 095Aではstaging apply、Supabase実DB接続、`.env.staging` 読み込み、RLS SQL修正を行っていません。production readiness remains No-Go.

## Loop 095B RLS Staging Apply

Loop 095BでRLS SQLをstaging DBへ適用しました。

```text
docs/11_codex_tasks/095b_rls_staging_apply_execution_gate.md
scripts/dev-loop/verify-staging-rls-policies.mjs
```

確認結果:

- `0003_rls_core_tables.sql` staging apply: passed
- RLS enabled tables: `9/9`
- FORCE RLS tables: `9/9`
- policies verified: `14/14`
- broad anon/public table grants: `0`
- authenticated minimal grants: verified
- service_role grants: remain usable
- customers/messages, alerts, knowledge/RAG staging smoke: passed

service_roleはRLS bypass前提のため、この結果だけではproduction Goにしない。authenticated role / JWT smoke、Supabase Auth/JWT本接続、LINE/OpenAI gatesは未完了。

## Loop 096 Authenticated Role / JWT Claim RLS Smoke

Loop 096でauthenticated role / JWT claim相当のRLS smokeをstaging DB上で実施しました。

```text
docs/11_codex_tasks/096_authenticated_role_jwt_rls_smoke.md
scripts/dev-loop/seed-staging-rls-smoke-data.mjs
scripts/dev-loop/smoke-staging-authenticated-rls.mjs
```

確認結果:

- `SET LOCAL ROLE authenticated` と `request.jwt.claim.sub` でdummy `auth.uid()` を設定。
- active staff + active membershipでtenant A/Bのread separationを確認。
- inactive staffはtenant dataを読めない。
- inactive membershipはtenant dataを読めない。
- `knowledge_pages.allowed_for_ai=false` は同tenantでも読めない。
- write smokeは `BEGIN ... ROLLBACK` 内のdummy rowsだけで確認。
- `anon` / `public` broad grantは `0`。

本物Supabase Auth user作成、Supabase Auth/JWT本接続、production接続、LINE/OpenAI本接続は未実施。production readiness remains No-Go.

## Loop 097 Supabase Auth/JWT Connection Plan

Loop 097でSupabase Auth/JWT本接続前の計画を追加しました。

```text
docs/11_codex_tasks/097_supabase_auth_jwt_connection_plan.md
docs/15_runbooks/supabase_auth_jwt_connection_plan.md
tests/integration/supabase-auth-jwt-connection-plan.test.ts
```

整理したこと:

- `Authorization: Bearer` からSupabase Auth `user.id` を得る方針。
- Supabase Auth `user.id` と `staff_users.auth_user_id` の接続方針。
- fake verifierとreal verifierの差分。
- real verifierのserver-side only境界とtoken非表示ルール。
- StaffAuthLookup、active staff、active membership、selectedTenantId再検証。
- RLS `auth.uid()` と `staff_users.auth_user_id` の一致条件。
- staging real Auth smokeのGo/No-Go。

Loop 097ではSupabase Auth user作成、Supabase Auth/JWT本接続、real verifier実装、RLS SQL変更、production接続を行っていない。production readiness remains No-Go.

## Loop 098 Supabase Auth Real Verifier Boundary

Loop 098でSupabase Auth real verifier境界を追加しました。

```text
apps/api/src/admin/supabase-auth-session-verifier.ts
tests/integration/supabase-auth-session-verifier.test.ts
docs/11_codex_tasks/098_supabase_auth_real_verifier_boundary.md
```

確認したこと:

- `SupabaseAuthSessionVerifier` がSupabase Auth `user.id` を `AuthUserIdentity.authUserId` へ変換する。
- Supabase auth clientは `SupabaseAuthClientLike` として抽象化し、testではfake clientだけを使う。
- Supabase auth error、missing user、blank user id、thrown network errorは `session_expired` へ安全に畳む。
- token、URL、key、project ref、raw error textをresultへ含めない。
- production modeではfake verifierをdefault利用せず、明示 `adminAuthRuntime` がないBearer requestは `authenticated_staff_required`。

Loop 098では実Supabase Auth接続、Supabase Auth user作成、staging real Auth smoke、RLS SQL変更、production接続を行っていない。production readiness remains No-Go.

## Loop 099 Staging Real Auth User Smoke

Loop 099でstaging real Auth user smokeを実施しました。

```text
scripts/dev-loop/smoke-staging-real-auth-api.mjs
tests/integration/staging-real-auth-api-smoke.test.ts
docs/11_codex_tasks/099_staging_real_auth_user_smoke.md
```

確認したこと:

- `.env.staging`、schema、service_role grants、RLS policy、RLS static verifierは成功。
- staging dummy Supabase Auth userを作成し、Bearer tokenを取得したが、値は表示していない。
- `SupabaseAuthSessionVerifier` が実tokenからSupabase Auth user idを解決した。
- `staff_users.auth_user_id`、active `staff_tenant_memberships`、selectedTenantId再検証がつながることを確認した。
- customers、alerts、RAG、AI reply draftのAdmin route smokeでtenant A/B境界を確認した。
- RLS smokeではreal Auth user idを `auth.uid()` と一致させ、tenant A dataは読めてtenant B dataは読めないことを確認した。
- `knowledge_pages.allowed_for_ai=false` は同tenantでも読めないことを確認した。
- smoke後にdummy Auth userとdummy DB rowsをcleanupした。

Loop 099はstaging dummy data限定です。Loop 100でAdmin UI selectedTenantId保存は追加済みですが、production Auth/JWT runtime接続、LINE real push、OpenAI real API、production readiness final gateは未完了であり、production readiness remains No-Go.

## Loop 100 Admin UI selectedTenantId Persistence

Loop 100でAdmin UI selectedTenantId persistenceを追加しました。

```text
apps/admin/src/selected-tenant.ts
apps/admin/app/select-tenant/selected-tenant-form.tsx
apps/admin/app/admin-api-request-options.ts
docs/11_codex_tasks/100_admin_ui_selected_tenant_persistence.md
```

確認したこと:

- `/select-tenant` は非secretのtenant selectorだけをlocalStorageとcookieへ保存する。
- Admin API helperは選択値がある場合だけ `x-selected-tenant-id` を付ける。
- 既存local/dev/test互換の `x-tenant-id` と `x-selected-tenant-id` を混同しない。
- `tenant_selection_required`、`tenant_membership_denied`、`invalid_selected_tenant_id`、`authenticated_staff_required` をUI向けに扱う。
- Bearer token、API key、Supabase secret、session値は保存・表示しない。

Loop 100はUI persistenceのみです。Supabase Auth/JWT production runtime、LINE real push、OpenAI real API、production readiness final gateは未完了です。

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
- Loop 099 verifies `x-selected-tenant-id` with a real staging Auth token and active memberships.
- Loop 100 adds Admin UI selectedTenantId persistence without storing tokens.
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
- Loop 093 implements this API gate. Loop 099 verifies real Supabase Auth/JWT in staging smoke only; production runtime wiring remains a later Loop.

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
- Auth/JWT production runtime has a dedicated implementation Loop.
- Admin UI selectedTenantId persistence is implemented in Loop 100.
- production dev_header rejection remains enforced.
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
- [Loop 095A: RLS Staging Apply Plan](../11_codex_tasks/095a_rls_staging_apply_plan.md)
- [Loop 095B: RLS Staging Apply Execution Gate](../11_codex_tasks/095b_rls_staging_apply_execution_gate.md)
- [Loop 096: Authenticated Role JWT RLS Smoke](../11_codex_tasks/096_authenticated_role_jwt_rls_smoke.md)
- [Loop 097: Supabase Auth/JWT Connection Plan](../11_codex_tasks/097_supabase_auth_jwt_connection_plan.md)
- [Loop 098: Supabase Auth Real Verifier Boundary](../11_codex_tasks/098_supabase_auth_real_verifier_boundary.md)
- [Loop 099: Staging Real Auth User Smoke](../11_codex_tasks/099_staging_real_auth_user_smoke.md)
- [Loop 100: Admin UI selectedTenantId persistence](../11_codex_tasks/100_admin_ui_selected_tenant_persistence.md)
- [Supabase Auth/JWT Connection Plan](supabase_auth_jwt_connection_plan.md)
- [RLS Staging Apply Plan](rls_staging_apply_plan.md)
- [Authenticated Staff Runtime Route Rollout](authenticated_staff_runtime_route_rollout.md)
- [Authenticated Staff Route Rollout Completion Audit](authenticated_staff_route_rollout_completion_audit.md)

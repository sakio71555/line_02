# Production Hardening Split Plan

## Purpose

Loop 085でstaging拡張検証版100%相当に到達した後、productionへ進むためのRLS/Auth/JWT hardeningを小さいLoopに分けるためのrunbookです。

このrunbookは実装手順ではなく、分割計画です。RLS SQL、Auth/JWT接続、API差し替え、Supabase接続、LINE/OpenAI実接続はこのrunbookでは行いません。

## Current Status

| area | status |
| --- | --- |
| customers/messages | staging runtime smoke済み |
| alerts | staging runtime smoke済み |
| knowledge_pages/RAG | staging runtime smoke済み |
| staging milestone | staging拡張検証版100%相当 |
| default runtime | `in_memory` |
| RLS | Loop 095Bでstaging apply済み。Loop 096でauthenticated role / JWT claim相当smoke成功済み |
| Auth/JWT | Loop 098でreal verifier boundary済み。Auth/JWT本接続とstaging real Auth smokeは未実装 |
| selectedTenantId | Loop 087でtransport boundary実装。Loop 088で全route rollout plan整理。Loop 089でcustomer read routesへ展開済み。Loop 090でcustomer write / AI routesへ展開済み。Loop 091でalerts routesへ展開済み。Loop 092でRAG routesへ展開済み。UI保存は未完了 |
| production dev_header rejection | Loop 093で実装済み |
| LINE real push | disabled/mock |
| OpenAI real API | mock |
| production readiness | production No-Go |

## Production No-Go Reasons

- RLS SQLはLoop 095Bでstaging apply済み。
- authenticated role / JWT claim相当のtenant A/B isolation smokeはLoop 096で成功済み。ただしSupabase Auth/JWT本接続は未完了。
- Loop 097でSupabase Auth/JWT connection planは追加済みだが、real verifier接続とAuth user作成は未実施。
- Loop 098でreal verifier boundaryは追加済みだが、Auth/JWT本接続とstaging real Auth user smokeは未実施。
- Auth/JWT未接続状態は継続。
- Auth/JWT本接続は未実装。
- selectedTenantId transport boundaryと現在の主要Admin route rolloutは完了済みだが、UI保存は未完了。
- production dev_header rejectionはLoop 093で実装済みだが、Supabase Auth/JWT本接続は未完了。
- `service_role` はserver-side onlyであり、RLS bypass権限のためproduction authorizationそのものにはしない。
- LINE real push gate未実装。
- OpenAI real API gate未実装。

## Hardening Order

```text
Loop 087 selectedTenantId transport boundary
Loop 088 authenticated runtime full route rollout plan
Loop 089 authenticated runtime read-only routes
Loop 090 authenticated runtime customer write / AI routes
Loop 091 authenticated runtime alerts routes
Loop 092 authenticated runtime RAG routes
Loop 093 production dev_header rejection (done)
Loop 094A RLS SQL draft review (done, not applied)
Loop 095A RLS staging apply planning / dry-run checklist (done, not applied)
Loop 095B RLS staging apply execution gate (done, staging only)
Loop 096 authenticated role / JWT RLS smoke (done, staging only)
Loop 097 Supabase Auth/JWT connection planning (done, docs/test only)
Loop 098 Supabase Auth real verifier boundary (done, fake client only)
Loop 099 staging real Auth user smoke
Loop 100 LINE real push gate
Loop 101 OpenAI real API gate
```

## selectedTenantId Rules

- `selectedTenantId` は権限ではなくselector。
- Loop 087では初期transportとして `x-selected-tenant-id` headerを採用した。
- `x-selected-tenant-id` はauthenticated_staff runtime用であり、dev_header用の `x-tenant-id` とは別物。
- staffのactive membershipで必ず再検証する。
- 複数tenant所属で未選択なら `tenant_selection_required`。
- membership外のtenantなら `tenant_membership_denied`。
- repositoryへ渡すのは確定済み `AdminTenantContext.tenantId` のみ。
- raw `selectedTenantId` をdata filterに使わない。

Loop 087 implementation note:

- `x-selected-tenant-id` は代表authenticated routeで検証済み。
- invalid formatは `invalid_selected_tenant_id`。
- dev_header pathでは `x-selected-tenant-id` を無視し、既存 `x-tenant-id` 互換を維持する。
- production dev_header rejectionは後続Loopで扱う。

Loop 088 planning note:

- 全Admin route rolloutへ進む前に、customer read、customer write/AI、alerts、RAG、production dev_header rejectionを分割した。
- route matrixでは `GET /api/admin/customers` だけがrepresentative authenticated routeで、他のAdmin routeはまだ `dev_header` 互換であることを明記した。
- selectedTenantIdは各routeでactive membership再検証を前提にし、repositoryへは検証済み `AdminTenantContext.tenantId` のみ渡す。
- dev seed、LINE webhook、health/check routesはauthenticated_staff Admin route rollout対象外。
- 詳細は [Loop 088 task doc](../11_codex_tasks/088_authenticated_staff_runtime_full_route_rollout_plan.md) と [Authenticated Staff Runtime Route Rollout](authenticated_staff_runtime_route_rollout.md) を参照する。

Loop 089 implementation note:

- customer read routesへauthenticated_staff runtimeを展開済み。
- 対象は `GET /api/admin/customers`、`GET /api/admin/customers/:customerId`、`GET /api/admin/customers/:customerId/timeline` のみ。
- `x-selected-tenant-id` はactive membershipで再検証し、customer read repository/serviceへは検証済み `AdminTenantContext.tenantId` のみ渡す。

Loop 090 implementation note:

- customer write / AI routesへauthenticated_staff runtimeを展開済み。
- 対象は `POST /api/admin/customers/:customerId/reply`、`POST /api/admin/customers/:customerId/ai-summary`、`POST /api/admin/customers/:customerId/ai-reply-draft` のみ。
- `x-selected-tenant-id` はactive membershipで再検証し、write / AI処理へは検証済み `AdminTenantContext.tenantId` のみ渡す。
- LINE real pushとOpenAI real APIは未接続のまま。
- alerts、RAG、production dev_header rejection、Auth/JWT、RLS SQLは未実装のまま。

Loop 091 implementation note:

- alerts routesへauthenticated_staff runtimeを展開済み。
- 対象は `GET /api/admin/alerts`、`POST /api/admin/alerts/check-unreplied`、`POST /api/admin/alerts/notify-open` のみ。
- `x-selected-tenant-id` はactive membershipで再検証し、alert list / unreplied check / notify-open処理へは検証済み `AdminTenantContext.tenantId` のみ渡す。
- notify-openは引き続きMockStaffNotifierで、本物LINE通知は未接続のまま。
- RAG、production dev_header rejection、Auth/JWT、RLS SQLは未実装のまま。

Loop 092 implementation note:

- RAG routesへauthenticated_staff runtimeを展開済み。
- 対象は `POST /api/admin/rag/search`、`POST /api/admin/rag/answer-draft` のみ。
- `x-selected-tenant-id` はactive membershipで再検証し、RAG search / answer-draft処理へは検証済み `AdminTenantContext.tenantId` のみ渡す。
- RAG sourceは `tenant_id + allowed_for_ai=true` のみで、MockAiProviderを維持する。
- customer read/write/AI、alerts、RAGのauthenticated_staff rollout完了を監査記録へ残した。
- production dev_header rejection、Auth/JWT、RLS SQLは未実装のまま。

Loop 093 implementation note:

- production mode判定は `APP_ENV=production` または `NODE_ENV=production` を対象にする。
- production modeでAdmin routeの `x-tenant-id` / `dev_header` pathを拒否する。
- production modeでAdmin routeにBearerがない場合は `authenticated_staff_required` を返す。
- production modeで `x-selected-tenant-id` 単体を認証扱いしない。
- production modeで `POST /api/dev/seed-demo-data` を `dev_route_not_allowed` として拒否する。
- local/dev/testの `x-tenant-id` / `dev_header` 互換は維持する。
- fake verifier / fake StaffAuthLookupによるAuth/JWT boundary testは維持する。
- Supabase Auth/JWT本接続、RLS SQL、Admin UI selectedTenantId保存は未実装のまま。

Loop 094A implementation note:

- `packages/db/migrations/0003_rls_core_tables.sql` をRLS SQL draftとして追加した。
- 対象は `tenants`、tenant settings、customers、messages、alerts、knowledge_pages、staff_users、staff_tenant_memberships。
- policyは `auth.uid()::text`、active `staff_users`、active `staff_tenant_memberships` を前提にする。
- `anon` / `public` へのgrant/policy、`grant all`、`using true`、`with check true` は静的検証で禁止する。
- `service_role` 既存grantは壊さない。
- staging apply、production apply、Supabase実DB接続は未実施。

Loop 095A planning note:

- RLS staging apply前のGo/No-Go、dry-run checklist、apply後verification、staging smoke、rollback/recovery方針を整理した。
- apply対象migrationは `packages/db/migrations/0003_rls_core_tables.sql`。
- Loop 095Aではstaging apply、Supabase実DB接続、`.env.staging` 読み込み、RLS SQL修正は行っていない。
- 詳細は [Loop 095A task doc](../11_codex_tasks/095a_rls_staging_apply_plan.md) と [RLS Staging Apply Plan](rls_staging_apply_plan.md) を参照する。

Loop 095B execution note:

- `packages/db/migrations/0003_rls_core_tables.sql` をstaging DBへapplyした。
- RLS enabled tables `9/9`、FORCE RLS tables `9/9`、policies `14/14`、broad anon/public grants `0` を確認した。
- service_role grantsは維持され、customers/messages、alerts、knowledge/RAG staging smokeは成功した。
- service_roleはRLS bypass前提のため、authenticated role / JWT smokeは後続Loopで扱う。
- production readinessはNo-Go継続。
- 詳細は [Loop 095B task doc](../11_codex_tasks/095b_rls_staging_apply_execution_gate.md) を参照する。

Loop 096 execution note:

- authenticated role / JWT claim相当のRLS smokeをstaging DBで実行した。
- `SET LOCAL ROLE authenticated` と `request.jwt.claim.sub` でdummy `auth.uid()` を設定した。
- tenant A/B read separation、inactive staff、inactive membership、`allowed_for_ai=false`、rollback-only write smokeを確認した。
- 本物Supabase Auth user作成、Supabase Auth/JWT本接続、production接続は未実施。
- production readinessはNo-Go継続。
- 詳細は [Loop 096 task doc](../11_codex_tasks/096_authenticated_role_jwt_rls_smoke.md) を参照する。

Loop 097 planning note:

- Supabase Auth/JWT本接続前のconnection planを追加した。
- `Authorization: Bearer`、Supabase Auth `user.id`、`staff_users.auth_user_id`、active staff、active membership、selectedTenantId再検証、RLS `auth.uid()` の接続順を整理した。
- fake verifierとreal verifierの差分、token非表示、staging real Auth smokeのGo/No-Goを記録した。
- Supabase Auth user作成、Supabase Auth/JWT本接続、RLS SQL変更、production接続は未実施。
- 詳細は [Loop 097 task doc](../11_codex_tasks/097_supabase_auth_jwt_connection_plan.md) と [Supabase Auth/JWT Connection Plan](supabase_auth_jwt_connection_plan.md) を参照する。

Loop 098 implementation note:

- `SupabaseAuthSessionVerifier` と `SupabaseAuthClientLike` を追加した。
- fake Supabase auth clientでvalid user、missing user、Supabase error、network error、token redactionを検証した。
- production modeではfake verifierをdefault利用しないことを固定した。
- Supabase Auth user作成、staging real Auth smoke、RLS SQL変更、production接続は未実施。
- 詳細は [Loop 098 task doc](../11_codex_tasks/098_supabase_auth_real_verifier_boundary.md) を参照する。

## Auth/JWT Rules

- production Admin APIは `Authorization: Bearer` を必須にする。
- Bearer tokenから得たuser idを `staff_users.auth_user_id` へmappingする。
- inactive staffは拒否する。
- inactive membershipは拒否する。
- role guardは `staff_tenant_memberships.role` を使う。
- errorsは `authenticated_staff_required`、`session_expired`、`tenant_selection_required`、`tenant_membership_denied`、`permission_denied` などで明確に返す。

## production dev_header rejection Rules

- local/dev/testでは `dev_header` 互換を維持してよい。
- stagingではdummy検証用に限定し、authenticated runtime検証を優先する。
- productionでは `x-tenant-id` / `dev_header` を拒否する。
- productionでは `Authorization: Bearer` + authenticated staff contextを必須にする。
- expected errorは `dev_tenant_header_not_allowed`。
- production mode判定は `APP_ENV=production` または `NODE_ENV=production` とする。
- production dev seed routeは `dev_route_not_allowed` として拒否する。
- BearerなしのAdmin routeは `authenticated_staff_required` とする。

## service_role Rules

- `service_role` はserver-side only。
- browser / LIFF / Next client componentへ絶対に出さない。
- `.env` 値、project ref、DB URL、token、keyはdocsやdev logに書かない。
- staging smokeではPostgREST/Data API accessのために使う。
- productionではrepository境界に閉じ、tenant filter testとauditを併用する。
- `service_role` はRLS bypass前提なので、RLS/Auth/JWT/role guardの代替にしない。

## RLS Split

RLSは次の順で扱う。

1. RLS SQL draftをdocs/test fixtureとしてレビューする。
2. local/test DBまたはstaging test DBへ適用する。
3. tenant Aのcontextでtenant B rowがselectできないことを確認する。
4. insert/update/deleteもtenant境界を確認する。
5. `service_role` bypass時はAPI/repository tenant filter testと組み合わせる。
6. production applyはGo/No-Go gate後に別Loopで扱う。

## LINE Real Push Gate

LINE real pushはproduction hardening完了後の別Loop。

- `LINE_REAL_PUSH_ENABLED=true` を明示するまで送信しない。
- server-side LineClientだけがtokenを扱う。
- authenticated staff contextと `send_staff_reply` permissionを必須にする。
- stagingではdummy recipient / safe channelだけで確認する。
- failed send時にmessage保存しない既存方針を維持する。

## OpenAI Real API Gate

OpenAI real APIはproduction hardening完了後の別Loop。

- `AI_PROVIDER=openai` を明示するまで呼ばない。
- `OPENAI_API_KEY` はserver-side only。
- tenant scoped messages/knowledgeだけを入力にする。
- AI does not auto-send to LINE.
- summary / reply draft / RAG answer draftはstaff assistに限定する。
- cost / rate limit / logging / error handlingを別Loopで確認する。

## Stop Conditions

以下が必要になったら、このrunbookの範囲を超える。

- migration SQL変更。
- RLS SQL apply。
- Supabase本番接続。
- `.env` 作成・変更。
- API route / runtime / repository / UI変更。
- LINE API実送信。
- OpenAI API実呼び出し。
- 実顧客情報の投入。

## Next Loop

Recommended next loop: Loop 099: staging real Auth user smoke.

理由:

- Loop 098でreal verifier境界はfake clientで固定済み。
- 次はstaging real Auth userと `staff_users.auth_user_id` の接続smokeを、production接続なしで小さく扱う。
- production applyやLINE/OpenAI本接続は引き続き別Loopで扱う。

## Related Docs

- [Loop 080: RLS/Auth Production Readiness Plan](../11_codex_tasks/080_rls_auth_production_readiness_plan.md)
- [Loop 085: Supabase Knowledge/RAG Runtime Boundary](../11_codex_tasks/085_supabase_knowledge_rag_runtime_boundary.md)
- [Loop 086: RLS/Auth/JWT Production Hardening Split Plan](../11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md)
- [Loop 092: Authenticated Staff RAG Routes and Rollout Audit](../11_codex_tasks/092_authenticated_staff_rag_routes_and_rollout_audit.md)
- [Loop 093: Production Dev Header Rejection + Auth/JWT Boundary](../11_codex_tasks/093_production_dev_header_rejection_auth_jwt_boundary.md)
- [Loop 094A: RLS SQL Draft Review](../11_codex_tasks/094a_rls_sql_draft_review.md)
- [Loop 095A: RLS Staging Apply Plan](../11_codex_tasks/095a_rls_staging_apply_plan.md)
- [Loop 095B: RLS Staging Apply Execution Gate](../11_codex_tasks/095b_rls_staging_apply_execution_gate.md)
- [Loop 096: Authenticated Role JWT RLS Smoke](../11_codex_tasks/096_authenticated_role_jwt_rls_smoke.md)
- [Loop 097: Supabase Auth/JWT Connection Plan](../11_codex_tasks/097_supabase_auth_jwt_connection_plan.md)
- [Loop 098: Supabase Auth Real Verifier Boundary](../11_codex_tasks/098_supabase_auth_real_verifier_boundary.md)
- [Supabase Auth/JWT Connection Plan](supabase_auth_jwt_connection_plan.md)
- [RLS Staging Apply Plan](rls_staging_apply_plan.md)
- [Authenticated Staff Route Rollout Completion Audit](authenticated_staff_route_rollout_completion_audit.md)
- [RLS/Auth Production Readiness](rls_auth_production_readiness.md)
- [Supabase Staging Verification Final Record](supabase_staging_verification_final_record.md)

# Loop 092: authenticated_staff RAG routes and rollout audit

## Goal

RAG routesへ authenticated_staff runtime を展開し、現在の主要Admin route rolloutが完了したことを監査として記録する。

対象route:

- `POST /api/admin/rag/search`
- `POST /api/admin/rag/answer-draft`

## Scope

- RAG 2routeで `Authorization: Bearer` + `x-selected-tenant-id` を受ける。
- `selectedTenantId` をactive `staff_tenant_memberships` で再検証する。
- RAG search / answer-draftへは検証済み `AdminTenantContext.tenantId` のみ渡す。
- `tenant_id + allowed_for_ai=true` のknowledgeだけを検索・回答sourceにする。
- 他tenant knowledgeと `allowed_for_ai=false` knowledgeを混ぜない。
- MockAiProviderを維持する。
- `dev_header` / `x-tenant-id` pathは既存互換のまま維持する。
- default `in_memory` runtimeを維持する。
- response shapeを変更しない。
- Admin route rollout completion auditをdocsに残す。
- tests、README、runbook、dev loop docs、dev logを更新する。

## Out of Scope

- production `dev_header` rejection。
- Supabase Auth/JWT本接続。
- RLS SQL実装。
- migration SQL / GRANT変更。
- Admin UI変更。
- selectedTenantId UI保存。
- LINE API実送信。
- OpenAI API実接続。
- Web crawl。
- embedding / pgvector。
- Supabase実DB / staging / production接続。
- `.env` 作成・変更。
- package依存追加。

## Starting State

- Loop 087で `x-selected-tenant-id` transport boundaryを追加済み。
- Loop 088で全Admin route rollout planとroute matrixを整理済み。
- Loop 089でcustomer read routesはauthenticated_staff runtimeへ展開済み。
- Loop 090でcustomer write / AI routesはauthenticated_staff runtimeへ展開済み。
- Loop 091でalerts routesはauthenticated_staff runtimeへ展開済み。
- RAG routesは `dev_header` 互換のみだった。
- production readinessはNo-Go。

## Implementation Summary

- `apps/api/src/index.ts` のRAG 2routeをtenant scoped admin route共通helperへ接続。
- helperは `Authorization` headerがある場合だけ authenticated_staff runtimeへ進む。
- authenticated pathでは `x-selected-tenant-id` を抽出し、invalid formatならsession lookup前に `invalid_selected_tenant_id` を返す。
- authenticated pathでは `resolveAuthenticatedAdminRuntimeContext` に既存AdminActionを渡し、active membershipとrole guardを通す。
- no Authorizationの場合は既存 `x-tenant-id` / `dev_header` pathを使う。
- RAG searchとRAG answer-draftは helper が返した verified tenant idだけでknowledge repository / MockAiProvider処理を扱う。

## selectedTenantId Revalidation

Rules:

- `selectedTenantId` は権限ではなくselector。
- active membershipが1つだけなら未指定でそのtenantを使う。
- 複数active membershipsで未指定なら `tenant_selection_required`。
- membership外のtenantなら `tenant_membership_denied`。
- invalid formatなら `invalid_selected_tenant_id`。
- raw `x-selected-tenant-id` はRAG search / repository / providerへ渡さない。
- RAG処理のtenant idは verified `AdminTenantContext.tenantId` のみ。

## `x-selected-tenant-id` and `x-tenant-id`

| header | runtime | purpose | production status |
| --- | --- | --- | --- |
| `x-selected-tenant-id` | authenticated_staff | authenticated staffが希望するtenant selector。active membershipで再検証する。 | 本番候補だがAuth/JWT未接続 |
| `x-tenant-id` | dev_header | local/dev/test互換のtenant selector。 | 本番認証ではない。production rejectionは後続Loop |

`dev_header` pathでは `x-selected-tenant-id` を無視する。

## Route Results

### RAG search

- single active membership + no selectedTenantIdで成功。
- multi membership + no selectedTenantIdで `tenant_selection_required`。
- matching `x-selected-tenant-id` で選択tenantのknowledgeだけ返す。
- wrong `x-selected-tenant-id` で `tenant_membership_denied`。
- invalid `x-selected-tenant-id` でsession lookup / repository accessなし。
- `allowed_for_ai=false` knowledgeは返さない。
- 他tenant knowledgeは返さない。

### RAG answer-draft

- matching `x-selected-tenant-id` のverified tenantでsourceを取得し、MockAiProviderで回答案を生成する。
- provider inputのtenant idは verified `AdminTenantContext.tenantId` のみ。
- sourceは `tenant_id + allowed_for_ai=true` のみ。
- sourceがない場合は既存no-source fallbackを返し、providerを呼ばない。
- OpenAI APIは呼ばない。
- LINEへ送信しない。

## allowed_for_ai

- `searchTenantKnowledge` はrepositoryからtenant別に取得した後、`allowed_for_ai=true` だけを検索対象にする。
- Supabase knowledge repositoryも `tenant_id` と `allowed_for_ai=true` をquery境界に持つ。
- Loop 092ではruntime経路でこのfilterが維持されることをtestで固定した。

## dev_header Path

- `x-tenant-id` の既存動作は維持。
- `x-selected-tenant-id` が不正値でも、Authorizationがないdev_header pathでは影響しない。
- local/testのMVP確認互換は維持。

## Default Runtime

- default runtimeは引き続き `in_memory`。
- `REPOSITORY_RUNTIME=supabase` やSupabase実DB接続はこのLoopでは扱わない。

## Tests

Added:

- `tests/integration/admin-api-authenticated-runtime-rag-routes.test.ts`
- `tests/integration/authenticated-staff-runtime-route-rollout-completion.test.ts`

Covered:

- RAG searchのsingle membership成功。
- multi membership + selectedTenantIdなしの `tenant_selection_required`。
- matching `x-selected-tenant-id` でtenant scoped RAG search。
- wrong `x-selected-tenant-id` でrepository accessなし。
- invalid `x-selected-tenant-id` でsession lookup / repository accessなし。
- RAG answer-draftがverified tenant idだけでrepository/provider inputを扱う。
- `allowed_for_ai=false` knowledgeをsourceにしない。
- wrong tenant sourceを混ぜない。
- dev_header pathでは `x-selected-tenant-id` を無視。
- default in-memory app behaviorを維持。
- rollout audit docsでcustomer read/write/AI、alerts、RAGが完了し、dev seed / LINE webhook / healthが対象外であることを確認。

## Route Rollout Completion Audit

authenticated_staff rollout完了:

- customer read routes
- customer write / AI routes
- alerts routes
- RAG routes

authenticated_staff rollout対象外:

- `POST /api/dev/seed-demo-data`
- `POST /api/line/webhook/:webhookSecret`
- `GET /health`

詳細は [docs/15_runbooks/authenticated_staff_route_rollout_completion_audit.md](../15_runbooks/authenticated_staff_route_rollout_completion_audit.md) を参照。

## Production No-Go

productionは引き続きNo-Go。

No-Go理由:

- production `dev_header` rejection未実装。
- Supabase Auth/JWT本接続未実装。
- RLS SQL未実装。
- Admin UI selected tenant保存未実装。
- LINE real push gate未実装。
- OpenAI real API gate未実装。

## Residual Risks

- fake verifier / fake StaffAuthLookupによる検証であり、real Supabase Auth/JWTではない。
- productionで `x-tenant-id` を拒否する処理はまだない。
- Admin UIはまだselectedTenantIdを保存・送信しない。
- RLS SQLは未実装。

## Next Loop

Loop 093: production dev_header rejection + Auth/JWT boundary.

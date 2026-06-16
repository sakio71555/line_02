# Loop 090: authenticated_staff customer write / AI routes

## Goal

Loop 089でcustomer read routesへ展開した authenticated_staff runtime を、customer write / AI routesだけへ広げる。

対象route:

- `POST /api/admin/customers/:customerId/reply`
- `POST /api/admin/customers/:customerId/ai-summary`
- `POST /api/admin/customers/:customerId/ai-reply-draft`

## Scope

- 対象3routeで `Authorization: Bearer` + `x-selected-tenant-id` を受ける。
- `selectedTenantId` をactive `staff_tenant_memberships` で再検証する。
- write / AI処理へは検証済み `AdminTenantContext.tenantId` のみ渡す。
- 対象customerがverified tenantに属する場合だけ処理する。
- 他tenant customerは `customer_not_found` 404として扱い、存在推測を避ける。
- `dev_header` / `x-tenant-id` pathは既存互換のまま維持する。
- default `in_memory` runtimeを維持する。
- response shapeを変更しない。
- tests、README、runbook、dev loop docs、dev logを更新する。

## Out of Scope

- customer read routesの大幅変更。
- alerts routes rollout。
- RAG routes rollout。
- production `dev_header` rejection。
- Supabase Auth/JWT本接続。
- RLS SQL実装。
- migration SQL / GRANT変更。
- Admin UI変更。
- selectedTenantId UI保存。
- LINE API実送信。
- OpenAI API実接続。
- Supabase実DB / staging / production接続。
- `.env` 作成・変更。
- package依存追加。

## Starting State

- Loop 087で `x-selected-tenant-id` transport boundaryを追加済み。
- Loop 088で全Admin route rollout planとroute matrixを整理済み。
- Loop 089でcustomer read routesはauthenticated_staff runtimeへ展開済み。
- customer write / AI routesは `dev_header` 互換のみだった。
- production readinessはNo-Go。

## Implementation Summary

- `apps/api/src/index.ts` のcustomer tenant resolution helperをcustomer admin route共通に整理。
- helperは `Authorization` headerがある場合だけ authenticated_staff runtimeへ進む。
- authenticated pathでは `x-selected-tenant-id` を抽出し、invalid formatならsession lookup前に `invalid_selected_tenant_id` を返す。
- authenticated pathでは `resolveAuthenticatedAdminRuntimeContext` に既存AdminActionを渡し、active membershipとrole guardを通す。
- no Authorizationの場合は既存 `x-tenant-id` / `dev_header` pathを使う。
- staff reply、AI summary、AI reply draftは helper が返した verified tenant idだけでcustomer lookup、message write、LINE mock boundary、AI mock provider inputを扱う。

## selectedTenantId Revalidation

Rules:

- `selectedTenantId` は権限ではなくselector。
- active membershipが1つだけなら未指定でそのtenantを使う。
- 複数active membershipsで未指定なら `tenant_selection_required`。
- membership外のtenantなら `tenant_membership_denied`。
- invalid formatなら `invalid_selected_tenant_id`。
- raw `x-selected-tenant-id` はrepository/service/providerへ渡さない。
- write / AI処理のtenant idは verified `AdminTenantContext.tenantId` のみ。

## `x-selected-tenant-id` and `x-tenant-id`

| header | runtime | purpose | production status |
| --- | --- | --- | --- |
| `x-selected-tenant-id` | authenticated_staff | authenticated staffが希望するtenant selector。active membershipで再検証する。 | 本番候補だがAuth/JWT未接続 |
| `x-tenant-id` | dev_header | local/dev/test互換のtenant selector。 | 本番認証ではない。production rejectionは後続Loop |

`dev_header` pathでは `x-selected-tenant-id` を無視する。

## Route Results

### Staff reply

- single active membership + no selectedTenantIdで成功。
- multi membership + no selectedTenantIdで `tenant_selection_required`。
- matching `x-selected-tenant-id` で選択tenantのcustomerへMockLineClient境界で返信処理する。
- wrong `x-selected-tenant-id` で `tenant_membership_denied`。
- invalid `x-selected-tenant-id` で `invalid_selected_tenant_id`。
- 他tenant customerは既存仕様どおり `customer_not_found` 404。
- 本物LINE送信は行わない。
- staff message保存とcustomer更新の既存仕様は維持。

### AI summary

- matching `x-selected-tenant-id` のverified tenantでtimelineを取得し、MockAiProviderでsummaryを生成する。
- summary message保存の既存仕様は維持。
- staff roleは既存permissionどおり `create_ai_summary` で拒否される。
- 他tenant customerは `customer_not_found` 404。
- OpenAI APIは呼ばない。

### AI reply draft

- matching `x-selected-tenant-id` のverified tenantでtimelineを取得し、MockAiProviderでreply draftを生成する。
- draftは既存仕様どおりresponse-onlyで、message保存しない。
- 他tenant customerは `customer_not_found` 404。
- OpenAI APIは呼ばない。

## dev_header Path

- `x-tenant-id` の既存動作は維持。
- `x-selected-tenant-id` が不正値でも、Authorizationがないdev_header pathでは影響しない。
- local/testのMVP確認互換は維持。

## Default Runtime

- default runtimeは引き続き `in_memory`。
- `REPOSITORY_RUNTIME=supabase` やSupabase実DB接続はこのLoopでは扱わない。

## Tests

Added:

- `tests/integration/admin-api-authenticated-runtime-customer-write-ai-routes.test.ts`

Covered:

- staff replyのsingle membership成功。
- multi membership + selectedTenantIdなしの `tenant_selection_required`。
- matching `x-selected-tenant-id` でtenant scoped staff reply。
- wrong `x-selected-tenant-id` でrepository/LINE mock accessなし。
- invalid `x-selected-tenant-id` でsession lookup / repository accessなし。
- other-tenant staff replyは404。
- AI summaryがverified tenant idでcustomer/timeline/provider/message writeを扱う。
- other-tenant AI summaryは404。
- staff roleはAI summaryでpermission denied。
- AI reply draftがverified tenant idでprovider inputを作り、message保存しない。
- other-tenant AI reply draftは404。
- dev_header pathでは `x-selected-tenant-id` を無視。
- default in-memory app behaviorを維持。

## Production No-Go

productionは引き続きNo-Go。

未実装:

- Supabase Auth/JWT本接続。
- RLS SQL。
- production `dev_header` rejection。
- Admin UI selected tenant保存。
- alerts/RAG routes authenticated rollout。
- LINE/OpenAI本接続。

## Residual Risks

- authenticated_staff runtimeはcustomer routesまで。
- alerts、RAGはまだ `dev_header` 互換のまま。
- fake verifier / fake StaffAuthLookupによる検証であり、real Supabase Auth/JWTではない。
- productionで `x-tenant-id` を拒否する処理はまだない。

## Next Loop

Loop 091: authenticated_staff runtime rollout for alerts routes.

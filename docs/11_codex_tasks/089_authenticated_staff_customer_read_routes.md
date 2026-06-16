# Loop 089: authenticated_staff customer read routes

## Goal

Loop 088で分割した最初の実装として、customer read routesだけに authenticated_staff runtime を展開する。

対象route:

- `GET /api/admin/customers`
- `GET /api/admin/customers/:customerId`
- `GET /api/admin/customers/:customerId/timeline`

## Scope

- customer read routesで `Authorization: Bearer` + `x-selected-tenant-id` を受ける。
- `selectedTenantId` をactive `staff_tenant_memberships` で再検証する。
- customer read repository/serviceへは検証済み `AdminTenantContext.tenantId` のみ渡す。
- `dev_header` / `x-tenant-id` pathは既存互換のまま維持する。
- default `in_memory` runtimeを維持する。
- response shapeを変更しない。
- tests、README、runbook、dev loop docs、dev logを更新する。

## Out of Scope

- customer write routes rollout。
- `POST /api/admin/customers/:customerId/reply`。
- `POST /api/admin/customers/:customerId/ai-summary`。
- `POST /api/admin/customers/:customerId/ai-reply-draft`。
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
- `GET /api/admin/customers` はrepresentative authenticated routeとして対応済み。
- `GET /api/admin/customers/:customerId` と `/timeline` は `dev_header` のみだった。
- production readinessはNo-Go。

## Implementation Summary

- `apps/api/src/index.ts` にcustomer read route向けの小さなtenant resolution helperを追加。
- helperは `Authorization` headerがある場合だけ authenticated_staff runtimeへ進む。
- authenticated pathでは `x-selected-tenant-id` を抽出し、invalid formatならsession lookup前に `invalid_selected_tenant_id` を返す。
- authenticated pathでは `resolveAuthenticatedAdminRuntimeContext` に既存AdminActionを渡し、active membershipとrole guardを通す。
- no Authorizationの場合は既存 `x-tenant-id` / `dev_header` pathを使う。
- customer list/detail/timelineは helper が返した verified tenant idだけでrepository/serviceを呼ぶ。

## selectedTenantId Revalidation

Rules:

- `selectedTenantId` は権限ではなくselector。
- active membershipが1つだけなら未指定でそのtenantを使う。
- 複数active membershipsで未指定なら `tenant_selection_required`。
- membership外のtenantなら `tenant_membership_denied`。
- invalid formatなら `invalid_selected_tenant_id`。
- raw `x-selected-tenant-id` はrepository/serviceへ渡さない。
- repository/service input tenant idは verified `AdminTenantContext.tenantId` のみ。

## `x-selected-tenant-id` and `x-tenant-id`

| header | runtime | purpose | production status |
| --- | --- | --- | --- |
| `x-selected-tenant-id` | authenticated_staff | authenticated staffが希望するtenant selector。active membershipで再検証する。 | 本番候補だがAuth/JWT未接続 |
| `x-tenant-id` | dev_header | local/dev/test互換のtenant selector。 | 本番認証ではない。production rejectionは後続Loop |

`dev_header` pathでは `x-selected-tenant-id` を無視する。

## Route Results

### Customer list

- single active membership + no selectedTenantIdで成功。
- multi membership + no selectedTenantIdで `tenant_selection_required`。
- matching `x-selected-tenant-id` で選択tenantのcustomersだけ返る。
- wrong `x-selected-tenant-id` で `tenant_membership_denied`。
- invalid `x-selected-tenant-id` で `invalid_selected_tenant_id`。
- invalid selectedTenantIdではsession lookupやcustomer repository accessへ進まない。

### Customer detail

- matching `x-selected-tenant-id` のverified tenantでcustomer detailを取得する。
- 他tenant customerは既存仕様どおり `customer_not_found` 404。
- invalid selectedTenantIdではrepositoryへ進まない。

### Timeline

- matching `x-selected-tenant-id` のverified tenantでtimelineを取得する。
- 他tenant customerのtimelineは返さない。
- customerが見つからない場合はmessage repositoryへ進まない。

## dev_header Path

- `x-tenant-id` の既存動作は維持。
- `x-selected-tenant-id` が不正値でも、Authorizationがないdev_header pathでは影響しない。
- local/testのMVP確認互換は維持。

## Default Runtime

- default runtimeは引き続き `in_memory`。
- `REPOSITORY_RUNTIME=supabase` やSupabase実DB接続はこのLoopでは扱わない。

## Tests

Added:

- `tests/integration/admin-api-authenticated-runtime-customer-read-routes.test.ts`

Covered:

- customer listのsingle membership成功。
- multi membership + selectedTenantIdなしの `tenant_selection_required`。
- matching `x-selected-tenant-id` でtenant scoped customer list。
- wrong `x-selected-tenant-id` でrepository accessなし。
- invalid `x-selected-tenant-id` でsession lookup / repository accessなし。
- customer detailがverified tenant idでrepositoryを呼ぶ。
- other-tenant customer detailは404。
- timelineがverified tenant idでmessage repositoryを呼ぶ。
- other-tenant customer timelineはmessagesを返さない。
- dev_header pathでは `x-selected-tenant-id` を無視。
- default in-memory app behaviorを維持。

## Production No-Go

productionは引き続きNo-Go。

未実装:

- Supabase Auth/JWT本接続。
- RLS SQL。
- production `dev_header` rejection。
- Admin UI selected tenant保存。
- customer write/AI routes authenticated rollout。
- alerts/RAG routes authenticated rollout。
- LINE/OpenAI本接続。

## Residual Risks

- authenticated_staff runtimeはcustomer read routesまで。
- customer write/AI、alerts、RAGはまだ `dev_header` 互換のまま。
- fake verifier / fake StaffAuthLookupによる検証であり、real Supabase Auth/JWTではない。
- productionで `x-tenant-id` を拒否する処理はまだない。

## Next Loop

Loop 090: authenticated_staff runtime rollout for customer write/AI draft routes.

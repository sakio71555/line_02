# Loop 091: authenticated_staff alert routes

## Goal

Loop 090でcustomer write / AI routesへ展開した authenticated_staff runtime を、alerts routesだけへ広げる。

対象route:

- `GET /api/admin/alerts`
- `POST /api/admin/alerts/check-unreplied`
- `POST /api/admin/alerts/notify-open`

## Scope

- 対象3routeで `Authorization: Bearer` + `x-selected-tenant-id` を受ける。
- `selectedTenantId` をactive `staff_tenant_memberships` で再検証する。
- alerts処理へは検証済み `AdminTenantContext.tenantId` のみ渡す。
- alert listはverified tenantのalertだけ返す。
- unreplied checkはverified tenantのcustomersとalertsだけを対象にする。
- notify-openはverified tenantのopen alertsだけをMockStaffNotifierへ渡す。
- `dev_header` / `x-tenant-id` pathは既存互換のまま維持する。
- default `in_memory` runtimeを維持する。
- response shapeを変更しない。
- tests、README、runbook、dev loop docs、dev logを更新する。

## Out of Scope

- RAG routes rollout。
- customer routesの追加変更。
- production `dev_header` rejection。
- Supabase Auth/JWT本接続。
- RLS SQL実装。
- migration SQL / GRANT変更。
- Admin UI変更。
- selectedTenantId UI保存。
- 本物LINE通知。
- OpenAI API実接続。
- Supabase実DB / staging / production接続。
- `.env` 作成・変更。
- package依存追加。

## Starting State

- Loop 087で `x-selected-tenant-id` transport boundaryを追加済み。
- Loop 088で全Admin route rollout planとroute matrixを整理済み。
- Loop 089でcustomer read routesはauthenticated_staff runtimeへ展開済み。
- Loop 090でcustomer write / AI routesはauthenticated_staff runtimeへ展開済み。
- alerts routesは `dev_header` 互換のみだった。
- production readinessはNo-Go。

## Implementation Summary

- `apps/api/src/index.ts` のadmin tenant resolution helperをtenant scoped route共通に整理。
- helperは `Authorization` headerがある場合だけ authenticated_staff runtimeへ進む。
- authenticated pathでは `x-selected-tenant-id` を抽出し、invalid formatならsession lookup前に `invalid_selected_tenant_id` を返す。
- authenticated pathでは `resolveAuthenticatedAdminRuntimeContext` に既存AdminActionを渡し、active membershipとrole guardを通す。
- no Authorizationの場合は既存 `x-tenant-id` / `dev_header` pathを使う。
- alert list、unreplied check、notify-openは helper が返した verified tenant idだけでrepository/service/notifier処理を扱う。

## selectedTenantId Revalidation

Rules:

- `selectedTenantId` は権限ではなくselector。
- active membershipが1つだけなら未指定でそのtenantを使う。
- 複数active membershipsで未指定なら `tenant_selection_required`。
- membership外のtenantなら `tenant_membership_denied`。
- invalid formatなら `invalid_selected_tenant_id`。
- raw `x-selected-tenant-id` はrepository/service/notifierへ渡さない。
- alerts処理のtenant idは verified `AdminTenantContext.tenantId` のみ。

## Route Results

### Alert list

- single active membership + no selectedTenantIdで成功。
- multi membership + no selectedTenantIdで `tenant_selection_required`。
- matching `x-selected-tenant-id` で選択tenantのalertsだけ返す。
- wrong `x-selected-tenant-id` で `tenant_membership_denied`。
- invalid `x-selected-tenant-id` でsession lookup / repository accessなし。

### Unreplied check

- matching `x-selected-tenant-id` のverified tenantでcustomer候補を取得する。
- customerRepositoryとalertRepositoryの両方へ同じverified tenant idだけを渡し、split-brainを避ける。
- staff roleは既存permissionどおり `check_unreplied_alerts` で拒否される。
- 他tenant customerにalertを作らない。

### Notify open

- matching `x-selected-tenant-id` のverified tenantでopen alertsだけ通知対象にする。
- alertRepositoryとMockStaffNotifierの両方へ同じverified tenant idだけを渡す。
- 成功したalertだけ `notified` へ更新する既存仕様を維持。
- staff roleは既存permissionどおり `notify_open_alerts` で拒否される。
- 本物LINE通知は行わない。

## dev_header Path

- `x-tenant-id` の既存動作は維持。
- `x-selected-tenant-id` が不正値でも、Authorizationがないdev_header pathでは影響しない。
- local/testのMVP確認互換は維持。

## Default Runtime

- default runtimeは引き続き `in_memory`。
- `REPOSITORY_RUNTIME=supabase` やSupabase実DB接続はこのLoopでは扱わない。

## Tests

Added:

- `tests/integration/admin-api-authenticated-runtime-alert-routes.test.ts`

Covered:

- alert listのsingle membership成功。
- multi membership + selectedTenantIdなしの `tenant_selection_required`。
- matching `x-selected-tenant-id` でtenant scoped alert list。
- wrong `x-selected-tenant-id` でrepository accessなし。
- invalid `x-selected-tenant-id` でsession lookup / repository accessなし。
- unreplied checkがverified tenant idだけでcustomer/alert repositoryを扱う。
- staff roleはunreplied checkでpermission denied。
- notify-openがverified tenant idだけでalert repository / MockStaffNotifierを扱う。
- staff roleはnotify-openでpermission denied。
- dev_header pathでは `x-selected-tenant-id` を無視。
- default in-memory app behaviorを維持。

## Production No-Go

productionは引き続きNo-Go。

未実装:

- Supabase Auth/JWT本接続。
- RLS SQL。
- production `dev_header` rejection。
- Admin UI selected tenant保存。
- RAG routes authenticated rollout。
- LINE/OpenAI本接続。

## Residual Risks

- authenticated_staff runtimeはcustomer routesとalerts routesまで。
- RAGはまだ `dev_header` 互換のまま。
- fake verifier / fake StaffAuthLookupによる検証であり、real Supabase Auth/JWTではない。
- productionで `x-tenant-id` を拒否する処理はまだない。

## Next Loop

Loop 092: authenticated_staff runtime rollout for RAG routes.

# Loop 087: selectedTenantId transport boundary

## Goal

authenticated_staff runtimeで、操作対象tenantの希望値である `selectedTenantId` を安全にAPIへ運ぶ境界を追加する。

`selectedTenantId` は権限ではない。必ずactive `staff_tenant_memberships` で再検証し、repositoryへ渡すtenantは検証済み `AdminTenantContext.tenantId` のみにする。

## Scope

- `x-selected-tenant-id` headerをauthenticated_staff runtime用transportとして追加。
- `selectedTenantId` の空文字を未指定扱いにする。
- tenant id形式に合わない値を `invalid_selected_tenant_id` として扱う。
- existing fake authenticated runtime / representative routeでmembership再検証を確認。
- `x-tenant-id` / `dev_header` pathは既存互換のまま維持。
- docs / runbook / dev logを更新。

## Out of Scope

- Supabase Auth/JWT本接続。
- RLS SQL実装。
- migration SQL変更。
- production dev_header rejection実装。
- Admin UIのtenant選択保存。
- cookie/session/localStorage保存。
- authenticated runtime full route rollout。
- LINE API実送信。
- OpenAI API実呼び出し。
- Supabase staging/production DB接続。

## Starting State

- Loop 086でproduction hardening split planを追加済み。
- staging拡張検証版100%相当。
- production readinessはNo-Go。
- `resolveAuthenticatedTenantContext` は、すでにactive staffとactive membershipで `selectedTenantId` を再検証する。
- `GET /api/admin/customers` のrepresentative routeはfake authenticated runtimeを持つ。
- これまではtest-only `authenticatedSelectedTenantId` dependency injectionを使っていた。

## selectedTenantId Definition

```text
selectedTenantId = requestから来る希望tenant selector
active membership = 権限ソース
AdminTenantContext.tenantId = membership再検証後の確定tenant scope
repository tenant_id = AdminTenantContext.tenantIdのみ
```

禁止:

- raw `selectedTenantId` をrepositoryへ渡す。
- `selectedTenantId` を権限として扱う。
- membership再検証なしでtenantを確定する。

## Transport Policy

authenticated_staff runtime:

```text
x-selected-tenant-id
```

dev_header path:

```text
x-tenant-id
```

`x-selected-tenant-id` はauthenticated_staff runtimeだけで使う。`Authorization: Bearer` がないdev_header pathでは既存どおり `x-tenant-id` だけを見る。

空文字は未指定扱い。形式不正な値は `invalid_selected_tenant_id`。

## Membership Revalidation

| case | result |
| --- | --- |
| active memberships = 0 | `tenant_membership_denied` |
| active memberships = 1, selectedTenantIdなし | そのtenantを自動確定 |
| active memberships = 1, matching selectedTenantId | そのtenantを確定 |
| active memberships = 1, wrong selectedTenantId | `tenant_membership_denied` |
| active memberships >= 2, selectedTenantIdなし | `tenant_selection_required` |
| active memberships >= 2, matching selectedTenantId | そのtenantを確定 |
| active memberships >= 2, wrong selectedTenantId | `tenant_membership_denied` |
| inactive membership | 無視 |
| inactive staff | 拒否 |

## Error Mapping

| error | HTTP |
| --- | --- |
| `invalid_selected_tenant_id` | `400` |
| `tenant_selection_required` | `409` |
| `tenant_membership_denied` | `403` |
| `authenticated_staff_required` | `401` |
| `session_expired` | `401` |
| `permission_denied` | `403` |

## Implementation Summary

- `apps/api/src/admin/selected-tenant-transport.ts` を追加。
- `resolveAuthenticatedAdminRuntimeContext` でも `selectedTenantId` をvalidation。
- `GET /api/admin/customers` のauthenticated pathで `x-selected-tenant-id` を抽出し、fake authenticated runtimeへ渡す。
- 既存のtest-only `authenticatedSelectedTenantId` fallbackは互換用として残す。
- dev_header pathでは `x-selected-tenant-id` を使わず、既存 `x-tenant-id` 動作を維持。

## Tests

- single active membership + selectedTenantIdなし => tenant確定。
- single active membership + wrong selectedTenantId => `tenant_membership_denied`。
- multiple active memberships + selectedTenantIdなし => `tenant_selection_required`。
- multiple active memberships + matching selectedTenantId => tenant確定。
- multiple active memberships + wrong selectedTenantId => `tenant_membership_denied`。
- inactive membershipは無視。
- inactive staffは拒否。
- invalid selectedTenantId => `invalid_selected_tenant_id`。
- representative routeで `x-selected-tenant-id` が検証済みtenant scopeになる。
- representative routeでraw `selectedTenantId` ではなく `AdminTenantContext.tenantId` のcustomersだけ返る。
- dev_header pathでは `x-selected-tenant-id` を無視し、既存 `x-tenant-id` 動作を維持。

## Still Not Implemented

- Supabase Auth/JWT本接続。
- selectedTenantIdのAdmin UI保存。
- authenticated runtimeの全route rollout。
- production dev_header rejection。
- RLS SQL。
- LINE/OpenAI本接続。

## Residual Risks

- HTTP transportは代表routeだけで確認済み。全Admin route rolloutは後続Loop。
- `x-selected-tenant-id` はserver-to-API forwarding前提だが、Admin UI token forwarding/session設計は未実装。
- productionはAuth/JWT/RLS/dev_header rejection未実装のためNo-Go。

## Next Loop

Loop 088: authenticated staff runtime full route rollout plan.

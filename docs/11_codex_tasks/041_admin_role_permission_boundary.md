# Loop 041: Admin Role Permission Boundary

## Goal

Loop 040で整理したrole permission matrixをもとに、Admin操作の許可/拒否を判定するpure permission boundaryを追加する。

今回作る境界は、後続LoopでAPI guardやUI制御に接続するためのHTTP非依存・UI非依存・DB非依存の判定ロジックである。Admin API route、Admin UI、authenticated runtimeにはまだ接続しない。

## Scope

- Admin role/actionの型を追加する。
- `owner` / `manager` / `staff` に対する操作許可matrixをコード化する。
- permission判定関数を追加する。
- permission deniedの理由を返せるresult型を追加する。
- `permission_denied` に変換しやすいthrow境界を追加する。
- role matrix testを追加する。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- API route変更
- Admin API role guard接続
- Admin UI button非表示/disabled実装
- Admin UI redirect実装
- authenticated_staff runtime接続
- dev-only `x-tenant-id` runtime変更
- Supabase Auth/JWT接続
- middleware実装
- RLS SQL実装
- migration SQL変更
- repository変更
- `.env` 作成・変更
- Supabase本番接続
- `supabase link`
- OpenAI API呼び出し
- LINE API呼び出し
- Webクロール

## Boundary Location

Implemented in:

- `packages/domain/src/admin-permissions.ts`

Exported from:

- `packages/domain/src/index.ts`

Reason:

- Permission判定はdomain policyであり、Hono、Next.js、Supabase client、repository、envに依存しない。
- 後続LoopでAPI側とUI側の両方から参照しやすい。
- Importしてもenv validation、network access、外部API呼び出しは発生しない。

## Roles

Implemented roles:

- `owner`
- `manager`
- `staff`

The boundary uses the existing `StaffRole` type as `AdminRole`.

Not implemented in code:

- `viewer`
- `platform_admin`

Reason:

- These roles are still future candidates and are not in the current schema/type list.
- Unknown roles default deny.

## Actions

Implemented `AdminAction` values:

| Action | Meaning |
| --- | --- |
| `view_customers` | 顧客一覧閲覧 |
| `view_customer_detail` | 顧客詳細閲覧 |
| `view_timeline` | timeline閲覧 |
| `send_staff_reply` | 担当者返信 |
| `create_ai_summary` | AI要約作成、summary message保存 |
| `create_ai_reply_draft` | AI返信下書き生成、保存なし |
| `search_rag` | RAG検索 |
| `create_rag_answer_draft` | RAG回答案生成、保存なし |
| `view_alerts` | alert一覧閲覧 |
| `check_unreplied_alerts` | 未返信チェック、alert作成 |
| `notify_open_alerts` | open alert通知、alert status更新 |
| `manage_knowledge` | future knowledge管理 |
| `manage_staff` | future staff管理 |
| `manage_tenant_settings` | future tenant設定 |
| `run_dev_seed` | dev-only demo seed |

`run_dev_seed` is intentionally listed as a known action but excluded from `roleGuardedAdminActions`. It remains dev-only and should not become a production role-granted operation.

## Permission Matrix Summary

| Action group | owner | manager | staff |
| --- | ---: | ---: | ---: |
| customer/timeline read | yes | yes | yes |
| staff reply | yes | yes | yes |
| AI summary save | yes | yes | no |
| AI reply draft | yes | yes | yes |
| RAG search / answer draft | yes | yes | yes |
| alert read | yes | yes | yes |
| check unreplied alerts | yes | yes | no |
| notify open alerts | yes | yes | no |
| manage knowledge | yes | no | no |
| manage staff | yes | no | no |
| manage tenant settings | yes | no | no |
| run dev seed | no | no | no |

Policy:

- `owner` can perform every role-guarded Admin action.
- `manager` can perform customer support, AI/RAG support, and alert operations, but not management/settings actions.
- `staff` can perform day-to-day customer support actions, but not persistent AI summary, alert mutation/notification, or management/settings actions.

## Default Deny Policy

The boundary denies by default:

- unknown role -> `unknown_role`
- unknown action -> `unknown_action`
- known role/action not in matrix -> `role_not_allowed`
- `run_dev_seed` -> `role_not_allowed`

This makes future roles/actions safe until explicitly added to the matrix.

## Permission Result Type

Added:

- `AdminPermissionDecision`
- `AdminPermissionDeniedReason`

Allowed result:

```ts
{
  allowed: true,
  role: AdminRole,
  action: AdminAction
}
```

Denied result:

```ts
{
  allowed: false,
  reason: "role_not_allowed" | "unknown_action" | "unknown_role",
  role: string,
  action: string
}
```

Functions:

- `evaluateAdminPermission({ role, action })`
- `canPerformAdminAction(role, action)`
- `requireAdminPermission({ role, action })`

`requireAdminPermission` throws `AdminPermissionError` with `code = "permission_denied"` so a later API guard can map it to the existing Admin auth error response boundary.

## `permission_denied` Error Relationship

Existing mapper:

- `apps/api/src/admin/auth-error-response.ts`

Loop 041 does not import or call that API mapper, because this boundary must remain HTTP-independent.

Future API guard policy:

- denied permission -> `AdminPermissionError.code = "permission_denied"`
- API layer maps it to `403 { ok: false, error: "permission_denied" }`
- `/permission-denied` remains the placeholder route for safe role-denied states.

## Dev-only `x-tenant-id` Runtime Relationship

Current runtime remains unchanged:

```text
Admin UI helper
-> x-tenant-id
-> Admin API tenant context guard
-> AdminTenantContext(source: dev_header)
-> in-memory repositories
```

Policy:

- The permission boundary accepts a role string, but current `dev_header` context has no production role.
- Do not treat `source: dev_header` as authenticated production role context.
- Do not add fake production role headers.
- A later loop should connect this boundary only when `source: authenticated_staff` is active.

## API Route / UI Connection Status

Not connected:

- Admin API route guard
- Admin UI button visibility/disabled control
- Admin UI redirects
- authenticated staff runtime path
- Supabase Auth/JWT/session verification

Existing MVP behavior is unchanged.

## Tests

Added:

- `tests/integration/admin-role-permissions.test.ts`

Verified:

- owner can perform every role-guarded action.
- manager can perform customer, AI/RAG, and alert operations.
- manager cannot manage staff, tenant settings, or knowledge management.
- staff can perform customer read, timeline, staff reply, AI reply draft, RAG answer draft, and alert read.
- staff cannot create AI summary, mutate/notify alerts, manage knowledge, manage staff, or manage tenant settings.
- `run_dev_seed` is known but not role-granted.
- unknown action is denied.
- unknown role is denied.
- permission result is easy to map to `permission_denied`.
- importing the boundary does not touch external APIs.

## Risks

- API routes do not yet enforce this permission boundary.
- Admin UI still shows all action buttons in dev MVP.
- Runtime still uses dev-only `x-tenant-id`.
- `viewer` and `platform_admin` remain future candidates outside schema/types.
- Route-specific ordering between resource-not-found, tenant filtering, and permission denial still needs implementation design.

## Next Loop Candidates

```text
Loop 042: admin API role guard connection plan
Loop 043: admin UI role visibility plan
Loop 044: admin session/JWT verification plan
```

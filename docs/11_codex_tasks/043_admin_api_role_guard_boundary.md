# Loop 043: Admin API Role Guard Boundary

## Goal

Loop 041の `admin role permission boundary` とLoop 042のroute/action mapping planを、Admin APIで使える薄いguard境界として追加する。

今回はAdmin API routeへ接続しない。authenticated staff runtime接続、UI制御、Supabase Auth/JWT接続も行わない。

## Scope

- API層のrole guard boundaryを追加する。
- `AdminTenantContext + AdminAction` を入力として受ける。
- `source: authenticated_staff` かつroleありのcontextだけをrole判定対象にする。
- `source: dev_header` は `authenticated_staff_required` として拒否する。
- permission deniedを既存のAdmin auth error mapper互換の `permission_denied` に変換する。
- fake contextのVitestを追加する。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- Admin API routeへの接続
- representative routeへのenforce
- full route rollout
- Admin UI role visibility制御
- authenticated staff runtime接続
- Supabase Auth/JWT接続
- RLS SQL実装
- migration SQL変更
- repository変更
- `.env` 作成・変更
- Supabase本番接続
- OpenAI API呼び出し
- LINE API呼び出し
- Webクロール
- build前提のUI変更

## Added Boundary

Location:

- `apps/api/src/admin/role-guard.ts`

Exports:

- `evaluateAdminRoleGuard`
- `requireAdminRole`
- `mapAdminRoleGuardFailureToAuthError`
- `AdminRoleGuardError`

Input:

```ts
{
  context: AdminTenantContext;
  action: AdminAction;
}
```

Behavior:

- `context.source !== "authenticated_staff"` は `authenticated_staff_required`。
- `authenticated_staff` でも `role` がない場合は `authenticated_staff_required`。
- `evaluateAdminPermission({ role, action })` がdenyなら `permission_denied`。
- allowなら `AdminTenantContext(source: authenticated_staff, role)` とactionを返す。

## `dev_header` Policy

Current runtime still uses:

```text
x-tenant-id -> resolveAdminTenantContext -> AdminTenantContext(source: dev_header)
```

`dev_header` is a local development tenant selector, not production authentication. The new role guard rejects it instead of treating it as authorized.

This boundary is therefore safe to add before route connection, but it must not be inserted into the current dev-header routes until authenticated staff runtime is connected or a representative route loop explicitly defines the transition.

## Error Mapping

The role guard returns `AdminAuthError` compatible errors:

| Guard failure | AdminAuthError code | HTTP mapping |
| --- | --- | --- |
| non-authenticated staff context | `authenticated_staff_required` | `401`, `/login` |
| role/action permission denied | `permission_denied` | `403`, `/permission-denied` |

HTTP response construction stays in:

- `apps/api/src/admin/auth-error-response.ts`

## Tests

Added:

- `tests/integration/admin-api-role-guard-boundary.test.ts`

Covered:

- Importing the guard does not validate env or make network calls.
- `owner` can perform all role-guarded Admin actions.
- `manager` can perform operational actions and is denied management-only actions.
- `staff` can perform day-to-day support actions and is denied notification/settings actions.
- `dev_header` context is rejected as `authenticated_staff_required`.
- `authenticated_staff` context without role is rejected.
- `requireAdminRole` throws `AdminRoleGuardError` with mappable auth error.
- `run_dev_seed` is not treated as a role-granted production action.

## Runtime Status

No route uses this guard yet. Existing Admin API runtime behavior remains unchanged and still uses in-memory repositories plus dev-only `x-tenant-id` tenant selection.

## Risks

- Admin API routes still do not enforce role permissions.
- Runtime still uses `source: dev_header`.
- UI still does not hide or disable actions by role.
- Representative route connection must decide how to transition from dev-header runtime without creating fake production authorization.

## Next Loop Candidates

```text
Loop 044: admin API role guard representative route
Loop 045: admin API role guard full route rollout
Loop 046: admin UI role visibility plan
Loop 047: admin UI role visibility placeholder
Loop 048: dev header production rejection plan
```

# Loop 044: Admin API Role Guard Representative Route

## Goal

Loop 043で追加したAdmin API role guard boundaryを、全Admin APIへ展開する前に代表actionで検証する。

今回は既存Admin API routeへは接続しない。現在のdev-only `x-tenant-id` MVP runtimeを壊さず、authenticated staff contextをfakeで渡せる代表handlerを追加してrole guardとresponse mappingを確認する。

## Scope

- 代表actionとして `view_customers` を使う。
- API層の代表handler helperを追加する。
- `AdminTenantContext(source: authenticated_staff, role) + AdminAction` をguardへ渡す。
- allow時はhandlerを実行し、deny時はhandlerを実行しない。
- deny時は既存Admin auth error mapperのHTTP shapeへ変換する。
- `dev_header` runtimeの既存Admin API routeは変更しない。
- fake contextのVitestを追加する。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- 全Admin API routeへのrole guard展開
- 既存MVP routeへの強制適用
- dev-only `x-tenant-id` runtime廃止
- Supabase Auth/JWT接続
- authenticated staff runtime本接続
- Admin UI制御
- button非表示/disabled実装
- middleware実装
- RLS SQL実装
- migration SQL変更
- repository変更
- `.env` 作成・変更
- Supabase本番接続
- OpenAI API呼び出し
- LINE API呼び出し
- Webクロール

## Representative Action

Representative action:

```text
view_customers
```

Reason:

- customer list is the basic Admin read path.
- `owner` / `manager` / `staff` are all expected to be allowed.
- it is low-risk for first guard verification.
- the current `/api/admin/customers` MVP route can remain dev-header compatible while the guard is tested with fake authenticated staff context.

## Adopted Connection Policy

Adopted policy: **A: representative handler without changing existing routes**.

Added:

- `apps/api/src/admin/role-guarded-handler.ts`

Exports:

- `runRoleGuardedAdminHandler`

Input:

```ts
{
  context: AdminTenantContext;
  action: AdminAction;
  handler: (context: AuthenticatedStaffRoleGuardContext) => TBody | Promise<TBody>;
}
```

Behavior:

- evaluates `evaluateAdminRoleGuard({ context, action })`.
- on allow, executes the handler with `AuthenticatedStaffRoleGuardContext`.
- on deny, maps the role guard failure through `mapAdminAuthErrorToHttp`.
- does not import Supabase, read env, or connect to external services.

## Existing MVP Route Compatibility

No existing route was modified in this Loop.

The current path remains:

```text
/api/admin/customers
-> x-tenant-id
-> resolveAdminTenantContext
-> AdminTenantContext(source: dev_header)
-> in-memory repository
```

The representative handler rejects `dev_header`, but it is not inserted into current MVP routes. This keeps local manual testing stable while preventing `dev_header` from becoming fake production authorization.

## Authenticated Staff Verification

Tests cover:

- `authenticated_staff + owner + view_customers` is allowed.
- `authenticated_staff + manager + view_customers` is allowed.
- `authenticated_staff + staff + view_customers` is allowed.
- handler executes only after allow.
- handler receives tenant-scoped authenticated staff context.

## Permission Denied Response Verification

Tests cover:

- `authenticated_staff + staff + create_ai_summary` is denied.
- denied handler is not executed.
- denial maps to:

```json
{
  "ok": false,
  "error": "permission_denied"
}
```

with HTTP status `403` and placeholder route `/permission-denied`.

## `dev_header` Runtime Relationship

- `source: dev_header` is not production-authenticated staff context.
- representative handler maps it to `authenticated_staff_required`.
- existing MVP routes still accept dev-only `x-tenant-id` because the handler is not connected to them.
- production dev-header rejection remains a later hardening Loop.

## Supabase Auth / JWT Status

Supabase Auth, JWT/session verification, authenticated runtime connection, and RLS are still unimplemented in this Loop.

## Tests

Added:

- `tests/integration/admin-api-role-guard-representative-route.test.ts`

Covered:

- import has no env validation or network access.
- `view_customers` allows owner / manager / staff.
- `create_ai_summary` denies staff and maps to permission_denied response.
- `dev_header` is rejected by the representative handler.
- existing `/api/admin/customers` dev-header route still returns the previous success and missing-tenant shapes.

## Risks

- No real Admin API route enforces role guard yet.
- Runtime still uses dev-only `x-tenant-id`.
- UI role visibility is still unimplemented.
- The next route-connection Loop must decide how to introduce authenticated runtime or explicitly keep a temporary compatibility layer.

## Next Loop Candidates

```text
Loop 045: admin API role guard full route rollout
Loop 046: admin UI role visibility plan
Loop 047: admin UI role visibility placeholder
Loop 048: dev header production rejection plan
```

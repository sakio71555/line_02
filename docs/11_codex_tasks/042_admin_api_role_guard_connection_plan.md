# Loop 042: Admin API Role Guard Connection Plan

## Goal

Loop 041で追加した `admin role permission boundary` を、後続LoopでAdmin APIへ安全に接続するためのdocs-only接続計画を作る。

今回はAdmin API routeへ接続しない。role guardをenforceしない。Admin UIのbutton制御、authenticated runtime接続、Supabase Auth/JWT接続も行わない。

## Scope

- 現在のAdmin API route一覧を実ファイルから確認する。
- Admin API routeごとに対応する `AdminAction` を割り当てる。
- dev-only routeと本番guard対象routeを分ける。
- LINE webhook / health / dev seed などrole guard対象外routeを整理する。
- `source: authenticated_staff` 接続後のguard適用方針を整理する。
- `source: dev_header` runtimeでの扱いを整理する。
- permission denied時のresponse方針を整理する。
- 接続順序をLoop分割する。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- API route変更
- role guard実装接続
- Admin UI制御実装
- button非表示/disabled実装
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
- build前提のUI変更

## Admin API Route Inventory

Source of truth:

- `apps/api/src/index.ts`

Current routes:

| Method | Route | Current boundary |
| --- | --- | --- |
| `GET` | `/health` | config health check |
| `POST` | `/api/dev/seed-demo-data` | dev-only seed; production disabled |
| `GET` | `/api/admin/customers` | Admin tenant context guard via dev header |
| `GET` | `/api/admin/customers/:customerId` | Admin tenant context guard via dev header |
| `GET` | `/api/admin/customers/:customerId/timeline` | Admin tenant context guard via dev header |
| `POST` | `/api/admin/customers/:customerId/ai-summary` | Admin tenant context guard via dev header |
| `POST` | `/api/admin/customers/:customerId/ai-reply-draft` | Admin tenant context guard via dev header |
| `POST` | `/api/admin/rag/search` | Admin tenant context guard via dev header |
| `POST` | `/api/admin/rag/answer-draft` | Admin tenant context guard via dev header |
| `POST` | `/api/admin/customers/:customerId/reply` | Admin tenant context guard via dev header |
| `GET` | `/api/admin/alerts` | Admin tenant context guard via dev header |
| `POST` | `/api/admin/alerts/check-unreplied` | Admin tenant context guard via dev header |
| `POST` | `/api/admin/alerts/notify-open` | Admin tenant context guard via dev header |
| `POST` | `/api/line/webhook/:webhookSecret` | LINE webhook secret + signature guard |

## Route To AdminAction Mapping

Loop 041 action source:

- `packages/domain/src/admin-permissions.ts`

Proposed mapping for production Admin API guard rollout:

| Method | Route | AdminAction | Initial allowed roles | Guard target | Notes |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/admin/customers` | `view_customers` | owner / manager / staff | yes | tenant-scoped customer list read |
| `GET` | `/api/admin/customers/:customerId` | `view_customer_detail` | owner / manager / staff | yes | tenant-scoped customer detail read |
| `GET` | `/api/admin/customers/:customerId/timeline` | `view_timeline` | owner / manager / staff | yes | tenant-scoped timeline read |
| `POST` | `/api/admin/customers/:customerId/reply` | `send_staff_reply` | owner / manager / staff | yes | LINE send boundary remains mock until production LINE connection |
| `POST` | `/api/admin/customers/:customerId/ai-summary` | `create_ai_summary` | owner / manager | yes | persistent summary message write |
| `POST` | `/api/admin/customers/:customerId/ai-reply-draft` | `create_ai_reply_draft` | owner / manager / staff | yes | draft only; no message write |
| `POST` | `/api/admin/rag/search` | `search_rag` | owner / manager / staff | yes | tenant-scoped knowledge search |
| `POST` | `/api/admin/rag/answer-draft` | `create_rag_answer_draft` | owner / manager / staff | yes | draft only; no message write |
| `GET` | `/api/admin/alerts` | `view_alerts` | owner / manager / staff | yes | tenant-scoped alert read |
| `POST` | `/api/admin/alerts/check-unreplied` | `check_unreplied_alerts` | owner / manager | yes | alert mutation; staff denied |
| `POST` | `/api/admin/alerts/notify-open` | `notify_open_alerts` | owner / manager | yes | notification + alert status mutation; staff denied |
| `POST` | `/api/dev/seed-demo-data` | `run_dev_seed` | none in production | no for production | dev-only utility; production disabled |
| `GET` | `/health` | none | n/a | no | system/health route |
| `POST` | `/api/line/webhook/:webhookSecret` | none | n/a | no | separate LINE signature + tenant webhook secret boundary |

## Dev-Only Route Policy

`POST /api/dev/seed-demo-data` policy:

- dev-only route.
- `apps/api/src/index.ts` checks `isProductionRuntime(env)` and returns `404` with `dev_seed_disabled` in production-like runtime.
- It still uses the Admin tenant context guard for local tenant selection.
- It must not be a production role-granted operation.
- `run_dev_seed` exists as a known `AdminAction`, but Loop 041 intentionally excludes it from `roleGuardedAdminActions`.
- If a later loop adds any dev guard for it, that guard must stay clearly dev-only and must not resemble production authorization.
- Demo data must remain fake and must not contain real customer information, LINE user IDs, API keys, `.env` values, or production logs.

## Non-Admin Route Policy

Role guard対象外:

| Route | Reason |
| --- | --- |
| `GET /health` | health/config status route. If production hardening is needed, design separately from Admin role guard. |
| `POST /api/line/webhook/:webhookSecret` | protected by webhook secret path and LINE signature verification. It is not an authenticated staff Admin action. |
| `POST /api/dev/seed-demo-data` | dev-only utility and production-disabled. It is not a production Admin role action. |

LINE webhook must keep its own security boundary:

```text
webhookSecret path
-> tenant resolution
-> LINE signature verification using raw body
-> event normalization/logging
```

Admin role guard must not be inserted into the LINE webhook route.

## `source: dev_header` And `source: authenticated_staff`

Current runtime:

```text
Admin UI helper
-> x-tenant-id
-> resolveAdminTenantContext
-> AdminTenantContext(source: dev_header)
-> in-memory repositories
```

Future runtime:

```text
Admin request
-> Supabase Auth/JWT/session verification
-> resolveAuthenticatedStaffAdminTenantContext
-> AdminTenantContext(source: authenticated_staff, role)
-> role permission guard
-> tenant-scoped handler
```

Policy:

- `source: dev_header` is not production authentication.
- `source: dev_header` has no production role and must not be treated as role-authorized.
- Existing local/dev/test MVP behavior should stay unchanged until an explicit runtime switch loop.
- Role guard enforcement should become active only for `source: authenticated_staff`.
- Do not add a fake production role header to the dev path.
- A later loop may add a clearly named local-only role override for manual testing, but that should not be mixed with production auth.
- A separate production hardening loop should reject dev headers in production.

## Permission Denied Response Policy

Existing mapper:

- `apps/api/src/admin/auth-error-response.ts`

Existing mapping:

```text
permission_denied -> HTTP 403
body -> { ok: false, error: "permission_denied" }
placeholderRoute -> /permission-denied
```

Connection policy:

- Loop 041 permission boundary denial should be converted to `permission_denied` at the API layer.
- Response shape must follow `mapAdminAuthErrorToHttp({ code: "permission_denied" })`.
- Response must not include token values, `auth_user_id`, secret values, env values, or cross-tenant existence hints.
- UI can later route page-level failures to `/permission-denied`.
- Action-level failures may show inline error messages before a full redirect pattern is chosen.
- Loop 042 does not add redirects.

## Loop 041 Permission Boundary Relationship

Loop 041 added:

- `AdminAction`
- `evaluateAdminPermission`
- `canPerformAdminAction`
- `requireAdminPermission`
- `AdminPermissionError(code = "permission_denied")`

Loop 042 does not call these functions from routes.

Future API usage shape:

```ts
const context = resolvedAdminTenantContext;

if (context.source !== "authenticated_staff") {
  // production path should reject or skip role enforcement depending on runtime phase
}

requireAdminPermission({
  role: context.role,
  action: "create_ai_summary"
});
```

The actual helper name and error plumbing should be finalized in the guard boundary implementation loop.

## Recommended Connection Order

Do not enforce every route in one pass.

Recommended loop split:

1. `Loop 043: admin API role guard boundary`
   - Add API-local helper that accepts `AdminTenantContext + AdminAction`.
   - Map `AdminPermissionError` to existing `permission_denied` response.
   - Do not apply to all routes yet.
2. `Loop 044: admin API role guard representative route`
   - Apply guard to one low-risk representative route, for example `POST /api/admin/customers/:customerId/ai-summary`.
   - Test owner/manager allowed, staff denied.
3. `Loop 045: admin API role guard full route rollout`
   - Apply route/action mapping to all Admin API routes.
   - Keep dev-only and non-admin routes excluded.
4. `Loop 046: admin UI role visibility plan`
   - Plan how Admin UI receives role and disables/hides controls.
5. `Loop 047: admin UI role visibility placeholder`
   - Add UI-level disabled/hidden states after API guard exists.
6. `Loop 048: dev header production rejection plan`
   - Plan production rejection of dev-only `x-tenant-id` path.

Authenticated runtime connection remains a separate loop from route/action mapping.

## Why No Route Connection In This Loop

Route enforcement depends on decisions that should stay separate:

- how authenticated staff runtime is connected;
- whether dev-header requests are bypassed, rejected, or separately simulated in local mode;
- route-level ordering between tenant resource lookup and permission denial;
- UI error handling for action-level 403 responses.

Connecting route guard before these decisions would risk breaking the local MVP or creating fake production authorization.

## Risks

- Admin API still does not enforce role permissions.
- Admin UI still does not hide or disable buttons by role.
- Runtime still uses `source: dev_header`.
- `run_dev_seed` is known as an action but intentionally excluded from production role grants.
- Resource-not-found vs permission-denied ordering still needs route-specific implementation design.

## Next Loop Candidates

```text
Loop 043: admin API role guard boundary
Loop 044: admin API role guard representative route
Loop 045: admin API role guard full route rollout
Loop 046: admin UI role visibility plan
Loop 047: admin UI role visibility placeholder
Loop 048: dev header production rejection plan
```

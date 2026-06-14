# Loop 045: Admin API Role Guard Full Route Rollout

## Goal

Loop 044で代表検証したAdmin API role guardを、既存MVPを壊さない形で全Admin API routeへ広げる。

今回はSupabase Auth/JWTやauthenticated runtimeを接続しない。現在のruntimeは `source: dev_header` のままなので、route/action mappingとrole guard hookを各Admin routeへ配置しつつ、`dev_header` は一時互換としてskipする。

## Scope

- Admin API route全体の `AdminAction` mappingをコード上に整理する。
- route handlerから使えるrole guard compatibility helperを追加する。
- `source: authenticated_staff` の場合だけrole guardをenforceする。
- `source: dev_header` の場合は既存MVP互換のため暫定skipする。
- dev seed / health / LINE webhookはrole guard対象外のままにする。
- 既存dev-header route挙動を維持する。
- fake authenticated staff contextでroute actionごとのallow/denyをテストする。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- Supabase Auth/JWT接続
- JWT署名検証
- session/cookie/localStorage処理
- authenticated runtime本接続
- dev-only `x-tenant-id` 廃止
- production dev_header rejection実装
- Admin UI制御
- button非表示/disabled実装
- middleware実装
- RLS SQL実装
- migration SQL変更
- repository変更
- `.env` 作成・変更
- Supabase本番接続
- LINE API呼び出し
- OpenAI API呼び出し
- Webクロール

## Route / Action Mapping

Mapping source:

- `apps/api/src/admin/role-guarded-handler.ts`

Current mapping:

| Route | AdminAction |
| --- | --- |
| `GET /api/admin/customers` | `view_customers` |
| `GET /api/admin/customers/:customerId` | `view_customer_detail` |
| `GET /api/admin/customers/:customerId/timeline` | `view_timeline` |
| `POST /api/admin/customers/:customerId/reply` | `send_staff_reply` |
| `POST /api/admin/customers/:customerId/ai-summary` | `create_ai_summary` |
| `POST /api/admin/customers/:customerId/ai-reply-draft` | `create_ai_reply_draft` |
| `GET /api/admin/alerts` | `view_alerts` |
| `POST /api/admin/alerts/check-unreplied` | `check_unreplied_alerts` |
| `POST /api/admin/alerts/notify-open` | `notify_open_alerts` |
| `POST /api/admin/rag/search` | `search_rag` |
| `POST /api/admin/rag/answer-draft` | `create_rag_answer_draft` |

## Compatibility Helper

Added:

- `evaluateAdminRouteRoleGuardCompatibility`

Behavior:

- `source: authenticated_staff`:
  - uses `evaluateAdminRoleGuard`.
  - allowed requests continue.
  - denied requests map through `mapAdminAuthErrorToHttp`.
- `source: dev_header`:
  - returns `ok: true` with `mode: "skipped_dev_header"`.
  - this is temporary MVP compatibility only.
  - this is not production authorization.

## Applied Routes

The compatibility hook is placed after tenant context resolution and before each Admin route body for:

- customers list
- customer detail
- customer timeline
- staff reply
- AI summary
- AI reply draft
- RAG search
- RAG answer draft
- alerts list
- unreplied alert check
- notify open alerts

The route body, service calls, repository calls, status codes, and response shapes remain unchanged for current `dev_header` runtime.

## Excluded Routes

Excluded from Admin role guard:

| Route | Reason |
| --- | --- |
| `GET /health` | health/system route, not an Admin staff action |
| `POST /api/dev/seed-demo-data` | dev-only utility, production disabled, not production role-granted |
| `POST /api/line/webhook/:webhookSecret` | LINE webhook secret + signature boundary, not Admin staff auth |

`run_dev_seed` remains a known action but is not part of production role grants or this rollout mapping.

## `dev_header` Compatibility Policy

`dev_header skip is temporary compatibility behavior.`

- Production must not trust `dev_header`.
- `dev_header` exists only to keep the local MVP usable while Auth/JWT is not connected.
- Authenticated staff runtime connection should make the guard enforce by default.
- Production dev-header rejection is a later hardening Loop.

## Permission Denied Response

For authenticated staff role denials:

```json
{
  "ok": false,
  "error": "permission_denied"
}
```

HTTP status:

```text
403
```

The response is produced through the existing Admin auth error mapper and does not include token values, auth user IDs, secrets, env values, or personal information.

## Tests

Added:

- `tests/integration/admin-api-role-guard-full-rollout.test.ts`

Covered:

- route/action mapping for all current Admin API routes.
- dev-header compatibility skip for every mapped action.
- owner and manager allowed for all mapped route actions.
- staff allowed for read/support actions.
- staff denied for `create_ai_summary`, `check_unreplied_alerts`, and `notify_open_alerts`.
- permission denied maps to HTTP 403 and `{ ok:false, error:"permission_denied" }`.
- existing `/api/admin/customers` dev-header success/missing/unknown tenant behavior remains unchanged.
- dev seed / health / LINE webhook are not included in the mapping.

## Runtime Status

Current runtime still resolves Admin requests through dev-only `x-tenant-id` and `AdminTenantContext(source: dev_header)`.

Supabase Auth, JWT/session verification, authenticated runtime connection, UI role visibility, and RLS remain unimplemented.

## Risks

- Because runtime is still `dev_header`, role guard is not yet enforced for real local Admin API calls.
- Production dev-header rejection still needs a dedicated Loop.
- Full authenticated runtime may require small route context plumbing when JWT/session verification is connected.
- UI still does not hide or disable actions by role.

## Next Loop Candidates

```text
Loop 046: admin UI role visibility plan
Loop 047: admin UI role visibility placeholder
Loop 048: dev header production rejection plan
Loop 049: authenticated runtime connection plan
```

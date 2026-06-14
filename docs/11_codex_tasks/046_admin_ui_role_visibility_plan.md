# Loop 046: Admin UI Role Visibility Plan

## Goal

Loop 041-045で整理したrole permission / Admin API guard方針をもとに、Admin UI側で将来どの操作を表示、有効化、disabledにするかをdocs-onlyで設計する。

今回はUI制御を実装しない。React component、Next.js page、Server Action、API helper、Admin API route、authenticated runtimeは変更しない。

## Scope

- 現在のAdmin UI画面一覧を実ファイルから確認する。
- 現在のAdmin UI操作一覧を実ファイルから確認する。
- UI操作ごとに対応する `AdminAction` を割り当てる。
- `owner` / `manager` / `staff` ごとの表示/disabled方針を整理する。
- UI制御は補助であり、API guardが本丸であることを明記する。
- `source: dev_header` runtimeではrole visibilityを本番制御として扱わない方針を整理する。
- `/permission-denied` placeholderとの関係を整理する。
- 後続Loop分割を整理する。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- Admin UI role visibility実装
- button非表示/disabled実装
- React component変更
- Next.js page変更
- Server Action変更
- API helper変更
- Admin API route変更
- authenticated runtime接続
- Supabase Auth/JWT接続
- session/cookie/localStorage保存
- middleware実装
- RLS SQL実装
- migration SQL変更
- repository変更
- `.env` 作成・変更
- Supabase本番接続
- LINE API呼び出し
- OpenAI API呼び出し
- Webクロール
- build前提のUI変更

## Source Files Checked

Admin UI:

- `apps/admin/app/page.tsx`
- `apps/admin/app/customers/page.tsx`
- `apps/admin/app/customers/[customerId]/page.tsx`
- `apps/admin/app/customers/[customerId]/customer-actions.tsx`
- `apps/admin/app/customers/[customerId]/actions.ts`
- `apps/admin/app/alerts/page.tsx`
- `apps/admin/app/alerts/alert-actions.tsx`
- `apps/admin/app/alerts/actions.ts`
- `apps/admin/app/login/page.tsx`
- `apps/admin/app/select-tenant/page.tsx`
- `apps/admin/app/permission-denied/page.tsx`
- `apps/admin/app/session-expired/page.tsx`
- `apps/admin/src/admin-api.ts`

Permission/API sources:

- `packages/domain/src/admin-permissions.ts`
- `apps/api/src/admin/role-guard.ts`
- `apps/api/src/admin/role-guarded-handler.ts`

## Current Admin UI Screens

| Screen | Path | Current behavior |
| --- | --- | --- |
| Admin top | `/` | Shows dev tenant/API config, links to customers, alerts, and auth placeholders. |
| Customer list | `/customers` | Calls `getAdminCustomers`, renders customer table and detail links. |
| Customer detail | `/customers/[customerId]` | Calls customer detail and timeline APIs, renders detail, action panel, and timeline. |
| Alerts | `/alerts` | Calls `listAlerts`, renders alert action panel and alert table. |
| Login placeholder | `/login` | Disabled login form; no auth request or storage. |
| Tenant selection placeholder | `/select-tenant` | Static `tenant_amamihome` placeholder; no tenant fetch or saved selection. |
| Permission denied placeholder | `/permission-denied` | Static safe state for future permission failures. |
| Session expired placeholder | `/session-expired` | Static safe state for future session expiry. |

## Current Admin UI Operations

| UI operation | UI source | API/helper source | Current behavior |
| --- | --- | --- | --- |
| Top -> customer list link | `/` | page navigation | Navigates to `/customers`. |
| Top -> alerts link | `/` | page navigation | Navigates to `/alerts`. |
| Auth placeholder links | `/` and placeholder pages | page navigation | Navigates to placeholder pages only. |
| Customer list display | `/customers` | `getAdminCustomers` | Server-side fetch of customer list. |
| Customer detail display | `/customers/[customerId]` | `getAdminCustomerDetail` | Server-side fetch of customer detail. |
| Timeline display | `/customers/[customerId]` | `getAdminCustomerTimeline` | Server-side fetch of timeline messages. |
| Staff reply form | `CustomerActionPanel` | `sendStaffReply` via Server Action | Sends mock staff reply and refreshes customer page. |
| AI summary button | `CustomerActionPanel` | `createAiSummary` via Server Action | Creates saved AI summary message and refreshes customer page. |
| AI reply draft button | `CustomerActionPanel` | `createAiReplyDraft` via Server Action | Returns draft only; no message save. |
| RAG answer draft form | `CustomerActionPanel` | `createRagAnswerDraft` via Server Action | Returns answer draft and sources; no send/save. |
| Alerts list display | `/alerts` | `listAlerts` | Server-side fetch of alerts. |
| Unreplied check button | `AlertActionPanel` | `checkUnrepliedAlerts` via Server Action | Creates unreplied alerts and refreshes alerts page. |
| Open alert notify mock button | `AlertActionPanel` | `notifyOpenAlerts` via Server Action | Mock-notifies open alerts and refreshes alerts page. |
| Login placeholder disabled form | `/login` | none | Form disabled; no submit action. |
| Tenant placeholder disabled button | `/select-tenant` | none | Button disabled; no tenant state saved. |
| Permission denied placeholder | `/permission-denied` | none | Static page for future permission failure. |
| Session expired placeholder | `/session-expired` | none | Static page for future session failure. |

## UI Operation To AdminAction Mapping

| UI operation | AdminAction | owner | manager | staff | Initial UI policy |
| --- | --- | ---: | ---: | ---: | --- |
| Customer list display | `view_customers` | allow | allow | allow | Show for all authenticated staff roles. |
| Customer detail display | `view_customer_detail` | allow | allow | allow | Show for all authenticated staff roles. |
| Timeline display | `view_timeline` | allow | allow | allow | Show for all authenticated staff roles. |
| Staff reply form | `send_staff_reply` | allow | allow | allow | Show and enable for all authenticated staff roles. |
| AI summary button | `create_ai_summary` | allow | allow | deny | Hide or disable for staff; prefer disabled with reason in early UI rollout. |
| AI reply draft button | `create_ai_reply_draft` | allow | allow | allow | Show and enable for all authenticated staff roles. |
| RAG answer draft form | `create_rag_answer_draft` | allow | allow | allow | Show and enable for all authenticated staff roles. |
| Direct RAG search UI | `search_rag` | allow | allow | allow | No current direct UI; use this if a search-only UI is added later. |
| Alerts list display | `view_alerts` | allow | allow | allow | Show for all authenticated staff roles. |
| Unreplied check button | `check_unreplied_alerts` | allow | allow | deny | Hide or disable for staff; alert creation is manager+ operation. |
| Open alert notify mock button | `notify_open_alerts` | allow | allow | deny | Hide or disable for staff; notification/status mutation is manager+ operation. |
| Future knowledge management link | `manage_knowledge` | allow | deny | deny | No current UI; owner-only when introduced unless policy changes. |
| Future staff management link | `manage_staff` | allow | deny | deny | No current UI; owner-only when introduced. |
| Future tenant settings link | `manage_tenant_settings` | allow | deny | deny | No current UI; owner-only when introduced. |
| Dev demo seed | `run_dev_seed` | n/a | n/a | n/a | Dev-only API utility; do not expose as production role operation. |
| Login/select/permission/session placeholders | n/a | n/a | n/a | n/a | Auth state pages, not role action controls. |
| Top navigation links | linked page action | allow | allow | allow | Link visibility may mirror target page read permission after authenticated runtime exists. |

## Role-Specific UI Policy

### owner

- Show and enable all current Admin UI operations.
- Future staff management, tenant settings, and knowledge management should start as owner-only.
- Do not show future management links until the feature itself exists.

### manager

- Show and enable customer read, timeline, staff reply, AI summary, AI reply draft, RAG answer draft, alert list, unreplied check, and open alert notify mock.
- Hide or disable future staff management, tenant settings, and knowledge management.
- Treat alert operations as manager+ because they create alerts, send notifications, or update alert status.

### staff

- Show and enable customer read, timeline, staff reply, AI reply draft, RAG answer draft, and alert list.
- Hide or disable AI summary because it saves an AI summary message to the timeline.
- Hide or disable unreplied check and open alert notify mock because they mutate alert state and notification flow.
- Hide or disable future staff management, tenant settings, and knowledge management.
- When disabled, show a short reason such as `manager以上の権限が必要です`.

## Display / Disabled Policy

- API guard is mandatory. UI visibility is only a usability layer.
- Dangerous or permission-insufficient operations should be hidden or disabled.
- In early rollout, prefer disabled with a short reason for visible operational controls so staff understand why an action is unavailable.
- For future management links that do not exist yet, do not show them until the feature exists.
- If an operation is hidden, direct API access must still return `403 permission_denied`.
- If an operation is disabled, the form/button must not submit.
- Error messages must not include token values, `auth_user_id`, secrets, env values, real customer personal data, or production logs.

## API Guard Relationship

The API is the source of truth for authorization.

Current API guard state:

- `packages/domain/src/admin-permissions.ts` defines the role/action matrix.
- `apps/api/src/admin/role-guard.ts` maps permission decisions to Admin auth errors.
- `apps/api/src/admin/role-guarded-handler.ts` maps Admin routes to `AdminAction`.
- `source: authenticated_staff` is enforced.
- `source: dev_header` is temporarily skipped for MVP compatibility.

Future UI flow:

```text
authenticated staff session
-> resolved role + tenant context
-> UI receives role/session summary
-> UI hides/disables controls by AdminAction
-> API still enforces the same AdminAction
```

UI must not invent a separate permission matrix. It should reuse or mirror the `AdminAction` names and role matrix.

## `/permission-denied` Placeholder Relationship

- `/permission-denied` is the safe UI state for page-level permission failures.
- Action-level failures can initially render inline errors in the existing action panels.
- Later UI loops may route page-level `403 permission_denied` responses to `/permission-denied`.
- The placeholder does not protect routes by itself; API guard must still return `403`.
- The placeholder must not reveal cross-tenant resource existence.

## `dev_header` Runtime Relationship

Current runtime:

```text
Admin UI helper
-> x-tenant-id
-> Admin API
-> AdminTenantContext(source: dev_header)
```

Policy:

- `source: dev_header` is not production-authenticated staff context.
- Loop 046 is only a visibility plan; it does not enforce role visibility.
- Do not treat dev-header runtime as a real user role.
- Authenticated staff runtime must be connected before role visibility is considered production behavior.
- A local/dev-only fake role fixture may be useful for UI demos, but that decision belongs to a later Loop.
- Existing MVP navigation and action panels remain unchanged in this Loop.

## Current Non-Role UI

Auth placeholder pages are not role action controls yet:

- `/login`
- `/select-tenant`
- `/permission-denied`
- `/session-expired`

They should remain available during development so the team can inspect planned auth states.

## Recommended Next Loops

```text
Loop 047: admin UI role visibility placeholder
Loop 048: admin UI role visibility test fixtures
Loop 049: authenticated runtime connection plan
Loop 050: dev header production rejection plan
Loop 051: Supabase Auth session extraction boundary
Loop 052: authenticated staff runtime integration
```

Suggested sequencing:

1. Add a small UI visibility helper/placeholder using static or test fixture roles.
2. Add tests for owner / manager / staff UI states.
3. Plan authenticated runtime connection.
4. Reject dev headers in production.
5. Connect real session/JWT extraction.
6. Connect authenticated staff runtime.

## Risks

- Current Admin UI still shows all current action controls because runtime role is not available.
- `dev_header` remains a local compatibility path and must not be trusted in production.
- UI role visibility could drift from API guard if the UI creates its own matrix instead of reusing the AdminAction policy.
- Staff users may still hit disabled/hidden APIs directly until authenticated runtime is connected; API guard is already prepared but current dev runtime skips enforcement.
- Page-level versus action-level permission error handling still needs a concrete UI implementation Loop.

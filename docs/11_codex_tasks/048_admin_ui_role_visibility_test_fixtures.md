# Loop 048: Admin UI Role Visibility Test Fixtures

## Goal

Loop 047で追加したAdmin UI role visibility placeholderの次段階として、本物のUI制御を実装する前に、role別の期待visibilityをfixtureとして固定する。

今回のfixtureは将来期待値であり、現在のAdmin UIではまだenforceしない。button非表示、button disabled、API helper変更、authenticated runtime接続は行わない。

## Scope

- Admin UI role visibility用のtest fixtureを追加する。
- UI operationと `AdminAction` の対応をfixture化する。
- `owner` / `manager` / `staff` ごとの `expectedVisibility` をfixture化する。
- fixtureと `packages/domain/src/admin-permissions.ts` のpermission boundaryが矛盾しないことをtestする。
- RoleVisibilityNoteの説明とfixture方針が大きく矛盾しないことをtestする。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- 本物のUI role判定
- Admin UI button非表示
- Admin UI button disabled化
- React componentの大規模変更
- API helper変更
- Server Action変更
- Admin API route変更
- authenticated_staff runtime接続
- dev_header runtime変更
- Supabase Auth/JWT接続
- RLS SQL実装
- migration SQL変更
- repository変更
- `.env` 作成・変更
- Supabase本番接続
- LINE API呼び出し
- OpenAI API呼び出し
- Webクロール

## Added Fixture

Added:

- `tests/fixtures/admin-ui-role-visibility.ts`

Reason:

- `tests/fixtures/` already exists for shared test fixtures.
- The fixture is test/support data, not product runtime code.
- Keeping it under `tests/fixtures/` prevents Admin UI from accidentally importing a separate UI permission matrix before authenticated runtime is ready.

## UI Operations

Current role-controlled UI operations in the fixture:

| UI operation | AdminAction |
| --- | --- |
| `view_customers_page` | `view_customers` |
| `view_customer_detail_page` | `view_customer_detail` |
| `view_timeline` | `view_timeline` |
| `use_staff_reply_form` | `send_staff_reply` |
| `use_ai_summary_button` | `create_ai_summary` |
| `use_ai_reply_draft_button` | `create_ai_reply_draft` |
| `use_rag_answer_form` | `create_rag_answer_draft` |
| `view_alerts_page` | `view_alerts` |
| `use_check_unreplied_button` | `check_unreplied_alerts` |
| `use_notify_open_alerts_button` | `notify_open_alerts` |

Excluded:

- `run_dev_seed`: dev-only operation and not a production role UI control.
- Login / select-tenant / permission-denied / session-expired placeholder pages: auth state placeholders, not role action controls.
- Direct `search_rag`: no current standalone UI. Current RAG UI uses `create_rag_answer_draft`.
- Future management links: not implemented yet, so not fixture targets in this Loop.

## Visibility States

Fixture states:

| State | Meaning |
| --- | --- |
| `visible_enabled` | Future UI should show the control and allow use for this role. |
| `visible_disabled` | Future UI should show the control but disable it with a reason. |
| `hidden` | Future UI should hide the control for this role. |

Current policy:

- `expectedVisibility` is a future expectation only.
- Current UI does not enforce these states.
- Early rollout prefers `visible_disabled` for staff-restricted operational controls so local verification remains clear.

## Role Fixture Policy

### owner

- All current role-controlled UI operations are `visible_enabled`.

### manager

- Customer read, timeline, staff reply, AI summary, AI reply draft, RAG answer draft, alert list, unreplied check, and open alert notify mock are `visible_enabled`.

### staff

`visible_enabled`:

- Customer list
- Customer detail
- Timeline
- Staff reply
- AI reply draft
- RAG answer draft
- Alert list

`visible_disabled`:

- AI summary
- Unreplied check
- Open alert notify mock

Reason:

- AI summary saves a summary message to the timeline.
- Alert check and notify mutate alert state / notification flow.
- Disabled-first rollout is easier to inspect than hidden controls.

## Permission Boundary Consistency

Added:

- `tests/integration/admin-ui-role-visibility-fixtures.test.ts`

The test verifies:

- every fixture maps to a known `AdminAction`.
- every fixture has `owner` / `manager` / `staff` expectations.
- `visible_enabled` matches `canPerformAdminAction(...) === true`.
- `visible_disabled` / `hidden` matches permission denial.
- staff AI summary, unreplied check, and notify-open are disabled expectations.
- staff AI reply draft, RAG answer draft, and staff reply are enabled expectations.
- manager alert operations are enabled expectations.
- `run_dev_seed` and auth placeholder pages are not normal UI role fixtures.

## RoleVisibilityNote Relationship

The Loop 047 `RoleVisibilityNote` is not reimplemented. A small render check confirms that its guidance still says:

- staff AI summary is a future restriction candidate.
- staff reply / AI reply draft / RAG answer draft are allowed candidates.
- unreplied check / open alert notify mock are manager+ candidates.
- current buttons are not hidden or disabled.

No role logic is added to `RoleVisibilityNote`.

## Existing MVP Flow

Unchanged:

- `/customers`
- `/customers/[customerId]`
- `/alerts`
- `/login`
- `/select-tenant`
- `/permission-denied`
- `/session-expired`
- AI summary
- AI reply draft
- RAG answer draft
- staff reply
- unreplied check
- open alert notification mock
- dev-only `x-tenant-id`
- demo seed flow

## Tests

Executed in this Loop:

- `git status --short`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

Build was not required because no Admin UI component or Next.js page behavior changed.

## Risks

- The fixture is not runtime enforcement.
- Future UI control must reuse the fixture or the domain `AdminAction` matrix to avoid drift.
- Hidden vs disabled may change later; current staff-restricted operations intentionally start as `visible_disabled`.
- `dev_header` runtime still skips real role visibility.

## Next Loop Candidates

```text
Loop 049: authenticated runtime connection plan
Loop 050: dev header production rejection plan
Loop 051: Supabase Auth session extraction boundary
Loop 052: authenticated staff runtime integration
```

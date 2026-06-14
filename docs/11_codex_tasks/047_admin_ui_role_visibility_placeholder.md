# Loop 047: Admin UI Role Visibility Placeholder

## Goal

Loop 046のAdmin UI role visibility planをもとに、既存MVPを壊さずにrole visibility placeholderをAdmin UIへ追加する。

今回は本物のrole判定、button非表示、button disabled化、API helper変更、authenticated runtime接続は行わない。

## Scope

- Admin UIにrole visibility placeholderを追加する。
- 既存操作ボタン/フォーム付近に「将来role制御予定」の説明を追加する。
- `owner` / `manager` / `staff` の許可方針を短く表示する。
- `staff` で制限予定の操作を視覚的に分かるようにする。
- 既存操作はまだ無効化しない。
- 既存MVP導線を維持する。
- UI render testを追加する。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- 本物のrole判定
- Admin UI button非表示
- Admin UI button disabled化による機能停止
- API helper変更
- Server Action変更
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

## Added Placeholder UI

Added:

- `apps/admin/app/role-visibility-note.tsx`

The component renders:

- `Role visibility placeholder`
- `dev_header runtime` is still unconnected to production role visibility.
- future `authenticated_staff runtime` will control UI by `owner / manager / staff`.
- current buttons are not hidden or disabled.
- `/permission-denied` can be inspected as a future safe state.

## Placement

### Admin top

File:

- `apps/admin/app/page.tsx`

Placement:

- below the existing development UI notice.

Content:

- general role visibility placeholder.
- explains that current UI role control is not connected.
- explains future `owner / manager / staff` control.

### Customer detail actions

File:

- `apps/admin/app/customers/[customerId]/customer-actions.tsx`

Placement:

- inside the `管理アクション` section before the action cards.

Content:

- `owner / manager`: staff reply, AI summary, AI reply draft, and RAG answer draft are planned as allowed.
- `staff`: staff reply, AI reply draft, and RAG answer draft are allowed candidates.
- `staff`: AI summary save is a future restriction candidate.
- buttons are still not hidden or disabled.

### Alerts actions

File:

- `apps/admin/app/alerts/alert-actions.tsx`

Placement:

- inside the `アラート操作` section before the action cards.

Content:

- `owner / manager`: alerts list, unreplied check, and open alert notification mock are planned as allowed.
- `staff`: alert list is a read candidate.
- `staff`: unreplied check / open alert notification mock are manager+ operation candidates.
- buttons are still not hidden or disabled.

## Styling

Updated:

- `apps/admin/app/globals.css`

Added `.role-visibility-note` with the existing restrained admin UI style. No new UI library, Tailwind, or dependency was added.

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

The placeholder only displays explanatory text. It does not alter form actions, button disabled state, Server Actions, API helpers, or API routes.

## Tests

Added:

- `tests/integration/admin-role-visibility-placeholder.test.tsx`

Covered:

- general role visibility placeholder renders.
- customer action role guidance renders.
- alert action role guidance renders.
- `owner / manager / staff` text is present.
- `dev_header runtime` and `authenticated_staff runtime` text is present.
- `/permission-denied` safe state is referenced.
- the placeholder itself does not render buttons or disabled controls.

## Runtime Status

Current runtime remains:

```text
source: dev_header
```

This placeholder is not production authorization and does not perform real role checks. Real UI role visibility should be enabled only after authenticated staff runtime and role data are available.

## Risks

- UI still shows all current action controls.
- Role visibility text can drift from API guard if future loops do not reuse `AdminAction`.
- The placeholder could be mistaken for enforcement; docs and UI explicitly state it is explanatory only.
- Real owner/manager/staff fixtures and authenticated runtime connection are still needed.

## Next Loop Candidates

```text
Loop 048: admin UI role visibility test fixtures
Loop 049: authenticated runtime connection plan
Loop 050: dev header production rejection plan
Loop 051: Supabase Auth session extraction boundary
Loop 052: authenticated staff runtime integration
```

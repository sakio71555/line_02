# Loop 040: Role-Based Admin Action Guard Plan

## Goal

将来の本番Admin API / Admin UIで必要になるrole-based admin action guardをdocs-onlyで設計する。

Loop 037で `AdminTenantContext(source: authenticated_staff)` にmembership由来のroleを持たせる境界ができたため、Loop 040ではそのroleを使ってどの管理操作を許可・拒否するかを整理する。

今回はrole guard実装、API route変更、Admin UI制御、Supabase Auth/JWT接続、authenticated runtime接続、RLS SQLは実装しない。

## Scope

- 現在のAdmin API操作一覧を整理する。
- 現在のAdmin UI操作一覧を整理する。
- `owner` / `manager` / `staff` の役割を整理する。
- 将来候補の `viewer` / `platform_admin` を整理する。
- 操作ごとの許可role matrixを作る。
- API側guard方針を整理する。
- UI側表示制御方針を整理する。
- `permission_denied` errorとの対応を整理する。
- `/permission-denied` placeholderとの関係を整理する。
- dev-only `x-tenant-id` runtimeとの関係を整理する。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- role guard実装
- API route変更
- Admin UI制御実装
- button非表示実装
- middleware実装
- Supabase Auth/JWT接続
- authenticated_staff runtime接続
- RLS SQL実装
- migration SQL変更
- repository変更
- `.env` 作成・変更
- Supabase本番接続
- `supabase link`
- OpenAI API呼び出し
- LINE API呼び出し
- Webクロール

## Current Role Sources

Current implemented roles:

- `owner`
- `manager`
- `staff`

Current schema/type locations:

- `staff_tenant_memberships.role`
- `packages/domain/src/index.ts` `staffRoles`
- `apps/api/src/admin/tenant-context.ts` `AdminTenantContext.role`
- `apps/api/src/admin/authenticated-staff-tenant-context.ts`

Policy:

- Production role must come from active `staff_tenant_memberships.role`.
- `staff_users.role` remains compatibility data and must not be the production source of tenant action permission.
- `x-staff-id` and `x-tenant-id` headers are dev-only metadata and must not grant production permissions.
- Unknown future roles should default deny until explicitly added.

## Role Definitions

| Role | Initial meaning | Initial policy |
| --- | --- | --- |
| `owner` | Tenant owner / administrator | 全Admin操作を許可。将来のstaff管理、tenant設定、billing相当もownerから開始する。 |
| `manager` | 店舗/営業管理者 | 顧客対応、AI/RAG支援、alert運用を許可。staff管理、tenant設定は不可または後続検討。 |
| `staff` | 日常対応担当者 | 顧客閲覧、timeline閲覧、担当者返信、AI返信下書き、RAG回答案を許可。alert通知や設定系は不可。 |
| `viewer` future | 読み取り専用候補 | 顧客/timeline/alerts閲覧のみを候補にする。まだschemaには追加しない。 |
| `platform_admin` future | 運営側横断管理候補 | 通常tenant membershipとは別概念にする。cross-tenant audit設計なしで混ぜない。 |

## Current Admin API Operations

Current Admin/API-related routes in `apps/api/src/index.ts`:

| Route | Current purpose | Guard category |
| --- | --- | --- |
| `GET /health` | health check | public/system, role guard対象外 |
| `POST /api/dev/seed-demo-data` | local in-memory demo seed | dev-only, production disabled, role guard対象外 |
| `GET /api/admin/customers` | 顧客一覧 | read customer |
| `GET /api/admin/customers/:customerId` | 顧客詳細 | read customer |
| `GET /api/admin/customers/:customerId/timeline` | timeline閲覧 | read timeline |
| `POST /api/admin/customers/:customerId/reply` | 担当者返信 | customer reply action |
| `POST /api/admin/customers/:customerId/ai-summary` | AI要約を作成しsummary message保存 | persistent AI support action |
| `POST /api/admin/customers/:customerId/ai-reply-draft` | AI返信下書き生成、保存なし | non-persistent AI support action |
| `GET /api/admin/alerts` | alert一覧 | read alerts |
| `POST /api/admin/alerts/check-unreplied` | 未返信チェック、alert作成 | alert operation |
| `POST /api/admin/alerts/notify-open` | open alert担当者通知mock、status更新 | alert notification operation |
| `POST /api/admin/rag/search` | tenant knowledge検索 | read/support knowledge |
| `POST /api/admin/rag/answer-draft` | RAG回答案生成、保存なし | non-persistent AI/RAG support action |
| `POST /api/line/webhook/:webhookSecret` | LINE webhook受信 | webhook signature/tenant secret guard、Admin role guard対象外 |

## Current Admin UI Operations

Current Admin UI operations:

| UI operation | Route / component | Current behavior |
| --- | --- | --- |
| 顧客一覧閲覧 | `/customers` | Admin API `GET /api/admin/customers` |
| 顧客詳細閲覧 | `/customers/[customerId]` | Admin API `GET /api/admin/customers/:customerId` |
| timeline閲覧 | `/customers/[customerId]` | Admin API `GET /api/admin/customers/:customerId/timeline` |
| 担当者返信 | customer action panel | Server Action -> `POST /api/admin/customers/:customerId/reply` |
| AI要約 | customer action panel | Server Action -> `POST /api/admin/customers/:customerId/ai-summary` |
| AI返信下書き | customer action panel | Server Action -> `POST /api/admin/customers/:customerId/ai-reply-draft` |
| RAG回答案 | customer action panel | Server Action -> `POST /api/admin/rag/answer-draft` |
| alerts一覧 | `/alerts` | Admin API `GET /api/admin/alerts` |
| 未返信チェック | alert action panel | Server Action -> `POST /api/admin/alerts/check-unreplied` |
| open alert通知mock | alert action panel | Server Action -> `POST /api/admin/alerts/notify-open` |
| 認証placeholder | `/login` | static placeholder only |
| tenant selection placeholder | `/select-tenant` | static placeholder only |
| 権限不足placeholder | `/permission-denied` | static placeholder only |
| セッション期限切れplaceholder | `/session-expired` | static placeholder only |

## Initial Role Matrix

Legend:

- `yes`: allow after authenticated_staff runtime is connected.
- `no`: deny with `permission_denied`.
- `future`: not implemented yet; decide in a later loop.
- `n/a`: not an Admin role-controlled operation.

| Operation | owner | manager | staff | viewer future | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| 顧客一覧閲覧 | yes | yes | yes | yes | tenant-scoped read. |
| 顧客詳細閲覧 | yes | yes | yes | yes | tenant-scoped read. |
| timeline閲覧 | yes | yes | yes | yes | tenant-scoped read. |
| 担当者返信 | yes | yes | yes | no | 日常対応に必要。将来はaudit logと送信履歴を必須にする。 |
| AI要約作成 | yes | yes | no | no | summary messageとしてtimelineへ保存されるためmanager以上から開始する。 |
| AI返信下書き | yes | yes | yes | no | 保存・送信しない担当者支援なのでstaffも許可する。 |
| RAG検索 | yes | yes | yes | yes | 公式情報参照のread/support操作。 |
| RAG回答案 | yes | yes | yes | no | 保存・送信しない担当者支援。viewerは閲覧専用なので不可。 |
| alerts一覧 | yes | yes | yes | yes | tenant-scoped read. |
| 未返信チェック | yes | yes | no | no | alert作成を伴うためmanager以上から開始する。 |
| open alert通知 | yes | yes | no | no | 通知送信とalert status更新を伴うためmanager以上。 |
| staff管理 | yes | no | no | no | future operation. ownerから開始する。 |
| tenant設定 | yes | no | no | no | future operation. ownerから開始する。 |
| demo seed | n/a | n/a | n/a | n/a | dev-only endpoint。productionでは使わない。 |
| login / select-tenant placeholder | n/a | n/a | n/a | n/a | Auth state UIでありrole actionではない。 |

Reasoning:

- `staff` は日常対応のため、顧客閲覧、timeline閲覧、担当者返信、AI返信下書き、RAG回答案を許可する。
- AI要約は `message_type = summary` としてtimelineへ保存されるため、初期はmanager以上にする。
- alert作成/通知は運用状態と担当者通知に影響するため、初期はmanager以上にする。
- `viewer` は将来候補であり、read-only accessだけを想定する。
- `platform_admin` はordinary tenant membership roleではなく、別のsupport/audit設計で扱う。

## API Guard Policy

API側が権限の本丸。

Future flow:

```text
Admin API request
-> JWT/session verification
-> authenticated staff tenant guard
-> AdminTenantContext(source: authenticated_staff, role)
-> role action guard
-> tenant-scoped repository / provider / notifier action
```

Rules:

- UI button非表示だけに依存しない。
- `AdminTenantContext.role` を使ってoperation permissionを判定する。
- `AdminTenantContext.source === "authenticated_staff"` のときだけ本番role guardとして扱う。
- `source: "dev_header"` の間は本番role guardとして扱わない。
- dev pathにroleを偽装するheaderを追加しない。
- role guard failureは `AdminAuthError.code = "permission_denied"` にする。
- HTTP statusは403を基本にする。
- response bodyは既存 mapper 方針に合わせて `{ ok: false, error: "permission_denied" }` にする。
- tenant存在や別tenant resourceの推測を避けるため、resource ownership checkとrole checkの順序はrouteごとに設計する。
- delete系や設定系はdefault denyから開始する。

Suggested implementation split:

1. role permission matrixをpure functionとして追加する。
2. Admin API routeにoperation idを付ける。
3. authenticated_staff runtime接続後にroute guardへ挿入する。
4. UI helper/error mappingを接続する。

## UI Control Policy

UI制御は補助。

Rules:

- API側guardが必須。
- roleに応じてbuttonを非表示またはdisabledにする。
- 非表示にすると操作の存在が分かりにくい場合はdisabled + 理由表示を優先する。
- 既存dev MVPではまだ制御しない。
- `source: dev_header` runtimeでは現行UIを維持する。
- role情報をUIへ渡す方法は、authenticated session/runtime接続後のloopで決める。
- 権限不足時は `/permission-denied` placeholderを将来利用する。
- 顧客詳細・alertページでは、action panel内の各button単位で制御する。

Future UI control targets:

| UI target | Initial control |
| --- | --- |
| 担当者返信button | owner / manager / staff |
| AI要約button | owner / manager |
| AI返信下書きbutton | owner / manager / staff |
| RAG回答案button | owner / manager / staff |
| 未返信チェックbutton | owner / manager |
| open alert通知button | owner / manager |
| future staff管理link | owner |
| future tenant設定link | owner |

## `permission_denied` Error Mapping

Existing mapper:

- `apps/api/src/admin/auth-error-response.ts`

Current mapping:

| Internal code | HTTP | Response error | Placeholder route |
| --- | --- | --- | --- |
| `permission_denied` | 403 | `permission_denied` | `/permission-denied` |

Policy:

- Role guard denial should use `permission_denied`.
- Inactive staff / missing membership should continue to use membership-related auth errors, not `permission_denied`.
- `tenant_membership_denied` means the staff cannot access the tenant.
- `permission_denied` means the staff can access the tenant but cannot perform the action.
- Response must not include sensitive role internals, auth user IDs, tokens, env values, or cross-tenant existence hints.

## `/permission-denied` Placeholder Relationship

`/permission-denied` currently remains a static placeholder and does not protect routes.

Future relationship:

- Admin API returns 403 `permission_denied`.
- Admin UI helper / Server Action maps that response to an actionable error state.
- Page-level navigation may link or redirect to `/permission-denied` for protected pages.
- Action-level denial may show an inline message instead of full-page navigation.
- `/permission-denied` should remain a safe state that does not render customer/timeline/alert data.

## Dev-only Runtime Relationship

Current runtime:

```text
Admin UI helper
-> x-tenant-id
-> Admin API tenant context guard
-> AdminTenantContext(source: dev_header)
-> in-memory repositories
```

Policy:

- Loop 040 does not change runtime.
- `x-tenant-id` is not production authentication.
- role guard should not be treated as active while runtime source is `dev_header`.
- A later loop can decide whether local/dev gets a fake role for manual testing, but that must remain clearly marked and not resemble production auth.

## Why No Implementation In This Loop

Role guard implementation should wait until these dependencies are clearer:

- authenticated_staff runtime connection
- JWT/session verification
- UI access to authenticated role state
- route-level error handling and redirect policy
- RLS/local auth test plan

Implementing role guard before authenticated runtime would risk guarding against fake dev headers or adding another temporary auth path.

## Test Plan For Later Loops

Future tests should verify:

- permission matrix pure function accepts and rejects expected roles.
- every Admin API route has an operation id.
- role denial maps to `403 permission_denied`.
- `staff` cannot run manager-only alert operations.
- `staff` cannot create persistent AI summary when policy says manager+.
- `viewer` can only read if/when the role is added.
- UI hides/disables action buttons based on role.
- API still denies even if UI controls are bypassed.
- tenant_id isolation remains enforced before/alongside role checks.

## Risks

- Actual role guard is still unimplemented.
- Admin API routes still run through dev-only `x-tenant-id`.
- UI still shows all action buttons in dev MVP.
- `viewer` and `platform_admin` are not in schema/types.
- Ordering between resource-not-found and permission-denied needs route-specific design to avoid cross-tenant leaks.

## Next Loop Candidates

```text
Loop 041: admin role permission boundary
Loop 042: admin UI role visibility plan
Loop 043: admin session/JWT verification plan
Loop 044: authenticated Admin API runtime connection plan
```

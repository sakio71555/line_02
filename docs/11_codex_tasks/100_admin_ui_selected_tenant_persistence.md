# Loop 100: Admin UI selectedTenantId persistence

## Goal

Admin UIで選択した操作対象tenantを保持し、Admin API requestへ `x-selected-tenant-id` として渡せるようにする。

`selectedTenantId` は権限ではなくselectorです。API側ではauthenticated staffのactive membershipで必ず再検証し、repositoryへ渡すtenantは検証済み `AdminTenantContext.tenantId` のみとする。

## Scope

- `/select-tenant` で `selectedTenantId` を保存・解除できるUIを追加した。
- Admin UI用のselected tenant storage boundaryを追加した。
- Admin API helperが `x-selected-tenant-id` を送れるようにした。
- `x-tenant-id` と `x-selected-tenant-id` を別headerとして維持した。
- Server Action / server pageからcookie経由で選択tenantを読み、Admin API helperへ渡すようにした。
- selected tenant / auth error codeを初心者にも読める文言へ変換した。
- unit / integration testでheader、storage、error mapping、UI guidanceを固定した。

## Out of Scope

- Supabase Auth/JWT production runtime接続。
- Bearer tokenの保存・表示・転送。
- tenant management UIや所属tenant一覧API。
- RLS SQL / migration / GRANT変更。
- LINE real push。
- OpenAI real API。
- production readiness final Go。

## Implementation

### Storage Boundary

```text
apps/admin/src/selected-tenant.ts
apps/admin/app/select-tenant/selected-tenant-form.tsx
```

- localStorage key: `amami-line-crm:selectedTenantId`
- cookie name: `amami_line_crm_selected_tenant_id`
- 保存値は `tenant_` から始まる英小文字、数字、underscoreのtenant selectorだけ。
- cookieはServer Actionやserver pageがAdmin API helperへ選択tenantを渡すために使う。
- Bearer token、API key、Supabase secret、session値は保存しない。

### Admin API helper

```text
apps/admin/src/admin-api.ts
```

- 既存互換の `x-tenant-id` はlocal/dev/test用として維持。
- `AdminApiConfig.selectedTenantId` がある場合だけ `x-selected-tenant-id` を追加。
- invalid selectorはfetch前に `invalid_selected_tenant_id` として扱う。
- `tenant_selection_required`、`tenant_membership_denied`、`invalid_selected_tenant_id`、`authenticated_staff_required` をUI向け文言へ変換する。

### Server-side Forwarding

```text
apps/admin/app/admin-api-request-options.ts
```

- server page / Server Actionはcookieから選択tenantを読む。
- browserから直接Admin APIを叩かず、既存のserver-side helper方針を維持する。
- service role keyやBearer tokenは扱わない。

## `x-selected-tenant-id` vs `x-tenant-id`

| header | use | permission? | note |
| --- | --- | --- | --- |
| `x-selected-tenant-id` | authenticated staffが希望する操作対象tenant selector | No | active membershipで再検証する |
| `x-tenant-id` | local/dev/test互換のdev header | No | productionでは拒否済み |

`x-selected-tenant-id` 単体では認証にならない。Bearer tokenなしのproduction requestは `authenticated_staff_required` になる。

## Error Handling

| code | UI handling |
| --- | --- |
| `tenant_selection_required` | 利用先選択画面へ誘導する |
| `tenant_membership_denied` | 所属している利用先を選び直すよう案内する |
| `invalid_selected_tenant_id` | 利用先ID形式を直すよう案内する |
| `authenticated_staff_required` | ログイン確認が必要と表示する |

## Tests

- Admin API helperが `x-selected-tenant-id` を付け、`x-tenant-id` と混同しないこと。
- selectedTenantId未指定では `x-selected-tenant-id` を付けないこと。
- invalid selectedTenantIdはfetch前に拒否すること。
- storage boundaryが保存・読み取り・解除でき、invalid値を保存しないこと。
- cookie文字列にtokenが含まれないこと。
- `/select-tenant` UIがselector-only、token非保存、header差分を表示すること。

## Production Readiness

Loop 100ではAdmin UI selectedTenantId persistenceだけを実装した。production readinessはまだNo-Goです。

No-Go継続理由:

- Supabase Auth/JWT production runtimeは未接続。
- Admin UI token forwardingは未実装。
- LINE real push gateは未実装。
- OpenAI real API gateは未実装。
- production readiness final gateは未実施。

## Next Loop Candidates

```text
Loop 101: LINE real push gate
Loop 102: OpenAI real API gate
Loop 103: production readiness final gate
```

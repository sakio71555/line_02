# Admin Login Session Minimal Integration

## Purpose

Admin UIがSupabase Auth sessionを扱うための最小境界を確認する。

このrunbookでは本物Supabase Auth接続、production DB接続、production deploy、production smokeは行わない。

## Current State

- Admin API helperはaccess token providerからBearer headerを付けられる。
- Admin UIはselectedTenantIdを非secret selectorとして保存できる。
- Loop 105でAdmin session controller境界を追加した。
- 実Supabase browser auth client注入はまだ未実施。

## Session Boundary

`apps/admin/src/admin-session.ts` が以下を担当する。

- sign-in input validation。
- Auth clientからsessionを読む。
- session resultをtokenなしのsafe statusへ変換する。
- refresh結果をtokenなしのsafe statusへ変換する。
- logoutでAuth client sessionをclearする。
- Admin API helper向けaccess token providerを作る。

## Token Rules

- access tokenはproviderから都度取得する。
- access tokenをUIに表示しない。
- access tokenをlocalStorage/cookieへ独自保存しない。
- access tokenをdocs、dev log、error messageへ書かない。
- session failureはgeneric errorへ丸める。
- selectedTenantIdはtokenとは別のselectorとして扱う。

## Manual UI Check

local admin serverで以下を確認する。

```text
http://localhost:3000/login
http://localhost:3000/logout
```

期待:

- login pageにemail/password入力欄がある。
- submit buttonは実Auth client接続待ちとしてdisabled。
- tokenを保存・表示しない説明がある。
- logout pageにsession clear境界の説明がある。
- 本物Supabase Auth接続は行われない。

## Automated Checks

対象:

- `tests/integration/admin-session.test.ts`
- `tests/integration/admin-auth-placeholder-pages.test.tsx`
- `tests/integration/admin-api-client.test.ts`

確認内容:

- fake auth clientでsign-inできる。
- token providerがAdmin API helperへBearer headerを渡せる。
- session resultにaccess tokenやpasswordが含まれない。
- tokenなしではAuthorization headerを出さない。
- selectedTenantId保存とAuthorization tokenが分離される。
- refresh / logout境界がfake clientで動く。
- auth errorがsecret/token/project ref/passwordを含まない。

## Not Done

- 実Supabase Auth client注入。
- 本物Supabase Auth login。
- refresh timer。
- password reset / OAuth。
- production deploy。
- production smoke。

## Go / No-Go

Go:

- fake auth client testsが通る。
- tokenがUI/docs/dev log/test snapshot/error resultへ出ない。
- selectedTenantIdとAuthorization tokenが分離されている。
- 本物外部接続なしで検証できる。

No-Go:

- 実Supabase Auth接続が必要。
- production DB接続が必要。
- secret、project ref、DB URL、token表示が必要。
- dependency追加が必要。

## Next

Loop 106でproduction auth runtime readiness smoke without production connectionへ進む。

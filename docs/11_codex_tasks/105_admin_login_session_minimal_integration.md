# Loop 105: Admin Login Session Minimal Integration

## Goal

Admin UIがSupabase Auth sessionからaccess tokenを取得し、既存Admin API helperのtoken providerへ渡せる最小境界を追加する。

Loop 105では実Supabase Auth接続、本番login smoke、production deployは行わない。

## Scope

- `apps/admin/src/admin-session.ts` にAdmin session controller境界を追加する。
- fake Supabase auth clientでsign-in、session read、refresh、logoutを検証する。
- access tokenはproviderから都度取得し、UI、docs、dev log、localStorage、cookieへ独自保存しない。
- `selectedTenantId` は非secret selectorとして維持し、Authorization tokenとは分離する。
- login/logoutのUI placeholderを、実Auth client接続前の境界状態が分かる表示へ更新する。
- token providerが既存Admin API helperへ `Authorization: Bearer` を渡せることをtestする。

## Out of Scope

- 本物Supabase Auth API呼び出し。
- production DB接続。
- production deploy / production smoke。
- `.env.production` 作成。
- 依存関係追加、`package.json` / lockfile変更。
- LINE API送信。
- OpenAI API呼び出し。
- RLS SQL変更。
- Admin API route変更。

## Implementation

追加した境界:

- `apps/admin/src/admin-session.ts`
  - `createAdminSessionController`
  - `signInAdminSession`
  - `getAdminSession`
  - `refreshAdminSession`
  - `logoutAdminSession`
  - `createAdminSessionAccessTokenProvider`
  - `createAdminSessionApiRequestOptions`

Admin側にはまだSupabase browser auth client依存がないため、今回はinterface互換の `AdminSupabaseAuthClientLike` を定義し、実client注入は後続Loopへ分離する。

## Token Handling

- access tokenはAdmin session resultへ含めない。
- access tokenはAdmin API request時にproviderから都度取得する。
- access tokenはlocalStorage/cookieへ独自保存しない。
- access tokenをUI、docs、dev log、error messageへ出さない。
- session failureはsafe generic messageへ丸める。

## selectedTenantId

- `selectedTenantId` はAuthorization tokenではない。
- `selectedTenantId` は利用先selectorとして保存される。
- Admin API側ではactive membershipで再検証されたtenantだけをrepositoryへ渡す。
- Loop 105ではselectedTenantId persistenceを変更しない。

## Tests

- fake auth clientでsign-inできる。
- session resultにtokenやpasswordが含まれない。
- token providerがAdmin API helperへBearer headerを渡せる。
- tokenなしではAuthorization headerを出さない。
- selectedTenantIdとAuthorization tokenが共存する。
- refresh後もresultへtokenを出さない。
- logout後にtoken providerがnullを返す。
- auth failuresがsecret/token/project ref/passwordを含まないsafe errorになる。
- login UIがtokenを表示しない。

## Production Readiness Impact

Loop 105でAdmin UI session/token取得の境界は追加されたが、実Supabase Auth client注入とreal login smokeはまだ未実施。

production readinessは引き続き `production_no_go` とする。

## Next Loop Candidates

- Loop 106: production auth runtime readiness smoke without production connection
- Loop 107: LINE real push final safety hardening
- Loop 108: OpenAI real API final safety hardening
- Loop 109: production readiness final re-check

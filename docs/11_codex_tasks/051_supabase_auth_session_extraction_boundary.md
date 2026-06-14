# Loop 051: Supabase Auth Session Extraction Boundary

## Goal

Admin APIを `authenticated_staff` runtimeへ接続する前に、server-sideで `Authorization` headerからBearer tokenを取り出し、token verifierへ渡して `AuthUserIdentity` を得る境界を追加する。

今回の境界はSupabase Auth本体へ接続しない。既存Admin API route、tenant context guard、role guard、Admin UIにはまだ接続しない。

## Scope

- `apps/api/src/admin/auth-session.ts` を追加。
- `Authorization: Bearer <token>` / `authorization: bearer <token>` のcase-insensitive schemeを受け付ける。
- missing / malformed / missing token / invalid token / expired sessionをcodeで整理する。
- `AuthSessionVerifier` interfaceを追加し、testではfake verifierだけを使う。
- verifier成功時にdomainの `AuthUserIdentity` を返す。
- Loop 034のAdmin auth error mapperへ接続しやすい `mapAuthSessionErrorToAdminAuthError` を追加。
- token値、secret、env値をerror/resultへ含めない。
- import時にenv validation、Supabase client生成、network accessが走らないことをtestする。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- Admin API route変更
- tenant context guard変更
- `authenticated_staff` runtime接続
- `StaffAuthLookup` runtime injection
- Supabase Auth `getUser` 実接続
- JWT署名検証実装
- cookie / localStorage / sessionStorage利用
- Admin UI token forwarding / login submit
- `dev_header` production rejection実装
- `.env` 作成・変更
- Supabase repository / migration / RLS変更
- Supabase本番接続
- LINE API / OpenAI API / Webクロール

## Added Boundary

Location:

```text
apps/api/src/admin/auth-session.ts
```

Main exports:

- `extractBearerToken`
- `extractAdminAuthSession`
- `AuthSessionVerifier`
- `AuthSessionExtractionResult`
- `AuthSessionErrorCode`
- `mapAuthSessionErrorToAdminAuthError`

Current flow:

```text
Authorization header
-> extractBearerToken
-> AuthSessionVerifier.verifyBearerToken(token)
-> AuthUserIdentity
```

The boundary returns structured results only. It does not build HTTP responses directly.

## Authorization Header Rules

Accepted:

- `Bearer <token>`
- `bearer <token>`

Rejected:

- missing or blank header
- non-Bearer scheme such as `Basic`
- `Bearer` without a token
- `Bearer` with extra segments
- malformed values such as `Authorization:Token`

The Bearer token is only passed to the injected verifier. It is not returned in success or failure results.

## Error Codes

Session extraction errors:

- `missing_authorization_header`
- `invalid_authorization_header`
- `missing_bearer_token`
- `invalid_bearer_token`
- `session_expired`
- `authenticated_staff_required`

Mapping to existing Admin auth error boundary:

| Session extraction error | Admin auth error |
| --- | --- |
| `session_expired` | `session_expired` |
| all other extraction failures | `authenticated_staff_required` |

This keeps the future route layer aligned with `apps/api/src/admin/auth-error-response.ts` without exposing token or lookup details.

## Verifier Policy

`AuthSessionVerifier` is an interface. The current implementation does not include real Supabase Auth verification.

Test verifier behavior:

- `valid-token` returns an `AuthUserIdentity`.
- invalid fake tokens return `invalid_bearer_token`.
- expired fake token returns `session_expired`.
- null verifier result maps to `authenticated_staff_required`.

Future verifier implementation can wrap Supabase Auth `getUser`, but that must be done in a later Loop and remain server-side only.

## Security Notes

- No service role key is used in this Loop.
- No env values are read during module import.
- No token is included in returned errors or mapper output.
- Browser / LIFF / Next client components must not use this boundary directly.
- Admin UI token forwarding is intentionally deferred.

## Tests

Added:

```text
tests/integration/admin-auth-session-extraction.test.ts
```

Covered:

- import has no env validation or network access
- missing Authorization header fails
- unsupported or malformed header fails
- Bearer without token fails
- lowercase `bearer` is accepted
- verifier receives token
- valid fake token returns `AuthUserIdentity`
- invalid fake token fails
- null verifier result maps to `authenticated_staff_required`
- expired fake token maps through existing Admin auth response as `session_expired`
- token values are not leaked in serialized result

## Not Connected Yet

Existing runtime remains:

```text
x-tenant-id -> AdminTenantContext(source: dev_header)
```

This Loop only prepares the session extraction boundary. Admin API routes are still not using it.

## Next Loop Candidates

- Loop 052: fake authenticated staff runtime connection
- Loop 053: representative Admin API route authenticated runtime wiring
- Loop 054: Admin UI token forwarding placeholder
- Loop 055: dev_header production rejection implementation

## Status

Implemented in Loop 051.

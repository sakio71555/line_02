# Loop 093: production dev_header rejection + Auth/JWT boundary

## Goal

production modeで開発用tenant指定経路を拒否し、Admin APIが `Authorization: Bearer` + authenticated_staff runtimeを前提にする境界を固定する。

今回の目的はproduction安全gateとAuth/JWT入口境界の整理です。Supabase Auth/JWT本接続、RLS SQL、Supabase実DB接続は行いません。

## Scope

- production判定は既存 `isProductionRuntime` に合わせ、`APP_ENV=production` または `NODE_ENV=production` をproduction扱いにする。
- productionの主要Admin routeで `x-tenant-id` / `dev_header` pathを拒否する。
- productionの主要Admin routeで `Authorization: Bearer` がない場合は `authenticated_staff_required` を返す。
- productionで `x-selected-tenant-id` 単体を認証扱いしない。
- productionで `POST /api/dev/seed-demo-data` を `dev_route_not_allowed` として拒否する。
- local/dev/testでは既存 `x-tenant-id` / `dev_header` pathを維持する。
- fake `AuthSessionVerifier` / fake `StaffAuthLookup` によるauthenticated path testを維持する。
- Bearer token値をerror body、docs、dev logへ出さない。
- tests、README、runbook、dev loop docs、dev logを更新する。

## Out of Scope

- Supabase Auth/JWT本接続。
- RLS SQL実装。
- `ALTER TABLE ENABLE ROW LEVEL SECURITY` / `CREATE POLICY`。
- migration SQL / GRANT変更。
- Supabase staging / production DB接続。
- `.env` 作成・変更。
- JWT secret、Supabase URL/key、project ref、DB URLの表示。
- Admin UI変更。
- selectedTenantId UI保存。
- LINE API実送信。
- OpenAI API実接続。
- Web crawl。
- embedding / pgvector。
- package依存追加。

## Starting State

- Loop 087で `x-selected-tenant-id` transport boundaryを追加済み。
- Loop 088でauthenticated_staff runtime full route rollout planを整理済み。
- Loop 089でcustomer read routesへauthenticated_staff runtimeを展開済み。
- Loop 090でcustomer write / AI routesへauthenticated_staff runtimeを展開済み。
- Loop 091でalerts routesへauthenticated_staff runtimeを展開済み。
- Loop 092でRAG routesへauthenticated_staff runtimeを展開済み。
- 主要Admin route rolloutは完了しているが、production `dev_header` rejectionは未実装だった。
- Supabase Auth/JWT本接続とRLS SQLは未実装。

## Production Decision

production判定:

```text
APP_ENV=production
or
NODE_ENV=production
```

`APP_ENV=production` を主軸にしつつ、既存の `NODE_ENV=production` 判定も維持する。

## production dev_header Rejection

productionのAdmin routeでは、`x-tenant-id` が存在した時点で拒否する。

```text
403 { ok:false, error:"dev_tenant_header_not_allowed" }
```

対象カテゴリ:

- customer read routes
- customer write / AI routes
- alerts routes
- RAG routes

productionで `Authorization: Bearer` がない場合:

```text
401 { ok:false, error:"authenticated_staff_required" }
```

## `x-selected-tenant-id` is not Auth

`x-selected-tenant-id` は認証ではなくselectorです。

- Bearer tokenなしではauthenticated_staff扱いにしない。
- productionで `x-selected-tenant-id` だけを送っても `authenticated_staff_required`。
- Bearer tokenがある場合だけ、active membershipで再検証して `AdminTenantContext.tenantId` を確定する。
- raw `x-selected-tenant-id` をrepository/service/providerへ渡さない。

## Authorization Bearer Boundary

今回も実Supabase Auth/JWT検証は行わない。

既存境界:

```text
Authorization header
-> extractBearerToken
-> AuthSessionVerifier.verifyBearerToken(token)
-> AuthUserIdentity
-> StaffAuthLookup
-> active staff + active membership
-> AdminTenantContext(source=authenticated_staff)
-> role guard
```

固定したこと:

- Bearer tokenはinjected verifierへ渡すだけ。
- error bodyにtoken値を入れない。
- invalid tokenは `authenticated_staff_required`。
- expired tokenは既存どおり `session_expired`。
- fake verifier / fake StaffAuthLookupでproduction authenticated pathをtestできる。

## Dev Seed Route

`POST /api/dev/seed-demo-data` はproductionで拒否する。

```text
403 { ok:false, error:"dev_route_not_allowed" }
```

local/dev/testでは既存どおりdemo seedを維持する。

## Local / Dev / Test Compatibility

- `APP_ENV=production` / `NODE_ENV=production` 以外では、既存 `x-tenant-id` / `dev_header` pathを維持する。
- `x-selected-tenant-id` があってもAuthorizationがなければdev_header pathでは無視する。
- default runtimeは `in_memory` のまま。
- Supabase実DB接続は行わない。

## Tests

Added:

- `tests/integration/production-dev-header-rejection.test.ts`

Updated:

- `tests/integration/dev-demo-seed.test.ts`

Covered:

- production customer read + `x-tenant-id` => `dev_tenant_header_not_allowed`。
- production customer write + `x-tenant-id` => `dev_tenant_header_not_allowed`。
- production alerts + `x-tenant-id` => `dev_tenant_header_not_allowed`。
- production RAG + `x-tenant-id` => `dev_tenant_header_not_allowed`。
- production dev seed => `dev_route_not_allowed`。
- production `x-selected-tenant-id` only => `authenticated_staff_required`。
- production Bearer fake verifier path succeeds without leaking token in response body。
- invalid Bearer token error body does not include the token。
- production Bearer + `x-tenant-id` still rejects `x-tenant-id` before verifier access。
- local/dev/test `x-tenant-id` path remains compatible。

## Production Readiness

production readiness remains No-Go.

進んだもの:

- production `dev_header` rejection。
- production dev seed route rejection。
- Auth/JWT入口 boundaryのfake verifier test。

まだ未完了:

- Supabase Auth/JWT本接続。
- RLS SQL。
- Admin UI selectedTenantId保存。
- LINE real push gate。
- OpenAI real API gate。

## Residual Risks

- fake verifier / fake StaffAuthLookupによる検証であり、real Supabase Auth/JWTではない。
- productionではAuthorization必須になったが、実JWT verifierは未接続。
- RLS SQL未実装のためDB level tenant isolationは未完成。
- Admin UIはまだselectedTenantIdを保存・送信しない。

## Next Loop

Loop 094: RLS SQL draft review.

実Supabase Auth/JWT本接続は、RLS SQL review/testとは混ぜず、専用Loopで扱う。

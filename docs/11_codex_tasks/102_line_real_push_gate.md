# Loop 102: LINE real push gate

## Goal

担当者返信を将来の本物LINE pushへ接続する前に、誤送信を防ぐためのruntime gateを追加する。

このLoopでは本物LINE API送信、LINE token実値利用、実LINE userId利用、production接続は行わない。目的はgate、test、docs、dry-run safetyの固定です。

## Scope

- `LINE_MESSAGING_ENABLED` と `LINE_REAL_PUSH_ENABLED` の両方が明示されるまでreal push pathを動かさない。
- real push pathでは `authenticated_staff`、`send_staff_reply` permission、`selectedTenantId` 再検証済みtenant、customer tenant一致を必須にした。
- real push pathでは送信前確認とidempotency keyを必須にした。
- idempotency keyはprocess内storeでreserveし、同一tenant/customer/keyの重複を拒否する。
- default / local / dev / testのmock pathは維持した。
- `RealLineClient` boundaryをfake transportで検証できる形で追加した。
- 本物LINE APIを呼ばないtestを追加した。
- docs / runbook / dev logを更新した。

## Out of Scope

- 本物LINE Messaging APIへのHTTP request。
- LINE channel access token実値の利用・表示。
- 実LINE userId / 実顧客情報の投入。
- production deploy / production smoke。
- RLS SQL、migration、GRANT変更。
- Supabase DB接続。
- `.env` 作成・変更。
- OpenAI API接続。
- package依存追加。

## Starting State

- staff reply APIは `POST /api/admin/customers/:customerId/reply` として存在。
- authenticated_staff route rolloutは完了済み。
- production dev_header rejectionは完了済み。
- Admin UI selectedTenantId persistenceとBearer token forwarding boundaryは完了済み。
- staff reply UIにはデモ保存用の2段階確認placeholderが存在。
- LINE送信境界は `MockLineClient` が中心で、本物LINE送信は未実装。

## LINE real push gate conditions

real push pathは、最低限すべての条件を満たす場合だけpushへ進む。

```text
LINE_MESSAGING_ENABLED=true
LINE_REAL_PUSH_ENABLED=true
authenticated_staff runtime
send_staff_reply permission
x-selected-tenant-id present and membership revalidated
AdminTenantContext.tenantId == customer.tenant_id
customer.line_user_id present
real_line_push_confirmed=true
line_push_confirmation=CONFIRM_REAL_LINE_PUSH
idempotency_key present
idempotency key not already used for tenant/customer
```

欠けた場合は本物送信不可。

## Flags

| env | required value | effect |
| --- | --- | --- |
| `LINE_MESSAGING_ENABLED` | `true` | LINE messaging機能全体の明示ON |
| `LINE_REAL_PUSH_ENABLED` | `true` | staff reply real pushの明示ON |

片方だけでは不十分。未指定または `false` なら `real_push_disabled`。

## Permission / tenant / selectedTenantId

- route actionは既存の `send_staff_reply`。
- authenticated_staff runtimeでactive staff / active membershipを再検証する。
- `selectedTenantId` は権限ではなくselector。
- real push pathでは明示的な `x-selected-tenant-id` を要求する。
- repository / LINE pushへ使うtenantは検証済み `AdminTenantContext.tenantId` のみ。
- 他tenant customerは既存仕様どおり `customer_not_found` で存在を隠す。

## Confirmation

real push requestでは以下を要求する。

```json
{
  "real_line_push_confirmed": true,
  "line_push_confirmation": "CONFIRM_REAL_LINE_PUSH"
}
```

既存Admin UIはデモ保存用確認UIであり、本物送信UIではない。実送信UIは後続Loopで扱う。

## Idempotency / duplicate prevention

real push requestでは `idempotency_key` を必須にした。

```text
tenant_id + customer_id + idempotency_key
```

同一scopeが再利用された場合は `real_push_duplicate`。送信失敗時はreserveをreleaseする。

このstoreはprocess内の最小境界であり、本番永続audit/idempotency storeは後続Loopで設計する。

## MockLineClient

defaultではmock pathのまま。

- `LINE_MESSAGING_ENABLED` / `LINE_REAL_PUSH_ENABLED` が未指定なら既存staff replyは維持。
- `MockLineClient` は引き続きtest/local/demoで使う。
- mock送信成功時はstaff message保存とtimeline反映を維持。
- mock送信失敗時はstaff messageを保存しない既存方針を維持。

## RealLineClient boundary

```text
packages/line/src/index.ts
```

`RealLineClient` はtransport injection前提で追加した。

- default transportは持たない。
- testではfake transportを渡す。
- request payload shapeを確認できる。
- transport errorは `LineMessagingApiError` に丸め、token / target / raw errorを漏らさない。
- 今回は実HTTP requestを実装しない。

## Timeline / audit

今回のschema変更はしない。

現時点の方針:

- mock pathもreal pathも、push成功後にstaff messageをtimelineへ保存する。
- push失敗時はstaff messageを保存しない。
- real pathではidempotency keyを要求する。
- 本番向けには永続audit / send marker / retry policyが後続Loopで必要。

## Tests

追加:

- `tests/integration/line-real-push-gate.test.ts`
- `tests/integration/line-real-client-boundary.test.ts`

更新:

- `tests/integration/admin-api-client.test.ts`

確認したこと:

- default mock pathは維持。
- `LINE_MESSAGING_ENABLED=false` または `LINE_REAL_PUSH_ENABLED=false` ではreal pushしない。
- dev_headerではreal push不可。
- selectedTenantIdなしではreal push不可。
- `send_staff_reply` permissionなしでは `permission_denied`。
- 他tenant customerは404。
- confirmationなしではreal push不可。
- idempotency keyなしではreal push不可。
- duplicate idempotency keyは拒否。
- fake clientではpush成功後にstaff messageが保存される。
- RealLineClientはfake transportだけでpayload shapeとredactionを検証。

## Production No-Go

Loop 102後もproduction readinessはNo-Go。

理由:

- 本物LINE送信UIは未実装。
- 本物LINE transport / token env実利用は未実装。
- idempotency storeはprocess内で、永続auditは未実装。
- production runtimeのSupabase client / StaffAuthLookup自動構成は未完了。
- OpenAI real API gate未完了。
- production readiness final gate未完了。

## Next Loop Candidates

```text
Loop 103: OpenAI real API gate
Loop 104: Admin Auth login/session minimal integration
Loop 105: production readiness final gate
```

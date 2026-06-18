# LINE Real Push Gate

## Purpose

本物LINE pushへ進む前に、誤送信、tenant混線、権限抜け、二重送信を防ぐためのGo/No-Goを確認する。

このrunbookは安全gateの記録です。本物LINE API送信、LINE token実値表示、実LINE userId利用、production接続は行わない。

## Current State

- `MockLineClient` はlocal/dev/test/demo用に維持。
- `RealLineClient` はtransport injection境界だけを追加済み。
- 実HTTP transportは未実装。
- Admin UIの既存staff replyはデモ保存用確認UI。
- 本物送信UIは未実装。

## Required Flags

real pushには両方が必要。

```text
LINE_MESSAGING_ENABLED=true
LINE_REAL_PUSH_ENABLED=true
```

未指定、`false`、片方だけONの場合はNo-Go。

## Required Runtime Conditions

real pushは以下がすべて必要。

- `Authorization: Bearer` によるauthenticated_staff runtime。
- `x-selected-tenant-id` があり、active membershipで再検証済み。
- `send_staff_reply` permission。
- verified `AdminTenantContext.tenantId` と `customer.tenant_id` が一致。
- customerに送信可能なLINE identifierがある。
- 送信前確認済み。
- idempotency keyがある。
- duplicate idempotency keyではない。

## Confirmation

real push requestは以下を含む。

```text
real_line_push_confirmed=true
line_push_confirmation=CONFIRM_REAL_LINE_PUSH
```

既存UIはデモ保存用確認であり、本物送信用ではない。本物送信UIを作る場合は、宛先、利用先、本文、送信者、送信種別、注意文を明示する。

## Idempotency

最小gateでは以下を重複防止scopeにする。

```text
tenant_id + customer_id + idempotency_key
```

本番化前には永続idempotency/audit tableまたは同等の永続storeが必要。

## Audit / Timeline

- push成功後にstaff messageをtimelineへ保存する。
- push失敗時はstaff messageを保存しない。
- 本番化前にはLINE送信結果、担当者、tenant、customer、idempotency key、送信時刻、再送状態を追えるauditが必要。

## Dry-run

local/dev/testでは `MockLineClient` またはfake transport付き `RealLineClient` を使う。

禁止:

- LINE Messaging APIへの実HTTP request。
- LINE channel access token実値表示。
- 実LINE userId利用。
- 実顧客情報利用。

## No-Go Conditions

- flagsが揃っていない。
- authenticated_staffではない。
- selectedTenantIdがない、またはmembership外。
- `send_staff_reply` permissionがない。
- customerがverified tenantに属さない。
- confirmationがない。
- idempotency keyがない。
- duplicate key。
- 永続audit/idempotency方針が必要な本番検証。
- tokenやuserIdを表示しないと進められない。

## Final Check Before Real Send

本物送信Loopへ進む前に確認する。

- staging/safe channelであること。
- recipientがdummy/safe targetであること。
- tokenやuserIdをログ・docs・screenshotsへ出さないこと。
- productionではないこと、またはproduction Goが明示されていること。
- OpenAI自動返信と混ぜないこと。

## Loop 103 Final Audit

Loop 103のproduction readiness final gateで、このrunbookの必須条件を再確認しました。本物LINE API送信、LINE token実値利用、実LINE userId利用は引き続き未実施です。production readiness final判定は、LINE gate単体ではなくAuth runtime、Admin login/session、OpenAI gate、production smokeも含めて `production_no_go` としました。

## Loop 106 VPS Deployment Planning Note

Loop 106で `api.taiyolabel.site` のplanned routeとLINE webhook URL shapeをdeployment runbookへ記録しました。

Code route:

```text
POST /api/line/webhook/:webhookSecret
```

Future URL shape:

```text
https://api.taiyolabel.site/api/line/webhook/<webhookSecretPath>
```

Loop 106ではLINE webhook設定、本物LINE API送信、LINE token実値利用、安全recipient smokeは行っていません。`LINE_MESSAGING_ENABLED=false` と `LINE_REAL_PUSH_ENABLED=false` を維持します。

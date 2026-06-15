# Loop 064: staff reply confirmation UI placeholder

## Goal

担当者返信カードに、将来の本物LINE送信へ進む前の誤送信防止として、送信前確認UIのplaceholderを追加する。

今回のLoopでは本物LINE送信は実装しない。既存の `MockLineClient` とstaff message保存挙動を維持し、デモ保存前に宛先、利用先、本文、本物LINE未送信を確認できるようにする。

## Scope

- 顧客詳細の担当者返信カードに2段階確認を追加する。
- `送信前に確認する` と `この内容でデモ保存する` を分ける。
- 確認カードに宛先、利用先、送信内容、送信種別、注意を表示する。
- 確認checkboxを追加し、未チェックでは最終ボタンを押せないようにする。
- 空本文では確認に進めないようにする。
- 既存staff reply Server Action / API helper / API routeのbusiness logicは変更しない。
- README、社内確認runbook、safety design doc、dev log、testを更新する。

## Out of Scope

- 本物LINE送信
- LINE Messaging API呼び出し
- LINE channel access token追加
- `.env` 作成・変更
- 環境変数追加
- `MockLineClient` の本物化
- Admin API routeの送信挙動変更
- Server Actionのbusiness logic変更
- DB schema変更
- Supabase本番接続
- Supabase Auth/JWT実装
- selectedTenantId transport実装
- RLS SQL
- migration変更
- OpenAI API実接続
- scheduler実装
- 本番deploy
- 依存関係追加

## Referenced Safety Docs

- [docs/16_design/staff_reply_safety_confirmation.md](../16_design/staff_reply_safety_confirmation.md)
- [docs/16_design/beginner_friendly_pop_admin_ui.md](../16_design/beginner_friendly_pop_admin_ui.md)
- [docs/11_codex_tasks/063_staff_reply_safety_confirmation_plan.md](063_staff_reply_safety_confirmation_plan.md)

## UI Changes

担当者返信カードを以下の2段階にした。

1. 返信文を入力し、`送信前に確認する` を押す。
2. 確認カードで宛先、利用先、送信内容、送信種別、注意を確認し、checkboxを入れて `この内容でデモ保存する` を押す。

確認カードの表示項目:

- 宛先: LINE表示名、名前、customer idの順で表示
- 利用先: `tenant_amamihome`
- 送信種別: デモ用。本物LINEには送信されません。
- 送信内容: 入力本文preview
- 注意: タイムラインにスタッフ返信として保存されます

## Checkbox

確認文:

```text
この内容を確認しました。本物LINEには送信されず、デモ用に保存されることを理解しました。
```

未チェックでは `この内容でデモ保存する` buttonをdisabledにする。

## Demo Send Display

- `デモ用`
- `本物のLINEには送信されません`
- `タイムラインに保存`
- `この内容でデモ保存する`

本番送信に見える `LINEに送信する` や `本番送信` は追加していない。

## Existing Behavior Kept

- 最終submitは既存のstaff reply actionを使う。
- `MockLineClient` のまま。
- 本物LINEには送信しない。
- staff messageとしてtimelineに保存される。
- API response / route挙動は変更なし。
- `x-tenant-id` / `dev_header` runtimeは変更なし。

## Test

Updated:

- `tests/integration/admin-customer-action-panel.test.tsx`

The tests check:

- 担当者返信カードが表示される。
- `送信前に確認する` が表示される。
- 確認カードに宛先、利用先、送信内容、デモ用、本物LINE未送信が表示される。
- 確認checkbox文言が表示される。
- `この内容でデモ保存する` が未チェックではdisabledになる。
- AI下書きカード、RAGカードの既存文言が維持される。

## Build

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success
- `npx pnpm@10.12.1 test`: success, 40 files / 266 tests passed
- `npx pnpm@10.12.1 test:integration`: success, 40 files / 266 tests passed
- `npx pnpm@10.12.1 build`: success, 10 packages

## Browser / Local Check

Browser確認はBrowser URL policyで `localhost:3000` がblockされたため未実行。

代替確認として、API/Admin dev serverを起動し、demo seed投入後に `POST /api/admin/customers/customer_demo_yamada_taro/reply` を実行した。既存 `MockLineClient` 経由でstaff messageが保存され、timelineに反映されることを確認した。

## Risks

- まだ本物LINE送信ではない。
- 確認UIはplaceholderであり、idempotency key、audit log、実LINE provider staging、認証/権限接続は未実装。
- 実ブラウザの確認はlocal dev serverとdemo seedに依存する。

## Next Loop Candidates

- Loop 065: staff reply send safety boundary tests
- Loop 066: real LINE send integration plan
- Loop 067: LINE provider staging boundary

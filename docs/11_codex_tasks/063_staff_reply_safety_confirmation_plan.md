# Loop 063: staff reply safety confirmation plan

## Goal

担当者返信を将来本物LINE送信へ接続する前に、誤送信、二重送信、送信失敗時の誤解を防ぐための安全確認方針をdocs化する。

今回のLoopでは本物LINE送信は実装しない。LINE Messaging API、LINE channel access token、`.env`、API route挙動、送信確認UI、DB schemaは変更しない。

## Scope

- 担当者返信の安全確認plan docを作成する。
- AI下書き、担当者返信、本物LINE送信の責務を分離する。
- 本物LINE送信前確認UIの仕様案を整理する。
- デモ送信と本番送信の表示方針を整理する。
- 送信前チェック項目を定義する。
- 誤送信防止ルールを定義する。
- 二重送信防止方針を定義する。
- 送信失敗時の表示方針を定義する。
- 権限、tenant、認証との関係を整理する。
- timeline / audit方針を整理する。
- 社内確認runbook、README、dev loop docs、dev logを更新する。
- docs testを追加/更新する。

## Out of Scope

- 本物LINE送信の実装
- LINE Messaging API呼び出し
- LINE channel access token追加
- `.env` 作成・変更
- 環境変数追加
- `MockLineClient` の本物化
- Admin API routeの送信挙動変更
- Server Actionの本送信化
- 送信確認modal実装
- 送信確認画面実装
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

## Current State

| Item | State |
| --- | --- |
| 担当者返信UI | 顧客詳細に存在する |
| 送信境界 | `MockLineClient` |
| 本物LINE送信 | 未実装 |
| 返信保存 | staff messageとしてtimelineに保存 |
| AI返信下書き | API responseのみ、保存なし、LINE送信なし |
| 本番認証/権限 | 未接続 |

社内確認版では、担当者返信の業務イメージを確認できる状態でよい。本物LINE送信へ進む前に、このLoopで定義した安全確認を後続Loopで実装する。

## Responsibility Split

### AI Reply Draft

- AIが返信文の候補を作る。
- まだ送信しない。
- 担当者が内容を確認、編集する。
- 不正確な内容が含まれる可能性がある。
- 本番ではOpenAI API接続予定だが、送信権限は持たせない。

### Staff Reply

- 担当者が最終的に送る文章。
- 現在はデモ用送信で、timelineにstaff messageとして保存される。
- 本番ではLINEへ送信される可能性があるため、送信前確認が必要。

### Real LINE Send

- 外部のLINEユーザーへ実際に届く。
- 誤送信リスクがある。
- 確認ステップ、明示チェック、権限、tenant確認が必須。

## Confirmation UI Proposal

今回、UIは実装しない。後続Loopで実装する仕様案として整理する。

送信前確認で表示する項目:

- 送信先の顧客名または表示名
- 送信先のLINE連携状態
- 利用先 / tenant
- 送信本文
- 送信者 / staff
- 本物LINEに送るかどうか
- デモ送信か本番送信か
- 注意文

操作案:

1. 返信文を入力する。
2. `送信前に確認する` を押す。
3. 確認画面または確認カードを表示する。
4. 本物LINEに送る場合は明示チェックを要求する。
5. `この内容で送信する` を押す。
6. 送信結果をtimelineに記録する。

明示チェック案:

```text
□ 本物のLINEに送信されることを確認しました
```

## Demo Send / Production Send Display

### Demo Send

- 本物LINEには送信されません。
- タイムラインにスタッフ返信として保存されます。
- 社内確認、ローカルデモ用です。

### Production Send

- 本物のLINEユーザーに届きます。
- 送信前確認が必要です。
- 送信後はtimelineに送信済みとして残します。

### Display Rules

- デモ送信中は `デモ用` ラベルを出す。
- 本番送信可能な画面では `本物LINEに送信されます` を明示する。
- デモと本番を同じ色、同じ文言で見せない。
- 危険操作は目立たせるが怖すぎない説明にする。

## Wrong Send Prevention

- AI下書きから直接本送信しない。
- 送信前確認ステップを必須にする。
- 本物LINE送信時は明示チェックを要求する。
- 送信先と本文を同じ画面で確認する。
- 空本文は送れない。
- 短すぎる本文には警告を検討する。
- 同じ本文の連続送信を防ぐ。
- 送信中はボタンを連打できないようにする。
- 送信失敗時は、送信されていない、または結果不明であることを明確にする。
- tenant / customer / line userの整合性確認を行う。

## Duplicate Send Prevention

- 送信ボタン押下後はpending状態にする。
- 同じrequestを二重実行しない。
- idempotency keyを将来検討する。
- 送信結果が不明な場合は、再送前にtimelineと送信ログを確認する。
- 送信済みmessage idを記録する。

今回、idempotency実装はしない。

## Send Failure Policy

想定する失敗:

- LINE API error
- rate limit
- invalid line user
- network error
- tenant mismatch
- auth expired
- permission denied

UI表示方針:

```text
送信できませんでした。
本物LINEに届いていない可能性があります。
再送する前に、タイムラインと送信結果を確認してください。
詳しい原因は開発者ログで確認します。
```

## Permission / Tenant / Auth Relationship

本番送信には、将来以下が必要。

- Supabase Auth/JWT
- `authenticated_staff`
- `staff_tenant_memberships`
- selectedTenantId transport
- role guard
- `send_staff_reply` permission
- customer tenant一致
- LINE user tenant一致
- production `dev_header` rejection

## Timeline / Audit Policy

将来追跡したい状態:

- 送信前下書き
- 送信リクエスト
- 送信成功
- 送信失敗
- 再送
- 担当者名 / role
- 送信時刻
- LINE message id
- tenant_id
- customer_id

本番ではaudit logが必要になる可能性がある。ただし、schema変更は今回しない。

## Screen Impact

- 顧客詳細
- 担当者返信カード
- AI返信下書きカード
- timeline
- alertsから顧客詳細へ行く導線
- login / auth / role
- tenant selection

## Why This Loop Does Not Implement Real Send

本物LINE送信は外部ユーザーに届く危険操作であり、送信前確認、権限、tenant整合、二重送信防止、失敗時表示、audit方針を先に固定する必要があるため。

## Test Result

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success
- `npx pnpm@10.12.1 test`: success, 40 files / 265 tests passed
- `npx pnpm@10.12.1 test:integration`: success, 40 files / 265 tests passed
- `npx pnpm@10.12.1 build`: not run, docs/test-only change

## Risks

- 現在の担当者返信はデモ用であり、本物LINE送信の失敗や結果不明状態はまだ扱っていない。
- 送信確認UI、idempotency、audit log、権限/認証接続は後続Loopで必要。
- 本番送信前に、LINE provider staging boundaryと実機検証計画が必要。

## Next Loop Candidates

- Loop 064: staff reply confirmation UI placeholder
- Loop 065: staff reply send safety boundary tests
- Loop 066: real LINE send integration plan
- Loop 067: LINE provider staging boundary
- Loop 068: LINE send idempotency/audit plan
- Loop 069: Supabase Auth and role requirement for real send

# Staff Reply Safety Confirmation

## Purpose

このドキュメントは、担当者返信を将来本物のLINE送信へ接続する前に、誤送信を避けるための安全確認方針を固定するための設計書です。

現在の社内確認版では、担当者返信は `MockLineClient` によるデモ用送信です。本物LINEには送信されません。入力した返信はstaff messageとしてタイムラインに保存され、担当者返信の流れだけを確認できます。

## Basic Policy

- AI下書き、担当者返信、本物LINE送信を別の責務として扱う。
- AI下書きから直接本送信しない。
- 本物LINE送信へ進む前に、送信前確認を必須にする。
- 送信先、送信本文、送信者、利用先を同じ画面で確認できるようにする。
- デモ送信と本番送信を同じ色、同じ文言、同じ操作感で見せない。
- 送信失敗時は、届いていない可能性と次に確認することを分かりやすく表示する。
- tenant / customer / line user / staff permissionの整合性をserver-sideで確認する。

## Dangerous Operation Definition

以下は危険操作として扱います。

- 本物のLINEユーザーへメッセージを送る。
- AI下書きを担当者確認なしで送る。
- 送信先が不明なcustomerへ送る。
- tenantが一致しないcustomerまたはLINE userへ送る。
- 権限がないstaffが送る。
- 送信結果が不明なまま再送する。

## Current State

| Item | Current State |
| --- | --- |
| Staff reply UI | 顧客詳細に存在する |
| Send implementation | `MockLineClient` |
| Real LINE delivery | 未実装、本物LINEには送信されない |
| Timeline | staff messageとして保存される |
| AI reply draft | 保存しない、LINE送信しない |
| Persistence | in-memory runtime |
| Auth / role | production runtime未接続 |

社内確認版ではこの状態でよい。本番運用前には、このdocの安全確認を実装Loopへ分割して進める。

## Loop 064 Placeholder UI Status

Loop 064で、顧客詳細の担当者返信カードに送信前確認UI placeholderを追加した。

Implemented:

- 返信文入力後に `送信前に確認する` を押す流れ。
- 確認カードで宛先、利用先、送信内容、送信種別、注意を表示。
- `本物のLINEには送信されません` と `デモ用` を表示。
- checkbox確認後だけ `この内容でデモ保存する` を押せる。
- 最終submitは既存のstaff reply actionを使い、`MockLineClient` のまま。

Still not implemented:

- 本物LINE送信。
- LINE Messaging API接続。
- idempotency key。
- audit log schema。
- Supabase Auth/JWTと `send_staff_reply` permissionの本番接続。

## Responsibility Split

### AI Reply Draft

- AIが返信文の候補を作る。
- まだ送信しない。
- messagesには保存しない。
- 担当者が内容を確認し、必要なら編集する。
- 不正確な内容、断定できない内容、担当者確認が必要な内容が含まれる可能性がある。
- 本番ではOpenAI API接続予定だが、送信権限は持たせない。

### Staff Reply

- 担当者が最終的に送る文章。
- 現在はデモ用送信としてtimelineにstaff messageを保存する。
- 本番ではLINEへ送信される可能性があるため、送信前確認が必要。
- staff user、tenant、customer、line_user_id、本文をserver-sideで検証する。

### Real LINE Send

- 外部のLINEユーザーへ実際に届く。
- 誤送信リスクがある。
- 送信前確認、明示チェック、権限確認、tenant確認が必須。
- 送信成功、送信失敗、送信結果不明をtimelineまたはaudit logで追えるようにする。

## Confirmation UI Proposal

今回、このUIは実装しません。後続Loopで実装する仕様案です。

送信前確認で表示する項目:

- 送信先の顧客名またはLINE表示名
- 送信先のLINE連携状態
- 利用先 / tenant
- 送信本文
- 送信者 / staff
- 本物LINEに送るかどうか
- デモ送信か本番送信か
- 注意文

確認操作案:

1. 返信文を入力する。
2. `送信前に確認する` を押す。
3. 確認画面または確認カードを表示する。
4. 本物LINEに送る場合は明示チェックを要求する。
5. `この内容で送信する` を押す。
6. 送信結果をtimelineまたはaudit logに記録する。

本番送信前の明示チェック案:

```text
□ 本物のLINEに送信されることを確認しました
```

## Demo Send And Production Send

### Demo Send

- 本物LINEには送信されません。
- タイムラインにスタッフ返信として保存されます。
- 社内確認、ローカルデモ用です。
- 表示は `デモ用送信`、`本物のLINEには送信されません` を使う。

### Production Send

- 本物のLINEユーザーに届きます。
- 送信前確認が必要です。
- 送信後はtimelineに送信済みとして残します。
- 表示は `本物LINEに送信されます` を明示する。

### Display Rules

- デモ送信中は `デモ用` ラベルを出す。
- 本番送信可能な画面では `本物LINEに送信されます` を明示する。
- デモと本番を同じ色、同じ文言で見せない。
- 危険操作は目立たせるが、初心者が怖くなりすぎない説明にする。

## Wrong Send Prevention / 誤送信防止

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

## Duplicate Send Prevention / 二重送信防止

- 送信ボタン押下後はpending状態にする。
- 同じrequestを二重実行しない。
- idempotency keyを将来検討する。
- 送信結果が不明な場合は、再送前にtimelineと送信ログを確認する。
- 送信済みmessage id、LINE message id、送信時刻を記録する。

今回、idempotency実装はしません。方針だけを固定します。

## Send Failure Policy

想定する失敗:

- LINE API error
- rate limit
- invalid line user
- network error
- tenant mismatch
- auth expired
- permission denied

初心者向けUI表示方針:

```text
送信できませんでした。
本物LINEに届いていない可能性があります。
再送する前に、タイムラインと送信結果を確認してください。
詳しい原因は開発者ログで確認します。
```

失敗時にmessageを保存するか、送信失敗ログとして別に残すかは後続Loopで設計する。送信成功として誤表示しないことを優先する。

## Permission / Tenant / Auth Requirements

本番送信には、将来以下が必要です。

- Supabase Auth / JWT
- `authenticated_staff`
- `staff_tenant_memberships`
- selectedTenantId transport
- role guard
- `send_staff_reply` permission
- customer tenant一致
- LINE user tenant一致
- production `dev_header` rejection

service role keyやLINE access tokenはserver-sideだけで扱う。browser、LIFF、Next client componentへ出さない。

## Timeline / Audit Requirements

本番化では以下の状態を追跡できるようにする。

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

将来、timelineとは別にaudit logが必要になる可能性があります。ただし、schema変更はこのLoopでは行いません。

## Screen Impact

この安全設計が影響する画面:

- 顧客詳細
- 担当者返信カード
- AI返信下書きカード
- timeline
- alertsから顧客詳細へ行く導線
- login / auth / role
- tenant selection

## Implementation Checklist Before Real Send

- [ ] AI下書きと本送信が直接つながっていない。
- [ ] 送信前確認UIがある。
- [ ] 本物LINE送信時の明示チェックがある。
- [ ] デモ送信と本番送信の表示が明確に違う。
- [ ] customer tenantとstaff tenantが一致する。
- [ ] line_user_idが対象customerに属する。
- [ ] `send_staff_reply` permissionをAPI側で確認する。
- [ ] 送信中pendingで二重送信を防ぐ。
- [ ] 送信成功、送信失敗、結果不明を区別できる。
- [ ] timelineまたはaudit logに送信結果を残せる。
- [ ] 本番LINE access tokenはserver-sideのみで扱う。

## Future Loop Candidates

- Loop 064: staff reply confirmation UI placeholder
- Loop 065: staff reply send safety boundary tests
- Loop 066: real LINE send integration plan
- Loop 067: LINE provider staging boundary
- Loop 068: LINE send idempotency/audit plan
- Loop 069: Supabase Auth and role requirement for real send

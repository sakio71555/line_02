# LINE Flows

## 友だち追加

1. 顧客がアマミホームLINE公式アカウントを友だち追加する。
2. LINE Webhookでfollow eventを `POST /api/line/webhook/:webhookSecret` に受信する。
3. Webhook URLまたはchannel設定からtenantを確定する。
4. raw bodyと `x-line-signature` でLINE署名検証を行う。
5. JSON parseし、Webhook eventを正規化する。
6. follow eventでは、in-memory repository上で `customers` に `tenant_id`、`line_user_id`、初期 `response_mode = bot_auto` の顧客カルテを作成または更新する。
7. 初回案内の実送信は後続Phaseで実装する。

## テキストメッセージ受信

1. LINE Webhookでmessage eventを受信する。
2. `webhookSecret` からtenantを確定する。
3. raw bodyと `x-line-signature` で署名検証する。
4. JSON parseし、Webhook eventを正規化する。
5. text message eventでは、`tenant_id + line_user_id` でcustomerを作成または更新し、`last_customer_message_at` を更新する。
6. text message eventでは、`tenant_id`、`customer_id`、`line_message_id`、本文を持つmessageをin-memory repositoryへ保存する。
7. consultation更新、response_modeに応じた自動応答判定、永続DB保存は後続Loopで実装する。

## 画像受信

1. LINE Webhookで画像message eventを受信する。
2. tenantを確定し、raw bodyで署名検証する。
3. Loop 003では画像eventは保存対象外として扱い、画像取得は行わない。
4. 後続PhaseではLINE content APIから画像を取得し、Supabase Storageへ保存する。
5. `messages.media_storage_path` に保存先を記録する。
6. 画像に個人情報や住宅内部写真が含まれる可能性があるため、公開URL化しない。

## BOT自動対応

BOT自動対応は `response_mode = bot_auto` の場合だけ許可します。

初期方針ではAI自動返信よりも、AI要約と返信下書きを優先します。自動返信を行う場合も、公式HP・FAQ・施工事例などtenant内で許可された根拠だけを参照します。

## 人間対応切替

以下の場合は `response_mode` を `human_required` または `human_active` へ切り替えます。

- 顧客が担当者対応を求めた
- 契約、見積、土地、建売在庫、補助金、保証判断が含まれる
- AIが確信できない
- ネガティブ・緊急度の高い相談
- 担当者が管理画面で手動切替した

人間対応中はBOTが勝手に返信してはいけません。

## 管理画面から返信

1. 担当者が顧客カルテを開く。
2. 会話履歴、AI要約、返信下書きを確認する。
3. 担当者が返信文を編集する。
4. 送信前に `tenant_id` と担当者権限を確認する。
5. LINE reply/push APIで送信する。
6. `messages` にoutbound messageとして保存する。
7. `consultations` と `alerts` の状態を更新する。

Loop 006の初期APIでは、`POST /api/admin/customers/:customerId/reply` を用意します。開発用に `x-tenant-id` と任意の `x-staff-id` headerを使い、customerをtenant scopedに取得してから `LineClient.pushMessage` 境界に渡します。本番LINE APIは呼ばず、MockLineClient送信成功時だけ `role = staff` のtext messageを保存し、`last_staff_reply_at` と `response_mode = human_active` を更新します。

Loop 017の初期UIでは、顧客詳細画面に担当者返信フォームを追加します。フォームはServer Action経由でadmin server側からstaff reply APIを呼び、`x-tenant-id` と開発用 `x-staff-id` を付けます。成功時は画面更新でtimelineにstaff messageが見えるようにし、本番LINE送信UIや本番LINE API接続は後続Loopに分けます。

## 未返信アラート

未返信判定は、顧客の最新inbound messageと担当者の最新outbound messageを比較して行います。

例:

- 顧客からの最新メッセージ以後に担当者返信がない
- 一定時間を超えて `waiting_staff` のまま
- `human_required` のまま未対応

アラートは `alerts` に保存し、管理画面と担当者通知LINEの両方で使います。

Loop 007の初期APIでは、`POST /api/admin/alerts/check-unreplied` を用意します。開発用の `x-tenant-id` headerでknown tenantを判定し、そのtenantのcustomerだけを対象に `response_mode`、`last_customer_message_at`、`last_staff_reply_at` を見て未返信を判定します。open/notifiedな `unreplied_customer_message` alertが既にあるcustomerには重複作成せず、担当者通知LINEやscheduler本実行は後続Loopで実装します。

Loop 018の初期UIでは、管理画面の `/alerts` から未返信チェックを実行し、`GET /api/admin/alerts` でtenant scopedなalert一覧を表示します。open alert通知ボタンは `POST /api/admin/alerts/notify-open` を呼び、MockStaffNotifier成功時にalert statusが `notified` へ変わる流れを確認します。本番LINEグループ通知は後続Loopで接続します。

## 担当者通知LINE

担当者通知LINEは、未返信、緊急、人間対応切替を担当者グループへ知らせる機能です。

Phase 0では `STAFF_LINE_GROUP_ID` を `.env.example` に用意するだけで、実送信はしません。後続Phaseで `LineClient` interfaceを使い、テストでは `MockLineClient` を使います。

Loop 008の初期APIでは、`POST /api/admin/alerts/notify-open` を用意します。開発用の `x-tenant-id` headerでknown tenantを判定し、そのtenantの `status = open` alertだけを `StaffNotifier` 境界へ渡します。MockStaffNotifier通知に成功したalertだけ `status = notified` と `notified_at` を更新し、通知失敗時は `open` のまま残します。本番LINE送信とscheduler実行は後続Loopで実装します。

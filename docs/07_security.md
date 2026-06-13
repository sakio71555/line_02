# Security

## .env管理

`.env` はコミットしません。共有するのは `.env.example` だけです。

管理対象外にする値:

- `OPENAI_API_KEY`
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `STAFF_LINE_GROUP_ID`

## LINE署名検証

LINE Webhookは必ず署名検証します。`POST /api/line/webhook/:webhookSecret` で受け、まず `webhookSecret` からtenantを解決し、`x-line-signature` とraw bodyを使ってchannel secretでHMAC-SHA256を検証します。

署名検証は必ずraw request bodyに対して行います。JSON parse後のbodyを使って署名検証してはいけません。

署名検証前に以下をしてはいけません。

- 顧客作成
- メッセージ保存
- AI処理
- LINE返信
- 担当者通知

Loop 002では、known webhook secret + valid signatureで200、invalid signatureで401、unknown webhook secretで404、malformed bodyで400を返すところまで実装します。顧客保存、message保存、LINE返信、Supabase接続はまだ行いません。

## OpenAI APIキー管理

OpenAI APIキーは `OPENAI_API_KEY` で管理します。テストでは使いません。`OpenAiProvider` はinterfaceの背後に置き、業務ロジックから直接SDKを呼びません。

## 個人情報管理

顧客名、住所、電話番号、メール、LINE user ID、相談内容は個人情報として扱います。

- ログへ不用意に出さない。
- fixtureには実データを入れない。
- tenant境界を越えて検索しない。
- AIへ渡す情報は最小化する。

## 住宅写真の扱い

画像には住宅内部、家族、位置情報、書類が含まれる可能性があります。

- Phase 0ではLINE画像取得を実装しない。
- 後続PhaseでSupabase Storageへ保存する場合は公開bucketにしない。
- AI解析対象にする場合は、利用目的と保存期間を明確にする。

## 管理画面認証

管理画面は担当者だけが使います。後続PhaseでSupabase Authなどを検討します。

必要な制約:

- staff userはtenantに所属する。
- 権限roleを持つ。
- inactive userはログインできない。
- 他tenantの顧客を閲覧できない。

## RLS方針

Supabase導入時にはRLSを前提にします。

- `tenant_id` によるselect/update/delete制限
- staff roleによる操作制限
- service role利用箇所の最小化
- 管理画面APIでもtenant条件を明示

## ログ方針

ログには運用に必要な情報だけを残します。

残してよい例:

- request id
- tenant_id
- customer_id
- consultation_id
- message id
- 処理ステータス

避ける例:

- LINE raw body全文
- APIキー
- channel secret
- 顧客の住所や電話番号
- AI入力全文

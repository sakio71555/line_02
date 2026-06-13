# Architecture

## 全体構成

Phase 0の構成はTypeScript monorepoです。

- `apps/admin`: 担当者が使うNext.js管理画面
- `apps/api`: LINE Webhook、管理画面API、AI支援APIを受け持つHono API
- `apps/liff`: LINE内フォーム用のLIFFフロントエンド
- `packages/domain`: tenant、customer、consultation、response_modeなどのドメイン型
- `packages/db`: Supabase PostgreSQL想定のテーブル定義メモとDB境界
- `packages/line`: LINE署名検証、LINE client interface、mock
- `packages/ai`: AiProvider interface、MockAiProvider、OpenAiProvider scaffold
- `packages/rag`: tenant_idで先に絞るナレッジ検索境界
- `packages/config`: 環境変数読み込みと初期tenant設定
- `packages/shared`: 共通定数と共通型

## LINE公式

顧客はアマミホームのLINE公式アカウントを友だち追加し、相談メッセージを送ります。LINE channelはtenantごとに管理します。将来ほかの工務店を追加する場合、`tenant_line_settings` にchannel設定を追加します。

## Webhook

LINE Webhookは `apps/api` で受けます。Webhookでは必ず以下の順番を守ります。

1. URLやchannel設定からtenant候補を特定する。
2. LINE署名を検証する。
3. LINE eventを正規化する。
4. `tenant_id` 付きでmessage/customer/consultationへ保存する。
5. `response_mode` を確認する。
6. BOT自動返信、AI下書き、人間対応通知のいずれかを選ぶ。

署名検証前にイベント内容を信頼してはいけません。

## API

APIはHonoを使います。Phase 0では `/health` とmock webhookだけを置き、外部APIには接続しません。後続Phaseでは以下を追加します。

- LINE Webhook受信
- 顧客一覧
- 顧客カルテ
- タイムライン
- 担当者返信
- 未返信アラート
- AI要約
- AI返信下書き
- LIFFフォーム送信

## DB

DBはSupabase PostgreSQLを想定します。主要テーブルには必ず `tenant_id` を持たせ、API層とDB/RLS層の両方でtenant分離を守ります。

`tenants` はtenantそのもののマスターのため `tenant_id` を持たず、主キー `id` がtenant IDになります。それ以外の主要テーブルは `tenant_id` を持ちます。

## 管理画面

管理画面はNext.jsです。担当者はログイン後、自分が所属するtenantの顧客だけを閲覧します。

Loop 004の初期APIでは、本格認証の前段として `GET /api/admin/customers` を用意します。開発用に `x-tenant-id` headerでtenantを判定し、known tenantのcustomerだけをin-memory repositoryから返します。Supabase Auth、JWT、RLS、Next.js管理画面UIは後続Loopで実装します。

Loop 005の初期APIでは、`GET /api/admin/customers/:customerId` と `GET /api/admin/customers/:customerId/timeline` を用意します。どちらも `x-tenant-id` でknown tenantを判定し、customer detailとtimeline messageをtenant scopedにin-memory repositoryから返します。存在しないcustomerと別tenantのcustomerは同じ404として扱い、他tenantの存在を推測できないようにします。

Loop 014の初期UIでは、Next.js Server Componentsでread-onlyの管理画面トップ、顧客一覧、顧客詳細、タイムライン表示だけを用意します。`API_BASE_URL` と `TENANT_ID` からHono APIへ `x-tenant-id` 付きでfetchし、返信送信、AI実行、RAG実行などのmutation UIは後続Loopに分けます。

主な画面は以下です。

- 顧客一覧
- 顧客カルテ
- 相談タイムライン
- 未返信・放置アラート
- AI要約
- AI返信下書き
- 担当者返信フォーム
- tenant設定

管理画面から送った返信をCRM上のsource of truthにします。LINE側の会話だけに状態を依存させません。

## LIFF

LIFFはLINE内フォームに使います。初期候補は以下です。

- 資料請求
- オンライン相談
- モデルホーム予約
- 土地・建売相談
- アフター相談

LIFF本番登録はPhase 0では行いません。後続PhaseでLINE Developers側のLIFF IDをtenant設定として保存します。

## AI

AIはOpenAI APIを使います。コードはResponses API前提の抽象化にします。

- `AiProvider`: AI呼び出しのinterface
- `MockAiProvider`: テスト・Phase 0用
- `OpenAiProvider`: 公式SDKを使う実装の入り口。ただしPhase 0では実呼び出ししない。

AIには必ずtenant確定済みの情報だけを渡します。FAQ/RAG検索ではDB側で `tenant_id` を先に絞り、AIに全tenantの情報を選ばせません。

## 担当者通知LINE

未返信・緊急・人間対応が必要な場合、将来的に担当者LINEグループへ通知します。Phase 0では `STAFF_LINE_GROUP_ID` の環境変数だけを用意し、実送信はしません。

## ドメインなし開発

開発段階では本番ドメインを設定しません。LINE実機WebhookやLIFF検証が必要になったら、ngrokまたはCloudflare TunnelでローカルAPIを一時公開します。

本番ドメイン、SSL、LIFF本番登録、LINE本番Webhook URLの固定化は後続Phaseで行います。

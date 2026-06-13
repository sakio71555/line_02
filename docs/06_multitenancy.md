# Multitenancy

## 基本方針

初期tenantはアマミホームだけです。

- `tenant_id`: `tenant_amamihome`
- `tenant_slug`: `amamihome`

ただし、将来ほかの工務店にも販売できるように、Phase 0からマルチテナント前提で実装します。

## tenant_id分離

`tenants` 以外の主要データは `tenant_id` を持ちます。

- `tenant_line_settings`
- `tenant_ai_settings`
- `staff_users`
- `customers`
- `messages`
- `consultations`
- `alerts`
- `knowledge_pages`
- `construction_cases`
- `reservations`

APIはログインユーザー、LINE channel、Webhook path、LIFF contextなどからtenantを確定し、そのtenantのデータだけを扱います。

## APIでのtenantチェック

APIでは以下を必ず確認します。

- リクエストのtenantが確定していること
- 担当者がそのtenantに所属していること
- URLパラメータのcustomer/consultation/messageが同じtenantに属していること
- 更新対象に `tenant_id` mismatchがないこと

## DBでのtenantチェック

Supabase PostgreSQLではRLSを使う予定です。

- `staff_users.tenant_id` をもとに閲覧可能tenantを制限する。
- `tenant_id` 条件なしのselect/update/deleteを禁止する。
- service roleを使う処理でもアプリ層でtenantを明示する。

## AI検索でのtenantチェック

RAG検索では、検索queryより先にtenant境界を確定します。

1. バックエンドがtenantを確定する。
2. `knowledge_pages` を `tenant_id` で絞る。
3. `allowed_for_ai = true` で絞る。
4. その範囲だけでキーワード検索またはembedding検索を行う。
5. AIへ渡す。

AIにtenant選択を任せません。

Loop 011の初期RAG検索API `POST /api/admin/rag/search` も同じ方針です。開発用には `x-tenant-id` headerでtenantを確定し、そのtenantの `knowledge_pages` だけをrepositoryから取得してから、`allowed_for_ai = true` と簡易キーワード検索を適用します。他tenantのknowledgeをスコアリング対象に含めません。

## 禁止事項

- tenant未確定のままAIへ入力を渡す。
- 全tenantのナレッジをAIへ渡す。
- LINE channel IDだけを信用し、署名検証を省略する。
- 管理画面で他tenantのcustomer IDを直接指定できる。
- `tenant_id` なしのmessages/consultationsを作る。
- テストで本番Supabaseや本番LINE APIへ接続する。

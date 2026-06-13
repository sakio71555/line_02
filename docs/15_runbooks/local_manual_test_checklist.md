# Local Manual Test Checklist

## 前提

- 作業フォルダーは `/Users/sakio/Desktop/PROJECT/amami-line-crm`。
- 現在はin-memory実装です。
- API processを再起動するとdemo dataは消えます。
- 本物のLINE API、OpenAI API、Supabaseには接続しません。
- LINE送信と担当者通知はmock境界です。
- `TENANT_ID` は `tenant_amamihome`。
- `API_BASE_URL` は基本 `http://localhost:4000`。
- Adminは基本 `http://localhost:3000`。
- `.env`、APIキー、本番ログ、実顧客情報、LINE userIdは使いません。

## 起動手順

### ターミナル1: API

```bash
cd /Users/sakio/Desktop/PROJECT/amami-line-crm
TENANT_ID=tenant_amamihome TENANT_SLUG=amamihome npx pnpm@10.12.1 --filter @amami-line-crm/api dev
```

期待結果:

- `API server listening on http://localhost:4000` が表示される。
- `http://localhost:4000/health` で `tenant_id = tenant_amamihome` が返る。

### ターミナル2: Admin

```bash
cd /Users/sakio/Desktop/PROJECT/amami-line-crm
API_BASE_URL=http://localhost:4000 TENANT_ID=tenant_amamihome npx pnpm@10.12.1 --filter @amami-line-crm/admin dev
```

期待結果:

- Next.js dev serverが `http://localhost:3000` で起動する。
- 管理画面トップに `tenant_amamihome` と `http://localhost:4000` が表示される。

## demo seed投入

API起動後に実行します。

```bash
curl -X POST http://localhost:4000/api/dev/seed-demo-data \
  -H "x-tenant-id: tenant_amamihome"
```

期待結果:

- `ok: true` が返る。
- `customer_demo_yamada_taro` と `customer_demo_sato_hanako` が返る。
- このseedは開発専用です。productionでは使いません。

## 管理画面確認

1. `http://localhost:3000` を開く。
2. `/customers` を開く。
3. demo顧客が表示される。
4. `customer_demo_yamada_taro` などの顧客詳細を開く。
5. タイムラインが表示される。
6. AI要約を実行する。
7. AI返信下書きを実行する。
8. RAG回答案で `オンライン相談`、`施工事例`、`メンテナンス` などを試す。
9. 担当者返信フォームで返信する。
10. タイムラインにstaff messageが増えることを確認する。
11. `/alerts` を開く。
12. 未返信チェックを実行する。
13. alert一覧に表示されることを確認する。
14. open alert通知mockを実行する。
15. alert statusが `notified` になることを確認する。

## 期待結果

- 管理画面トップ: `顧客一覧` と `アラート` へのリンクが表示される。
- 顧客一覧: demo顧客2件が表示される。
- 顧客詳細: customer情報とtimelineが表示される。
- AI要約: MockAiProviderのsummaryが表示され、AI summary messageがtimelineに追加される。
- AI返信下書き: `draft_body`、`next_questions`、`risk_flags`、`recommended_response_mode`、`should_handoff` が表示される。
- RAG回答案: `answer_body` とsourcesが表示される。該当sourceがない場合はfallbackが表示される。
- 担当者返信: 開発用Mock送信として成功表示され、timelineに `role = staff` のmessageが増える。
- 未返信チェック: 条件に合うcustomerに `unreplied_customer_message` alertが作成される。
- open alert通知mock: open alertがmock通知され、成功したalertのstatusが `notified` になる。

## トラブルシュート

### 顧客一覧が空の場合

- demo seedを投入したか確認する。
- API processを再起動してdemo dataが消えていないか確認する。
- seed curlに `x-tenant-id: tenant_amamihome` が付いているか確認する。
- Admin serverの `TENANT_ID` が `tenant_amamihome` か確認する。

### API接続エラーの場合

- `apps/api` が起動しているか確認する。
- `http://localhost:4000/health` が返るか確認する。
- Adminの `API_BASE_URL` が `http://localhost:4000` か確認する。

### AdminがAPIを読めない場合

- Admin起動時の `API_BASE_URL` 環境変数を確認する。
- Admin serverを再起動する。
- API serverを再起動した場合はdemo seedも入れ直す。

### AI系が失敗する場合

- 現在はMockAiProviderでOpenAI APIは呼びません。
- timelineが空だとAI要約やAI返信下書きは409になる可能性があります。
- demo seed後の顧客詳細で試してください。

### RAGでsourceが出ない場合

- demo knowledge seedが入っているか確認する。
- queryを `オンライン相談`、`施工事例`、`資料請求`、`メンテナンス`、`SoToNo MA` で試す。
- 該当sourceがないqueryではfallbackが表示されます。

### alertが出ない場合

- `response_mode` が `human_required`、`human_active`、`emergency` のいずれかか確認する。
- `last_customer_message_at` が存在するか確認する。
- 返信済みcustomerは未返信alert対象外です。
- open/notified alertが既にあるcustomerは重複作成されません。
- demo seed直後は未返信っぽい `customer_demo_yamada_taro` で確認してください。

## まだ本番ではないもの

- 認証はまだ開発用です。
- `x-tenant-id` header前提です。
- Supabase永続化はありません。
- RLSはありません。
- 本物のLINE送信はありません。
- 本物の担当者LINE通知はありません。
- OpenAI API実呼び出しはありません。
- LIFFは未実装です。
- 画像処理は未実装です。

## 次に本番寄りにするための候補

- Supabase persistence planning
- 本番認証
- LINE実接続
- OpenAI API実接続
- LIFF相談フォーム
- 画像相談

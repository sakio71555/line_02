# Local Manual Test Checklist

## 最終確認記録

- Latest Codex verification record: [Loop 056.2 local demo RAG knowledge seed verification patch](../11_codex_tasks/056_2_local_demo_rag_knowledge_seed_verification_patch.md)
- 前回確認記録: [Loop 056.1 local demo manual verification record](../11_codex_tasks/056_1_local_demo_manual_verification_record.md)
- 確認日時: `2026-06-15`
- 確認方法: demo seed後のRAG search / RAG answer draft source付き確認、API/Admin route確認。
- UI目視: Codex環境では未実施。人間がブラウザで最終確認する。
- 注意点: source付きRAGはdemo seed後のin-memory knowledge fixtureで確認する。API processを再起動した場合はdemo seedを再投入する。

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

## アマミホーム社内確認版

社内スタッフや関係者に画面の流れを確認してもらう場合は、以下のrunbookを使います。

- [Amami Home Internal Review Checklist](amami_home_internal_review_checklist.md)

この社内確認版runbookには、確認順、できること/まだできないこと、説明台本、フィードバック項目、本番化前に必要な項目をまとめています。

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
- `knowledge_page_count: 10` が返る。
- このseedは開発専用です。productionでは使いません。

## 管理画面確認

1. `http://localhost:3000` を開く。
2. トップの `Demo flow` を確認し、mock/in-memory/未接続の注意書きを説明する。
3. トップから `/login`、`/select-tenant`、`/permission-denied`、`/session-expired` へ移動し、Auth placeholderが未接続であることを確認する。
4. トップへ戻り、`/customers` を開く。
5. demo顧客が表示される。
6. `customer_demo_yamada_taro` などの顧客詳細を開く。
7. 顧客情報とタイムラインが表示される。
8. RoleVisibilityNoteで、owner / manager / staff の将来制御予定と現在はdev_header runtimeで未接続であることを確認する。
9. AI要約を実行する。
10. AI返信下書きを実行する。
11. RAG回答案で `オンライン相談`、`施工事例`、`資料請求`、`メンテナンス`、`SoToNo MA` などを試す。
12. 担当者返信フォームで返信する。
13. タイムラインにstaff messageが増えることを確認する。
14. `/alerts` を開く。
15. 未返信チェックを実行する。
16. alert一覧に表示されることを確認する。
17. open alert通知mockを実行する。
18. alert statusが `notified` になることを確認する。

## 期待結果

- 管理画面トップ: `顧客一覧` と `アラート` へのリンクが表示される。
- 管理画面トップ: `Demo flow` とAuth placeholderリンクが表示され、mock/in-memory/未接続の範囲が分かる。
- 顧客一覧: demo顧客2件が表示される。
- 顧客詳細: customer情報とtimelineが表示される。
- AI要約: MockAiProviderのsummaryが表示され、AI summary messageがtimelineに追加される。OpenAI APIは呼ばない。
- AI返信下書き: `draft_body`、`next_questions`、`risk_flags`、`recommended_response_mode`、`should_handoff` が表示される。下書きは保存せず、LINE送信しない。
- RAG回答案: demo seed後は `オンライン相談` などでsource付き回答案が表示される。該当sourceがない場合はfallbackが表示される。公式HP crawl、embedding、pgvectorは使わない。
- 担当者返信: 開発用Mock送信として成功表示され、timelineに `role = staff` のmessageが増える。
- 未返信チェック: 条件に合うcustomerに `unreplied_customer_message` alertが作成される。
- open alert通知mock: open alertがmock通知され、成功したalertのstatusが `notified` になる。
- Auth placeholder: login / tenant selection / permission denied / session expired は未接続状態として表示される。
- RoleVisibilityNote: 将来のrole別表示制御予定が見えるが、現在はbutton非表示/disabled制御は行わない。

## デモ当日の説明順

1. トップ画面で、このMVPがローカルデモ用であり、in-memory / mock中心であることを説明する。
2. 顧客一覧で、demo seedにより未返信顧客と返信済み顧客が用意されていることを説明する。
3. 顧客詳細で、顧客情報とLINE風の相談timelineを見せる。
4. AI要約を実行し、summary messageがtimelineへ保存されることを見せる。
5. AI返信下書きを実行し、担当者確認用の下書きだけが返ることを見せる。
6. RAG回答案で `オンライン相談` や `メンテナンス` を試し、source付き回答案を見せる。sourceなしqueryではfallbackになることも説明する。
7. 担当者返信フォームで短い返信を入力し、MockLineClient送信とstaff message保存を見せる。
8. アラート画面で未返信チェックを実行し、open alertが出ることを見せる。
9. open alert通知mockを実行し、statusが `notified` になることを見せる。
10. `/login` と `/select-tenant` を開き、本番認証・tenant選択はplaceholderであることを説明する。
11. RoleVisibilityNoteを見せ、将来はowner / manager / staffで操作表示を制御するが、今は未接続であることを説明する。
12. 最後に、Supabase実DB、Supabase Auth、LINE実送信、OpenAI実API、Web crawl、LIFFは未接続であることを明示する。

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

- demo seedを投入したか確認する。
- API processを再起動してin-memory knowledgeが消えていないか確認する。
- seed responseに `knowledge_page_count: 10` が返っているか確認する。
- queryを `オンライン相談`、`施工事例`、`資料請求`、`メンテナンス`、`SoToNo MA` で試す。
- 該当sourceがないqueryではfallbackが表示されます。
- `オンライン相談` では `knowledge_amamihome_online_consultation` がsourceとして返る想定です。

### alertが出ない場合

- `response_mode` が `human_required`、`human_active`、`emergency` のいずれかか確認する。
- `last_customer_message_at` が存在するか確認する。
- 返信済みcustomerは未返信alert対象外です。
- open/notified alertが既にあるcustomerは重複作成されません。
- demo seed直後は未返信っぽい `customer_demo_yamada_taro` で確認してください。

## 人間目視チェック

Codex確認ではHTTP routeと主要文言のみ確認しています。デモ前に人間がブラウザで以下を目視確認します。

- トップ画面のDemo flow、mock/in-memory/未接続説明が読みやすい。
- `/customers` でdemo顧客2件が見える。
- `/customers/customer_demo_yamada_taro` で顧客情報、timeline、AI/RAG/担当者返信actionが見える。
- AI要約、AI返信下書き、RAG回答案、担当者返信の結果表示が理解しやすい。
- `/alerts` で未返信チェック、alert一覧、notify-open mockの結果が分かる。
- `/login`、`/select-tenant`、`/permission-denied`、`/session-expired` が未接続placeholderとして誤解なく見える。
- RoleVisibilityNoteが将来のowner / manager / staff制御予定として分かる。

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

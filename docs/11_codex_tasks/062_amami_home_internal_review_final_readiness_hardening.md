# Loop 062: Amami Home internal review final readiness hardening

## Goal

アマミホーム社内確認版を、社内の人に見せる前の最終仕上げとして確認する。

今回の目的は、本番化ではなく、ローカルデモMVPを社内確認版として一周確認できること、mock / 未接続 / 一時保存 / 本番未接続の説明が揃っていること、feedback導線があること、Browser/API/test/buildの確認記録が残ること。

## Scope

- Adminトップ最終確認
- 顧客一覧最終確認
- 顧客詳細/timeline最終確認
- AI/RAG/担当者返信カード最終確認
- alerts最終確認
- Auth/tenant/role placeholder最終確認
- mock/未接続/一時保存/dev-only表記ゆれ確認
- 必要な小さいUI文言補正
- 社内確認runbook補強
- feedback triage/log導線確認
- Browser確認記録doc作成
- README更新
- docs/08_dev_loop.md更新
- dev log更新
- docs test更新
- lint / typecheck / test / test:integration / build

## Out of Scope

- 本物LINE送信
- 本物OpenAI API接続
- Supabase本番接続
- Supabase Auth/JWT実装
- selectedTenantId transport実装
- production dev_header rejection
- RLS SQL
- migration変更
- repository runtime切替
- scheduler実装
- 本物通知実装
- LIFF実装
- 画像相談実装
- 本番deploy
- `.env` 作成・変更
- 依存関係追加
- 大規模UIリニューアル

## Internal Review 100% Criteria

| Criteria | Result |
| --- | --- |
| API/Adminを起動できる | Confirmed |
| demo seedを投入できる | Confirmed |
| Adminトップが初心者向け入口として機能する | Confirmed |
| 顧客一覧へ進める | Confirmed |
| 顧客詳細へ進める | Confirmed |
| timelineを見られる | Confirmed |
| 相談内容をまとめる が確認できる | Confirmed |
| 返信文の下書きを作る が確認できる | Confirmed |
| ホームページ情報から回答案を作る がsource付きで確認できる | Confirmed |
| 担当者として返信する がデモ保存できる | Confirmed |
| alerts画面で未返信チェックとデモ通知を確認できる | Confirmed |
| Auth/tenant/role準備画面が未接続として説明できる | Confirmed |
| 本物LINE/OpenAI/Supabase未接続が誤解なく分かる | Confirmed |
| 社内確認runbookがある | Confirmed |
| feedback log/triage guideがある | Confirmed |
| lint/typecheck/test/integration/buildが通る | Verification sectionに記録 |

## Screens Checked

Browserで以下を確認した。

- `http://localhost:3000/`
- `http://localhost:3000/customers`
- `http://localhost:3000/customers/customer_demo_yamada_taro`
- `http://localhost:3000/alerts`
- `http://localhost:3000/login`
- `http://localhost:3000/select-tenant`
- `http://localhost:3000/permission-denied`
- `http://localhost:3000/session-expired`

## API Checked

All returned HTTP `200`.

- `GET /health`
- `POST /api/dev/seed-demo-data`
- `GET /api/admin/customers`
- `GET /api/admin/customers/customer_demo_yamada_taro`
- `GET /api/admin/customers/customer_demo_yamada_taro/timeline`
- `POST /api/admin/customers/customer_demo_yamada_taro/ai-summary`
- `POST /api/admin/customers/customer_demo_yamada_taro/ai-reply-draft`
- `POST /api/admin/rag/search`
- `POST /api/admin/rag/answer-draft`
- `POST /api/admin/customers/customer_demo_yamada_taro/reply`
- `GET /api/admin/alerts`
- `POST /api/admin/alerts/check-unreplied`
- `POST /api/admin/alerts/notify-open`

## RAG Source Verification

Confirmed after demo seed:

- `オンライン相談`
  - RAG search: `knowledge_amamihome_online_consultation`
  - RAG answer draft: `can_answer=true`, source count `1`
- `メンテナンス`
  - RAG search: warranty/maintenance and after-support sources

Still not connected:

- OpenAI API
- Web crawl
- embedding
- pgvector

## UI Wording Result

画面上の目立つ文言を以下に寄せた。

- `デモ用`
- `本物のLINEには送信されません`
- `OpenAI APIには接続していません`
- `ホームページ情報から回答案を作る`
- `一時保存`
- `本番ログインはまだ準備中`
- `開発確認用`

## UI Corrections

Small UI wording corrections only.

- 顧客一覧の `Local demo customer list`、`tenant`、`in-memory`、`status`、`response_mode` などを社内確認向け表示へ補正。
- 顧客一覧に本物LINE/OpenAI/Supabase未接続の注意を追加。
- 顧客詳細の情報項目、timeline列、message role/typeを日本語表示へ補正。
- AI/RAG/担当者返信の結果ラベルを日本語化し、画面上の `mock` を `デモ用AI` と表示。
- alerts画面の `MockStaffNotifier` 表示を `デモ用通知` へ補正。
- login / select tenant / permission denied / session expired placeholderを `準備中`、`利用先`、`開発確認用` へ補正。

## Runbook Updates

- [docs/15_runbooks/amami_home_internal_review_final_verification.md](../15_runbooks/amami_home_internal_review_final_verification.md) を追加。
- 社内確認runbookからfinal verification docへリンク。
- 社内確認当日の注意を補強。

## Feedback Flow

Confirmed:

- [docs/15_runbooks/internal_review_feedback_triage.md](../15_runbooks/internal_review_feedback_triage.md)
- [docs/15_runbooks/internal_review_feedback_log.md](../15_runbooks/internal_review_feedback_log.md)

P0/P1は次Loopで優先対応し、本番化要望は社内確認版の軽微修正と混ぜない。

## Test / Build

Expected final commands:

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

Results are recorded in the dev log and final report.

## Risks

- データは一時保存で、API process再起動後はdemo seed再投入が必要。
- 本物LINE送信、OpenAI API、Supabase本番DB、本番ログイン、本番通知、schedulerは未接続。
- LIFF、画像相談、本番deployは未実装。
- 社内確認で出たP0/P1 feedbackは、次Loopで小さく切って優先対応する必要がある。

## Next Loop Candidates

- Loop 061.2: internal review P0/P1 quick fixes
- Loop 063: staff reply safety confirmation plan
- Loop 064: role visibility friendly wording pass
- Loop 065: production readiness planning


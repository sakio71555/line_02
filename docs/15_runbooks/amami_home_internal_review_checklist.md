# Amami Home Internal Review Checklist

## Purpose

このrunbookは、アマミホーム社内確認版としてローカルデモMVPを確認するための手順書です。

社内確認版は、本番前に画面の流れ、業務イメージ、AI返信下書き、ホームページ情報からの回答案、未返信アラートを確認するためのものです。本番運用版ではありません。

## Target Reviewers

- アマミホームの社内スタッフ
- LINE相談対応を行う担当者
- 営業担当
- 管理画面やAI機能に詳しくない確認者
- 本番化前に業務導線を確認するプロジェクト関係者

## Before Review

- 作業フォルダーは `/Users/sakio/Desktop/PROJECT/amami-line-crm` です。
- 初期利用先IDは `tenant_amamihome` です。
- 現在は一時保存のため、API processを再起動するとdemo seedの再投入が必要です。
- 本物のLINEには送信されません。
- OpenAI APIにはまだ接続していません。
- Supabase本番DBには保存しません。
- 本番ログイン、JWT/session、権限判定はまだ準備中です。
- 本番通知、scheduler、LIFF、画像相談、本番deployはまだ未実装です。
- 最終確認記録は [amami_home_internal_review_final_verification.md](amami_home_internal_review_final_verification.md) を参照してください。

## Final Verification

社内確認会に出す前の最終確認記録:

- [Amami Home Internal Review Final Verification](amami_home_internal_review_final_verification.md)

社内確認当日の注意:

- 本物LINEには送信されない。
- OpenAI APIには接続していない。
- データは一時保存。
- API再起動後はdemo seedを再投入する。
- 実顧客情報を入力しない。
- feedbackは [internal_review_feedback_log.md](internal_review_feedback_log.md) へ記録する。
- P0/P1は次Loopで優先対応する。

## Startup

### Terminal 1: API

```bash
cd /Users/sakio/Desktop/PROJECT/amami-line-crm
TENANT_ID=tenant_amamihome TENANT_SLUG=amamihome npx pnpm@10.12.1 --filter @amami-line-crm/api dev
```

Expected:

- `API server listening on http://localhost:4000`

### Terminal 2: Admin

```bash
cd /Users/sakio/Desktop/PROJECT/amami-line-crm
API_BASE_URL=http://localhost:4000 TENANT_ID=tenant_amamihome npx pnpm@10.12.1 --filter @amami-line-crm/admin dev
```

Expected:

- Admin starts at `http://localhost:3000`

## Demo Seed

Run after API startup:

```bash
curl -X POST http://localhost:4000/api/dev/seed-demo-data \
  -H "x-tenant-id: tenant_amamihome"
```

Expected:

- `ok: true`
- `customer_demo_yamada_taro`
- `customer_demo_sato_hanako`
- `knowledge_page_count: 10`

This is development-only demo data. It is not production data.

## Review URLs

| Screen | URL | Purpose |
| --- | --- | --- |
| Admin top | `http://localhost:3000` | 社内確認版の入口と全体説明 |
| Customer list | `http://localhost:3000/customers` | demo顧客一覧 |
| Customer detail | `http://localhost:3000/customers/customer_demo_yamada_taro` | 未返信っぽい相談の詳細 |
| Replied customer detail | `http://localhost:3000/customers/customer_demo_sato_hanako` | 返信済みっぽい相談の詳細 |
| Alerts | `http://localhost:3000/alerts` | 対応が必要な相談と未返信チェック |
| Login placeholder | `http://localhost:3000/login` | ログイン準備中画面 |
| Tenant selection placeholder | `http://localhost:3000/select-tenant` | 利用先選択準備中画面 |
| Permission denied placeholder | `http://localhost:3000/permission-denied` | 権限不足準備中画面 |
| Session expired placeholder | `http://localhost:3000/session-expired` | ログイン期限切れ準備中画面 |

## Review Order

1. Adminトップ
2. 顧客一覧
3. 顧客詳細
4. timeline
5. 相談内容をまとめる
6. 返信文の下書きを作る
7. ホームページ情報から回答案を作る
8. 担当者として返信する
9. 対応が必要な相談 / alerts
10. 未返信チェック
11. デモ通知
12. ログイン / 利用先選択 / 権限表示の準備画面
13. できること / まだできないことの説明

## Screen Review Points

### 1. Admin Top

- まず `顧客一覧を見る` が分かるか。
- `未返信アラートを見る` が次の導線として分かるか。
- デモ用、一時保存、本番LINE未送信、本番AI未接続が伝わるか。

### 2. Customer List

- demo顧客が表示されるか。
- 未返信確認用の顧客と返信済み確認用の顧客があることが分かるか。
- `開く` から詳細へ迷わず進めるか。

### 3. Customer Detail And Timeline

- お客様情報が確認できるか。
- お客様と担当者のやり取りとしてtimelineを理解できるか。
- AI要約、返信下書き、ホームページ情報からの回答案、担当者返信の順番が分かるか。

### 4. AI Summary

- `相談内容をまとめる` を押して、相談内容の要約が役に立ちそうか確認する。
- 結果はtimelineへ保存されることを説明する。
- OpenAI APIにはまだ接続していないことを説明する。

### 5. AI Reply Draft

- `返信文の下書きを作る` を押して、返信案が実務で使えそうか確認する。
- 下書きは保存されず、LINEにも送信されないことを説明する。

### 6. Homepage Answer Draft

- `ホームページ情報から回答案を作る` で `オンライン相談`、`施工事例`、`メンテナンス`、`SoToNo MA` などを試す。
- 参考にした情報が見えるか確認する。
- 静的knowledge fixtureであり、Webクロール、embedding、pgvector、OpenAI APIは未接続であることを説明する。

### 7. Staff Reply

- `担当者として返信する` に短い文を入れて、timelineにスタッフ返信が増えることを確認する。
- 今はMockLineClientなので、本物のLINEには送信されないことを説明する。

### 7.1 Staff Reply Safety Before Real LINE Send

- 現在は本物LINEには送信されない。
- AI返信下書きは送信ではない。
- 担当者返信は現在デモ保存で、timelineにstaff messageとして残る。
- 本物LINE送信へ進む前に、送信前確認UIと安全設計が必要。
- 本番送信時は、送信先、送信本文、送信者、利用先、デモ送信/本番送信の違いを確認するステップを入れる予定。
- 安全設計は [staff_reply_safety_confirmation.md](../16_design/staff_reply_safety_confirmation.md) を参照する。

### 8. Alerts

- `対応が必要な相談を確認する` 画面として理解できるか。
- `未返信チェックを実行する` を押して、未返信アラートが出ることを確認する。
- `開いているアラートをデモ通知する` を押して、状態がデモ通知済みに変わることを確認する。
- MockStaffNotifierなので、本物のLINE、Slack、メールには通知されないことを説明する。

### 9. Auth Placeholder

- `/login`、`/select-tenant`、`/permission-denied`、`/session-expired` は準備中画面です。
- 本番ログイン、JWT/session、selectedTenantId transport、実際の権限判定はまだ未接続です。

## Short Demo Script

これは本番前の社内確認版です。
本物のLINEには送信されません。
AIやホームページ情報の回答案も、今はデモ用のmockで確認しています。
お客様相談が来たときに、担当者がどのように内容を確認し、返信下書きを作り、未返信を見落とさないかを確認する画面です。

### Screen-by-Screen Script

| Screen | Script |
| --- | --- |
| Admin top | まずここから顧客一覧と未返信アラートへ進みます。今はデモ用で、一時保存です。 |
| Customer list | demo seedで用意した2件の相談を確認します。未返信っぽい相談と返信済みっぽい相談があります。 |
| Customer detail | お客様情報と相談の流れを確認します。ここで担当者が次の対応を考えます。 |
| AI summary | 相談内容を短くまとめる補助です。結果はtimelineへ保存されます。 |
| AI reply draft | お客様へ送る前の返信文案です。まだ保存もLINE送信もしません。 |
| Homepage answer draft | アマミホームの参考情報から回答案を作ります。公式HPの最新クロールではなく、デモ用fixtureです。 |
| Staff reply | 担当者として返信した流れを確認します。今は本物LINE送信ではありません。 |
| Alerts | 未返信を見落とさないための確認画面です。手動チェックとデモ通知だけを確認します。 |
| Auth placeholders | 本番ログインや権限表示は準備中です。本番化Loopで接続します。 |

## What Works / What Does Not Work Yet

| Item | Internal review state | Notes |
| --- | --- | --- |
| 顧客一覧 | 確認可能 | demo seedデータ |
| 顧客詳細 | 確認可能 | timelineあり |
| timeline | 確認可能 | お客様、AI要約、担当者返信を表示 |
| AI要約 | 確認可能 | MockAiProvider |
| AI返信下書き | 確認可能 | LINE送信なし、保存なし |
| HP情報から回答案 | 確認可能 | 静的knowledge fixture |
| 担当者返信 | 確認可能 | MockLineClient、timeline保存 |
| 未返信アラート | 確認可能 | 手動チェック |
| デモ通知 | 確認可能 | MockStaffNotifier |
| ログイン準備画面 | 確認可能 | placeholder |
| 利用先選択準備画面 | 確認可能 | placeholder |
| 権限表示準備画面 | 確認可能 | placeholder |
| 本物LINE送信 | 未実装 | 本番前に必要 |
| 本物OpenAI API | 未実装 | 本番前に必要 |
| Supabase本番DB保存 | 未実装 / 一時保存 | API再起動でseed再投入 |
| 本番ログイン | 未実装 | Supabase Auth/JWT後続 |
| selectedTenantId transport | 未実装 | 複数tenant運用前に必要 |
| 本番通知 | 未実装 | LINE group / Slack / emailなどは後続 |
| scheduler | 未実装 | 未返信チェックの自動実行は後続 |
| LIFF | 未実装 | 相談フォームは後続 |
| 画像相談 | 未実装 | 後続 |
| 本番deploy | 未実装 | 社内確認後に計画 |

## Unified Wording For Review

| Technical wording | Internal review wording |
| --- | --- |
| mock | デモ用 |
| in-memory | 一時保存 |
| dev-only | 開発確認用 |
| unconnected | 本番未接続 |
| tenant | 利用先 |
| tenant_id | 利用先ID |
| RAG | ホームページ情報から回答案 |
| OpenAI not connected | OpenAI APIにはまだ接続していません |
| LINE mock | 本物のLINEには送信されません |
| Staff notification mock | 本物のLINE、Slack、メールには通知されません |

## Feedback Questions

- 顧客一覧から詳細まで迷わず進めたか。
- 相談内容は読みやすいか。
- AI要約は役に立ちそうか。
- 返信下書きの表現は実務で使えそうか。
- ホームページ情報からの回答案は分かりやすいか。
- 担当者返信の操作は怖くないか。
- 未返信アラートは必要そうか。
- 画面の文言は初心者にも分かるか。
- POPさは業務画面として違和感がないか。
- 本番化するなら最優先で必要な機能は何か。
- スマホやタブレットで確認したい画面はどれか。
- 実際の社内運用では誰が未返信アラートを見るべきか。

## Feedback Recording

社内確認で出た意見は、その場で実装せず、以下に記録してtriageします。

- Feedback log: [internal_review_feedback_log.md](internal_review_feedback_log.md)
- Triage guide: [internal_review_feedback_triage.md](internal_review_feedback_triage.md)

記録時の注意:

- 実顧客情報を書かない。
- LINE userIdを書かない。
- 電話番号、メールアドレス、住所などの個人情報を書かない。
- APIキー、`.env` 値、secretを書かない。
- 本番ログを貼らない。
- 記入例と実フィードバックを混ぜない。

優先順位:

- P0/P1は次Loop候補として優先する。
- P2は本番化前backlogとしてまとめる。
- P3/P4は将来改善やSaaS化候補として扱う。
- LINE本送信、OpenAI本接続、Supabase永続化、本番ログイン、本番通知、scheduler、LIFFは、社内確認版の軽微修正と混ぜず別Loopにする。

## Review Result Notes

Use this section during the review.

| Item | Result / Notes |
| --- | --- |
| Review date |  |
| Reviewers |  |
| Overall impression |  |
| Confusing screen |  |
| Useful feature |  |
| Wording to change |  |
| Priority before production |  |

## Bug / Issue Log

| Screen | Issue | Severity | Owner | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Production Readiness Items

- Supabase persistence runtime connection
- Supabase Auth / JWT / session
- selectedTenantId transport
- production `dev_header` rejection
- RLS SQL and local/staging verification
- LINE real send connection and send confirmation UI
- OpenAI API provider connection and prompt/risk rules
- Staff notification real destination design
- scheduler for unreplied checks
- LIFF consultation form
- Image consultation flow
- Production deploy plan
- Monitoring, logs, backup, rollback

## Troubleshooting

### Customer list is empty

- Run demo seed again.
- Confirm API is running.
- Confirm Admin is started with `TENANT_ID=tenant_amamihome`.
- Remember that demo data disappears when the API process restarts.

### AI actions fail

- Confirm the customer timeline is not empty.
- OpenAI API is not connected; this should use MockAiProvider.
- Try `customer_demo_yamada_taro` after demo seed.

### Homepage answer has no sources

- Run demo seed again.
- Try `オンライン相談`、`施工事例`、`資料請求`、`メンテナンス`、`SoToNo MA`.
- This uses static knowledge fixture, not live web crawl.

### Alert does not appear

- Use `customer_demo_yamada_taro` after demo seed.
- Run `未返信チェックを実行する`.
- Existing open/notified alerts are not duplicated.

## Final Reminder

社内確認版は、業務イメージと画面の分かりやすさを確認するための版です。
本物の外部API接続や本番認証はまだ行いません。

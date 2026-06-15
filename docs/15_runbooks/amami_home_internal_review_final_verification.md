# Amami Home Internal Review Final Verification

## Verification Time

- `2026-06-15 19:06:48 JST`

## Target

- Base commit before Loop 062: `1dd6d8d`
- Verification target: Loop 062 working tree before final commit
- Tenant: `tenant_amamihome`
- API: `http://localhost:4000`
- Admin: `http://localhost:3000`

## Purpose

この記録は、アマミホーム社内確認版として、主要画面、主要API、RAG source付き回答案、mock / 未接続表示、feedback導線を一周確認した結果を残すものです。

これは本番運用版の確認ではありません。

## API / Admin Startup

Started API:

```bash
TENANT_ID=tenant_amamihome TENANT_SLUG=amamihome npx pnpm@10.12.1 --filter @amami-line-crm/api dev
```

Confirmed:

- API server listening on `http://localhost:4000`

Started Admin:

```bash
API_BASE_URL=http://localhost:4000 TENANT_ID=tenant_amamihome npx pnpm@10.12.1 --filter @amami-line-crm/admin dev
```

Confirmed:

- Admin server ready at `http://localhost:3000`

## Demo Seed

Request:

```bash
curl -X POST http://localhost:4000/api/dev/seed-demo-data \
  -H "x-tenant-id: tenant_amamihome"
```

Result:

- HTTP `200`
- `ok: true`
- demo customers: `2`
- demo messages: `4`
- demo knowledge pages: `10`

## API Verification

All checks returned HTTP `200`.

| Check | Result |
| --- | --- |
| `GET /health` | `tenant_id=tenant_amamihome`, `external_connections=disabled` |
| `POST /api/dev/seed-demo-data` | 2 customers, 4 messages, 10 knowledge pages |
| `GET /api/admin/customers` | 2 demo customers |
| `GET /api/admin/customers/customer_demo_yamada_taro` | detail returned, `response_mode=human_required` |
| `GET /api/admin/customers/customer_demo_yamada_taro/timeline` | initial 2 customer text messages |
| `POST /api/admin/customers/customer_demo_yamada_taro/ai-summary` | mock provider, summary message saved |
| `POST /api/admin/customers/customer_demo_yamada_taro/ai-reply-draft` | mock provider, response-only draft, not saved |
| `POST /api/admin/rag/search` with `オンライン相談` | 1 source: `knowledge_amamihome_online_consultation` |
| `POST /api/admin/rag/search` with `メンテナンス` | 2 sources: warranty/maintenance and after-support |
| `POST /api/admin/rag/answer-draft` with `オンライン相談` | `can_answer=true`, mock provider, 1 source |
| `GET /api/admin/alerts` | initially 0 alerts |
| `POST /api/admin/alerts/check-unreplied` | checked 2 customers, created 1 alert |
| `GET /api/admin/alerts` after check | 1 `open` alert |
| `POST /api/admin/alerts/notify-open` | `notified=1`, `failed=0`, `skipped=0` |
| `GET /api/admin/alerts` after notify | 1 `notified` alert |
| `POST /api/admin/customers/customer_demo_yamada_taro/reply` | staff text saved, customer became `human_active` |
| timeline after actions | contains `customer:text`, `ai:summary`, `staff:text` |

## RAG Source Verification

Confirmed source付きRAG works after demo seed.

| Keyword | Search Result | Answer Draft Result |
| --- | --- | --- |
| `オンライン相談` | 1 source, `knowledge_amamihome_online_consultation` | `can_answer=true`, 1 source |
| `メンテナンス` | 2 sources, warranty/maintenance and after-support | Search source確認済み |

Not connected:

- OpenAI API
- Web crawl
- embedding
- pgvector

## Browser Verification

Browserで主要画面を開き、H1、主要導線、デモ/未接続表示を確認した。

| URL | Browser Result |
| --- | --- |
| `http://localhost:3000/` | H1 `LINE相談の対応状況を確認するデモ管理画面`、顧客一覧/アラート導線、本物LINE未送信表示を確認 |
| `http://localhost:3000/customers` | H1 `顧客一覧`、demo顧客2件、一時保存、本物LINE/OpenAI/Supabase未接続表示を確認 |
| `http://localhost:3000/customers/customer_demo_yamada_taro` | H1 `顧客詳細`、AI/RAG/担当者返信カード、本物LINE未送信、OpenAI未接続表示を確認 |
| `http://localhost:3000/alerts` | H1 `対応が必要な相談を確認する`、未返信チェック、デモ通知、本物通知なし表示を確認 |
| `http://localhost:3000/login` | H1 `管理画面ログイン`、ログイン準備中、未接続表示を確認 |
| `http://localhost:3000/select-tenant` | H1 `利用先を選ぶ`、利用先選択準備中、未接続表示を確認 |
| `http://localhost:3000/permission-denied` | H1 `権限がありません`、権限表示準備中を確認 |
| `http://localhost:3000/session-expired` | H1 `ログインの有効期限が切れました`、ログイン期限切れ準備中を確認 |

## UI Wording Final Check

社内確認画面では、目立つ表示を以下へ寄せた。

- `デモ用`
- `本物のLINEには送信されません`
- `OpenAI APIには接続していません`
- `ホームページ情報から回答案を作る`
- `一時保存`
- `APIを再起動するとdemo seedの再投入が必要`
- `本番ログインはまだ準備中`
- `開発確認用`

Small UI wording corrections in Loop 062:

- 顧客一覧の `Local demo customer list`、`tenant`、`in-memory`、`response_mode` などを社内確認向け表示へ補正。
- 顧客詳細の情報項目、timeline列、message role/typeを日本語表示へ補正。
- AI/RAG/担当者返信の結果ラベルを日本語化し、`mock` を画面上では `デモ用AI` と表示。
- alerts画面の `MockStaffNotifier` 表示を `デモ用通知` へ補正。
- login / select tenant / permission denied / session expired placeholderの表側文言を `準備中`、`利用先`、`開発確認用` へ補正。

## Runbook / Feedback Flow

Confirmed:

- [amami_home_internal_review_checklist.md](amami_home_internal_review_checklist.md) exists.
- [internal_review_feedback_triage.md](internal_review_feedback_triage.md) exists.
- [internal_review_feedback_log.md](internal_review_feedback_log.md) exists.
- P0/P1 feedbackは次Loopで優先対応する方針がある。
- 実顧客情報、LINE userId、APIキー、`.env`、本番ログを書かないルールがある。

## Automated Verification

Loop 062 final command verification:

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success, 10 packages
- `npx pnpm@10.12.1 test`: success, 40 files / 264 tests passed
- `npx pnpm@10.12.1 test:integration`: success, 40 files / 264 tests passed
- `npx pnpm@10.12.1 build`: success, 10 packages

Build note:

- Next.js reported the existing ESLint plugin warning for `apps/admin` and `apps/liff`, but build completed successfully.

Dev server shutdown:

- After Browser/API verification, local listeners on `3000` and `4000` were stopped and confirmed clear.

## Internal Review Judgement

判定:

アマミホーム社内確認版として確認可能。

理由:

- API/Adminを起動できる。
- demo seedを投入できる。
- 顧客一覧、顧客詳細、timeline、AI要約、AI返信下書き、ホームページ情報からの回答案、担当者返信、未返信アラート、デモ通知を一周確認できる。
- RAG answer draftはsource付きで確認できる。
- Browserで主要画面を確認できる。
- 本物LINE送信、OpenAI API、本番ログイン、永続化は未接続であることを画面とrunbookで説明できる。

ただし、本番運用版ではない。

## Review Day Notes

- 本物LINEには送信されない。
- OpenAI APIには接続していない。
- データは一時保存。
- API再起動後はdemo seedを再投入する。
- 実顧客情報を入力しない。
- feedbackは [internal_review_feedback_log.md](internal_review_feedback_log.md) へ記録する。
- P0/P1は次Loopで優先対応する。

## Remaining Risks

- データはin-memoryで、API process再起動後に消える。
- 本番ログイン、JWT/session、Supabase Authは未接続。
- Supabase本番DB、RLS、本番永続化は未接続。
- 本物LINE送信、本番通知、schedulerは未接続。
- OpenAI API、Web crawl、embedding、pgvectorは未接続。
- LIFF、画像相談、本番deployは未実装。

## Production Readiness Candidates

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

# Loop 056: Local Demo MVP Completion Hardening

## Goal

ローカルで第三者に見せるデモMVPとして、Admin UIの主要導線、mock/未接続表示、manual checklist/runbookを補強する。

今回の目的は本番化ではない。Supabase Auth、Supabase実DB runtime、LINE実送信、OpenAI実API、RLS、LIFF、Web crawlには進まない。

## Scope

- ローカルデモMVPの現状点検。
- Admin UIトップ、顧客一覧、顧客詳細、アクションUI、alerts、Auth placeholder、role visibility placeholderの導線確認。
- demo seed後に見せる流れのrunbook補強。
- mock / in-memory / 未接続範囲のUI文言補強。
- README、dev loop docs、local manual checklist、dev log更新。
- buildを含む既存検証コマンド実行。

## Out of Scope

- Supabase本番接続
- Supabase Auth `getUser` 本接続
- JWT本検証
- Admin API authenticated runtime full rollout
- `selectedTenantId` transport実装
- production `dev_header` rejection
- RLS SQL / migration変更
- repository runtime切替
- LINE API実送信
- OpenAI API実接続
- Web crawl
- embedding / pgvector
- LIFF実装
- 画像相談実装
- `.env` 作成・変更
- 本番deploy

## Local Demo MVP Completion Criteria

- APIとAdminをローカル起動できる。
- `POST /api/dev/seed-demo-data` でdemo顧客とmessagesをin-memoryへ投入できる。
- Adminトップで、何を見るべきかとmock/未接続範囲が分かる。
- `/customers` でdemo顧客を見られる。
- `/customers/:customerId` で顧客情報、timeline、AI/RAG/staff reply actionを確認できる。
- AI要約mock、AI返信下書きmock、RAG回答案mockを画面から試せる。
- 担当者返信mockを画面から試せる。
- `/alerts` で未返信チェック、alert一覧、open alert通知mockを確認できる。
- `/login`、`/select-tenant`、`/permission-denied`、`/session-expired` が未接続placeholderとして分かる。
- RoleVisibilityNoteで将来のowner / manager / staff制御予定と現runtime未接続が分かる。
- runbookだけでデモ当日の説明順を再現できる。

## Checked Admin UI Routes

| Route | Checked behavior | Notes |
| --- | --- | --- |
| `/` | 顧客一覧、アラート、Auth placeholder導線、Demo flowを表示。 | ローカルデモUIでありin-memory / mock中心と明示。 |
| `/customers` | demo顧客一覧と最新message/response_modeを表示。 | 空の場合はdemo seed再投入を案内。 |
| `/customers/:customerId` | 顧客詳細、timeline、管理アクションを表示。 | AI要約保存、AI下書き/RAG非保存を明示。 |
| `/alerts` | alert一覧、未返信チェック、open alert通知mockを表示。 | MockStaffNotifierと本番通知未接続を明示。 |
| `/login` | login placeholderを表示。 | Supabase Auth / session未接続。 |
| `/select-tenant` | tenant selection placeholderを表示。 | tenant保存、cookie/session/storage未接続。 |
| `/permission-denied` | 権限不足placeholderを表示。 | 実redirect/role判定未接続。 |
| `/session-expired` | session expired placeholderを表示。 | session検証/logout未接続。 |

## Checked API / Demo Seed Flow

Checked route surface:

- `POST /api/dev/seed-demo-data`
- `GET /api/admin/customers`
- `GET /api/admin/customers/:customerId`
- `GET /api/admin/customers/:customerId/timeline`
- `POST /api/admin/customers/:customerId/reply`
- `POST /api/admin/customers/:customerId/ai-summary`
- `POST /api/admin/customers/:customerId/ai-reply-draft`
- `GET /api/admin/alerts`
- `POST /api/admin/alerts/check-unreplied`
- `POST /api/admin/alerts/notify-open`
- `POST /api/admin/rag/search`
- `POST /api/admin/rag/answer-draft`

The existing runtime remains:

```text
Admin UI -> Admin API helper -> x-tenant-id -> in-memory repositories / mock providers
```

No production external API connection was added.

## UI Text Added / Hardened

- Admin top now says it is a local demo development UI, not a production-ready screen.
- Admin top includes a short `Demo flow`.
- Admin top explicitly states Supabase real DB, Supabase Auth, LINE real send, OpenAI real API, and Web crawl are not connected.
- Customers list empty state now points to demo seed.
- Customer detail explains which action results are saved to timeline and which are response-only.
- Staff reply action explains MockLineClient and staff message persistence.
- AI summary action explains MockAiProvider and AI summary message persistence.
- AI reply draft action explains no LINE send and no message save.
- RAG answer draft action explains static seed/fixture search and no crawl / embedding / pgvector.
- Alerts page/action explains MockStaffNotifier and no real LINE/Slack/scheduler/persistence.

## Runbook Updates

Updated:

- `docs/15_runbooks/local_manual_test_checklist.md`

Added / reinforced:

- Admin top Demo flow確認。
- Auth placeholder確認。
- RoleVisibilityNote確認。
- AI/RAG/staff reply/alert mock expectations.
- デモ当日の説明順。
- 本番未接続範囲の説明。

## External API / Mock / In-Memory Scope

Current local demo uses:

- in-memory repositories.
- `MockAiProvider`.
- `MockLineClient`.
- `MockStaffNotifier`.
- static Amami Home knowledge seed/fixture for RAG.
- dev-only `x-tenant-id`.

Still not connected:

- Supabase実DB runtime.
- Supabase Auth / JWT / session.
- production `dev_header` rejection.
- RLS SQL.
- real LINE Messaging API.
- real OpenAI API.
- real Web crawl / embedding / pgvector.
- LIFF.

## Test / Build

Required verification:

- `git status --short`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`
- `git status --short`

## Risks

- Demo data remains in-memory and disappears when the API process restarts.
- Auth placeholder, tenant selection, and role visibility are still not connected to real auth.
- Admin API still primarily uses dev-only `x-tenant-id` for local demo paths.
- Build can catch UI/type issues, but this Loop does not add browser E2E.
- Local demo is not production readiness.

## Next Loop Candidates

- Loop 057: selectedTenantId transport boundary
- Loop 058: authenticated runtime read-only route rollout
- Loop 059: authenticated runtime AI/RAG route rollout
- Loop 060: authenticated runtime side-effect route rollout
- Loop 061: Supabase Auth getUser verifier boundary
- Loop 062: Admin UI token forwarding plan

## Status

Implemented in Loop 056.

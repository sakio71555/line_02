# Loop 056.1: Local Demo Manual Verification Record

## Goal

Loop 056で整えたローカルデモMVPについて、runbookに沿って確認できた内容、未確認の内容、人間目視が必要な内容、注意点を記録する。

今回の目的は確認記録であり、新機能追加や本番接続ではない。

## Scope

- 起動scriptと実package scriptsの照合。
- API server / Admin serverのローカル起動確認。
- demo seedのcurl確認。
- 主要Admin API endpointのcurl確認。
- Admin UI routeのHTTP 200と主要文言確認。
- runbook / README / dev logの確認記録更新。

## Out of Scope

- Supabase Auth / JWT実装。
- `selectedTenantId` transport実装。
- Admin API authenticated runtime full rollout。
- production `dev_header` rejection。
- Supabase実DB runtime / RLS / migration変更。
- LINE API / OpenAI API実呼び出し。
- Web crawl / embedding / pgvector。
- LIFF / 画像相談。
- `.env` 作成・変更。
- 大規模UI変更。

## Verification Time

- `2026-06-15 13:39:23 JST`

## Git Commit Checked

- Before this Loop: `44ae05ea5818de019656e2ec2a807acf1d44a997`

## Script Check

| Target | Script | Result |
| --- | --- | --- |
| Root dev | `npx pnpm@10.12.1 dev` | Root script exists as `turbo run dev --parallel`. |
| API dev | `npx pnpm@10.12.1 --filter @amami-line-crm/api dev` | Confirmed. Runs `tsx src/index.ts`. |
| Admin dev | `npx pnpm@10.12.1 --filter @amami-line-crm/admin dev` | Confirmed. Runs `next dev -p 3000`. |
| Root build | `npx pnpm@10.12.1 build` | Root script exists as `turbo run build`. |
| Tests | `lint` / `typecheck` / `test` / `test:integration` | Root scripts exist. |

## API / Admin Startup Check

Started with:

```bash
TENANT_ID=tenant_amamihome TENANT_SLUG=amamihome npx pnpm@10.12.1 --filter @amami-line-crm/api dev
API_BASE_URL=http://localhost:4000 TENANT_ID=tenant_amamihome npx pnpm@10.12.1 --filter @amami-line-crm/admin dev
```

Confirmed:

- API: `API server listening on http://localhost:4000`
- Admin: `Next.js 15.5.19`, `Local: http://localhost:3000`, ready in dev server.
- Ports `4000` and `3000` were not already occupied before startup.
- Long-running processes were stopped with Ctrl-C after verification.

## Demo Seed Check

Endpoint:

```text
POST /api/dev/seed-demo-data
x-tenant-id: tenant_amamihome
```

Result:

- HTTP `200`
- `ok: true`
- `tenant_id: tenant_amamihome`
- customer ids:
  - `customer_demo_yamada_taro`
  - `customer_demo_sato_hanako`
- `message_count: 4`

## API Curl Check

| Endpoint | Result | Notes |
| --- | --- | --- |
| `GET /health` | `200` | `tenant_id=tenant_amamihome`, `external_connections=disabled`. |
| `POST /api/dev/seed-demo-data` | `200` | Demo customers/messages created in-memory. |
| `GET /api/admin/customers` | `200` | 2 demo customers returned, tenant-scoped. |
| `GET /api/admin/customers/customer_demo_yamada_taro` | `200` | Customer detail returned, `response_mode=human_required`. |
| `GET /api/admin/customers/customer_demo_yamada_taro/timeline` | `200` | Initially 2 customer text messages returned. |
| `POST /api/admin/customers/customer_demo_yamada_taro/ai-summary` | `200` | Mock summary returned and `ai:summary` message saved. |
| `POST /api/admin/customers/customer_demo_yamada_taro/ai-reply-draft` | `200` | Mock draft returned; response-only behavior confirmed by API shape. |
| `POST /api/admin/rag/search` | `200` | Returned `results: []` for `オンライン相談` in default runtime. |
| `POST /api/admin/rag/answer-draft` | `200` | Returned fallback answer with `can_answer=false`, `risk_flags=["no_source"]`. |
| `GET /api/admin/alerts` | `200` | Initially no alerts. |
| `POST /api/admin/alerts/check-unreplied` | `200` | Checked 2 customers, created 1 open alert. |
| `GET /api/admin/alerts?status=open` | `200` | 1 open high severity alert returned. |
| `POST /api/admin/alerts/notify-open` | `200` | `notified=1`, `failed=0`, `skipped=0`. |
| `GET /api/admin/alerts` | `200` | Alert status became `notified`. |
| `POST /api/admin/customers/customer_demo_yamada_taro/reply` | `200` | Mock staff reply saved as `staff:text`, customer became `human_active`. |
| `GET /api/admin/customers/customer_demo_yamada_taro/timeline` | `200` | Timeline contained `customer:text`, `ai:summary`, and `staff:text`. |

## Admin UI Route Check

HTTP route checks used `fetch` against the local Next.js dev server. This was not a browser visual inspection.

| Route | Result | Confirmed text |
| --- | --- | --- |
| `/` | `200` | `Demo flow`, `顧客一覧`, `アラート`, `Auth placeholder`, `Supabase実DB`. |
| `/customers` | `200` | `顧客一覧`, demo customer ids, `POST /api/dev/seed-demo-data`. |
| `/customers/customer_demo_yamada_taro` | `200` | `顧客詳細`, `タイムライン`, `AI要約`, `AI返信下書き`, `RAG回答案`, `担当者返信`. |
| `/alerts` | `200` | `アラート`, `MockStaffNotifier`, `alert一覧`, `notified`. |
| `/login` | `200` | `管理画面ログイン`, `Supabase Auth未接続`. |
| `/select-tenant` | `200` | `テナント選択`, `tenant_amamihome`, `選択機能は未接続`. |
| `/permission-denied` | `200` | `権限不足`, `placeholder`. |
| `/session-expired` | `200` | `セッション期限切れ`, `placeholder`. |

## AI / RAG / Staff Reply / Alerts Check

- AI summary: confirmed via curl as `MockAiProvider` result and `ai:summary` timeline message.
- AI reply draft: confirmed via curl as response-only draft with `draft_body`, `next_questions`, `risk_flags`, `recommended_response_mode`, `should_handoff`.
- RAG answer draft: endpoint works, but default runtime returned fallback with `source_count=0`.
- Staff reply: confirmed via curl as `MockLineClient` path, `staff:text` message saved, and customer updated to `human_active`.
- Alerts: confirmed unreplied check creates open alert and `notify-open` changes status to `notified` through mock notification.

## Auth / Tenant / Role Placeholder Check

- `/login`, `/select-tenant`, `/permission-denied`, `/session-expired` returned HTTP `200`.
- Admin top includes Auth placeholder links.
- Role visibility remains placeholder-only. No real role-based UI hide/disable enforcement is connected yet.
- Dev runtime still uses `x-tenant-id` / `tenant_amamihome` for local demo checks.

## Mock / In-Memory / Not Connected Scope

Confirmed or documented as still not connected:

- Supabase実DB runtimeなし。
- Supabase Auth / JWT / sessionなし。
- RLS SQLなし。
- LINE実送信なし。
- OpenAI実APIなし。
- Web crawl / embedding / pgvectorなし。
- LIFFなし。
- Runtime data is in-memory and disappears when the API process restarts.

## Human Visual Verification Required

UI目視: Codex環境では未実施。runbookに人間確認項目として残した。

Human visual checks should confirm:

- Layout readability on the local browser.
- Buttons/forms are easy to follow in the demo order.
- AI/RAG/staff reply/alerts result panels are understandable after clicking.
- Auth placeholder and role placeholder are visually clear as not-yet-connected features.

## Bugs / Notes

- RAG API routes are reachable and fallback response works, but default local runtime returned `results: []` and `source_count=0` for `オンライン相談`.
- If the demo requires source付きRAG回答案, a follow-up Loop should seed or inject Amami Home knowledge into the default local API runtime before the demo.
- Browser visual inspection was not performed in this Loop.

## Local Demo MVP Judgement

Command/curl/build/test上はローカルデモ可能。

ただし、RAG source付き回答案はdefault runtimeで未確認であり、ブラウザ目視は人間確認が必要。デモでは、現状のRAGはfallback確認まで可能として説明するか、次Loopでdefault local knowledge seedを整える。

## Verification Commands

Required after docs update:

```bash
git status --short
git diff --check
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
git status --short
```

## Next Loop Candidates

- Loop 056.2: local demo RAG knowledge seed verification patch
- Loop 057: selectedTenantId transport boundary

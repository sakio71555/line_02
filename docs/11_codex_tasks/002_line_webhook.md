# Loop 002: LINE Webhook Foundation

## Status

Implemented in Loop 002.

## Goal

LINE Webhook受信の土台として、署名検証、tenant特定、Webhook fixtureを実装する。

## Scope

- raw bodyを使ったLINE署名検証
- Webhook pathまたはchannel設定からのtenant特定
- follow/message event fixture
- Webhook handlerの最小正常系と異常系

## Out of scope

- LINE APIへの返信
- message保存
- customer upsert
- 画像取得
- LIFF登録

## Acceptance Criteria

- 署名不正のWebhookは処理されない。
- tenant未特定のWebhookは保存・AI処理されない。
- テストはLINE本番APIを呼ばない。
- fixtureに個人情報を含めない。
- `POST /api/line/webhook/:webhookSecret` が存在する。
- valid signature + known webhookSecretで200を返す。
- invalid signatureで401を返す。
- unknown webhookSecretで404を返す。
- malformed bodyで400を返す。

## Implementation Notes

- `apps/api/src/index.ts` にWebhook routeを追加。
- `packages/line/src/index.ts` の署名検証関数を再利用し、raw bodyを検証してからJSON parseする。
- 初期tenantは `LINE_WEBHOOK_SECRET_PATH=wh_dev_amamihome` から `tenant_amamihome` / `amamihome` へ解決する。
- customer保存、message保存、LINE返信、Supabase接続は未実装のまま維持。

## Files likely affected

- `apps/api/**`
- `packages/line/**`
- `packages/config/**`
- `tests/fixtures/**`
- `tests/integration/**`
- `docs/04_line_flows.md`
- `docs/07_security.md`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 002: LINE webhook foundationを実装してください。署名検証とtenant特定だけに集中し、message保存やLINE返信は実装しないでください。テストではfixtureとmockのみを使ってください。

# Loop 009: AI Summary

## Goal

会話要約用のAiProvider境界とMockAiProvider実装を拡張する。

## Status

API/domain portion implemented in Loop 009. OpenAI API calls, reply draft generation, RAG, UI, and Supabase persistence remain out of scope for this loop.

## Scope

- summary input/output型
- MockAiProviderの会話要約
- tenant scopedな会話取得境界
- AI要約結果の保存先設計
- `POST /api/admin/customers/:customerId/ai-summary`
- AI summary message保存

## Out of scope

- OpenAI API実呼び出し
- 返信下書き
- RAG検索
- 自動返信

## Acceptance Criteria

- AI入力はtenant確定済みのconversationだけを受け取る。
- 他tenantのmessageが要約に混ざらないテストがある。
- テストではOpenAI APIを直接叩かない。
- docsのAIルールと実装が一致している。
- `x-tenant-id` なしは401、unknown tenantは403を返す。
- 存在しないcustomer、別tenant customerは404を返す。
- 空timelineは409 `cannot_summarize_empty_timeline` を返す。
- MockAiProvider成功時に `role = ai` / `message_type = summary` のmessageを保存する。
- AI provider失敗時はsummary messageを保存しない。
- timeline APIでAI summary messageが見える。

## Implementation Notes

- Loop 009ではAPI/domain土台だけ実装済み。
- `AiProvider` / `MockAiProvider` は `summary`、`next_actions`、`risk_flags`、`recommended_response_mode` を返す。
- `POST /api/admin/customers/:customerId/ai-summary` は開発用に `x-tenant-id` headerでtenantを判定する。
- 要約対象は `tenant_id + customer_id` で取得したtimeline messageだけに限定する。
- 要約結果は担当者支援用messageとして保存し、LINE送信や自動返信は行わない。

## Files likely affected

- `packages/ai/**`
- `packages/domain/**`
- `apps/api/**`
- `tests/integration/**`
- `docs/05_ai_rules.md`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 009: AI summaryを実装してください。MockAiProviderによる会話要約だけに集中し、OpenAI API実呼び出しや返信下書きは実装しないでください。

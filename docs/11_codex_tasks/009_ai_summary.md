# Loop 009: AI Summary

## Goal

会話要約用のAiProvider境界とMockAiProvider実装を拡張する。

## Scope

- summary input/output型
- MockAiProviderの会話要約
- tenant scopedな会話取得境界
- AI要約結果の保存先設計

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

## Files likely affected

- `packages/ai/**`
- `packages/domain/**`
- `apps/api/**`
- `tests/integration/**`
- `docs/05_ai_rules.md`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 009: AI summaryを実装してください。MockAiProviderによる会話要約だけに集中し、OpenAI API実呼び出しや返信下書きは実装しないでください。

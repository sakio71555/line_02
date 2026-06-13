# Loop 010: AI Reply Draft

## Goal

担当者確認前提のAI返信下書きと次アクション提案を実装する。

## Scope

- reply draft input/output型
- MockAiProviderの返信下書き
- escalation理由
- response_modeに応じた自動送信禁止ルール

## Out of scope

- OpenAI API実呼び出し
- LINEへの自動送信
- RAG
- 管理画面の本格編集UI

## Acceptance Criteria

- `human_required`、`human_active`、`emergency` では自動送信しない。
- draftは担当者確認用として保存または返却される。
- テストではOpenAI APIを直接叩かない。
- 断定禁止トピックではescalationが必要になる。

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

Loop 010: AI reply draftを実装してください。担当者確認前提の返信下書きと次アクション提案だけを対象にし、OpenAI API実呼び出しやLINE自動送信は行わないでください。

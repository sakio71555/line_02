# Loop 010: AI Reply Draft

## Goal

担当者確認前提のAI返信下書きと次アクション提案を実装する。

## Status

API/domain portion implemented in Loop 010. OpenAI API calls, LINE sending, draft persistence, RAG, UI, and Supabase persistence remain out of scope for this loop.

## Scope

- reply draft input/output型
- MockAiProviderの返信下書き
- escalation理由
- response_modeに応じた自動送信禁止ルール
- `POST /api/admin/customers/:customerId/ai-reply-draft`
- APIレスポンスでの返信下書き返却

## Out of scope

- OpenAI API実呼び出し
- LINEへの自動送信
- messagesへのdraft保存
- reply_draft用DB schema追加
- RAG
- 管理画面の本格編集UI

## Acceptance Criteria

- `human_required`、`human_active`、`emergency` では自動送信しない。
- draftは担当者確認用としてAPIレスポンスで返却される。
- draftはmessagesへ保存しない。
- テストではOpenAI APIを直接叩かない。
- 断定禁止トピックではescalationが必要になる。
- `x-tenant-id` なしは401、unknown tenantは403を返す。
- 存在しないcustomer、別tenant customerは404を返す。
- 空timelineは409 `cannot_draft_reply_empty_timeline` を返す。
- `draft_body`、`next_questions`、`risk_flags`、`recommended_response_mode`、`should_handoff` を返す。
- AI provider失敗時は保存・送信せずエラーを返す。
- 他tenantのmessageがdraft入力に混ざらない。

## Implementation Notes

- Loop 010ではAPI/domain土台だけ実装済み。
- `AiProvider.draftReply` と `MockAiProvider` は返信下書き、次の確認事項、注意点、推奨response_mode、handoff要否を返す。
- `POST /api/admin/customers/:customerId/ai-reply-draft` は開発用に `x-tenant-id` headerでtenantを判定する。
- 下書き対象は `tenant_id + customer_id` で取得したtimeline messageだけに限定する。
- 下書きは保存せず、LINE送信も行わない。

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

Loop 010: AI reply draftを実装してください。担当者確認前提の返信下書きと次アクション提案だけを対象にし、OpenAI API実呼び出しやLINE自動送信は行わないでください。

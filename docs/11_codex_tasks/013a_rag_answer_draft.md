# Loop 013: RAG Answer Draft

## Goal

tenant scopedなknowledge検索結果を根拠に、担当者確認前提のRAG回答案を返すAPI土台を作る。

## Status

API/domain portion implemented in Loop 013. OpenAI API calls, embeddings, vector search, web crawling, LINE sending, draft persistence, UI, and Supabase persistence remain out of scope for this loop.

## Scope

- `AiProvider.draftRagAnswer`
- `MockAiProvider` のRAG回答案
- `POST /api/admin/rag/answer-draft`
- `tenant_id` と `allowed_for_ai = true` で絞ったsourceだけを回答材料にする
- sourceなしfallback
- APIレスポンスでの回答案返却

## Out of scope

- OpenAI API実呼び出し
- embedding生成
- vector search
- 公式HPクロール
- Webスクレイピング
- AI自動返信
- LINE送信
- messagesへの回答案保存
- Supabase接続
- Next.js管理画面UI

## Acceptance Criteria

- `x-tenant-id` なしは401、unknown tenantは403を返す。
- invalid query/limitは400を返す。
- known tenantかつ有効queryならRAG answer draftを返す。
- sourceがある場合だけMockAiProviderを呼ぶ。
- sourceがない場合は `can_answer = false` のfallbackを返し、AI providerを呼ばない。
- sourcesに `id`、`title`、`url`、`category`、`source_type`、`excerpt`、`score` を含める。
- 他tenantのknowledgeを回答材料にしない。
- `allowed_for_ai = false` のknowledgeをsourceに含めない。
- 回答案はmessagesへ保存しない。
- LINE送信しない。

## Implementation Notes

- Loop 013ではAPI/domain土台だけ実装済み。
- `AiRagAnswerDraftInput` / `AiRagAnswerDraft` / `AiRagAnswerSource` を追加。
- `POST /api/admin/rag/answer-draft` は既存のRAG検索serviceを使う。
- provider失敗時は `rag_answer_draft_failed` で502を返す。
- OpenAI API、Webアクセス、Supabase接続は未実装。

## Files likely affected

- `packages/ai/**`
- `apps/api/**`
- `packages/rag/**`
- `tests/integration/**`
- `docs/05_ai_rules.md`
- `docs/06_multitenancy.md`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 013: RAG answer draftを実装してください。tenant scopedなknowledge sourceを根拠にMockAiProviderで回答案を返すだけに集中し、OpenAI API実呼び出し、Webアクセス、LINE送信、保存は行わないでください。

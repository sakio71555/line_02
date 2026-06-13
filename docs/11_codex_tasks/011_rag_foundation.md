# Loop 011: RAG Foundation

## Goal

tenant別knowledge_pages検索の基礎を作る。

## Scope

- `knowledge_pages` repository interface
- tenant_idで先に絞る検索
- `allowed_for_ai` filter
- keyword検索またはin-memory検索のテスト

## Out of scope

- embedding生成
- OpenAI embeddings API
- Webクロール
- 公式HP取り込み
- AI回答生成

## Acceptance Criteria

- 検索は必ず `tenant_id` で先に絞る。
- 他tenantのknowledge_pagesが返らないテストがある。
- `allowed_for_ai = false` はAI検索に出ない。
- 外部APIを呼ばない。

## Files likely affected

- `packages/rag/**`
- `packages/db/**`
- `tests/integration/**`
- `docs/05_ai_rules.md`
- `docs/06_multitenancy.md`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 011: RAG foundationを実装してください。tenant_idで先に絞るknowledge_pages検索だけに集中し、embedding生成やWebクロールは実装しないでください。

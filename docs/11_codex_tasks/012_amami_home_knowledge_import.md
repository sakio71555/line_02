# Loop 012: Amami Home Knowledge Import

## Goal

アマミホーム公式HP取り込みの設計と、施工事例データの取り込み準備を行う。

## Status

Static seed / fixture portion implemented in Loop 012. Real crawling, web scraping, embeddings, AI answer generation, UI, and Supabase persistence remain out of scope for this loop.

## Scope

- アマミホーム初期knowledge fixture
- `tenant_amamihome` 用knowledge SQL seed
- `InMemoryKnowledgePageRepository` へ投入できるhelper
- RAG検索で静的knowledgeがヒットするテスト
- 後続クロール・手動確認のためのdocs更新

## Out of scope

- 実クロール
- Webスクレイピング実装
- sitemap取得
- embedding生成
- AI回答生成
- 最新情報の断定
- construction_cases本実装

## Acceptance Criteria

- `amamihome.net` を後で検証・更新する前提がdocsに明記されている。
- tenant_idが取り込みデータに必ず入る設計になっている。
- 初期knowledge fixtureの全itemに `tenant_id = tenant_amamihome` と `allowed_for_ai = true` が入る。
- `tenant_amamihome_knowledge.sql` が存在し、再実行しやすいupsert形になっている。
- RAG検索でオンライン相談、施工事例、資料請求、メンテナンス、SoToNo MAが検索できる。
- 他tenant検索ではアマミホームknowledgeが返らない。

## Implementation Notes

- Loop 012では外部Webアクセスなしで静的fixtureだけを追加済み。
- `createAmamiHomeKnowledgePages` と `seedAmamiHomeKnowledge` を追加。
- SQL seedは `packages/db/seed/tenant_amamihome_knowledge.sql` に配置。
- 価格、在庫、イベント日程、補助金可否、保証判断は断定しない初期文面にしている。
- 公式HPクロール、Webスクレイピング、embedding、AI回答生成は未実装。

## Files likely affected

- `docs/09_amamihome_research.md`
- `docs/03_database.md`
- `docs/05_ai_rules.md`
- `packages/rag/**`
- `packages/db/seed/**`
- `tests/integration/**`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 012: Amami Home knowledge importを設計してください。実クロールやスクレイピングはせず、公式HP取り込みのデータ形式、tenant_id付与、施工事例変換方針を整備してください。

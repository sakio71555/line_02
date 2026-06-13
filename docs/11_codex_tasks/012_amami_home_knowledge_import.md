# Loop 012: Amami Home Knowledge Import

## Goal

アマミホーム公式HP取り込みの設計と、施工事例データの取り込み準備を行う。

## Scope

- 公式HPクロール設計
- 取り込み対象URL管理方針
- `knowledge_pages` と `construction_cases` への変換方針
- 取り込みfixtureの形式

## Out of scope

- 実クロール
- Webスクレイピング実装
- embedding生成
- AI回答生成
- 最新情報の断定

## Acceptance Criteria

- `amamihome.net` を後で検証・更新する前提がdocsに明記されている。
- 施工事例とFAQの取り込み先が分かれている。
- tenant_idが取り込みデータに必ず入る設計になっている。

## Files likely affected

- `docs/09_amamihome_research.md`
- `docs/03_database.md`
- `docs/05_ai_rules.md`
- `packages/rag/**`
- `tests/fixtures/**`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 012: Amami Home knowledge importを設計してください。実クロールやスクレイピングはせず、公式HP取り込みのデータ形式、tenant_id付与、施工事例変換方針を整備してください。

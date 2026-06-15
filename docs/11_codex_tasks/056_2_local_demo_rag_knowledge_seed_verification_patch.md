# Loop 056.2: Local Demo RAG Knowledge Seed Verification Patch

## Goal

Loop 056.1で残った「default local runtimeではRAG sourceが0件になり、source付きRAG回答案を確認できない」問題を、ローカルデモMVPの範囲で解消する。

今回の目的は、本物RAGではなく、demo seed後に静的Amami Home knowledge fixtureを使ってsource付きRAG search / answer draftを確認できる状態にすること。

## Scope

- RAG source 0件の原因確認。
- `POST /api/dev/seed-demo-data` とin-memory `KnowledgePageRepository` の接続。
- 既存のAmami Home静的knowledge fixtureをdev seedに最小接続。
- demo seed後のRAG search / RAG answer draft test追加。
- runbook、README、dev log更新。
- lint / typecheck / test / test:integration / build実行。

## Out of Scope

- Web crawl。
- 外部Web取得。
- embedding / pgvector。
- OpenAI API実接続。
- Supabase本番接続。
- Supabase実DB runtime切替。
- migration変更。
- RLS SQL。
- LINE API送信。
- `.env` 作成・変更。
- 大規模RAG再設計。

## Root Cause

Loop 012で `createAmamiHomeKnowledgePages` と `seedAmamiHomeKnowledge` は追加済みだった。

ただし、APIのdefault local runtimeでは以下の状態だった。

- `defaultKnowledgePageRepository = new InMemoryKnowledgePageRepository([])` で空のrepositoryを使う。
- `POST /api/dev/seed-demo-data` はcustomer/messageだけをseedしていた。
- そのため、demo seed後もRAG endpointが参照するin-memory knowledge repositoryは空のままだった。

結果として、`POST /api/admin/rag/search` と `POST /api/admin/rag/answer-draft` は200を返すが、`results: []` / sourceなしfallbackになっていた。

## Fix

`POST /api/dev/seed-demo-data` で、初期tenant `tenant_amamihome` の場合に限り、既存のAmami Home静的knowledge fixtureをin-memory knowledge repositoryへupsertするようにした。

実装方針:

- 既存fixture `createAmamiHomeKnowledgePages()` を再利用。
- `tenant_id = tenant_amamihome` のfixtureのみを投入。
- `allowed_for_ai = true` の既存fixtureを使う。
- `KnowledgePageRepository` が `upsertMany` を持つin-memory seedable repositoryの場合だけ投入。
- Supabase repositoryや外部DBには接続しない。
- seed responseに `knowledge_page_count` を追加し、local demoでknowledge seed件数を確認できるようにした。

## Demo Seed / Knowledge Fixture

seedされるknowledgeはLoop 012で追加済みの静的fixture。

代表keyword:

- `オンライン相談`
- `施工事例`
- `資料請求`
- `メンテナンス`
- `SoToNo MA`

これは公式HPをcrawlした最新情報ではなく、後続Loopで公式HP確認・更新する前提のローカルデモ用初期knowledge。

## Verified Keyword

curl / testでは `オンライン相談` を確認した。

## RAG Search Result

demo seed後:

```text
POST /api/admin/rag/search
query: オンライン相談
```

Expected:

- HTTP `200`
- `tenant_id = tenant_amamihome`
- `results` に `knowledge_amamihome_online_consultation` を含む

Local curl confirmation:

```text
seed: 200, knowledge_page_count=10
rag_search_online: 200, result_count=1, source_ids=["knowledge_amamihome_online_consultation"]
rag_search_maintenance: 200, result_count=2, source_ids=["knowledge_amamihome_warranty_maintenance","knowledge_amamihome_after_support"]
```

## RAG Answer Draft Result

demo seed後:

```text
POST /api/admin/rag/answer-draft
query: オンライン相談
```

Expected:

- HTTP `200`
- `can_answer = true`
- `provider = mock`
- `sources` に `knowledge_amamihome_online_consultation` を含む
- sourceなしfallbackではない

Local curl confirmation:

```text
rag_answer_online: 200, can_answer=true, provider=mock, source_count=1, source_ids=["knowledge_amamihome_online_consultation"]
```

## Test

Updated:

- `tests/integration/dev-demo-seed.test.ts`

Added assertions:

- production runtimeではknowledgeもseedされない。
- demo seed responseに `knowledge_page_count = 10` が返る。
- demo seed後、RAG searchで `knowledge_amamihome_online_consultation` が返る。
- demo seed後、RAG answer draftで `can_answer = true` とsource付きmock回答案が返る。

Existing tests still cover:

- `allowed_for_ai = false` は検索/answer sourceに含めない。
- 他tenant knowledgeを混ぜない。
- sourceなしfallbackは維持する。

## Runbook Update

`docs/15_runbooks/local_manual_test_checklist.md` に以下を反映した。

- Latest verification recordをLoop 056.2へ更新。
- demo seedで `knowledge_page_count: 10` が返る期待値を追記。
- RAG source付き確認用keywordを追記。
- `オンライン相談` でsource付きanswer draftが確認できる期待値を追記。
- source 0件時の対処を「demo seed再投入 / API process再起動確認 / keyword確認」へ更新。

## Mock / Not Connected Scope

今回も未接続:

- Web crawl。
- embedding / pgvector。
- OpenAI API。
- Supabase実DB runtime。
- LINE送信。
- LIFF。

RAG answer draftは `MockAiProvider` による担当者確認用回答案であり、LINE送信やmessage保存はしない。

## Risks

- knowledgeはin-memoryで、API process再起動後はdemo seedを再投入する必要がある。
- 静的fixtureは公式HP最新情報ではないため、価格、在庫、補助金、保証判断などは断定しない。
- ブラウザ目視は引き続き人間確認が必要。

## Next Loop Candidates

- Loop 057: selectedTenantId transport boundary
- Loop 058: authenticated runtime read-only route rollout

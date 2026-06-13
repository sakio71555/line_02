# AI Rules

## 基本方針

AIはOpenAI APIを使います。コードはResponses API前提の抽象化にし、直接SDK呼び出しを業務ロジックへ散らしません。

- `AiProvider` interfaceを使う。
- テストでは `MockAiProvider` を使う。
- 本番実装では `OpenAiProvider` を使う。
- APIキーは `OPENAI_API_KEY` で管理する。
- モデル名は `OPENAI_MODEL` で管理し、コードに固定しない。
- Phase 0ではOpenAI APIを実呼び出ししない。

## tenant_idで必ず絞る

AI検索では必ずバックエンド側で `tenant_id` を確定し、DB検索を先に絞ります。

NG:

```text
全社のknowledge_pagesをAIへ渡し、どの会社の情報かAIに選ばせる
```

OK:

```text
tenant_id = tenant_amamihome でknowledge_pagesを検索し、その結果だけAIへ渡す
```

AIに会社を選ばせてはいけません。

## 根拠にしてよい情報

将来的なFAQ/RAG回答では、以下だけを根拠にします。

- 公式HP
- 施工事例
- 登録済みFAQ
- 管理者が承認したナレッジ

SNS、口コミ、他社サイト、未確認のWeb検索結果は根拠にしません。

## 断定してはいけないこと

AIは以下を断定しません。

- 見積金額
- 土地価格
- 建売在庫
- 補助金の可否
- 契約条件
- 保証判断
- 法的・金融的な判断
- 現地確認が必要な施工可否

必要なら「担当者が確認します」と案内し、`human_required` へ誘導します。

## 初期AI機能

最初はAI自動返信ではなく、以下を中心にします。

- 会話要約
- 返信下書き
- 次アクション提案
- リスク検知
- 担当者確認が必要な話題の分類

AIが生成した返信下書きは、そのまま顧客へ送る前に担当者が確認します。

Loop 009では、管理者が `POST /api/admin/customers/:customerId/ai-summary` を実行したときだけ、tenant scopedなtimelineから会話要約を生成します。Phase 0は `MockAiProvider` のみを使い、OpenAI APIは呼びません。生成結果は担当者支援用の `role = ai` / `message_type = summary` messageとして保存し、顧客へ自動送信しません。

会話要約の出力は最低限以下を含みます。

- `summary`
- `next_actions`
- `risk_flags`
- `recommended_response_mode`

Loop 010では、管理者が `POST /api/admin/customers/:customerId/ai-reply-draft` を実行したときだけ、tenant scopedなtimelineから担当者確認用の返信下書きを生成します。Phase 0は `MockAiProvider` のみを使い、OpenAI APIは呼びません。返信下書きはAPIレスポンスで返すだけで、messagesへ保存せず、LINE送信もしません。

返信下書きの出力は最低限以下を含みます。

- `draft_body`
- `next_questions`
- `risk_flags`
- `recommended_response_mode`
- `should_handoff`

Loop 011では、管理者が `POST /api/admin/rag/search` を実行したときだけ、tenant scopedな `knowledge_pages` を簡易キーワード検索します。Phase 0はembedding生成、OpenAI API、公式HPクロール、AI回答生成を行わず、検索結果を返すだけにします。

## 人間対応中の挙動

`response_mode` が以下の場合、AIは自動返信しません。

- `human_required`
- `human_active`
- `emergency`

この状態でも、担当者向けの要約や下書き生成は許可できます。ただし、LINEへの送信は担当者操作が必要です。

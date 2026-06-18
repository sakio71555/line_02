# OpenAI Real API Gate

## Purpose

OpenAI real APIへ進む前に、AIが勝手に外部課金APIへ接続したり、LINEへ自動送信したりしないことを確認するためのgateです。

このrunbookはgateの記録です。OpenAI API実呼び出し、`OPENAI_API_KEY` 実値利用、production接続は行いません。

## Current State

- default AI providerは `MockAiProvider`。
- `AI_PROVIDER` 未指定または `mock` の場合はmock。
- `OpenAiProvider` はfake transport注入でResponses API shapeを検証できる境界。
- real HTTP transportは未接続。
- API routeの既定実行経路はMockAiProviderのまま。
- AI outputは担当者支援用のdraft/support contentであり、LINEへ自動送信しない。

## Required Gates

OpenAI real API pathへ進むには最低限すべてが必要です。

- `AI_PROVIDER=openai`。
- `OPENAI_API_KEY` がserver-side envで設定されている。
- `OPENAI_MODEL` がserver-side envで設定されている。
- tenant scopedな `tenant_ai_settings` が `provider = openai` を許可している。
- 対象機能のtenant AI settingがenabled。
  - summary: `summary_enabled = true`
  - reply draft: `reply_draft_enabled = true`
  - RAG answer draft: `rag_enabled = true`
- RAG answer draftではtenant scopedかつ `allowed_for_ai = true` のsourceが1件以上ある。
- `auto_reply_enabled = false`。
- API requestがLINE自動送信を要求していない。

## Draft-Only Rule

OpenAI resultは担当者支援に限定します。

- AI summaryはtimelineへ `ai / summary` messageとして保存できるが、お客様へ送らない。
- AI reply draftはAPI responseで返すだけで、messagesへ保存しない。
- RAG answer draftはAPI responseで返すだけで、LINEへ送らない。
- AIからLINE送信API、staff reply API、LINE real push pathへ直接進まない。

## Tenant Isolation

- AI inputは検証済み `AdminTenantContext.tenantId` のconversation / knowledgeだけにする。
- `selectedTenantId` はpermissionではなくselectorであり、API側active membershipで再検証済みのtenantだけを使う。
- RAG sourceは `tenant_id + allowed_for_ai=true` で先に絞る。
- 他tenantのconversation、messages、knowledgeをpromptへ混ぜない。

## Secret and Prompt Handling

禁止:

- `OPENAI_API_KEY` 実値をdocs、dev log、error、test snapshotへ出す。
- prompt全文をsnapshotへ残す。
- raw OpenAI errorをAPI responseへ出す。
- OpenAI request/responseを本番ログへそのまま出す。

許可:

- env名だけをdocsへ書く。
- fake transport testでrequest shapeを確認する。
- sanitized error codeだけを返す。

## Provider Boundary

実装場所:

```text
packages/ai/src/index.ts
```

追加境界:

- `evaluateOpenAiRealApiGate`
- `resolveAiProviderMode`
- `OpenAiProvider`
- `OpenAiResponsesTransport`
- `OpenAiProviderError`

`OpenAiProvider` はtransport injection前提です。Loop 103ではfake transportだけで検証し、OpenAI APIへfetchしません。

## No-Go Conditions

- `AI_PROVIDER=openai` がない。
- `OPENAI_API_KEY` がない。
- `OPENAI_MODEL` がない。
- `tenant_ai_settings` がない、またはOpenAIを許可していない。
- tenant feature flagがdisabled。
- RAG sourceがない。
- `auto_reply_enabled = true`。
- LINE自動送信が要求されている。
- keyやprompt全文を表示しないと進められない。

## Final Check Before Real OpenAI Enablement

- staging safe tenantであること。
- tenant AI settingsがreview済みであること。
- cost/rate limit policyが決まっていること。
- prompt logging policyが決まっていること。
- fallback/error handlingがUIで分かること。
- LINE送信とAI draftが分離されていること。
- production enablementは別Loopで明示許可されていること。

## Loop 106 VPS Deployment Planning Note

Loop 106でVPS deployment plan/templatesを追加しましたが、OpenAI real API smokeは行っていません。

Future VPS env examples keep:

```text
AI_PROVIDER=mock
OPENAI_REAL_API_ENABLED=false
```

OpenAI real API enablement requires a separate approved Loop after deploy/SSL/Auth smoke and cost/rate limit policy are confirmed.

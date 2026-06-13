# Codex Review Prompt

この変更をコードレビューしてください。優先順位は、バグ、tenant分離違反、外部APIの誤呼び出し、secrets混入、テスト不足です。

## Review Points

- `tenant_id` が抜けていないか。
- AIに他tenantの情報を渡していないか。
- LINE署名検証前にWebhook payloadを信頼していないか。
- `response_mode` が人間対応中なのにBOT返信していないか。
- テストでOpenAI API、LINE API、Supabase本番環境を呼んでいないか。
- `.env` やsecretが含まれていないか。

重大な問題から順に、ファイルと行番号付きで指摘してください。

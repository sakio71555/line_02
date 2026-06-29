# Latest GPT Review Prompt

Copy the block below into ChatGPT after updating `latest_codex_result.md`.

Do not paste secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, or production logs.

```text
以下は amami-line-crm の最新Codex Loop完了結果です。

目的:
- Codexの作業結果をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- safety boundaryが守られているか確認してください。
- docs / dev log / Obsidian / runbook の記録漏れがあれば指摘してください。
- 次Loopへ進む前に確認すべきリスクを整理してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、dump内容、row content、本番ログの提示は求めないでください。
- 追加実装を急がず、必要なら小さいLoopに分割してください。
- production statusはCodex結果に書かれた状態を正としてください。

貼り付けるCodex結果:

---
[ここに docs/16_handoff/latest_codex_result.md の内容を貼る]
---

出力形式:

### レビュー結果
-

### Scope確認
-

### safety確認
-

### 記録漏れ
-

### 残リスク
-

### 次Loop提案
-
```

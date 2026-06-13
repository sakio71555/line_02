# ADR-002: Admin Reply As Source Of Truth

## Status

Accepted

## Context

LINEは顧客接点として重要ですが、CRMとしては担当者返信、相談ステータス、未返信アラート、AI要約を一元管理する必要があります。

## Decision

管理画面から送る担当者返信をCRM上のsource of truthにします。LINEへ送信した結果だけでなく、送信前のAI下書き、担当者編集、送信者、送信時刻を `messages` と `consultations` に記録します。

## Consequences

- 管理画面で対応履歴を追いやすい。
- 未返信判定が安定する。
- LINE API送信失敗時の再送や状態管理が必要になる。
- 担当者がLINEアプリから直接返信した場合の同期方針は後続で検討する。

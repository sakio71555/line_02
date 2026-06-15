# Internal Review Feedback Log

このファイルは、アマミホーム社内確認版で出たフィードバックを記録するための空テンプレートです。

実フィードバックを書く前に、[Internal Review Feedback Triage](internal_review_feedback_triage.md) を確認してください。

## Safety Rules

- 実顧客名を書かない。
- LINE userIdを書かない。
- 電話番号、メールアドレス、住所などの個人情報を書かない。
- APIキー、`.env` 値、secretを書かない。
- 本番ログを貼らない。
- 社内確認版と本番運用版を混同しない。

## Feedback Items

| ID | 受付日 | 確認者 | 画面/機能 | 内容 | 種別 | 影響度 | 優先度 | 実装難易度 | 社内確認版で対応するか | 本番化で対応するか | 判断 | 次Loop候補 | 対応commit | メモ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Category Options

- UI / 文言
- 業務フロー
- AI下書き品質
- RAG / 参考情報
- LINE返信
- 未返信アラート
- 通知
- 顧客情報
- 認証 / 権限
- データ永続化
- スマホ / LIFF
- 本番運用
- 不具合
- その他

## Priority Options

- P0: 社内確認が継続できない重大不具合
- P1: 社内確認の理解や操作に大きく影響するもの
- P2: 社内確認後、本番化前に対応したいもの
- P3: 将来改善でよいもの
- P4: SaaS化や拡張時に検討するもの

## Severity Options

- Critical: 起動不可、主要導線不能、誤送信リスク
- High: 社内確認で誤解が大きい、実務判断に支障
- Medium: 使い勝手や文言の改善
- Low: 見た目や軽微な表現
- Info: アイデア、将来要望

## Effort Options

- S: 文言、docs、test程度
- M: 小さなUI変更、既存APIの範囲
- L: API、DB、認証、外部連携を伴う
- XL: 本番運用設計、LIFF、SaaS化、複数tenant設計

## Triage Notes

- P0/P1は次Loop候補として優先します。
- P2は本番化前backlogとしてまとめます。
- P3/P4は将来改善やSaaS化backlogへ分けます。
- 1つのLoopに複数カテゴリを詰め込みすぎないでください。


# Loop 061.1: internal review feedback triage

## Goal

アマミホーム社内確認版で出たフィードバックを、実装へ直行させず、分類、優先度付け、Loop化できる運用docsとして整理する。

Loop 061で社内確認runbook、確認順、説明台本、できること/まだできないことを整えた。Loop 061.1では、その後に出る意見を受け止め、次のCodex taskへ安全に変換する。

## Scope

- 社内確認feedback triage guideを作成する。
- feedback log templateを作成する。
- priority / severity / effort / categoryの分類基準を定義する。
- 社内確認版、本番化、将来SaaSの切り分けを明記する。
- feedbackからCodex Loopへ変換する手順を定義する。
- 社内確認runbookへfeedback記録先と注意事項を追記する。
- READMEとdev loop docsからtriage docsへ辿れるようにする。
- dev logへLoop 061.1を追記する。
- docs testを追加または更新する。

## Out of Scope

- 実フィードバックの捏造
- UI変更
- API変更
- DB/schema変更
- 認証実装
- 永続化実装
- LINE API接続
- OpenAI API接続
- Supabase接続
- selectedTenantId transport実装
- 本番通知/scheduler実装
- LIFF実装
- 画像相談実装
- 本番deploy
- `.env` 作成・変更
- 依存関係追加

## Why Triage Is Needed

社内確認では、次のような意見が同時に出る。

- UIが分かりにくい
- 文言を変えたい
- 実務フローと違う
- AI下書きの表現を変えたい
- LINE送信が必要
- 顧客情報の項目が足りない
- 通知タイミングを変えたい
- 本番ログインが必要
- データが消えるのは困る
- スマホで見たい
- LIFFが必要

これらを全部同じLoopで実装すると、外部API境界、tenant_id分離、認証、DB、UIの責務が混ざる。Loop 061.1では、まず記録と分類の運用を用意する。

## Created Docs

- [docs/15_runbooks/internal_review_feedback_triage.md](../15_runbooks/internal_review_feedback_triage.md)
- [docs/15_runbooks/internal_review_feedback_log.md](../15_runbooks/internal_review_feedback_log.md)

## Feedback Categories

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

## Priority

| Priority | Meaning |
| --- | --- |
| P0 | 社内確認が継続できない重大不具合 |
| P1 | 社内確認の理解や操作に大きく影響するもの |
| P2 | 社内確認後、本番化前に対応したいもの |
| P3 | 将来改善でよいもの |
| P4 | SaaS化や拡張時に検討するもの |

## Severity

| Severity | Meaning |
| --- | --- |
| Critical | 起動不可、主要導線不能、誤送信リスク |
| High | 社内確認で誤解が大きい、実務判断に支障 |
| Medium | 使い勝手や文言の改善 |
| Low | 見た目や軽微な表現 |
| Info | アイデア、将来要望 |

## Effort

| Effort | Meaning |
| --- | --- |
| S | 文言、docs、test程度 |
| M | 小さなUI変更、既存APIの範囲 |
| L | API、DB、認証、外部連携を伴う |
| XL | 本番運用設計、LIFF、SaaS化、複数tenant設計 |

## Feedback To Codex Loop

1. feedbackをlogに記録する。
2. 個人情報や実顧客情報を除去する。
3. category / priority / severity / effort を付ける。
4. 社内確認版対応か本番化対応かを判断する。
5. 似たfeedbackをまとめる。
6. 1Loopに入れる範囲を小さく切る。
7. Codex task docを作る。
8. 実装後、feedback logへ対応commitを記録する。

## Why Not Implement Feedback Now

今回は実フィードバックの収集前であり、要望を推測して実装すると危険。

特に、本物LINE送信、OpenAI API、Supabase永続化、本番ログイン、scheduler、LIFFは本番化範囲であり、社内確認版の文言調整と混ぜない。

## Test

更新対象:

- `tests/integration/internal-review-runbook.test.ts`

確認内容:

- feedback triage guideが存在する。
- feedback log templateが存在する。
- READMEからtriage docsへリンクされている。
- 社内確認runbookからfeedback log / triage guideへリンクされている。
- priority / severity / effort の基準が存在する。
- 個人情報、LINE userId、APIキー、`.env`、本番ログを書かない注意が存在する。

## Risks

- 実フィードバックが入るまでは、優先度は仮運用になる。
- P0/P1が出た場合は、通常のUI polishより先に小さい修正Loopへ切る必要がある。
- 本番化要望を社内確認版に混ぜると、外部APIや認証境界が危険になる。

## Next Loop Candidates

- Loop 061.2: internal review P0/P1 quick fixes
- Loop 062: AI/RAG copywriting polish
- Loop 063: staff reply safety confirmation plan
- Loop 064: role visibility friendly wording pass


# Loop 061: Amami Home internal review edition readiness

## Goal

ローカルデモMVPを、アマミホーム社内確認版として見せられる状態へ整理する。

今回の目的は、画面の流れ、できること/まだできないこと、mock/未接続範囲、確認順、フィードバック項目をdocsとrunbookで明確にすること。本番運用版への接続は行わない。

## Scope

- 社内確認版readiness docを作成する。
- 社内確認用runbookを作成する。
- READMEから社内確認runbookとLoop 061 task docへリンクする。
- dev loop docsに、ローカルデモMVPから社内確認版へ進むときのrunbook化方針を追記する。
- RoleVisibilityNoteの一般表示を初心者向けに補強する。
- runbook / README / RoleVisibilityNoteのtestを追加/更新する。
- dev logへLoop 061を追記する。
- lint / typecheck / test / test:integration / buildを実行する。

## Out of Scope

- 本物LINE送信
- OpenAI API実接続
- Supabase本番接続
- Supabase Auth/JWT接続
- selectedTenantId transport実装
- production dev_header rejection
- RLS SQL
- migration変更
- repository runtime切替
- scheduler実装
- 本物通知実装
- LIFF実装
- 画像相談実装
- 本番deploy
- `.env` 作成・変更
- 依存関係追加
- 大規模UIリニューアル

## Internal Review Edition Definition

社内確認版は、アマミホーム関係者または社内スタッフに、ローカルまたは社内確認環境で触ってもらい、画面の流れ、業務イメージ、AI返信下書き、未返信アラートを確認できる状態。

本番運用版ではない。外部API、永続DB、本番認証、本番通知は未接続であることを明示する。

## What Works Now

| Item | State | Notes |
| --- | --- | --- |
| 顧客一覧 | 確認可能 | demo seedデータ |
| 顧客詳細 | 確認可能 | timelineあり |
| timeline | 確認可能 | お客様、AI要約、担当者返信を表示 |
| AI要約 | 確認可能 | MockAiProvider |
| AI返信下書き | 確認可能 | LINE送信なし、保存なし |
| HP情報から回答案 | 確認可能 | 静的knowledge fixture |
| 担当者返信 | 確認可能 | MockLineClient |
| 未返信アラート | 確認可能 | 手動チェック |
| デモ通知 | 確認可能 | MockStaffNotifier |
| Auth placeholder | 確認可能 | ログイン/利用先/権限の準備画面 |

## What Does Not Work Yet

| Item | State | Notes |
| --- | --- | --- |
| 本物LINE送信 | 未実装 | 本番前に必要 |
| 本物OpenAI API | 未実装 | 本番前に必要 |
| Supabase本番DB保存 | 未実装 / 一時保存 | API再起動でseed再投入 |
| 本番ログイン | 未実装 | Supabase Auth/JWT後続 |
| selectedTenantId transport | 未実装 | 複数tenant運用前に必要 |
| 本番通知 | 未実装 | LINE group / Slack / emailは後続 |
| scheduler | 未実装 | 未返信チェック自動化は後続 |
| LIFF | 未実装 | 相談フォームは後続 |
| 画像相談 | 未実装 | 後続 |
| 本番deploy | 未実装 | 社内確認後に計画 |

## Review Screen Order

1. Adminトップ
2. 顧客一覧
3. 顧客詳細
4. timeline
5. 相談内容をまとめる
6. 返信文の下書きを作る
7. ホームページ情報から回答案を作る
8. 担当者として返信する
9. 対応が必要な相談 / alerts
10. 未返信チェック
11. デモ通知
12. ログイン / 利用先選択 / 権限表示の準備画面
13. できること / まだできないことの説明

## Internal Review Checklist

Runbook:

- [docs/15_runbooks/amami_home_internal_review_checklist.md](../15_runbooks/amami_home_internal_review_checklist.md)

The runbook includes:

- 目的
- 対象者
- 確認前の注意
- 起動手順
- demo seed投入手順
- 確認URL
- 画面確認順
- 各画面の見るポイント
- できること / まだできないこと表
- 社内確認で使う説明台本
- フィードバック項目
- 確認結果記入欄
- 不具合記録欄
- 本番化前に必要な項目

## Review Script

基本説明:

```text
これは本番前の社内確認版です。
本物のLINEには送信されません。
AIやホームページ情報の回答案も、今はデモ用のmockで確認しています。
お客様相談が来たときに、担当者がどのように内容を確認し、返信下書きを作り、未返信を見落とさないかを確認する画面です。
```

画面別の説明例はrunbookに記載する。

## Mock / Unconnected Wording

社内確認では以下の表現に統一する。

| Technical wording | Internal review wording |
| --- | --- |
| mock | デモ用 |
| in-memory | 一時保存 |
| dev-only | 開発確認用 |
| unconnected | 本番未接続 |
| tenant | 利用先 |
| tenant_id | 利用先ID |
| RAG | ホームページ情報から回答案 |
| LINE mock | 本物のLINEには送信されません |
| Staff notification mock | 本物のLINE、Slack、メールには通知されません |

## UI Reinforcement

最小限のUI補強として、RoleVisibilityNoteのgeneral variantを初心者向けに更新した。

- `Role visibility placeholder` を使わず、`権限ごとの表示制御は準備中です` と表示。
- `dev_header runtime` / `authenticated_staff runtime` / `owner / manager / staff` を主文言にせず、管理者、チーム管理者、担当者として説明。
- 本番ログイン、JWT/session、実際の権限判定が未接続であることを明記。

Adminトップ、顧客詳細、alertsの既存導線と操作は変更していない。

## Test

Added:

- `tests/integration/internal-review-runbook.test.ts`

Updated:

- `tests/integration/admin-role-visibility-placeholder.test.tsx`

The tests check:

- 社内確認runbookが存在する。
- runbookに確認順、できること/まだできないこと、mock/未接続説明、フィードバック項目がある。
- READMEからrunbookとLoop 061 task docへリンクされている。
- RoleVisibilityNoteのgeneral variantが初心者向け文言を表示する。

## Build

RoleVisibilityNoteのUI文言変更を含むため、`npx pnpm@10.12.1 build` を実行対象にする。

## Risks

- 社内確認版はまだ一時保存で、API process再起動後はdemo seed再投入が必要。
- 本物LINE送信、OpenAI API、Supabase本番DB、本番ログイン、本番通知、schedulerは未実装。
- 社内確認で出たフィードバックを、次Loop以降の小さいタスクに分ける必要がある。

## Next Loop Candidates

- Loop 057: selectedTenantId transport boundary
- Loop 061.1: internal review feedback triage
- Loop 062: AI/RAG copywriting polish
- Loop 063: staff reply safety confirmation plan

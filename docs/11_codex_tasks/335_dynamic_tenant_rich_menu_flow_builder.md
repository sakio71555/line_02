# Task 335: Dynamic tenant rich menu flow builder

## Goal

テナントごとにLINEリッチメニューを追加・削除し、各6項目の動作と相談フローを管理画面から設定できるようにする。初期状態はアマミホームの現行3メニューと既存フローを維持する。

## Scope

- LINEメニューを1件から20件まで追加・削除できる設定モデルと編集画面
- 各メニューに名称、トークルーム表示名、任意のLINE公開ID、6項目を設定
- 各項目にURL案内、定型案内、相談フロー、担当者相談を設定
- 相談フローに選択式・自由入力の質問、選択肢、前回答による表示条件、担当区分、重要度を設定
- 保存済みの追加メニューと相談フローをLINE webhookで実行
- LINE公開IDを設定した追加メニューを顧客詳細から割り当て
- テナント分離、入力検証、既存アマミホームフローの維持をテスト

## Out Of Scope

- LINE Messaging APIでのリッチメニュー作成、画像アップロード、公開
- メニュー画像の編集・自動生成
- 本番DBへのmigration適用
- LINE、OpenAI、Supabaseその他外部APIへの実接続
- VPSへのデプロイ

## Acceptance Criteria

- 初期値としてアマミホームの3メニューと既存相談フローが表示される
- 管理画面でメニューの追加・削除と各6項目の編集ができる
- 相談項目ごとに質問、選択肢、自由入力、条件分岐、担当区分を保存できる
- 保存済みの追加相談フローがLINE webhookで順番に実行され、CRM履歴・アラート・担当者通知へ反映される
- LINE公開IDを設定した追加メニューを顧客へ割り当てられる
- 重複キー、不正な条件分岐、相談フロー未設定などの不正入力を拒否する
- lint、typecheck、test、integration test、buildが成功する

## Implementation Result

- 固定3メニュー前提を外し、1テナント最大20メニューの設定へ拡張した
- 各メニューは従来どおり6枠を持ち、追加・削除、名称変更、動作選択ができる
- 相談フロー編集で選択式・自由入力の質問、選択肢、前回答条件、担当区分、重要度を設定できる
- 現行アマミホームの相談フローを設定初期値へ展開し、既存動作を維持した
- 追加メニューの相談フローをwebhook、CRM履歴、アラート、担当者通知へ接続した
- 任意のLINE公開IDを持つ追加メニューを顧客詳細から割り当てられるようにした

## Safety Boundary

- 設定は常に認証済みテナントIDへ保存し、request bodyのtenant IDは信用しない
- 外部API呼び出し、LINE実送信、DB接続、migration適用、VPS変更は実施しない
- LINE公開IDは任意設定であり、実際のリッチメニュー公開は別のoperator作業とする

## Validation Result

- 対象統合テスト: 4 files / 77 tests pass
- `git diff --check`: pass
- `npx pnpm@10.12.1 lint`: pass
- 強制typecheck: 10 packages pass
- 全体test: 214 files / 1 skipped, 1,365 tests / 4 skipped pass
- integration test: 214 files / 1 skipped, 1,365 tests / 4 skipped pass
- production build: 10 packages pass
- secret pattern boolean check: no secret value detected
- docs link check: pass

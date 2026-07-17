# Task 334: Tenant LINE experience settings

## Goal

会社ごとに、初期・商談中・アフターの3種類のLINEメニュー内容と最初の返答を管理画面から設定し、保存内容をLINE webhookの実処理へ反映する。

## Scope

- `tenant_workspace_settings` にテナント別LINE設定を保存する
- 各メニューの名称、トークルーム表示名、6項目の表示名・動作・送信文字・URL・最初の返答・履歴表示名を設定できるようにする
- アマミホームの現行設定を初期値として維持する
- 保存済み設定をURL案内、定型返答、既存の構造化相談フロー、担当者相談の開始時に利用する
- LINE rich menu API用の定義を設定から組み立てられるようにする
- テナント分離、入力検証、既存挙動をテストする

## Out Of Scope

- LINE Messaging APIへのrich menu作成・画像アップロード・公開
- rich menu画像の自動生成
- 本番DBへのmigration適用
- LINE、OpenAI、Supabaseその他外部APIへの実接続
- VPSへのデプロイ
- 構造化相談フローの全質問項目を会社ごとに編集する機能

## Acceptance Criteria

- 初期設定画面で3メニュー・各6項目を編集して保存できる
- APIが不正なURL、重複メニュー、重複action key、動作が競合する重複トリガーを拒否する
- webhookがテナントの保存済みトリガーと返答を利用する
- 未設定テナントは現行アマミホーム設定で動作する
- rich menu definition builderが3x2のLINE action定義を返す
- lint、typecheck、test、integration test、buildが成功する

## Implementation Result

- 初期・商談中・アフターの3メニューをテナント別設定として追加した
- 各メニューの名称、トークルーム表示名、6項目の表示名、動作、送信文字、URL、最初の返答、履歴表示名を管理画面から保存できる
- 現行アマミホーム設定を既定値にし、未設定または不正な保存値では既定値へ安全に戻す
- 保存内容をLINE webhookのURL案内、構造化相談開始、担当者相談開始へ反映する
- 3x2のLINE rich menu API定義を設定値から生成できる
- テナント分離、不正入力拒否、既存挙動維持を統合テストで確認した

## Validation Result

- `git diff --check`: pass
- `npx pnpm@10.12.1 lint`: pass
- `npx pnpm@10.12.1 typecheck`: pass
- `npx pnpm@10.12.1 test`: 214 files / 1,363 tests pass, 1 file / 4 tests skipped
- `npx pnpm@10.12.1 test:integration`: 214 files / 1,363 tests pass, 1 file / 4 tests skipped
- `npx pnpm@10.12.1 build`: 10 packages pass

Migration適用、LINE rich menu公開、LINE実送信、外部API接続、VPS反映は実施していない。

Task 335で、メニュー追加・削除、相談フローの全質問編集、追加メニューの顧客割り当てへ拡張した。

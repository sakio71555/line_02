# Task 336: Japanese LINE menu names

## Goal

管理画面とLINEリッチメニュー生成定義に表示する既定メニュー名を日本語へ統一し、既存テナントの保存済み既定名にも反映する。

## Scope

- 既定3メニューを「初期メニュー」「商談中メニュー」「アフターメニュー」に統一
- LINEリッチメニュー生成スクリプトと配布用JSONを同じ名称へ統一
- 保存済みの旧英語名だけを置換する再実行可能なデータ移行
- 既定値、生成定義、移行境界の統合テスト
- 検証後のcommit、push、Supabase migration適用、VPS反映

## Safety Boundary

- 利用者が変更した独自メニュー名は置換しない
- LINE送信、OpenAI API実行、顧客データ参照、Nginx変更は行わない
- 移行対象は `tenant_workspace_settings.line_experience` 内の旧英語名3件だけとする

## Acceptance Criteria

- 設定画面の3つの既定メニュー名が日本語で表示される
- 新規テナントにも日本語名が保存される
- 配布用LINE定義と生成スクリプトも同じ日本語名になる
- カスタムメニュー名を保持したまま既存の旧英語名だけが日本語化される
- lint、typecheck、test、integration test、buildが成功する

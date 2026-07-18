# Task 339: LINE rich menu rollback and deployment port consistency

## Goal

LINEリッチメニューの公開失敗時に公開前のデフォルトメニューへ確実に戻し、公開IDの保存失敗でも既存ファイルを壊さないようにする。あわせて、現行のVPS配布物をAdminとAPIの同一オリジン構成へ統一する。

## Scope

- 公開処理の開始前に現在のデフォルトリッチメニューを取得する
- 公開途中で失敗した場合は、既存デフォルトを復元してから新規メニューを削除する
- 既存デフォルトを復元できない場合は、稼働中の新規デフォルトを残して手動クリーンアップが必要な状態として停止する
- デフォルト切替APIの応答喪失時は、現在のデフォルトを再取得してから復元・削除を判断する
- 公開IDのenv出力を同一ディレクトリ内の一時ファイルとrenameによる原子的な置換にする
- env出力先の読み込みは、ファイル未作成の場合だけ空として扱い、それ以外の読み込み失敗を停止理由にする
- 現行のenv、Nginx、preflight配布物を `https://admin.taiyolabel.site` の同一オリジンへ統一し、API公開経路だけを `/api/` にする
- 過去Loopの実績記録に残る旧ポートは履歴として変更しない

## Safety Boundary

- LINE APIの実呼び出しとLINEメッセージ送信は行わず、統合テストではmockを使う
- OpenAI API、Supabase、production DBへ接続しない
- 公開ID、アクセストークン、APIレスポンス本文、secret値を出力・記録しない
- Nginx設定の適用、reload、restart、DNS、HTTPS、certbot、package、database schemaは変更しない

## Acceptance Criteria

- 既存デフォルトあり・なしの両方で公開失敗時の復旧順序がテストされる
- 既存デフォルト復元失敗時に、利用可能な新規デフォルトを削除しないことがテストされる
- env置換失敗時に既存ファイルが変更されないことがテストされる
- env読み込み権限エラーが新規ファイル扱いされず、書き込み前に停止することがテストされる
- 現行配布物がAdminポート `3100` とAPIポート `8788` を同一オリジンで振り分け、旧APIホストを参照しない
- lint、typecheck、test、integration test、buildが成功する
- commitとpushが成功し、作業ツリーがcleanになる

## Implementation Result

- 単一メニュー公開とライフサイクル公開の両方で、切替前デフォルトを取得して復元できるようにした
- デフォルト切替要求後に応答が失われても、LINE側の現在値を再確認して稼働中メニューを誤削除しないようにした
- 再確認にも失敗した場合は、稼働中の可能性がある新規メニューを残し、`cleanup_required=true` として安全停止する
- env出力先は `ENOENT` の場合だけ新規作成し、権限エラーなどは書き込み前に失敗させる
- 現行のNginx、env、preflight、runbookをAdmin配下の `/api/` と `/api/health` に統一した
- LINE、OpenAI、Supabase、VPS、Nginxへの実接続・実変更は行っていない

## Validation Result

- `git diff --check`: pass
- `npx pnpm@10.12.1 lint`: pass
- `npx pnpm@10.12.1 typecheck`: pass（10 packages）
- `npx pnpm@10.12.1 test`: pass（1399 passed / 4 skipped）
- `npx pnpm@10.12.1 test:integration`: pass（1399 passed / 4 skipped）
- `npx pnpm@10.12.1 build`: pass（10 packages）
- changed docs link check: pass（missing=0）
- active deploy config legacy host/port check: pass（legacy reference=false）
- secret value pattern check: pass（detected=false）

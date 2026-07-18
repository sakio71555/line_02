# Task 339: LINE rich menu rollback and deployment port consistency

## Goal

LINEリッチメニューの公開失敗時に公開前のデフォルトメニューへ確実に戻し、公開IDの保存失敗でも既存ファイルを壊さないようにする。あわせて、現行のVPS配布物でAdmin localhostポートを `3100` に統一する。

## Scope

- 公開処理の開始前に現在のデフォルトリッチメニューを取得する
- 公開途中で失敗した場合は、既存デフォルトを復元してから新規メニューを削除する
- 既存デフォルトを復元できない場合は、稼働中の新規デフォルトを残して手動クリーンアップが必要な状態として停止する
- 公開IDのenv出力を同一ディレクトリ内の一時ファイルとrenameによる原子的な置換にする
- 現行のsystemd、env、Nginx、preflight配布物のAdminポートを `3100` に統一する
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
- 現行配布物がAdminポート `3100` を参照し、履歴テストは旧実績を保持する
- lint、typecheck、test、integration test、buildが成功する
- commitとpush後、既存copy-based runbookでAPI/AdminをVPSへ反映し、安全なhealth確認が成功する

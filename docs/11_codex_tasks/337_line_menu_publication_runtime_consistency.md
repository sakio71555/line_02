# Task 337: LINE menu publication/runtime consistency

## Goal

テナントが追加したLINEメニューを再公開しても公開IDを失わず、顧客画面では公開済みの実行版だけを選択でき、LINE APIで作成したIDを安全に設定へ引き継げる状態にする。

## Scope

- カスタムメニューの初回公開・再公開でLINE公開IDを必須化
- 顧客詳細の切替候補を公開済みスナップショットだけから生成
- カスタムメニュー作成IDを権限 `0600` の指定ファイルへ出力
- 作成途中の失敗時に作成済みLINEリッチメニューを可能な限り削除
- API、管理画面、operatorの統合テスト
- 検証後のcommit、push、VPS反映

## Safety Boundary

- LINEメッセージ送信、OpenAI API実行、DB直接接続・変更は行わない
- LINEリッチメニューAPIの実呼び出しは行わず、テストではmockを使う
- stdout、docs、commitへLINE公開IDやsecretを出力しない
- 既定3メニューは既存の環境変数fallback互換を維持する
- Nginx、DNS、HTTPS、certbotは変更しない

## Acceptance Criteria

- カスタムメニューを公開IDなしで再公開できない
- 下書き・廃止メニューが顧客詳細の切替候補に出ない
- operatorが作成IDを安全な出力ファイルへ引き継げる
- 画像登録、既定化、複数メニュー作成途中の失敗で補償削除が実行される
- lint、typecheck、test、integration test、buildが成功する
- API/Admin appだけを既存runbookでVPSへ反映し、public smokeが成功する

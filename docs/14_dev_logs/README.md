# Development Logs

このフォルダは、Loopごとの作業記録をMarkdownで残す場所です。

Obsidianで `docs/` を開いたときに、日付ごとの作業履歴を見返すために使います。これはプロダクト機能ではなく、開発記録用のdocsです。

## 書くこと

- Codexの完了報告の要点
- 変更内容の短い要約
- 実行した検証コマンド
- テスト結果
- tenant_id分離の確認
- 外部API mock確認
- 残リスク
- 次Loop

## 書かないこと

- 実顧客情報
- LINE userId
- APIキーやtoken
- `.env` の内容
- 本番ログ
- secretやcredential

ログは1日1ファイルを基本にし、長くしすぎず、後から流れを追える粒度で追記します。

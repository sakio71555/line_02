# Task 338: LINE rich menu publication safety hardening

## Goal

LINEリッチメニューの公開処理で公開IDの保存漏れを防ぎ、失敗時に作成済みメニューを削除できなかった場合は、運用者が手動対応の必要性を判断できる状態にする。

## Scope

- 3種類のメニューを公開する処理では、公開IDの安全な出力先を必須にする
- 出力先がない場合はLINE APIを呼ぶ前に停止する
- 公開途中の失敗時は作成済みメニューを逆順で削除する
- 削除にも失敗した場合は、IDやトークンを表示せずに手動クリーンアップが必要と報告する
- VPS再反映runbookのAdmin localhostポートを実稼働の `3100` に合わせる

## Safety Boundary

- LINEメッセージ送信、OpenAI API実行、DB直接接続・変更は行わない
- LINE APIの実呼び出しは行わず、統合テストではmockを使う
- 公開ID、アクセストークン、APIレスポンス本文を標準出力・docs・commitへ記録しない
- Nginx、DNS、HTTPS、certbot、package、database schemaは変更しない

## Acceptance Criteria

- 公開ID出力先がないライフサイクル公開は、外部呼び出し前に失敗する
- 正常時は3種類の公開IDが安全な出力先へ渡される
- 失敗時の補償削除と、削除失敗時の `cleanup_required=true` がテストされる
- lint、typecheck、test、integration test、buildが成功する
- commitとpush後、既存copy-based runbookでAPI/AdminをVPSへ反映し、サービスとhealthを確認する

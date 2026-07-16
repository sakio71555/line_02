# Production LINE webhook safety hardening

## Purpose

本番運用中のLINE相談CRMについて、担当者対応とAI自動応答の競合、添付イベント欠落、AI返信失敗の見逃し、Webhook応答の過剰な情報返却、ナレッジ鮮度、READMEの現状不一致を修正する。

## Changes

- AI自動応答は `bot_auto` の時だけ許可し、`human_required`、`human_active`、`emergency` では停止する。
- AI返信はpending記録を作ってからLINEへ送信し、成功時だけ送信済みに更新する。送信失敗時はpending記録の削除を試み、削除処理が利用できない場合でもsanitizedなシステム記録、high severityの未対応アラート、担当者通知を必ず作成する。
- 画像、動画、音声、ファイルはLINE Content APIからバイナリ本体を取得し、非公開Supabase Storageへ保存する。顧客タイムラインにはmetadataと非公開オブジェクトパスだけを保存する。
- Adminの認証・テナント権限・顧客所属・メッセージ所属を確認した場合だけ、APIサーバーが非公開Storageから添付を取得する。ブラウザーへ非公開オブジェクトパスやservice-role情報を返さず、Admin画面内で画像・動画・音声を表示し、その他のファイルをダウンロードできるようにする。
- LINE message IDでWebhook再配信を重複排除し、顧客発言、添付、AI返信の二重登録を防ぐ。
- 署名済みWebhookの形式不正は400、保存や添付取得などの処理失敗は500として再配信可能にする。
- customer webhookのHTTP応答を成功可否と受信件数だけに限定する。
- 許可したアマミホーム公式サイトのHTTPSページだけを、本番APIの起動後と6時間ごとにバックグラウンド同期する。HTMLの本文だけを上限付きで抽出し、取得成功ページだけをchecksum付きでupsertする。取得失敗時は既存ナレッジを保持する。
- 変更されやすい質問は、現在時刻以前かつ7日以内に同期された管理ナレッジがない場合に担当者へ引き継ぐ。未来日時はfreshと判定せず、顧客メッセージ処理中には公式サイトへアクセスしない。
- READMEへ現在の本番実装状態と残課題を記録する。

## Safety boundaries

- LINE実送信、OpenAI API実行、Supabase接続、本番DB操作は行わない。
- secret、DB URL、LINE識別子、顧客発言、raw errorをHTTP応答、docs、失敗通知へ追加しない。
- 添付バイナリは非公開Storageだけに保存し、公開URL、バイナリ本文、署名付きURLをHTTP応答やdocsへ記録しない。
- 実端末E2Eは自動化せず、mock結合テストで回帰を確認する。

## Residual work

- 添付の保持期間と削除ジョブは別タスクとして残る。Storage bucketはprivateを維持し、Adminからの閲覧は認証済みAPIサーバー経由だけを許可する。
- 公式サイト同期はAPIプロセス内の定期処理であり、独立したジョブ監視基盤は持たない。本番サイトへの実アクセス確認は、このコード修正では実行しない。
- 本番LINEの実機確認はoperator手動確認として残る。

## Validation

- `git diff --check`: pass
- `npx pnpm@10.12.1 lint`: pass
- `npx pnpm@10.12.1 typecheck`: pass (10 packages)
- `npx pnpm@10.12.1 test`: pass (207 files / 1322 tests, 4 skipped)
- `npx pnpm@10.12.1 test:integration`: pass (207 files / 1322 tests, 4 skipped)
- `npx pnpm@10.12.1 build`: pass (10 packages)
- changed-file secret pattern boolean check: pass

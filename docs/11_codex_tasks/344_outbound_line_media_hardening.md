# Task 344: Outbound LINE media hardening

## Goal

担当者返信と一斉送信の画像・動画機能を、APIメモリ使用量、準備中ファイルの寿命、旧multipart経路、DBスキーマ不整合の観点から本番運用可能な境界へ補強する。

## Implemented

- 画像・動画は署名付きURLによるブラウザー直接アップロードだけを受け付け、APIへファイル本体を送る旧multipart経路を400で拒否する。
- 準備中ファイルを専用パスへ保存し、検証成功後にだけ配信用の保存先へ移動する。
- 準備から24時間を超えた一時ファイルを、アップロード準備時に最大100件ずつ削除する。
- ファイル本体を取得する前にStorage metadataのサイズとMIME typeを検査し、申告値との不一致やアプリ上限超過を先に拒否する。
- 原本と動画プレビューを順番に検証し、全体をバイト配列へ複製せず先頭16バイトだけでmagic bytesを確認する。
- 検証処理はtenant単位で直列化しつつ全体同時実行数を4件に制限し、Storageのパス解決・検査・取得・準備ファイル削除は15秒で停止する。
- あるtenantのStorage検査が停止しても別tenantの検証を待たせないことを、並行integration testで固定する。
- 検証失敗時は準備中ファイルを削除し、配信用URLの作成失敗時は移動済みファイルも削除する。補償削除は最大3回まで再試行し、全失敗時は成功扱いにしない。
- Supabase利用時はAPI起動前にスキーマreadiness RPCを実行し、必要な担当者管理スキーマが未反映ならHTTP待受と公式サイト同期を開始しない。
- readiness RPCはservice roleだけに許可し、起動失敗時はDB内部エラーや接続情報をログへ出さない。

## Safety before release

- LINE実送信とOpenAI API実行は行わない。
- secret、DB URL、アクセストークン、添付内容、raw responseを表示・記録しない。
- DBマイグレーションはコードのcommit後、API更新前に適用し、readinessがtrueの場合だけVPSを更新する。

## Verification

- `git diff --check`: 成功
- `npx pnpm@10.12.1 lint`: 成功
- `npx pnpm@10.12.1 typecheck`: 10 package成功
- `npx pnpm@10.12.1 test`: 1507件成功、4件skip
- `npx pnpm@10.12.1 test:integration`: 1495件成功、4件skip
- `npx pnpm@10.12.1 build`: 10 package成功

## Production boundary

DBマイグレーションを先に適用し、readiness RPCがtrueを返すことを確認した後にAPIを更新する。API/Admin更新後はサービス状態とlocalhost/public smokeを確認する。

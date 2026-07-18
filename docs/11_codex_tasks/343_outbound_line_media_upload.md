# Task 343: Outbound LINE media upload

## Goal

担当者返信と一斉送信で、本文に加えて画像または動画を1ファイル送信できるようにする。管理画面ではドラッグ＆ドロップとファイル選択の両方を提供し、既存の本文のみの送信を維持する。

## Implemented

- 担当者返信と一斉送信に、JPEG・PNG（最大10MB）またはMP4（最大50MB）の添付欄を追加した。
- PCのドラッグ＆ドロップ、スマートフォンのファイル選択、選択解除、送信前確認を追加した。
- LINE配信用の画像・動画メッセージを既存のテキストメッセージと組み合わせて生成する。
- MP4のプレビュー画像をブラウザー内で生成し、iPhone向けにインライン再生と事前読込を明示した。
- 添付ファイルは既存の非公開ストレージへテナント別パスで保存し、短時間の署名URLだけをLINE送信に利用する。
- MIME type、拡張子、magic bytes、サイズ、保存パスをAPI側でも検証する。
- LINE送信完了前の履歴は顧客画面やダウンロードAPIへ公開せず、送信失敗時は履歴・ファイル・送信予約を整理する。
- LINE送信後に履歴確定処理だけが失敗した場合は再送せず、重複送信を防ぐ結果を返す。
- 一斉送信は既存の1回限り・再送禁止・対象固定の安全境界を維持する。
- 添付はブラウザーから非公開ストレージへ署名付きURLで直接アップロードし、管理画面Server ActionやNginxを大容量ファイルの中継経路にしない。

## Safety

- LINE実送信、OpenAI API実行、production DB直接接続、Supabase実接続は行わない。
- secret、DB URL、LINE ID、送信本文、raw response、添付内容をdocsへ記録しない。
- テナント境界は保存パス、履歴検索、ダウンロード認可の各層で確認する。
- 外部LINE APIはテストダブルで検証する。

## Verification

- `git diff --check`: pass
- `npx pnpm@10.12.1 lint`: pass
- `npx pnpm@10.12.1 typecheck`: pass
- `npx pnpm@10.12.1 test`: pass（1491 passed / 4 skipped）
- `npx pnpm@10.12.1 test:integration`: pass（1479 passed / 4 skipped）
- `npx pnpm@10.12.1 build`: pass（10 packages）

## Review passes

1. 画面レビュー: 送信中の画面遷移で準備済みファイルが先に削除されないよう、送信フォームへの所有権引き渡し・失敗時の復帰・成功時の解放を確認した。
2. APIレビュー: 非公開ストレージから取得した原本とプレビューをAPI側で再検証し、改ざん・不一致・送信失敗時に履歴とファイルを整理することを確認した。
3. 回帰レビュー: 本文のみの送信ではmedia項目を省略し、添付時だけ検証済み参照をJSONで渡すことで、既存送信との互換性とブラウザー直接アップロード境界を確認した。

## Production boundary

アプリの本番反映と、送信を伴わないhealth/auth smokeのみを許可する。LINE実送信、一斉送信、OpenAI実行、DB直接操作、Nginx reload/restartは実施しない。

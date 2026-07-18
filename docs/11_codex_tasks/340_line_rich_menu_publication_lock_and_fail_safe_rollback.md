# Task 340: LINE rich menu publication lock and fail-safe rollback

## Goal

LINEリッチメニュー公開の同時実行を防ぎ、公開失敗時の自動復元が管理画面や別オペレーターによる最新の既定メニュー変更を上書きしないようにする。

## Scope

- 通常公開、カスタム公開、ライフサイクル3種公開、既定解除をローカル所有者ロックと共有leaseで直列化する
- 同じSupabase project、tenant、LINE channelを操作する別clone・別hostも共有leaseで競合停止する
- ロック取得済みの場合はLINE APIを呼ばず、sanitizedな理由で停止する
- 既定メニュー切替を試行した後に処理が失敗した場合は、公開前の既定メニューへ自動復元しない
- 稼働中の可能性がある新規メニューを保持し、`cleanup_required=true` として手動確認を求める
- ロック解放失敗も`cleanup_required=true`として報告する
- 競合、応答喪失、出力保存失敗をmock統合テストで確認する

## Out of Scope

- LINE API、OpenAI API、Supabase、VPSへの実接続
- LINEメッセージ送信
- 管理画面、API、DB schema、Nginx、DNS、HTTPSの変更
- 既存リッチメニューの手動削除や本番公開

## Safety Boundary

- ローカルロックはrepo内のignoredな`tmp/locks/`配下だけを使用し、所有者ごとのファイルを`0600`で作成する
- 共有leaseは既存のSupabase runtime lease RPCを使用し、`TENANT_ID`と安定した`LINE_CHANNEL_ID`のhashで対象を分離する
- アクセストークン更新でlease keyが変わらないよう、アクセストークンをlease識別子に使用しない
- 長いLINE API処理中もheartbeatで共有leaseを更新し、lease喪失時は次のLINE API呼び出しや出力保存へ進まない
- アクセストークン、rich menu ID、APIレスポンス本文をログやdocsへ記録しない
- 所有者不一致または残存ロックは自動削除せず、別公開を安全停止する
- Supabase lease RPCは10秒でtimeoutし、解放RPC停止時もローカル所有者ロックの解放へ進む
- テストではLINE APIを必ずmockする

## Acceptance Criteria

- 同じrepo rootで公開ロックが存在する場合、変更系処理がLINE API呼び出し前に停止する
- 別repo rootでも共有leaseが取得済みの場合、LINE API呼び出し前に停止する
- 古い処理の解放操作が、後から作成された別所有者のローカルロックを削除しない
- 長いLINE API処理中に共有leaseを更新し、lease喪失後は追加変更を行わない
- 出力保存失敗または既定切替応答喪失時に、公開前メニューを再設定するPOSTを行わない
- 稼働中の可能性がある新規既定メニューを削除しない
- 失敗結果が`cleanup_required=true`を返し、secretやIDを含まない
- `git diff --check`、lint、typecheck、test、integration test、buildが成功する

## Implementation Result

- 通常公開、カスタム公開、ライフサイクル3種公開、既定解除を所有者付きローカルロックとSupabase共有leaseで直列化した
- `LINE_CHANNEL_ID`のhashを共有lease keyに使用し、アクセストークン更新後も同じLINE channelを同じ対象として扱う
- 共有leaseをheartbeatで更新し、LINE API応答の前後とローカル出力保存前に所有権を再確認する
- 別clone・別hostからの競合は、同じSupabase projectと`TENANT_ID`を使用する限り共有leaseで安全停止する
- ロック競合時はLINE APIを呼ばず、`rich_menu_publication_locked`で安全停止する
- 公開前の既定メニューへ戻す自動POSTを廃止した
- 既定切替を試行した後に失敗した場合は、稼働中の可能性がある新規メニューを削除せず、`cleanup_required=true`で手動確認へ切り替える
- 既定切替前に失敗した新規メニューだけを自動削除し、既定メニューへ影響させない
- ローカルロックは所有者固有ファイルだけを解放し、後から置き換わった別所有者のロックを削除しない
- 残存ロックは自動削除せず、オペレーター確認まで次の公開を停止する
- Supabase lease RPCへ10秒のabort timeoutを追加し、取得・更新timeoutは安全停止、解放timeoutは`cleanup_required=true`としてローカルロックを解放する
- LINE作成、既定切替、既定解除の応答喪失を、未反映と断定せずsanitizedな結果不明エラーとして扱う
- LINE変更完了後の最終lease確認に失敗した場合も、公開状態を確定扱いせず`cleanup_required=true`で手動確認へ切り替える

## Validation Result

- `npx pnpm@10.12.1 vitest run tests/integration/line-rich-menu-operator.test.ts`: pass（43 tests）
- `npx pnpm@10.12.1 lint`: pass
- `npx pnpm@10.12.1 typecheck`: pass（10 packages）
- `npx pnpm@10.12.1 test`: pass（215 files / 1415 tests、既存skipを除く）
- `npx pnpm@10.12.1 test:integration`: pass（215 files / 1415 tests、既存skipを除く）
- `npx pnpm@10.12.1 build`: pass（10 packages）
- 3回の差分レビュー: 新たなblocking findingなし
- LINE API、OpenAI API、Supabase、VPSへの外部接続: not executed

# Loop 059: customer detail action cards POP UI

## Goal

ローカルデモで一番見せる顧客詳細画面について、AI要約、返信下書き、ホームページ情報からの回答案、担当者返信を初心者にも分かりやすい操作カードUIへ小さく整理する。

今回の対象は顧客詳細画面のアクションまわりだけ。API helper、Server Actionの挙動、Admin API route、外部接続は変更しない。

## Scope

- `apps/admin/app/customers/[customerId]/page.tsx` の説明文を初心者向けに調整。
- `apps/admin/app/customers/[customerId]/customer-actions.tsx` の操作カード文言と順番を整理。
- AI要約、AI返信下書き、ホームページ情報からの回答案、担当者返信に、デモ用/未接続/保存有無のラベルを追加。
- `RoleVisibilityNote` の `customer-actions` variantを、この画面向けにやさしい文言へ変更。
- 表示用の `CustomerActionPanelView` を分離し、render testを追加。
- README、dev logを更新。

## Out of Scope

- API helper変更
- Server Actionの挙動変更
- Admin API route変更
- AI要約/AI下書き/RAG/担当者返信のAPI仕様変更
- 本物LINE送信
- OpenAI API実接続
- Supabase Auth/JWT接続
- selectedTenantId transport
- production dev_header rejection
- RLS SQL
- migration変更
- repository変更
- 顧客一覧ページ変更
- alertsページ変更
- Adminトップ再変更
- 依存関係追加
- `.env` 作成・変更

## Referenced UI Direction

- [docs/16_design/beginner_friendly_pop_admin_ui.md](../16_design/beginner_friendly_pop_admin_ui.md)
- [docs/11_codex_tasks/056_3_beginner_friendly_pop_admin_ui_direction.md](056_3_beginner_friendly_pop_admin_ui_direction.md)
- [docs/11_codex_tasks/058_beginner_friendly_admin_top_polish.md](058_beginner_friendly_admin_top_polish.md)

## Customer Detail Changes

- ページ上部の説明を「お客様情報、相談の流れ、AIの下書き、担当者返信」を確認する画面として整理。
- `顧客情報` を `お客様情報` へ変更。
- `タイムライン` を `相談の流れ / タイムライン` へ変更。
- `tenant` 表示は `利用先ID` として表示。

## AI Summary Card

表示名:

- `相談内容をまとめる`

説明:

- デモ用AIが、これまでの相談内容を短くまとめる。
- OpenAI APIには接続していない。
- 結果はタイムラインにAI要約として保存される。

Labels:

- `デモ用AI`
- `タイムラインに保存`

## AI Reply Draft Card

表示名:

- `返信文の下書きを作る`

説明:

- お客様への返信文をデモ用AIで作る。
- 下書きはLINEに送信されない。
- 内容確認後に担当者が返信する想定。

Labels:

- `下書き確認用`
- `LINEには送信されません`

## RAG Answer Draft Card

表示名:

- `ホームページ情報から回答案を作る`

説明:

- デモ用に登録したアマミホームの参考情報から回答案を作る。
- Webクロール、embedding、pgvectorは未接続。
- OpenAI API未接続をラベル表示する。

Example keywords:

- `オンライン相談`
- `メンテナンス`
- `新築`
- `リフォーム`

Labels:

- `参考情報つき回答案`
- `Webクロール未接続`
- `OpenAI API未接続`

## Staff Reply Card

表示名:

- `担当者として返信する`

説明:

- 入力した内容をスタッフ返信としてタイムラインに保存する。
- 今はMockLineClientなので、本物のLINEには送信されない。

Labels:

- `デモ用送信`
- `本物のLINEには送信されません`
- `タイムラインに保存`

## RoleVisibilityNote

`customer-actions` variantだけを初心者向けに補正した。

- `権限ごとの表示制御は準備中です`
- 将来は管理者、チーム管理者、担当者によって表示操作が変わる。
- 今はデモ確認のため、操作ボタンは従来通り使える。
- 本物の権限判定やボタン非表示はまだ行わない。

General variantとalerts variantは今回のScope外として維持した。

## Existing MVP Behavior

維持したもの:

- AI要約が動く。
- AI返信下書きが動く。
- ホームページ情報から回答案が動く。
- 担当者返信が動く。
- タイムラインが見える。
- RoleVisibilityNoteが表示される。
- `x-tenant-id` / `dev_header` runtimeは変更なし。
- API helper変更なし。

## Test

Added:

- `tests/integration/admin-customer-action-panel.test.tsx`

Updated:

- `tests/integration/admin-role-visibility-placeholder.test.tsx`
- `tests/integration/admin-ui-role-visibility-fixtures.test.ts`

The tests check:

- 顧客詳細の操作カード文言がrenderできる。
- `相談内容をまとめる` が表示される。
- `返信文の下書きを作る` が表示される。
- `ホームページ情報から回答案を作る` が表示される。
- `本物のLINEには送信されません` が表示される。
- `OpenAI APIには接続していません` が表示される。
- `Webクロール、embedding、pgvectorは未接続` が表示される。
- customer action用RoleVisibilityNoteが初心者向け文言を表示する。

## Build

Next.js UI変更を含むため、`npx pnpm@10.12.1 build` を実行対象にする。

## Risks

- 顧客詳細の情報テーブルやタイムライン表示自体はまだ表形式のまま。
- General/alertsのRoleVisibilityNoteには開発者向け表現が残る。
- 実ブラウザの目視確認は人間確認が必要。

## Next Loop Candidates

- Loop 057: selectedTenantId transport boundary
- Loop 060: alerts page beginner-friendly polish
- Loop 061: mock/unconnected badge component


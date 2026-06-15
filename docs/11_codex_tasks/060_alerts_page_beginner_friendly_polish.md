# Loop 060: alerts page beginner-friendly polish

## Goal

ローカルデモMVPのalerts画面を、初心者にも「対応が必要な相談を見つける画面」として分かるように小さく整理する。

今回の対象はalerts画面だけ。Admin API route、Server Actionの挙動、通知ロジック、MockStaffNotifier仕様、外部接続は変更しない。

## Scope

- `apps/admin/app/alerts/page.tsx` の見出し、説明、一覧表示、状態説明を初心者向けに整理。
- `apps/admin/app/alerts/alert-actions.tsx` の未返信チェックとデモ通知の説明を整理。
- alerts用 `RoleVisibilityNote` をやさしい文言へ更新。
- 本物通知なし、手動チェック、scheduler未接続、MockStaffNotifierをラベル表示。
- alertsページ/操作カードのrender testを追加。
- READMEとdev logを更新。

## Out of Scope

- Admin API route変更
- Server Actionの挙動変更
- alert business logic変更
- alert status仕様変更
- scheduler実装
- 本物通知実装
- LINE/Slack/email通知実装
- MockStaffNotifier仕様変更
- Supabase Auth/JWT接続
- selectedTenantId transport実装
- production dev_header rejection
- RLS SQL
- migration変更
- repository変更
- Adminトップ、顧客詳細、顧客一覧の再変更
- `.env` 作成・変更
- 依存関係追加

## Referenced UI Direction

- [docs/16_design/beginner_friendly_pop_admin_ui.md](../16_design/beginner_friendly_pop_admin_ui.md)
- [docs/11_codex_tasks/056_3_beginner_friendly_pop_admin_ui_direction.md](056_3_beginner_friendly_pop_admin_ui_direction.md)
- [docs/11_codex_tasks/058_beginner_friendly_admin_top_polish.md](058_beginner_friendly_admin_top_polish.md)
- [docs/11_codex_tasks/059_customer_detail_action_cards_pop_ui.md](059_customer_detail_action_cards_pop_ui.md)

## Alerts Page Changes

- H1を `対応が必要な相談を確認する` へ変更。
- alertsを `未返信アラート`、`対応が必要な相談` として説明。
- 画面上部に「未返信のままになっている相談を見つけます」という説明を追加。
- まず押す操作として `未返信チェックを実行する` を案内。
- 本物通知なし、手動チェック、scheduler未接続、MockStaffNotifierをラベル表示。
- 空状態では、demo seed後に未返信チェックを実行する流れを案内。

## Unreplied Check Copy

表示名:

- `未返信チェックを実行する`

説明:

- お客様からの相談にまだ担当者返信がないものを確認する。
- デモ用の未返信アラートを作る。
- 現在は手動チェックで、schedulerは未接続。

## Demo Notification Copy

表示名:

- `開いているアラートをデモ通知する`

説明:

- 開いている未返信アラートをデモ用の通知処理に流す。
- MockStaffNotifierを使う。
- 本物のLINE、Slack、メールには通知しない。

## Status Display Policy

既存statusは変更せず、表示だけ初心者向けに補足する。

- `open` -> `対応待ち`
- `notified` -> `デモ通知済み`
- `resolved` -> `対応済み`
- `dismissed` -> `非表示`

## Mock / Unconnected Display

alerts画面では以下を明示する。

- `デモ用`
- `手動チェック`
- `本物通知なし`
- `scheduler未接続`
- `MockStaffNotifier`
- `Supabase永続化は未接続`

## Existing MVP Behavior

維持したもの:

- alerts一覧が見える。
- 未返信チェックが動く。
- open alert通知mockが動く。
- MockStaffNotifierのまま。
- 本物通知しない。
- Admin API挙動は変更なし。
- `x-tenant-id` / `dev_header` runtimeは変更なし。

## Test

Added:

- `tests/integration/admin-alerts-page.test.tsx`

Updated:

- `tests/integration/admin-role-visibility-placeholder.test.tsx`
- `tests/integration/admin-ui-role-visibility-fixtures.test.ts`

The tests check:

- alerts画面が初心者向け文言でrenderできる。
- `対応が必要な相談を確認する` が表示される。
- `未返信チェックを実行する` が表示される。
- `開いているアラートをデモ通知する` が表示される。
- 本物のLINE/Slack/メールには通知されない旨が表示される。
- `MockStaffNotifier`、`scheduler未接続`、`本物通知なし` が表示される。
- status/severity/typeの初心者向けlabelが表示できる。

## Build

Next.js UI変更を含むため、`npx pnpm@10.12.1 build` を実行対象にする。

## Risks

- alerts一覧はまだtable表示中心。
- 本物通知、scheduler、alert解決操作は未実装。
- 実ブラウザの目視確認は人間確認が必要。

## Next Loop Candidates

- Loop 057: selectedTenantId transport boundary
- Loop 061: mock/unconnected badge component
- Loop 062: AI/RAG copywriting polish

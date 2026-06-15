# Loop 058: beginner-friendly Admin top polish

## Goal

ローカルデモMVPの入口であるAdminトップを、初心者でも迷わず使える画面へ小さく改善する。

今回の対象は `apps/admin/app/page.tsx` のみ。顧客一覧、顧客詳細、alerts、auth placeholder、API、Server Action、認証、Supabase接続には広げない。

## Scope

- Adminトップの見出しと説明文を初心者向けに整理。
- 最初に押す導線として「顧客一覧を見る」を明確化。
- 次の導線として「未返信アラートを見る」を表示。
- デモの流れを5ステップで表示。
- デモ用、一時保存、本番LINE未送信、本番AI未接続の状態をラベル表示。
- ログイン、利用先選択、権限表示は準備中であることを怖くない文言で表示。
- Adminトップrender testを追加。
- README、dev logを更新。

## Out of Scope

- 顧客一覧ページ変更
- 顧客詳細ページ変更
- alertsページ変更
- auth placeholderページ変更
- API helper変更
- Server Action変更
- selectedTenantId transport実装
- 本物のrole判定
- Supabase Auth/JWT接続
- LINE API実送信
- OpenAI API実接続
- Supabase本番接続
- migration変更
- `.env` 作成・変更
- 依存関係追加

## Referenced UI Direction

- [docs/16_design/beginner_friendly_pop_admin_ui.md](../16_design/beginner_friendly_pop_admin_ui.md)
- [docs/11_codex_tasks/056_3_beginner_friendly_pop_admin_ui_direction.md](056_3_beginner_friendly_pop_admin_ui_direction.md)

## Admin Top Changes

- `Local demo development UI` を「ローカルデモ管理画面」へ変更。
- H1を「LINE相談の対応状況を確認するデモ管理画面」へ変更。
- 主要導線をカード/ボタン風にし、「顧客一覧を見る」を最優先に表示。
- 「未返信アラートを見る」を次の導線として表示。
- 「デモの流れ」を5ステップに整理。
- `mock`、`in-memory`、`dev-only` などの表現を、初心者向けに「デモ用」「一時保存」「本番未接続」へ寄せた。
- Auth placeholder系は「準備中の画面」として補助導線へ整理。

## Beginner-Friendly Copy

- 顧客一覧を見る
- 未返信アラートを見る
- 本物のLINEには送信されません
- AIとホームページ回答案もデモ用
- データは一時保存です
- ログイン・利用先選択・権限表示は準備中
- 現在のローカルデモでは開発用の確認モードで動きます

## Demo Flow

1. 顧客一覧を見る
2. 顧客詳細で相談内容を確認する
3. AI要約・返信文の下書き・ホームページ情報からの回答案を見る
4. 担当者として返信する
5. 未返信アラートを確認する

## Mock / Unconnected Display

Adminトップでは以下を明示する。

- デモ用
- 一時保存
- 本番LINE未送信
- 本番AI未接続
- Supabase Auth、JWT/session、Admin API authenticated_staff guardはまだ本番未接続

## Existing MVP Flow

既存のローカルMVP導線は維持した。

- `/customers`
- `/alerts`
- `/login`
- `/select-tenant`
- `/permission-denied`
- `/session-expired`

API helper、tenant resolver、role visibility logic、Server Actionは変更していない。

## Test

Added:

- `tests/integration/admin-home-page.test.tsx`

The test checks:

- Adminトップがrenderできる。
- 「顧客一覧を見る」導線がある。
- 「未返信アラートを見る」導線がある。
- デモの流れが表示される。
- 本物のLINEには送信されない旨が表示される。
- AI / ホームページ回答案がデモ用であることが表示される。
- ログイン/利用先選択/権限表示が準備中であることが表示される。

## Build

Next.js UI変更を含むため、`npx pnpm@10.12.1 build` を実行対象にする。

## Risks

- 顧客詳細、顧客一覧、alertsのPOP化は未実施。
- RoleVisibilityNote自体はまだ開発者向け表現を含む。
- 実ブラウザの目視確認は人間確認が必要。

## Next Loop Candidates

- Loop 057: selectedTenantId transport boundary
- Loop 059: customer detail action cards POP UI
- Loop 060: alerts page beginner-friendly polish

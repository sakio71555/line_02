# Loop 018: Alert UI Foundation

## Goal

管理画面から未返信アラートを確認し、未返信チェックとopen alertのMock通知を開発確認できるようにする。

## Status

Implemented in Loop 018. Alert list API, admin alert page, check-unreplied action, and notify-open action are available for development. Production LINE notification, scheduler, auth, and persistence remain out of scope.

## Scope

- `GET /api/admin/alerts`
- `listAlerts`
- `checkUnrepliedAlerts`
- `notifyOpenAlerts`
- `/alerts` page
- alert operation Server Actions
- helper/API tests
- docs and dev log update

## Out of scope

- 本物のLINE API送信
- LINE channel access token利用
- LINE group id本番利用
- OpenAI API実呼び出し
- Supabase接続
- Supabase Auth
- JWT認証
- RLS実装
- LIFF
- 画像処理
- 予約フォーム
- Webクロール
- embedding生成
- 新規依存追加
- 本番認証

## Acceptance Criteria

- `/alerts` ページがある。
- `/alerts` でalert一覧を表示できる。
- `/alerts` で未返信チェックを実行できる。
- `/alerts` でopen alert通知mockを実行できる。
- 管理画面トップから `/alerts` に移動できる。
- `GET /api/admin/alerts` がある。
- alert一覧はtenant_idで分離されている。
- 他tenant alertは返らない。
- helper testsがある。
- UIはMockStaffNotifier前提であることを明示している。
- LINE API、OpenAI API、Supabaseに接続しない。
- dev logにLoop 018が追記されている。

## Implementation Notes

- `GET /api/admin/alerts` は `x-tenant-id` 必須。
- `status` query parameterで任意のstatus filterができる。
- `/alerts` の操作はServer Action経由でadmin API helperを呼ぶ。
- notify-open成功後は一覧更新で `open` から `notified` への流れを確認する。
- 実通知はMockStaffNotifier境界まで。

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build` if possible

# Loop 013: LIFF Forms

## Goal

LINE内で使う相談フォームと予約フォームの基礎を作る。

## Scope

- LIFFフォームの最小画面
- 資料請求、オンライン相談、モデルホーム予約の入力型
- APIへのmock送信境界
- customer/consultation/reservationへの紐づけ設計

## Out of scope

- LIFF本番登録
- LINE Login本実装
- 予約確定ロジック
- メール送信

## Acceptance Criteria

- フォーム送信データに `tenant_id` が入る。
- 入力データはconsultation/reservationへ紐づけられる設計になっている。
- テストでLINEやSupabase本番環境を呼ばない。

## Files likely affected

- `apps/liff/**`
- `apps/api/**`
- `packages/domain/**`
- `tests/integration/**`
- `docs/04_line_flows.md`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 013: LIFF formsを実装してください。相談フォームと予約フォームの基礎だけに集中し、LIFF本番登録やLINE Login本実装は行わないでください。

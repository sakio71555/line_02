# Loop 005: Customer Timeline

## Goal

顧客詳細画面で、顧客カルテと会話タイムラインをtenant scopedに表示する。

## Scope

- 顧客詳細API
- message timeline API
- `apps/admin` の簡易顧客詳細ページ
- inbound/outbound/system messageの表示用型

## Out of scope

- 担当者返信送信
- LINE API呼び出し
- AI要約
- 画像表示の本格実装

## Acceptance Criteria

- customerとmessagesのtenant_idが一致しない場合は取得できない。
- 他tenantのmessageが混ざらないテストがある。
- response_modeが詳細画面で確認できる。

## Files likely affected

- `apps/api/**`
- `apps/admin/**`
- `packages/domain/**`
- `packages/db/**`
- `tests/integration/**`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 005: customer timelineを実装してください。顧客詳細と会話タイムライン表示だけに集中し、返信送信やAI処理は実装しないでください。

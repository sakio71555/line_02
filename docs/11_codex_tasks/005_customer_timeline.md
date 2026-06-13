# Loop 005: Customer Timeline

## Status

API portion implemented in Loop 005. Admin UI remains out of scope for this loop.

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
- `GET /api/admin/customers/:customerId` が存在する。
- `GET /api/admin/customers/:customerId/timeline` が存在する。
- 開発用に `x-tenant-id` headerでtenantを判定する。
- `x-tenant-id` なしは401、unknown tenantは403を返す。
- 存在しないcustomerと別tenantのcustomerは404を返す。
- LINE webhookでin-memory保存されたcustomer/messageが詳細・timeline APIから見える。
- timelineは該当customerのmessagesだけを `created_at` 昇順で返す。

## Implementation Notes

- Loop 005ではAPI部分だけ実装済み。
- `CustomerRepository.findByIdForTenant` と `MessageRepository.listByCustomer` を追加。
- `CustomerDetail` と `CustomerTimelineMessage` view modelを追加。
- 本格認証、Next.js管理画面UI、Supabase接続、返信送信は未実装。

## Files likely affected

- `apps/api/**`
- `apps/admin/**`
- `packages/domain/**`
- `packages/db/**`
- `tests/integration/**`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 005: customer timelineを実装してください。顧客詳細と会話タイムライン表示だけに集中し、返信送信やAI処理は実装しないでください。

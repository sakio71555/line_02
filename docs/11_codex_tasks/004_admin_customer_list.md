# Loop 004: Admin Customer List

## Status

API portion implemented in Loop 004. Admin UI remains out of scope for this loop.

## Goal

管理画面向けの顧客一覧APIと最小UIを作る。

## Scope

- tenant scopedな顧客一覧API
- 顧客名、最終メッセージ時刻、response_mode、未返信状態の表示用型
- `apps/admin` の簡易一覧ページ

## Out of scope

- 顧客詳細タイムライン
- 担当者返信
- 認証本実装
- UI本格デザイン

## Acceptance Criteria

- APIはtenant_idで顧客を絞る。
- 他tenantの顧客が一覧に出ないテストがある。
- UIはmockまたはAPI境界を通して最小表示できる。
- `GET /api/admin/customers` が存在する。
- 開発用に `x-tenant-id` headerでtenantを判定する。
- `x-tenant-id` なしは401、unknown tenantは403を返す。
- LINE webhookでin-memory保存されたcustomerが一覧APIから見える。
- 最新message情報を一覧view modelに含める。

## Implementation Notes

- Loop 004ではAPI部分だけ実装済み。
- `CustomerRepository.listByTenant` と `MessageRepository.findLatestByCustomerIds` を追加。
- `CustomerListItem` view modelを追加。
- 本格認証、Next.js管理画面UI、Supabase接続は未実装。

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

Loop 004: admin customer listを実装してください。顧客一覧APIと簡易UIだけに集中し、顧客詳細、返信、認証本実装は行わないでください。

# Loop 004: Admin Customer List

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

Loop 004: admin customer listを実装してください。顧客一覧APIと簡易UIだけに集中し、顧客詳細、返信、認証本実装は行わないでください。

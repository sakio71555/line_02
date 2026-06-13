# Loop 014: Amami-specific Features

## Goal

アマミホーム固有の暮らし方診断、施工事例レコメンド、SoToNo MA導線の設計と初期実装を行う。

## Scope

- 暮らし方診断の質問設計
- 施工事例レコメンドの入力・出力型
- SoToNo MA導線の相談タグ設計
- 担当者確認前提のrecommendation表示

## Out of scope

- AIによる断定的な提案
- 公式HP未検証情報の本番利用
- 高度なranking model
- 自動予約確定

## Acceptance Criteria

- レコメンド候補は `tenant_id` で絞られた施工事例だけを使う。
- 暮らし方診断の結果は顧客カルテへ紐づく設計になっている。
- 未検証情報はdocsで後続確認扱いになっている。

## Files likely affected

- `packages/domain/**`
- `packages/rag/**`
- `apps/admin/**`
- `apps/liff/**`
- `docs/09_amamihome_research.md`
- `tests/integration/**`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 014: Amami-specific featuresを実装してください。暮らし方診断、施工事例レコメンド、SoToNo MA導線を小さく設計し、tenant_idで絞られた情報だけを使ってください。

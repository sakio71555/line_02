# Loop 000: Scaffold

## Goal

TypeScript monorepoの開発レール、docs、AGENTS.md、基本コマンドを作り、後続ループを安全に進められる状態にする。

## Scope

- `amami-line-crm` フォルダー作成
- pnpm workspace、Turborepo、TypeScript strict、ESLint、Prettier、Vitestの雛形
- `apps/admin`、`apps/api`、`apps/liff` の最小アプリ
- `packages/*` の最小interfaceとmock
- `docs/`、ADR、Codex task、prompt、templateの初版
- `.env.example` と `.gitignore`

## Out of scope

- LINE本番API呼び出し
- OpenAI API実呼び出し
- Supabase本番接続
- 本番ドメイン設定
- LIFF本番登録
- 管理画面UIの本格実装

## Acceptance Criteria

- `pnpm install` が成功する。
- `pnpm lint` が成功する。
- `pnpm typecheck` が成功する。
- `pnpm test` が成功する。
- AGENTS.mdにループエンジニアリング方針が明記されている。
- `.env` は作らず `.env.example` だけを作る。

## Files likely affected

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.base.json`
- `AGENTS.md`
- `README.md`
- `docs/**`
- `apps/**`
- `packages/**`
- `tests/**`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 000: scaffoldを実施してください。外部API実接続は行わず、monorepo、docs、AGENTS.md、最小app/package、mock、テストを整備してください。完了時はループ完了報告フォーマットで報告してください。

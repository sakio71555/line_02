# Loop 069: Codex Development Kit Scaffold

## Goal

Codex Development Kit風の5レイヤー構成を、`amami-line-crm` 向けの安全なdocs/scaffoldとして追加する。

今回のLoopはプロダクト機能追加ではない。runtime、API、UI、DB、migrationは変更しない。

## Scope

- `AGENTS.md` に作業フォルダー、`/tmp` 禁止、外部接続禁止、default in-memory維持、push禁止を追記する。
- `skills/*/SKILL.md` をMarkdown運用資料として追加する。
- `hooks/README.md` を未有効化の将来案として追加する。
- `subagents/*.md` を役割定義だけとして追加する。
- `plugins/README.md` を配布構想だけとして追加する。
- `docs/15_runbooks/codex_development_kit.md` を追加する。
- docs testを追加する。
- README、dev logを更新する。
- commitする。

## Out of Scope

- product runtime変更
- API route変更
- UI変更
- DB schema / migration変更
- package.json / pnpm-lock.yaml変更
- 実行hook script作成
- `.codex/` 作成
- plugin manifest作成
- install script作成
- Supabase / LINE / OpenAI接続
- git push

## Added Five Layers

| Layer | Added file(s) | State |
| --- | --- | --- |
| L1 Memory/Rules | `AGENTS.md` | 既存内容に追記 |
| L2 Skills | `skills/*/SKILL.md` | Markdown docsのみ |
| L3 Hooks | `hooks/README.md` | 未有効化 |
| L4 Subagents | `subagents/*.md` | 役割定義のみ |
| L5 Plugins | `plugins/README.md` | 構想のみ |

## AGENTS.md Handling

既存 `AGENTS.md` は破壊的に上書きせず、Repository Guardrailsとして追記した。

主な追加内容:

- 作業フォルダー制限
- `/tmp` 禁止
- 小さいLoop単位
- 実API / 本番 / 外部接続禁止
- default in-memory runtime維持
- Supabase接続は明示Loopのみ
- 秘密情報をdocsやdev logへ書かない
- 確認コマンド
- `docs/14_dev_logs` / `docs/11_codex_tasks` への記録
- commit前の確認項目
- `git push` は明示指示があるLoop以外禁止

## Skills

- `skills/loop-engineering/SKILL.md`: Plan / Build / Check / Record、小さいLoop、push禁止。
- `skills/amami-crm-domain/SKILL.md`: アマミホーム、マルチテナント、CRM概念、未接続範囲。
- `skills/supabase-runtime-boundary/SKILL.md`: `in_memory` default、fake client、env secret非漏洩、実接続禁止。
- `skills/obsidian-dev-log/SKILL.md`: dev log / task doc運用、実顧客情報やsecret禁止。

## Hooks

`hooks/README.md` のみ追加した。

- 現在は未有効化。
- このrepositoryでは自動実行されない。
- 実行shell scriptはまだ存在しない。
- `.codex/` やhook設定は作っていない。

## Subagents

Markdownの役割定義だけを追加した。

- `subagents/code-reviewer.md`
- `subagents/test-runner.md`
- `subagents/domain-architect.md`

実際の別エージェント実行や外部ツール呼び出しはしていない。

## Plugins

`plugins/README.md` のみ追加した。

- 未配布。
- manifestなし。
- install scriptなし。
- npm package化なし。
- marketplace設定なし。

## Runtime / API / DB / UI Status

- runtime変更なし。
- API route変更なし。
- UI変更なし。
- DB schema / migration変更なし。
- default in-memory runtime維持。
- Supabase runtime switch boundaryとfake client integration testsの現状は変更していない。

## Verification Commands

- `pwd`
- `git status --short`
- `git log --oneline -5`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

## Push Policy

このLoopでは `git push` しない。

## Remaining Risks

- `skills/`、`subagents/`、`hooks/`、`plugins/` は現時点ではMarkdown運用資料であり、自動実行や実配布はない。
- hooks/pluginsを有効化する場合は別Loopでdry-run設計、secret検出、rollback方針を先に決める必要がある。

## Next Loop Candidates

```text
Loop 070: staging migration dry-run record
Loop 071: Supabase customer/message API runtime switch plan
```

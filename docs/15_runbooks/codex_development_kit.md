# Codex Development Kit Runbook

## Purpose

Codexをこのrepositoryで安全に使うための運用scaffoldをまとめる。これはプロダクト機能ではなく、開発者向けのMarkdown運用資料である。

今回追加したものは、Xで見たCodex Development Kit的な5レイヤーを `amami-line-crm` 向けに当てはめた安全な土台だけである。

## Five Layer Mapping

| Layer | このrepoでの対応 | 今回の状態 |
| --- | --- | --- |
| L1 Memory/Rules | `AGENTS.md` | 既存ルールへ追記/整理 |
| L2 Skills | `skills/*/SKILL.md` | Markdown docsのみ |
| L3 Hooks | `hooks/README.md` | 未有効化 |
| L4 Subagents | `subagents/*.md` | 役割定義のみ |
| L5 Plugins | `plugins/README.md` | 構想のみ |

## What This Does

- Codex作業時のルール、domain知識、Supabase境界、dev log運用をMarkdownに分けて整理する。
- code review / test runner / domain architectの役割をMarkdownで定義する。
- 将来hooksやpluginsを検討する前に、未有効化の注意点を明記する。

## What This Does Not Do

- product runtimeを変更しない。
- API routeを変更しない。
- UIを変更しない。
- DB schemaやmigrationを変更しない。
- Supabase、LINE、OpenAIへ接続しない。
- hooksを自動実行しない。
- pluginsを配布しない。
- `.codex/` を作らない。

## Hooks / Plugins Status

`hooks/README.md` は将来案だけである。

- 現在は未有効化。
- このrepositoryでは自動実行されない。
- 実行shell scriptはまだ存在しない。

`plugins/README.md` も将来構想だけである。

- manifestなし。
- install scriptなし。
- npm package化なし。
- marketplace設定なし。

## Recommended Introduction Order

1. `AGENTS.md`
2. `skills`
3. `subagents`
4. hooksはdry-run設計後
5. pluginsはチーム配布段階

## Operational Notes

- Loop作業は必ず小さく切る。
- `git push` は明示指示があるLoop以外では行わない。
- `docs/14_dev_logs` には実顧客情報、LINE userId、API key、env値、本番ログを書かない。
- Obsidianはdocsを読むために使うだけで、プロダクト機能ではない。

## Related Files

- `AGENTS.md`
- `skills/loop-engineering/SKILL.md`
- `skills/amami-crm-domain/SKILL.md`
- `skills/supabase-runtime-boundary/SKILL.md`
- `skills/obsidian-dev-log/SKILL.md`
- `hooks/README.md`
- `subagents/code-reviewer.md`
- `subagents/test-runner.md`
- `subagents/domain-architect.md`
- `plugins/README.md`

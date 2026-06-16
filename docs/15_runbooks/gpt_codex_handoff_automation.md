# GPT-Codex Handoff Automation Runbook

## Purpose

GPTとCodexの往復で必要になるrepo文脈収集と、Codexへ貼るprompt下書き生成を安全に補助する。

この仕組みはCodexを自動実行しない。人間がpromptを確認してからCodexへ貼る。必要に応じて出力されたpromptを編集する。

## What Is Automated

- repoの作業フォルダー、git status、branch/ahead状態、最近のcommitを収集する。
- 最新Loop番号、最近のtask doc、最新dev log、README内のCodex/Supabase関連リンクを収集する。
- `AGENTS.md` と `skills/*/SKILL.md` の存在を確認する。
- 次Loop用Codex prompt draftを `tmp/dev-loop/` 配下へ生成する。

## What Is Not Automated

- Codex実行。
- OpenAI APIを呼ばない。
- LINE API呼び出し。
- Supabase接続。
- Supabase/LINE/OpenAIへ接続しない。
- migration apply。
- commit/pushを自動実行しない。
- `.env` / `.env.local` 作成・変更。
- secret、Supabase project ref、実顧客情報、LINE userId、本番ログの取得や記録。

## Safety Design

- scriptはNode.js標準ライブラリだけで動く。
- outputはproject配下に制限する。
- default outputは `tmp/dev-loop/` 配下にする。
- `tmp/` はgit管理しない。
- `.env` 系ファイルは出力先として拒否する。
- 許可するshell commandはread-onlyのgit確認だけに限定する。
- 生成promptは下書きであり、人間確認ゲートを必ず挟む。

## collect-context

repo文脈をMarkdownで出力する。

```bash
node scripts/dev-loop/collect-context.mjs --out tmp/dev-loop/context.md
```

`--out` を省略した場合も `tmp/dev-loop/context.md` に出力する。

収集内容:

- work folder
- `git status --short`
- `git status --short --branch`
- `git log --oneline -10`
- 最新Loop番号
- 最新task docs
- 最新dev log file
- README内のCodex/Supabase関連リンク
- `AGENTS.md` / skills存在確認
- ahead状態とpush禁止注意

## generate-codex-handoff

次Loop用のCodex投入文の下書きを生成する。

```bash
node scripts/dev-loop/generate-codex-handoff.mjs \
  --loop 073 \
  --title "Sample safe handoff" \
  --mode docs-only \
  --push forbidden \
  --out tmp/dev-loop/next-codex-prompt.md
```

`--out` を省略した場合は `tmp/dev-loop/next-codex-prompt.md` に出力する。

必須引数:

- `--loop`
- `--title`
- `--mode`
- `--push`

引数なしの場合は使い方を表示し、危険なpromptを勝手に生成しない。

## Push Handling

`--push forbidden` の場合、生成promptには必ず以下を含める。

```text
git push は絶対に実行しない
```

このscript自体もcommitやpushを実行しない。pushを許可するかどうかは、各Loopの人間指示を正とする。

## Docs-only Mode

`--mode docs-only` の場合、生成promptには必ず以下を含める。

```text
runtime/API/UI/DB変更禁止
```

docs-only Loopでは、実装やruntime接続を混ぜない。

## Human Review Gate

1. `collect-context` を実行する。
2. `generate-codex-handoff` を実行する。
3. `tmp/dev-loop/next-codex-prompt.md` を人間が読む。
4. Scope / Out of Scope / commit方針 / push方針を人間が修正する。
5. 確認済みpromptだけをCodexへ貼る。

## Troubleshooting

- `repository root was not found`: repo root以外から実行している可能性がある。`/Users/sakio/Desktop/PROJECT/amami-line-crm` で実行する。
- `refusing to write outside project`: `--out` がproject外を指している。`tmp/dev-loop/*.md` を使う。
- `refusing to write env-like files`: `.env` 系の出力先は使えない。
- generated promptが具体的すぎない: これは下書き生成であり、Loop固有Scopeは人間が追記する。

## Conditions To Proceed

- `git status --short` がclean。
- 対象LoopのScope / Out of Scopeが明確。
- push方針が明確。
- 外部接続、migration apply、runtime switchが必要な場合は、別Loopで明示承認を取る。
- 生成promptにsecretや実顧客情報が含まれていない。

# Loop 072: GPT-Codex Handoff Automation Scaffold

## Goal

GPTとCodexの往復で使うrepo文脈収集とCodex prompt下書き生成を、安全なscaffoldとして追加する。

今回のLoopではCodex自動実行、OpenAI API呼び出し、LINE API呼び出し、Supabase接続、migration apply、commit/push自動化は行わない。

## Initial Git State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Initial `git status --short`: clean
- Initial branch: `main...origin/main [ahead 3]`
- Latest commit before Loop 072: `1345c5b docs: plan Supabase staging migration apply`

Loop 069 / Loop 070 / Loop 071 are committed locally and intentionally not pushed. Loop 072 also does not push.

## Scope

- `scripts/dev-loop/collect-context.mjs` を追加する。
- `scripts/dev-loop/generate-codex-handoff.mjs` を追加する。
- project内出力を強制するhelperを追加する。
- repo context収集helperを追加する。
- `tmp/` をgit管理しないようにする。
- handoff automation runbookを追加する。
- README、dev loop、dev logを更新する。
- integration testを追加する。
- script動作確認を行う。
- commitする。

## Out of Scope

- Codex自動実行
- OpenAI API呼び出し
- LINE API呼び出し
- Supabase接続
- `supabase link`
- `supabase db push`
- migration apply
- `.env` / `.env.local` 作成・変更
- `.env.example` 変更
- migration SQL変更
- API runtime switch
- repository wiring変更
- Admin API / Admin UI変更
- package依存追加
- package install
- git push

## Added Scripts

### `scripts/dev-loop/collect-context.mjs`

repo状態を読み取り、handoffに必要な文脈をMarkdownへ出力する。

Default output:

```text
tmp/dev-loop/context.md
```

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

### `scripts/dev-loop/generate-codex-handoff.mjs`

次Loop用Codex prompt draftを生成する。

Default output:

```text
tmp/dev-loop/next-codex-prompt.md
```

サポートする引数:

- `--loop`
- `--title`
- `--mode`
- `--push`
- `--out`

引数なしの場合は使い方を表示し、勝手にLoop番号や危険promptを決めない。

`--push forbidden` の場合、promptへ `git push は絶対に実行しない` を含める。

`--mode docs-only` の場合、promptへ `runtime/API/UI/DB変更禁止` を含める。

## Safety Constraints

- scriptはNode.js標準ライブラリのみを使う。
- outputはproject内に制限する。
- `/tmp` は使わない。
- `.env` 系ファイルを出力先にしない。
- `.env` / `.env.local` を読まない。
- Codex、OpenAI、LINE、Supabaseへ接続しない。
- commit、push、reset、stash、migration apply、package installを実行しない。
- 許可するshell commandはread-only git確認だけ。

## Output Handling

生成物は `tmp/dev-loop/*.md` に置く。

`tmp/` はgit管理しない。生成物はdocsへ自動保存せず、人間が確認してから必要なpromptだけをCodexへ貼る。

## Tests

追加したtest:

- `tests/integration/gpt-codex-handoff-automation.test.ts`

確認内容:

- scriptとrunbookが存在する。
- READMEからrunbookへリンクしている。
- `generate-codex-handoff` の出力に作業フォルダーが含まれる。
- `--push forbidden` でpush禁止文が含まれる。
- `--mode docs-only` でruntime/API/UI/DB変更禁止が含まれる。
- scriptが `.env` を読まない。
- scriptに危険な自動実行command文字列がない。
- default outputがproject `tmp/` 配下である。

## Why No Codex Auto-run

このLoopの目的は、handoff文脈収集とprompt下書き生成だけである。Codex自動実行、commit/push自動判断、Supabase migration apply、外部API接続を混ぜると、人間確認ゲートが失われ、secret露出や本番影響のリスクが高くなる。

## Push Policy

git push is prohibited in Loop 072. Loop 069 / Loop 070 / Loop 071 / Loop 072 remain local until the user explicitly asks to push.

## Verification Result

- `node scripts/dev-loop/collect-context.mjs --out tmp/dev-loop/context.md`: passed.
- `node scripts/dev-loop/generate-codex-handoff.mjs --loop 073 --title "Sample safe handoff" --mode docs-only --push forbidden --out tmp/dev-loop/next-codex-prompt.md`: passed.
- Generated `tmp/dev-loop/context.md`: confirmed.
- Generated `tmp/dev-loop/next-codex-prompt.md`: confirmed with push-forbidden and docs-only constraints.
- `git diff --check`: passed.
- `npx pnpm@10.12.1 lint`: passed.
- `npx pnpm@10.12.1 typecheck`: passed.
- `npx pnpm@10.12.1 test`: passed, 47 files / 326 tests.
- `npx pnpm@10.12.1 test:integration`: passed, 47 files / 326 tests.
- `npx pnpm@10.12.1 build`: passed, 10 packages.

## Remaining Risks

- 生成promptは下書きであり、Loop固有のScope / Out of Scopeは人間確認が必要。
- scriptはrepo状態を読むだけで、GPT側への自動送信やCodex自動投入はしない。
- Loop 069 / 070 / 071 / 072は未push。

## Next Loop Candidates

```text
Loop 073: Supabase staging migration apply execution
Loop 074: GPT-Codex handoff prompt review checklist
Loop 075: Supabase customer/message API runtime switch plan
```

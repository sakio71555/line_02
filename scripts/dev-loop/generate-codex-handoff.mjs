#!/usr/bin/env node
import { collectRepoContext, findRepoRoot } from "./lib/repo-context.mjs";
import { writeProjectFile } from "./lib/safe-write.mjs";

const defaultOutputPath = "tmp/dev-loop/next-codex-prompt.md";

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || Object.keys(args).length === 0) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  validateRequiredArgs(args);

  const repoRoot = findRepoRoot();
  const context = collectRepoContext({ repoRoot });
  const outputPath = args.out ?? defaultOutputPath;
  const target = writeProjectFile(
    repoRoot,
    outputPath,
    renderHandoffPrompt(args, context)
  );

  console.log(`wrote ${target}`);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token.startsWith("--")) {
      const key = token.slice(2);
      args[key] = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`unknown argument: ${token}`);
    }
  }

  return args;
}

function validateRequiredArgs(args) {
  const missing = ["loop", "title", "mode", "push"].filter(
    (key) => !args[key]
  );

  if (missing.length > 0) {
    printUsage();
    throw new Error(`missing required argument(s): ${missing.join(", ")}`);
  }
}

function renderHandoffPrompt(args, context) {
  const pushForbiddenLine =
    args.push === "forbidden"
      ? ["git", "push は絶対に実行しない"].join(" ")
      : `${["git", "push"].join(" ")} policy: ${args.push}`;
  const docsOnlyLine =
    args.mode === "docs-only" ? "runtime/API/UI/DB変更禁止" : "";
  const prohibitedCommands = [
    "Codex自動実行",
    "外部AI API呼び出し",
    "LINE API呼び出し",
    "Supabase接続",
    ["supabase", "link"].join(" "),
    ["supabase", "db push"].join(" "),
    ["git", "commit自動判断"].join(" "),
    ["git", "push自動判断"].join(" "),
    "package install"
  ];

  return `作業フォルダー：

\`${context.repoRoot}\`

このフォルダー内のみで作業してください。
フォルダー外の作成・編集・削除は禁止です。
\`/tmp\` は使わず、必要な一時領域はproject配下の \`tmp/\` を使ってください。

まず \`AGENTS.md\` を読んで、既存ルールに従ってください。

## Loop ${args.loop}: ${args.title}

mode: \`${args.mode}\`
push: \`${args.push}\`

## Current Repo Context

- Branch state: \`${context.gitStatusBranch.trim() || "unknown"}\`
- Latest loop detected: \`${context.latestLoopNumber ?? "unknown"}\`
- Latest dev log: \`${context.latestDevLogFile ?? "unknown"}\`
- ${context.aheadState ? `Current branch is ${context.aheadState}.` : "Ahead state was not detected."}
- ${pushForbiddenLine}
${docsOnlyLine ? `- ${docsOnlyLine}` : ""}

## Goal

次Loopの目的をここに人間が短く書いてください。

## Scope

- このpromptは下書きです。人間がScopeを確認してからCodexへ貼ってください。
- 1 Loopで扱う小さい変更だけを実施してください。
- docs-only modeの場合はdocs/testだけに閉じてください。

## Out of Scope

- Scope外の実装を追加しない。
- runtime変更をしない。
- API/UI/DB変更をしない。
- 外部接続をしない。

## 禁止事項

${prohibitedCommands.map((item) => `- ${item}`).join("\n")}
- \`.env\` / \`.env.local\` 作成・変更禁止
- secret、project ref、実顧客情報、LINE userId、本番ログをdocsやcommitに書かない
- ${pushForbiddenLine}
${docsOnlyLine ? `- ${docsOnlyLine}` : ""}

## 最初に実行する確認

\`\`\`bash
pwd
git status --short
git status --short --branch
git log --oneline -10
\`\`\`

\`git status --short\` がcleanでない場合は停止して報告してください。

## 読むべきファイル

- \`AGENTS.md\`
- \`README.md\`
- \`docs/08_dev_loop.md\`
- \`docs/15_runbooks/codex_development_kit.md\`
- \`skills/loop-engineering/SKILL.md\`
- \`skills/amami-crm-domain/SKILL.md\`
- \`skills/supabase-runtime-boundary/SKILL.md\`
- \`skills/obsidian-dev-log/SKILL.md\`
- \`docs/11_codex_tasks/\` の対象Loop doc
- \`docs/14_dev_logs/${context.latestDevLogFile ?? "YYYY-MM-DD.md"}\`

## 実行コマンド

\`\`\`bash
git status --short
git diff --check
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
git status --short
\`\`\`

buildが必要なLoopの場合だけ、理由を報告して \`npx pnpm@10.12.1 build\` を実行してください。

## commit方針

検証が通ったら1コミットしてください。commit messageは人間がLoopに合わせて決めてください。
${pushForbiddenLine}

## 完了報告項目

- 変更ファイル一覧
- 実施内容の要約
- 実行したコマンドと結果
- commit hash
- push結果またはpush未実行の明記
- Scope外として実装しなかったこと
- 残リスク
- 次Loop候補
- 最終 \`git status --short\`
`;
}

function printUsage() {
  console.log(`Usage:
  node scripts/dev-loop/generate-codex-handoff.mjs \\
    --loop 073 \\
    --title "Next small Loop title" \\
    --mode docs-only \\
    --push forbidden \\
    [--out tmp/dev-loop/next-codex-prompt.md]

This script generates a prompt draft only. It does not execute agents,
external services, commits, pushes, installs, or migrations.
Default output: ${defaultOutputPath}`);
}

main();

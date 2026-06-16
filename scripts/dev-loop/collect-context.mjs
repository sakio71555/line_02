#!/usr/bin/env node
import {
  collectRepoContext,
  findRepoRoot,
  renderContextMarkdown
} from "./lib/repo-context.mjs";
import { writeProjectFile } from "./lib/safe-write.mjs";

const defaultOutputPath = "tmp/dev-loop/context.md";

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const repoRoot = findRepoRoot();
  const context = collectRepoContext({ repoRoot });
  const outputPath = args.out ?? defaultOutputPath;
  const target = writeProjectFile(
    repoRoot,
    outputPath,
    renderContextMarkdown(context)
  );

  console.log(`wrote ${target}`);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--out") {
      args.out = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`unknown argument: ${token}`);
    }
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/dev-loop/collect-context.mjs [--out tmp/dev-loop/context.md]

This script only reads repository context and writes inside the project folder.
Default output: ${defaultOutputPath}`);
}

main();

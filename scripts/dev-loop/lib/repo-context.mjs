import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function findRepoRoot(startDir = process.cwd()) {
  let current = resolve(startDir);

  while (true) {
    if (
      existsSync(join(current, "AGENTS.md")) &&
      existsSync(join(current, "package.json"))
    ) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error("repository root was not found");
    }
    current = parent;
  }
}

export function collectRepoContext(options = {}) {
  const repoRoot = options.repoRoot ?? findRepoRoot();
  const taskDocs = listLatestTaskDocs(repoRoot, 8);
  const latestLoopNumber = taskDocs.length > 0 ? taskDocs[0].loopNumber : null;
  const sourceIdentity = detectSourceIdentity(repoRoot);
  const branchStatus =
    tryRunGit(repoRoot, ["status", "--short", "--branch"]) ??
    renderCopyBasedBranchStatus(sourceIdentity);

  return {
    repoRoot,
    generatedAt: new Date().toISOString(),
    pwd: repoRoot,
    sourceIdentity,
    gitStatusShort: tryRunGit(repoRoot, ["status", "--short"]) ?? "",
    gitStatusBranch: branchStatus,
    gitLogOneline: tryRunGit(repoRoot, ["log", "--oneline", "-10"]) ?? renderCopyBasedLog(sourceIdentity),
    latestLoopNumber,
    latestTaskDocs: taskDocs,
    latestDevLogFile: findLatestDevLog(repoRoot),
    readmeLinks: findReadmeContextLinks(repoRoot),
    agentsExists: existsSync(join(repoRoot, "AGENTS.md")),
    skills: listSkillStatus(repoRoot),
    aheadState: extractAheadState(branchStatus),
    pushWarning: `${["git", "push"].join(" ")} is prohibited unless the current Loop explicitly allows it.`
  };
}

export function renderContextMarkdown(context) {
  const taskDocs = context.latestTaskDocs
    .map((item) => `- Loop ${item.loopNumber}: ${item.file}`)
    .join("\n");
  const readmeLinks =
    context.readmeLinks.length > 0
      ? context.readmeLinks.map((line) => `- ${line}`).join("\n")
      : "- No Codex/Supabase README links found.";
  const skills = context.skills
    .map((item) => `- ${item.file}: ${item.exists ? "present" : "missing"}`)
    .join("\n");

  return `# GPT-Codex Handoff Context

Generated at: ${context.generatedAt}

## Work Folder

\`${context.pwd}\`

## Git Status

\`\`\`text
${context.gitStatusBranch.trim() || "(empty)"}
${context.gitStatusShort.trim() || "(working tree clean)"}
\`\`\`

## Recent Commits

\`\`\`text
${context.gitLogOneline.trim()}
\`\`\`

## Loop Context

- Latest loop number detected: ${context.latestLoopNumber ?? "unknown"}
- Latest dev log file: ${context.latestDevLogFile ?? "none"}
- Source type: ${context.sourceIdentity.type}
- Source commit: ${context.sourceIdentity.commit ?? "unknown"}
- Ahead state: ${context.aheadState ?? "not detected"}
- Push warning: ${context.pushWarning}

## Latest Task Docs

${taskDocs || "- No task docs found."}

## README Codex/Supabase Links

${readmeLinks}

## Required Rule Files

- AGENTS.md: ${context.agentsExists ? "present" : "missing"}

## Skills

${skills}
`;
}

function runGit(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function tryRunGit(repoRoot, args) {
  if (!hasGitMetadata(repoRoot)) {
    return null;
  }

  try {
    return runGit(repoRoot, args);
  } catch {
    return null;
  }
}

function hasGitMetadata(repoRoot) {
  return existsSync(join(repoRoot, ".git"));
}

function detectSourceIdentity(repoRoot) {
  const gitCommit = tryRunGit(repoRoot, ["rev-parse", "HEAD"])?.trim();

  if (gitCommit) {
    return {
      type: "git",
      commit: gitCommit,
      sourceFile: ".git"
    };
  }

  const markerCandidates = [
    join(repoRoot, ".deploy-source"),
    join(repoRoot, ".deploy-manifest.txt"),
    join(repoRoot, "release-manifest.txt"),
    join(repoRoot, "..", "release-manifest.txt"),
    join(repoRoot, "DEPLOYED_COMMIT")
  ];

  for (const file of markerCandidates) {
    if (!existsSync(file)) {
      continue;
    }

    const text = readFileSync(file, "utf8");
    const commit = parseCommitFromMarker(text);

    if (commit) {
      return {
        type: "copy_based",
        commit,
        sourceFile: file
      };
    }
  }

  return {
    type: "copy_based",
    commit: null,
    sourceFile: null
  };
}

function parseCommitFromMarker(text) {
  const namedCommit = /(?:release_candidate_commit|release_candidate|deployed_commit|commit)=([0-9a-f]{7,40})/i.exec(
    text
  );

  if (namedCommit) {
    return namedCommit[1];
  }

  const bareCommit = /\b[0-9a-f]{40}\b/i.exec(text);
  return bareCommit ? bareCommit[0] : null;
}

function renderCopyBasedBranchStatus(sourceIdentity) {
  const suffix = sourceIdentity.commit ? ` ${sourceIdentity.commit.slice(0, 12)}` : "";
  return `## copy-based-source${suffix}\n`;
}

function renderCopyBasedLog(sourceIdentity) {
  if (sourceIdentity.commit) {
    return `${sourceIdentity.commit.slice(0, 12)} copy-based source from ${
      sourceIdentity.sourceFile ?? "source marker"
    }\n`;
  }

  return "(git history unavailable in copy-based source)\n";
}

function listLatestTaskDocs(repoRoot, limit) {
  const taskDir = join(repoRoot, "docs/11_codex_tasks");
  if (!existsSync(taskDir)) {
    return [];
  }

  return readdirSync(taskDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => ({
      file,
      loopNumber: parseLoopNumber(file)
    }))
    .filter((item) => item.loopNumber !== null)
    .sort((a, b) => b.loopNumber - a.loopNumber || b.file.localeCompare(a.file))
    .slice(0, limit);
}

function parseLoopNumber(file) {
  const match = /^(\d+)/.exec(file);
  return match ? Number(match[1]) : null;
}

function findLatestDevLog(repoRoot) {
  const logDir = join(repoRoot, "docs/14_dev_logs");
  if (!existsSync(logDir)) {
    return null;
  }

  return (
    readdirSync(logDir)
      .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file))
      .sort()
      .at(-1) ?? null
  );
}

function findReadmeContextLinks(repoRoot) {
  const readmePath = join(repoRoot, "README.md");
  if (!existsSync(readmePath)) {
    return [];
  }

  return readFileSync(readmePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => /\]\(.+\)/.test(line))
    .filter((line) => /codex|supabase/i.test(line))
    .slice(-20);
}

function listSkillStatus(repoRoot) {
  const files = [
    "skills/loop-engineering/SKILL.md",
    "skills/amami-crm-domain/SKILL.md",
    "skills/supabase-runtime-boundary/SKILL.md",
    "skills/obsidian-dev-log/SKILL.md"
  ];

  return files.map((file) => ({
    file,
    exists: existsSync(join(repoRoot, file))
  }));
}

function extractAheadState(branchStatus) {
  const match = /\[(ahead \d+(?:, behind \d+)?|behind \d+)\]/.exec(
    branchStatus
  );
  return match ? match[1] : null;
}

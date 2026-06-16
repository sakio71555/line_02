# Loop Engineering Skill

## Purpose

Use this skill when working on any Codex Loop in this repository.

## Flow

1. Plan: read `AGENTS.md`, the target task doc, and nearby implementation/docs.
2. Build: change only the files inside the Loop scope.
3. Check: run the required verification commands and fix scoped failures.
4. Record: update task docs, dev logs, and commit when requested.

## Rules

- 1 Loop = one small documented difference.
- Include tests, docs, and commit readiness in the same Loop when requested.
- Do not do broad refactors.
- Do not implement scope-out work.
- Do not hide failed checks.
- Stop and report if a failure appears unrelated to the current Loop.
- Do not push unless the Loop explicitly says to push.

## Expected Result

Return a concise report with changed files, commands, results, tenant isolation, external API status, risks, and next Loop.

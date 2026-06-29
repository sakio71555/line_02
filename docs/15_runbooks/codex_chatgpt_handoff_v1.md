# Codex to ChatGPT Handoff v1 Runbook

## Purpose

Codex作業完了後に、ChatGPTへレビュー依頼を出すための手動コピー量を減らす。

This runbook uses committed Markdown templates. It does not call ChatGPT, OpenAI APIs, Codex automation, external services, VPS, Nginx, LINE, Supabase, Git push, or production runtime commands.

## Files

- `docs/16_handoff/README.md`
- `docs/16_handoff/latest_codex_result.md`
- `docs/16_handoff/latest_gpt_review_prompt.md`

## When To Use

Use this after a Codex Loop finishes and before asking ChatGPT to review the result.

Good use cases:

- review whether Scope / Out of Scope were respected
- review safety boundaries
- check missing docs/dev log/Obsidian/runbook updates
- ask for next Loop decomposition

Do not use this to bypass operator approval or to expose sensitive logs.

## Codex Result Fields

Record these fields in `latest_codex_result.md`:

- Loop number and title
- date
- work folder
- goal
- start git status
- end git status
- commit hash
- push status
- production status
- changed files
- verification commands and results
- safety boundary booleans
- sanitized result summary
- risks
- next Loop candidate

## GPT Review Prompt Fields

Use `latest_gpt_review_prompt.md` as the copy source. It asks ChatGPT to review:

- result summary
- Scope adherence
- safety boundary
- missing docs/logs
- residual risks
- next Loop proposal

## Safety Rules

Never include:

- secrets
- DB URLs
- API keys
- `.env` values
- LINE userIds
- raw logs
- diagnostic logs
- dump contents
- row contents
- production logs

Allowed:

- boolean states such as `secrets_recorded=false`
- sanitized categories such as `role_owner_acl_error_detected`
- file paths that are not secret values
- commit hashes
- command names and pass/fail results

## End-of-Loop Checklist

1. Confirm the work folder.
2. Confirm `git status -sb`.
3. Confirm changed files.
4. Confirm verification results.
5. Confirm secret safety.
6. Confirm production status.
7. Fill `latest_codex_result.md`.
8. Copy `latest_gpt_review_prompt.md` to ChatGPT.
9. Paste the latest result into the prompt block.
10. Convert feedback into a future small Loop before acting on it.

## Relation To Loop 072

Loop 072 created GPT to Codex prompt scaffolding under `tmp/dev-loop/`.

This Loop 214 handoff is the reverse direction: Codex to ChatGPT review. It uses committed Markdown templates in `docs/16_handoff/` so the operator can copy a stable review request without searching through the conversation.

## Verification

For docs-only changes:

```bash
git diff --check
npx pnpm@10.12.1 lint
```

Also perform a secret pattern boolean check on changed Markdown before commit when possible.

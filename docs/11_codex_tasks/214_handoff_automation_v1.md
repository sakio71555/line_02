# Loop 214: handoff automation v1

## Goal

Codex作業完了後に、ChatGPTへそのまま貼れるレビュー用引継ぎ文を固定フォーマットで生成できるようにする。

This Loop is docs-only. It adds manual Markdown templates and a runbook. It does not automate ChatGPT, Codex, OpenAI API calls, Git operations, VPS operations, LINE, Supabase, Nginx, DNS, HTTPS, certbot, or production runtime changes.

## Scope

- Add `docs/16_handoff/`.
- Add `docs/16_handoff/latest_codex_result.md`.
- Add `docs/16_handoff/latest_gpt_review_prompt.md`.
- Add a runbook for what to record after a Codex Loop.
- Update README / docs index links.
- Update dev loop docs.
- Update dev log and Obsidian navigation.

## Out of Scope

- VPS / Nginx / DNS / HTTPS / certbot / public smoke.
- LINE real send.
- OpenAI API call.
- Supabase connection.
- Production runtime change.
- Existing app/API/UI behavior change.
- Secret, DB URL, API key, raw log, dump content, row content, or production log recording.
- Automatic ChatGPT submission.
- Automatic Codex execution.
- Automatic commit/push execution.

## Added Files

- `docs/16_handoff/README.md`
- `docs/16_handoff/latest_codex_result.md`
- `docs/16_handoff/latest_gpt_review_prompt.md`
- `docs/15_runbooks/codex_chatgpt_handoff_v1.md`
- `docs/16_obsidian/loop_214_handoff_automation_v1.md`

## Workflow

1. Finish the Codex Loop.
2. Run the Loop verification commands.
3. Fill `docs/16_handoff/latest_codex_result.md` with sanitized results.
4. Copy `docs/16_handoff/latest_gpt_review_prompt.md` into ChatGPT.
5. Paste the latest result into the prompt block.
6. Treat ChatGPT feedback as review input, then convert any work into a small future Loop.

## Safety

The handoff files are allowed to record boolean states and sanitized categories only. They must not include:

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

## Verification

- `git diff --check`
- docs link check
- secret pattern boolean check
- `npx pnpm@10.12.1 lint`

## Result

- Handoff templates were added.
- ChatGPT review prompt format was added.
- Runbook, README, docs index, dev loop, dev log, and Obsidian navigation were updated.
- No runtime behavior was changed.

## Next Loop Candidates

```text
Loop 214.1: handoff template dry-run with latest Loop result
Loop 215: role owner ACL follow-up remediation gate
```

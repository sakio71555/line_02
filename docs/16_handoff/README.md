# Codex / ChatGPT Handoff

This folder stores the manual handoff templates used after a Codex Loop finishes.

The purpose is to reduce copy and paste work when asking ChatGPT to review a Codex result. These files are Markdown templates only. They do not automate Codex, ChatGPT, OpenAI API calls, Git, VPS operations, Supabase, LINE, Nginx, DNS, HTTPS, or production runtime changes.

## Files

- `latest_codex_result.md`: Fill this with the latest Codex Loop result.
- `latest_gpt_review_prompt.md`: Copy this into ChatGPT after filling the latest result.

## Safety Rules

- Do not write secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, or production logs.
- Record boolean safety states and sanitized categories instead.
- Keep production status unchanged unless a Loop explicitly changes it.
- Treat Git commits as the source of truth; these templates are handoff helpers.

## Basic Flow

1. Finish the Codex Loop and verification.
2. Update `latest_codex_result.md` with the sanitized result.
3. Update `latest_gpt_review_prompt.md` only if the review request shape needs to change.
4. Copy the review prompt into ChatGPT.
5. Keep any ChatGPT feedback as a new Loop scope before acting on it.

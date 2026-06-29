# Loop 214: handoff automation v1

## Decisions

- Add a committed Markdown handoff folder at `docs/16_handoff/`.
- Keep the handoff process manual and review-oriented.
- Use `latest_codex_result.md` for sanitized Codex completion summaries.
- Use `latest_gpt_review_prompt.md` as the ChatGPT paste-ready review prompt.
- Do not automate ChatGPT submission, Codex execution, Git push, external service calls, or production runtime changes.
- Do not record secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, dump contents, row contents, or production logs.

## DevelopmentLog

- Added `docs/16_handoff/README.md`.
- Added `docs/16_handoff/latest_codex_result.md`.
- Added `docs/16_handoff/latest_gpt_review_prompt.md`.
- Added the Codex to ChatGPT handoff v1 runbook.
- Added Loop 214 task documentation.
- Updated README, docs index, dev loop, dev log, and Obsidian navigation.
- Verification commands: `git diff --check`, docs link check, secret pattern boolean check, `npx pnpm@10.12.1 lint`.

## Risks

- The templates are manual; the operator still needs to paste the latest result correctly.
- If a future Loop writes raw logs or secrets into the template, the handoff could leak sensitive data.
- The word `latest` means the files may be overwritten by future Loop summaries, so durable history remains in task docs, dev logs, runbooks, and Git commits.
- ChatGPT feedback is advisory and must be converted into a scoped Loop before implementation.

## Checklist

working_directory_confirmed=true
handoff_templates_created=true
chatgpt_review_prompt_created=true
runbook_created=true
dev_log_updated=true
obsidian_updated=true
docs_index_updated=true
readme_updated=true
secret_values_recorded=false
db_url_recorded=false
api_key_recorded=false
raw_log_recorded=false
dump_content_recorded=false
row_content_recorded=false
vps_operation_executed=false
nginx_dns_https_certbot_public_smoke_executed=false
line_real_send_executed=false
openai_api_call_executed=false
supabase_connection_executed=false
production_runtime_changed=false

# Loop 187: OpenAI Usage and Cost Monitoring Plan

## Purpose

Plan how operators will monitor OpenAI usage, cost, provider errors, latency symptoms, and output quality after the production OpenAI runtime was enabled.

This Loop is planning, runbook, read-only verification, and static-test work only. It does not call the OpenAI API, OpenAI usage API, OpenAI cost API, or any dashboard API.

## Current State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
OpenAI usage API not called
OpenAI cost API not called
OpenAI real API not called
runtime_changes_performed=false
additional_line_send_performed=false
```

Loop 186 added the production monitoring dry-run. It checks health, runtime classifications, sanitized logs, and resources, but it does not call OpenAI usage or cost APIs.

## Scope

- Create a secret-safe OpenAI usage and cost monitoring plan.
- Define monitoring targets, manual dashboard review, threshold placeholders, incident response, and rollback decision triggers.
- Define future API integration approval requirements.
- Connect the plan to the Loop 186 production monitoring dry-run.
- Perform read-only VPS health and runtime classification checks.
- Update README, runbooks, backlog docs, dev log, and static tests.

## Out of Scope

- OpenAI API call.
- OpenAI usage API call.
- OpenAI cost API call.
- OpenAI dashboard API call.
- OpenAI runtime changes.
- OpenAI systemd drop-in changes.
- LINE additional send.
- LINE runtime changes.
- Supabase write, migration, or RLS changes.
- Nginx config changes, reload, or restart.
- DNS, certbot, cron, systemd timer, or notification changes.
- `.env` display or modification.

## Read-Only Evidence

```txt
api_direct_health_loop187_openai_cost_plan=200
https_api_health_loop187_openai_cost_plan=200
https_admin_root_loop187_openai_cost_plan=200
https_admin_customers_loop187_openai_cost_plan=200
https_admin_api_no_header_customers_loop187_openai_cost_plan=401
https_line_invalid_signature_loop187_openai_cost_plan=401
OpenAI systemd drop-in=present
secrets_recorded=false
```

The runtime environment was inspected with values redacted. Secret values, webhook suffixes, LINE identifiers, message bodies, OpenAI model values, OpenAI response bodies, Supabase endpoints, and DB URLs were not recorded.

## Monitoring Targets

- Daily OpenAI cost.
- Daily OpenAI request volume.
- OpenAI provider error rate.
- Provider latency symptoms and timeout-like behavior.
- JSON parse and schema validation errors.
- AI draft quality concerns raised by staff.
- LINE send path interaction risk, especially whether AI output could be mistaken for auto-send.
- OpenAI API availability symptoms.

## Manual Process

1. Operator checks the OpenAI dashboard manually.
2. Operator records only summarized usage and cost status.
3. Operator compares status with the operator-defined thresholds.
4. Operator records whether the result is normal, warning, critical, or needs review.
5. Operator must not paste API keys, model values, organization IDs, project IDs, prompt text, response text, raw usage payloads, raw cost payloads, LINE identifiers, or Supabase values into docs or chat.

## Threshold Proposal

Threshold values are intentionally not fixed in this Loop.

```txt
cost_threshold_values=operator_defined
currency=operator_defined
```

Initial threshold classes:

- Daily cost warning: operator-defined small amount.
- Daily cost critical: operator-defined stop-review threshold.
- Request count warning: operator-defined daily request count.
- OpenAI error warning: repeated errors in one monitoring window.
- OpenAI error critical: persistent errors across two monitoring windows.
- Malformed AI output warning: any repeated schema parse issue.
- Latency warning: user-visible delay reported or repeated timeout-like logs.

## Future API Integration

Future API-based usage or cost collection requires a separate explicit approval Loop.

Requirements:

- Use a server-side boundary only.
- Do not display or record API keys.
- Do not record raw usage payloads.
- Do not record raw cost payloads.
- Do not record model values, prompt text, response text, organization IDs, project IDs, LINE identifiers, Supabase endpoints, or DB URLs.
- Summarize only the approved aggregate fields.
- Include tests that prove the integration can run without leaking secrets.
- Keep any paid or external call separate from docs-only planning Loops.

## Rollback and Mitigation

If OpenAI usage, cost, error rate, latency, or output quality crosses the operator-defined threshold, use a separate rollback decision Loop.

Preferred OpenAI-only rollback target:

```txt
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
activation_mode=line_only
```

Mitigation steps:

1. Decide whether to disable OpenAI runtime only.
2. Remove the OpenAI systemd drop-in in an approved rollback Loop.
3. Restart only the API service.
4. Confirm API direct health returns `200`.
5. Confirm HTTPS API health returns `200`.
6. Confirm Admin root/customers routes return `200`.
7. Confirm Admin API no-header customers returns `401`.
8. Confirm LINE invalid-signature request is rejected.
9. Confirm AI output is not automatically sent to LINE.

## Incident Workflow

### Cost Spike

- Stop and compare dashboard summary with operator-defined thresholds.
- Do not paste raw billing or usage payloads.
- Open a rollback decision Loop if warning or critical threshold is crossed.

### OpenAI Outage

- Confirm CRM health without calling OpenAI again.
- Use sanitized error summaries from monitoring.
- Decide whether OpenAI-only rollback is needed.

### Malformed AI Output

- Record only schema/parse status.
- Do not record the raw response.
- Disable OpenAI runtime if repeated malformed output affects operators.

### User Complaint

- Preserve a sanitized timeline.
- Do not record message bodies or LINE identifiers.
- Confirm whether AI output was draft-only and not auto-sent.

### High Latency

- Check health and timeout-like sanitized logs.
- If the delay is user-visible or repeated, open a mitigation Loop.

## No-Go Conditions

- `OPENAI_API_KEY` missing.
- `OPENAI_MODEL` missing.
- Costs exceed operator-defined threshold.
- Repeated provider errors.
- JSON parse/schema error spike.
- OpenAI response text, prompt text, API key, model value, or raw usage/cost payload appears in logs or docs.
- Staff cannot confirm that AI output remains draft-only.

## Production Monitoring Dry-Run Connection

Current dry-run:

- Checks health/runtime/log/resource state.
- Does not call OpenAI API.
- Does not call OpenAI usage API.
- Does not call OpenAI cost API.
- Reviews sanitized OpenAI-related log summaries only.

Future extension:

- Add an optional OpenAI usage/cost summary module only after explicit approval.
- Keep raw payloads out of stdout, docs, and Git.
- Keep API key and model values out of stdout, docs, and Git.
- Keep the module disabled by default until the approval Loop defines it.

## Test Coverage

- Static tests confirm the Loop 187 task doc and runbook exist.
- Static tests confirm purpose, current state, manual process, thresholds, rollback, incident workflow, future API approval, and production readiness are recorded.
- Static tests confirm docs do not contain obvious secret-shaped values.

## Next Loop

```txt
Loop 188: production backup automation plan
```

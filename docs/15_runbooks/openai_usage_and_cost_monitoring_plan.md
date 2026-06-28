# OpenAI Usage and Cost Monitoring Plan

## Purpose

Give operators a safe process for observing OpenAI usage, cost, error signals, latency symptoms, and output quality after the OpenAI runtime is active.

This runbook is planning and operations guidance only. It does not authorize OpenAI API calls, OpenAI usage API calls, OpenAI cost API calls, runtime changes, LINE sends, Supabase writes, Nginx changes, cron, systemd timers, or notifications.

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
secrets not recorded
```

## Monitoring Targets

| Target | What to watch | Secret-safe record |
| --- | --- | --- |
| Daily cost | Whether cost is normal, warning, or critical. | Summary status only. |
| Daily request volume | Unexpected increase in OpenAI requests. | Summary status only. |
| Error rate | Repeated provider errors or timeout-like failures. | Sanitized error class/count only. |
| Latency symptoms | User-visible delay or repeated timeout-like logs. | Status class and timestamp window only. |
| JSON parse/schema errors | AI output contract mismatch. | Parse/schema status only. |
| AI draft quality | Staff reports of poor or unsafe drafts. | Summary note without prompt/response text. |
| LINE interaction risk | Whether AI output could be mistaken for auto-send. | Confirm draft-only/no auto-send. |
| API availability | Provider outage symptoms. | Sanitized availability status only. |

## Manual Dashboard Process

Daily or weekly, the operator should:

1. Open the OpenAI dashboard manually.
2. Review usage and cost for the monitoring window.
3. Compare the summary to operator-defined thresholds.
4. Record only high-level status such as normal, warning, critical, or needs review.
5. If warning or critical, open a small rollback/mitigation decision Loop.

Do not paste or record API keys, model values, organization IDs, project IDs, prompt text, response text, raw usage payloads, raw cost payloads, LINE identifiers, message bodies, Supabase endpoints, or DB URLs.

## Threshold Proposal

The threshold values are not fixed by this runbook.

```txt
cost_threshold_values=operator_defined
currency=operator_defined
```

Initial policy:

- Daily cost warning: operator-defined small amount.
- Daily cost critical: operator-defined stop-review threshold.
- Request count warning: operator-defined daily request count.
- OpenAI error warning: repeated errors in one monitoring window.
- OpenAI error critical: persistent errors across two monitoring windows.
- Malformed AI output warning: any repeated schema parse issue.
- Latency warning: user-visible delay reported or repeated timeout-like logs.

## Future API Integration Requirements

OpenAI usage/cost API integration is not implemented in Loop 187.

Future implementation requires:

- Explicit approval in a separate Loop.
- Server-side only execution.
- No API key output.
- No model value output.
- No raw usage payload output.
- No raw cost payload output.
- No prompt or response body output.
- No organization ID or project ID output.
- Aggregate summaries only.
- Tests for redaction and failure behavior.

## Production Monitoring Dry-Run Connection

Loop 186 dry-run currently checks:

- API/Admin health.
- Admin no-header rejection.
- LINE invalid-signature rejection.
- Runtime classifications.
- Sanitized journal/Nginx summaries.
- Resource summary.

It does not call the OpenAI API, OpenAI usage API, or OpenAI cost API.

Future extension idea:

```txt
optional_module=openai_usage_cost_summary
approval_required=true
raw_payload_recorded=false
api_key_recorded=false
model_value_recorded=false
```

## Rollback and Mitigation

If usage, cost, error rate, latency, or output quality crosses the operator-defined threshold, choose mitigation in a separate explicit Loop.

Preferred OpenAI-only rollback:

```txt
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
activation_mode=line_only
```

Health checks after rollback:

- API direct health returns `200`.
- HTTPS API health returns `200`.
- Admin root/customers routes return `200`.
- Admin API no-header customers returns `401`.
- LINE invalid-signature request is rejected.
- AI output remains draft-only and not auto-sent.

## Incident Workflow

### Cost Spike

- Compare dashboard summary with operator-defined thresholds.
- Record only summary status.
- If critical, open a rollback decision Loop.

### Quota or Rate Limit

- Record sanitized provider status only.
- Avoid retry loops.
- Consider OpenAI-only rollback if customer-facing work is affected.

### OpenAI Outage

- Confirm core CRM health without extra OpenAI calls.
- Use sanitized provider error summaries.
- Keep LINE receive and staff reply paths operational if healthy.

### Malformed AI Output

- Record parse/schema status only.
- Do not record raw AI output.
- Disable OpenAI runtime if repeated malformed output affects operators.

### User Complaint

- Preserve a sanitized timeline.
- Confirm the AI output was draft-only.
- Do not record LINE identifiers, message bodies, prompt text, or response text.

### High Latency

- Review health and sanitized timeout-like summaries.
- If user-visible delay repeats, open mitigation review.

## No-Go Conditions

- API key missing.
- Model config missing.
- Costs exceed operator-defined threshold.
- Repeated provider errors.
- Repeated JSON parse/schema errors.
- Raw prompt/response or usage/cost payload appears in logs/docs.
- AI output is no longer clearly draft-only.

## Operator Recording Template

```txt
date=<date>
window=<daily_or_weekly>
openai_usage_status=normal|warning|critical|needs_review
openai_cost_status=normal|warning|critical|needs_review
cost_threshold_values=operator_defined
currency=operator_defined
openai_error_status=normal|warning|critical|needs_review
latency_status=normal|warning|critical|needs_review
ai_output_quality_status=normal|warning|critical|needs_review
raw_payload_recorded=false
api_key_recorded=false
model_value_recorded=false
prompt_response_recorded=false
next_action=continue_monitoring|open_rollback_decision_loop|open_remediation_loop
```

## Loop 187 Result

```txt
planning_status=complete
OpenAI usage API not called
OpenAI cost API not called
OpenAI real API not called
runtime_changes_performed=false
additional_line_send_performed=false
cron_installed=false
systemd_timer_installed=false
notifications_sent=false
production_readiness=production_go
```

## Next Loop

```txt
Loop 188: production backup automation plan
```

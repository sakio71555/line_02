# Production Monitoring Schedule

## Purpose

Define lightweight monitoring after line-only production activation.

This schedule is operational guidance. It does not authorize runtime changes, LINE sends, OpenAI runtime activation, Supabase writes, Nginx changes, DNS changes, or certbot execution.

## Daily

1. Confirm API direct health returns `200`.
2. Confirm HTTPS API health returns `200`.
3. Confirm Admin root or customers route returns `200`.
4. Confirm Admin API no-header customers returns `401`.
5. Confirm LINE invalid-signature request returns `401`, `400`, or `403`.
6. Review sanitized API journal classification.
7. Review sanitized Nginx error summary.
8. Check disk, memory, and load.
9. Record only sanitized results.

## Weekly

1. Review dependency update candidates.
2. Review backup status and restore path.
3. Review Supabase usage and quota dashboards without recording endpoints or keys.
4. Review LINE delivery/error dashboard without recording user identifiers or message bodies.
5. Confirm operation runbooks still match the deployed runtime.
6. Confirm rollback owner availability.
7. Review future backlog and split work into small Loops.

## After Any Incident

1. Preserve a sanitized timeline.
2. Record timestamps, status classes, and affected areas.
3. Do not record secret values, webhook suffixes, identifiers, tokens, or message bodies.
4. If rollback is needed, use a separate explicit approval Loop.
5. After stabilization, update the dev log and related runbook.
6. Do not combine diagnosis, rollback, OpenAI activation, Supabase changes, and Nginx changes in one Loop.

## Current Runtime Assumption

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
activation_mode=line_and_openai_runtime
monitoring_status=healthy
```

## OpenAI Runtime Monitoring

After Loop 182, daily checks should also include:

1. Review sanitized OpenAI error classification.
2. Review OpenAI usage and cost without recording values.
3. Watch provider latency and timeout trend.
4. Review AI draft quality with staff.
5. Confirm AI output is not automatically sent to LINE.
6. Confirm logs do not contain prompts, responses, API keys, model values, LINE identifiers, or message bodies.

## Loop 183 Follow-up

Loop 183 completed read-only first-hour monitoring for the OpenAI runtime state.

```txt
monitoring_status=healthy
rollback_recommended=false
critical_errors_detected=false
openai_runtime_errors_detected=false
line_send_errors_detected=false
webhook_errors_detected=false
supabase_errors_detected=false
runtime_changes_performed=false
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

Continue normal monitoring. Any rollback, additional LINE send, OpenAI smoke, Nginx/DNS/certbot change, or Supabase schema/RLS change must be a separate approved Loop.

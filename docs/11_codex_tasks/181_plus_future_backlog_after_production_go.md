# Loop 181+ Future Backlog After Production Go

## Purpose

List future work after production closeout.

This is a backlog record only. None of these items are implemented in Loop 180 or Loop 184.

## Backlog Candidates

- Post-production backlog triage.
- Production monitoring automation.
- OpenAI runtime activation as a separate explicit Loop remains the pattern for any future OpenAI runtime change.
- OpenAI usage/cost dashboard.
- Authenticated staff route improvement.
- Admin auth UX hardening.
- Production alerting.
- Backup automation.
- User-facing operation manual.
- Additional tenant onboarding.
- Proper audit log.
- Operator dashboard for daily checks.
- Incident follow-up template.
- Customer-facing QA.

## Safety Rules

- Keep OpenAI runtime activation separate from LINE send changes.
- Keep Supabase schema/RLS changes separate from runtime monitoring.
- Keep Nginx/DNS/certbot changes separate from application feature work.
- Do not record secret values, webhook suffixes, LINE identifiers, reply tokens, message bodies, OpenAI model values, provider responses, Supabase endpoints, or DB URLs.

## Suggested Next Loop

```txt
Loop 185: post-production backlog triage
```

## Loop 181 Follow-up

Loop 181: OpenAI runtime activation planning

Loop 181 creates the OpenAI runtime activation plan only. It does not enable OpenAI runtime, call the OpenAI real API, or change LINE runtime.

Next explicit candidate:

```txt
Loop 182: OpenAI runtime activation with explicit approval
```

## Loop 184 Follow-up

Loop 184 completed production stabilization closeout with OpenAI runtime enabled.

```txt
production_readiness_status=go
activation_mode=line_and_openai_runtime
monitoring_status=healthy
rollback_recommended=false
handoff_complete=true
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

Future work should be triaged from an operations perspective and kept in small explicit Loops.

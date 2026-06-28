# Loop 181+ Future Backlog After Production Go

## Purpose

List future work after line-only production closeout.

This is a backlog record only. None of these items are implemented in Loop 180.

## Backlog Candidates

- OpenAI runtime activation as a separate explicit Loop.
- Authenticated staff route improvement.
- Admin auth UX hardening.
- Production alerting.
- Backup automation.
- User-facing operation manual.
- Additional tenant onboarding.
- Proper audit log.
- Monitoring automation.
- Operator dashboard for daily checks.
- Incident follow-up template.

## Safety Rules

- Keep OpenAI runtime activation separate from LINE send changes.
- Keep Supabase schema/RLS changes separate from runtime monitoring.
- Keep Nginx/DNS/certbot changes separate from application feature work.
- Do not record secret values, webhook suffixes, LINE identifiers, reply tokens, message bodies, OpenAI model values, provider responses, Supabase endpoints, or DB URLs.

## Suggested Next Loop

```txt
Loop 181: OpenAI runtime activation planning
```

## Loop 181 Follow-up

Loop 181 creates the OpenAI runtime activation plan only. It does not enable OpenAI runtime, call the OpenAI real API, or change LINE runtime.

Next explicit candidate:

```txt
Loop 182: OpenAI runtime activation with explicit approval
```

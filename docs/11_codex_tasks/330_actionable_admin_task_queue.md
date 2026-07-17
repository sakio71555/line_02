# Task 330: Actionable admin task queue

## Goal

Replace internal alert strings on the Admin task surfaces with a clear work queue that tells staff who needs attention, what to do, why it is needed, and which task to open first.

## Scope

- Convert structured consultation metadata and unreplied-message alerts into concise Japanese task titles and details.
- Show the same presentation on Tasks, Home, and Inbox.
- Separate smoke/test records from real outstanding counts.
- Keep explicit priority, received time, and next-action labels visible.
- Preserve existing alert links, status handling, APIs, and production behavior.

## Safety boundary

- No LINE message or OpenAI API call.
- No production database, Supabase, customer-data, or secret access.
- No Nginx, DNS, HTTPS, certificate, package, or unrelated runtime change.
- Test records are identified from existing sanitized identifiers and messages; no records are deleted.

## Completion checks

- Internal `key=value`, UUID-heavy unreplied text, and smoke records are not presented as normal staff work.
- A task card shows the customer display name when available, the required action, a short consultation detail, received time, and priority.
- Desktop and mobile layouts have no horizontal overflow.
- `git diff --check`, lint, typecheck, tests, integration tests, and build pass.

## Result

- The task queue now leads with outstanding, urgent, and completed counts followed by a one-sentence instruction.
- Tasks are ordered by priority and age, with a direct action label to open the customer record and reply.
- Home and Inbox reuse the same Japanese presentation so internal alert syntax does not leak through another screen.
- Smoke and test alerts are excluded from real work counts and remain available in a collapsed confirmation section.
- Desktop and mobile views were checked without horizontal overflow.
- Validation passed: diff check, lint, typecheck, 1,339 unit tests, 1,339 integration tests, and the production build.
- Release evidence is recorded in the completion report for the commit containing this task record.

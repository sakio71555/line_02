# Task 329: LINE delivery and sync consistency hardening

## Goal

Resolve the five reliability gaps found after the production LINE safety review:

1. Do not expose structured replies in CRM before LINE delivery succeeds.
2. Keep failed normal-chat replies out of the customer timeline even when cleanup fails.
3. Create the staff alert before best-effort failure timeline logging.
4. Preserve an attachment receipt and staff alert when attachment retrieval or storage fails.
5. Prevent duplicate official-site refreshes across API processes with a shared lease.

The release hardening review added four completion requirements:

1. Release the completed repository changes, including the required database migrations.
2. Bind every structured LINE reply to its exact pending message ID so identical concurrent replies cannot cross-promote or orphan records.
3. Fail closed when attachment storage is unavailable instead of treating a missing storage callback as a successful save.
4. Renew the official-site refresh lease while work is running and stop before commit if lease ownership is lost.

## Safety boundary

- No LINE message is sent during implementation, verification, or release.
- No OpenAI API call is made.
- Production database access is limited to applying and verifying the two reviewed migrations.
- Production runtime access is limited to the existing copy-based API/Admin release procedure and service restart.
- No Nginx, DNS, HTTPS, certificate, firewall, package, or unrelated VPS setting is changed.
- Automated tests use in-memory or fake clients only.

## Completion checks

- Structured and normal replies become visible only after delivery is confirmed.
- Every LINE reply failure creates or reuses a high-priority staff alert even if timeline logging fails.
- Attachment storage failure returns a successful webhook result while recording a sanitized receipt and alert.
- Official-site refresh uses an expiring tenant-scoped shared lease.
- `git diff --check`, lint, typecheck, unit/integration tests, and build pass.

## Result

- Status: complete in the repository.
- Structured, rich-menu, and normal-chat replies use a hidden pending record and are promoted to a visible LINE timeline message only after delivery succeeds.
- Structured replies carry the exact pending message ID from insert through delivery confirmation. No reply promotion depends on matching duplicate message text.
- Delivery failures remove the pending record on a best-effort basis and leave a high-priority staff alert; alert creation does not depend on failure timeline logging.
- Attachment retrieval, private-storage, and unavailable-storage failures keep the webhook successful, save only a sanitized failure receipt without a storage path, and create a high-priority staff alert.
- Official-site refreshes require both the process-local guard and an expiring tenant-scoped database lease. The lease is renewed during long work and rechecked immediately before repository writes.
- Regression coverage includes identical concurrent replies, delivery failure, failed pending cleanup, failed failure-timeline logging, unavailable attachment storage, attachment storage failure, competing scheduler processes, long refresh renewal, and lease loss before commit.
- Validation passed: `git diff --check`, lint, typecheck, 1,332 tests with 4 skipped, integration tests, and production build.
- The private attachment bucket and shared lease migrations are release prerequisites and are applied before the production application cutover.

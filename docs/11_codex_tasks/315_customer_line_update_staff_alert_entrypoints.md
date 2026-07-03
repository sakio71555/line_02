# Loop 315: customer LINE update staff alert entrypoints

## Goal

Make customer-facing LINE updates create CRM staff follow-up targets without sending LINE messages from Codex.

## Scope

- Keep the existing customer-facing LINE account and rich menu active.
- Keep the newly created `アマミホーム 相談受付` account as staff-notification-only.
- Create an open CRM alert when a customer sends a text message through LINE.
- Create an open CRM alert when the LIFF customer registration/contact-change form is submitted.
- Keep staff notification payloads summary-only; details stay in Admin.

## Result

- Added `ensureOpenUnrepliedCustomerMessageAlert` in the domain layer.
- LINE webhook text messages now mark the customer as `human_required` and create one open unresolved alert when no active alert already exists.
- LIFF customer registration/contact-change writes now create one open unresolved alert when no active alert already exists.
- API responses include sanitized alert creation metadata only.

## Safety

- LINE message send was not executed.
- OpenAI API execution, Supabase direct connection, production DB direct access, DB migration, Nginx/DNS/HTTPS/certbot changes, and VPS runtime changes were not performed.
- LINE user IDs, message bodies, secrets, raw logs, and token values are not written to docs.
- Staff notifications remain summary-only and do not include customer message bodies.

## Verification

- `npx pnpm@10.12.1 vitest run tests/integration/liff-customer-profile.test.ts tests/integration/line-webhook.test.ts tests/integration/staff-notification.test.ts`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`

## Next

- Implement the real staff notification delivery channel for the separate `アマミホーム 相談受付` account after staff recipients are registered.

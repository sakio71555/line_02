# Loop 314: customer account and staff notification account boundary

## Goal

Keep the existing LINE Official Account customer-facing as before, and reserve the newly created LINE Official Account for internal staff notifications only.

## Correction

The first Loop 314 interpretation incorrectly treated the existing customer-facing account as the internal staff notification account. That was corrected immediately after operator clarification:

- Existing customer-facing LINE account: keep operating as before, including the customer rich menu.
- New internal LINE account: use only for staff notification when customer LINE updates or inquiries arrive.
- Staff notification account: no customer rich menu, no customer LIFF entry, no customer-facing menu operation.
- Customer-facing account: customer rich menu restored after the accidental default removal.

## Scope

- Keep customer inquiry details in the CRM/Admin UI.
- Format staff notification payloads as brief summaries only.
- Use the public Admin base URL for staff notification links.
- Keep the existing customer rich menu on the customer-facing LINE Official Account.
- Add a safe operator command that can remove a default rich menu only from the separate internal staff notification account.
- Do not send LINE messages in this Loop.

## Result

- `buildStaffNotificationPayload` now emits a Japanese internal notification summary:
  - inquiry type
  - urgency
  - unresolved status
  - Admin detail URL
- Raw alert message text is not copied into the staff notification body.
- `line_rich_menu_operator.ts --remove-default` exists only for a separate internal staff notification account and requires explicit approval.
- The customer-facing account rich menu was restored after the boundary correction.

## Safety

- LINE message send was not executed during implementation.
- Customer-facing rich menu removal is not part of the steady-state operation.
- LINE rich menu default removal requires explicit operator approval and is intended only for the separate staff notification account.
- LINE token, rich menu ID, LIFF ID, LINE user IDs, raw logs, and customer details are not recorded.
- Supabase direct connection, DB migration, OpenAI API execution, Nginx/DNS/HTTPS/certbot changes, and production DB direct access were not performed.

## Verification

- `npx pnpm@10.12.1 vitest run tests/integration/staff-notification.test.ts tests/integration/line-rich-menu-operator.test.ts`
- `git diff --check`
- Sensitive value check on changed files
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

## Next

- Add staff LINE linking codes and persist `staff_users.line_user_id`.
- Implement real staff notification delivery from the new internal notification account only after staff recipients are registered.

# Loop 314: internal staff notification LINE account boundary

## Goal

Treat the current LINE Official Account as the internal staff notification account, not a customer-facing rich menu account.

## Scope

- Keep customer inquiry details in the CRM/Admin UI.
- Format staff notification payloads as brief summaries only.
- Use the public Admin base URL for staff notification links.
- Add a safe operator command to remove the default rich menu from the LINE Official Account.
- Do not send LINE messages in this Loop.

## Result

- `buildStaffNotificationPayload` now emits a Japanese internal notification summary:
  - inquiry type
  - urgency
  - unresolved status
  - Admin detail URL
- Raw alert message text is not copied into the staff notification body.
- `line_rich_menu_operator.ts --remove-default` cancels the default rich menu with explicit approval.
- The remove command records only sanitized result booleans/status.

## Safety

- LINE message send was not executed during implementation.
- LINE rich menu default removal requires explicit operator approval.
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
- Implement real staff notification delivery only after staff recipients are registered.

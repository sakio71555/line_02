# Loop 321: staff LINE webhook foundation

## Goal

Add a separate webhook receive route for the internal staff notification LINE Official Account
`アマミホーム 相談受付`.

The route must be separate from the customer-facing LINE webhook so the two accounts do not share
runtime secrets or webhook paths.

## Scope

- Add `POST /api/staff-line/webhook/:webhookSecret`.
- Resolve the route with `STAFF_LINE_WEBHOOK_SECRET_PATH`.
- Verify the LINE signature with `STAFF_LINE_CHANNEL_SECRET`.
- Parse the LINE webhook body only after signature verification passes.
- Return sanitized event counts only.
- Keep staff linking, staff notification delivery, and message sending disabled in this loop.
- Add `STAFF_LINE_*` keys to env examples without values.

## Out Of Scope

- Real staff notification push through `アマミホーム 相談受付`.
- Staff LINE userId linking, linking-code processing, group/room delivery, or retry logic.
- LINE message send from Codex, OpenAI API execution, Supabase direct connection, production DB
  direct operation, DB migration, Nginx/DNS/HTTPS/certbot change, or secret/raw-log display.
- Recording the actual webhook secret path, channel secret, access token, LINE userId, message
  body, raw response, or raw webhook log.

## Runtime Env Keys

The implementation reads these runtime keys by name only:

- `STAFF_LINE_CHANNEL_ID`
- `STAFF_LINE_CHANNEL_SECRET`
- `STAFF_LINE_CHANNEL_ACCESS_TOKEN`
- `STAFF_LINE_WEBHOOK_SECRET_PATH`

Values must be entered on the VPS by an operator-controlled secret input flow and must not be
committed or pasted into docs.

## Result

- Added the staff-line webhook route and signature guard.
- Added sanitized webhook event summary counts.
- The endpoint reports `staff_linking_executed=false` and
  `staff_notification_send_executed=false`.
- Added tests for valid signed staff-line webhook requests, invalid signatures, unknown paths, and
  missing staff channel secret.

## Verification

- `npx pnpm@10.12.1 vitest run tests/integration/line-webhook.test.ts`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

## Next

- Deploy the updated API runtime to the VPS.
- Add the staff LINE runtime env values on the VPS through a value-hidden operator flow.
- After the env values are present and the API is restarted, use LINE Developers webhook
  verification for the staff account.

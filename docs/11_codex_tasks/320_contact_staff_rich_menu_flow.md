# Loop 320: contact staff rich menu flow

## Goal

Implement the next customer rich-menu flow one item at a time: tapping `担当者に相談`
should start an in-LINE staff-consultation intake, collect the consultation category and body,
save the request to CRM, and create an unreplied staff follow-up alert.

## Scope

- Handle the exact message text `担当者に相談` as the initial contact-staff entrypoint.
- Ask the customer to select one of the initial categories:
  - `家づくりについて`
  - `モデルハウス見学について`
  - `資料請求について`
  - `費用・ローンについて`
  - `その他`
- If the customer is not marked `情報登録済み`, ask for name and phone before the consultation body.
- Record category/contact/body flow markers in the customer timeline.
- Save the final consultation body as a customer text message.
- Mark the customer `human_required` and create one open unreplied staff alert.
- Reply to the customer that the consultation was received and staff will check Admin.

## Out Of Scope

- Real staff notification delivery through the separate `アマミホーム 相談受付` account.
- Staff LINE account linking, staff user routing, group notification, scheduler, or retry logic.
- LINE real send from Codex, OpenAI API execution, Supabase direct connection, production DB direct
  operation, DB migration, Nginx/DNS/HTTPS/certbot change, or secret/raw-log display.

## Result

- Added contact-staff flow state handling to the LINE webhook logging path.
- Added LINE quick reply support for category selection while keeping message payloads text-only.
- Unregistered customers are asked for name/phone before entering the consultation body.
- Registered customers skip the contact-info question and can enter the consultation body directly.
- Final consultation body creates a CRM customer timeline message and one open staff follow-up alert.

## Staff Notification Boundary

The separate `アマミホーム 相談受付` LINE Official Account remains the staff-notification-only account,
but real delivery is not connected in this Loop. The current production path creates the open alert
target in CRM. Real staff notification still needs a separate implementation Loop with sanitized
runtime inputs for that account.

## Verification

- `npx pnpm@10.12.1 vitest run tests/integration/line-webhook.test.ts`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

## Next

- Deploy the updated API/Admin runtime to VPS after validation.
- For real staff notification delivery, collect only sanitized requirements for the
  `アマミホーム 相談受付` channel in a separate small Loop.

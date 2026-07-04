# Loop 326: contact staff priority selection

## Goal

Add a customer-facing priority choice to staff-consultation rich-menu flows and reflect the selected
priority in the CRM alert severity and staff notification text.

## Scope

- Add a priority step after the contact-staff category selection.
- Offer three customer-facing choices:
  - `はやく返事が欲しい` -> high severity
  - `通常でよい` -> medium severity
  - `急ぎではない` -> low severity
- Preserve the existing unregistered-customer name/phone check after priority selection.
- Preserve the registered-customer shortcut to the consultation body after priority selection.
- Store sanitized flow markers in the timeline.
- Include the selected priority in the alert message and staff notification detail.

## Out of scope

- LINE real send by Codex.
- OpenAI API execution.
- Supabase direct DB access, psql, or migration.
- Nginx, DNS, HTTPS, certbot, package, or runtime secret changes.
- Recording LINE user IDs, tokens, raw logs, or customer private data in docs.

## Result

- `担当者に相談` now flows through category -> priority -> contact/body.
- The final unreplied alert severity follows the selected priority.
- Staff notification details include the selected priority before the consultation body.
- Existing in-progress legacy flows without a priority marker remain compatible.

## Verification

- `git diff --check`
- `npx pnpm@10.12.1 exec vitest run tests/integration/line-webhook.test.ts`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Next

- Deploy the validated API/Admin runtime to VPS.
- Continue implementing the negotiation and aftercare rich-menu item flows one item at a time.

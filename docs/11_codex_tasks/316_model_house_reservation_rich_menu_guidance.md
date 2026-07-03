# Loop 316: model house reservation rich menu guidance

## Goal

Implement the first customer rich-menu flow one item at a time: tapping
`モデルハウス見学予約` should guide the customer to the reservation page and record sanitized
CRM evidence that the page was 案内済み.

## Scope

- Change only the initial/default customer rich menu model-house area from a direct URI action to a
  message action.
- Handle the exact message text `モデルハウス見学予約` in the LINE webhook.
- Reply with a short reservation guide containing the public reservation URL.
- Record `モデルハウス見学予約ページ案内済み` in the customer timeline.
- Do not create an unreplied staff alert for this guide-only action.

## Result

- Added a domain guide-action resolver for `initial.model_house_reservation`.
- Added webhook reply handling for customer rich-menu guide actions.
- Model-house guide taps create a system `reservation` timeline record with the public reservation
  URL as source metadata.
- The customer-facing rich menu definition now routes the model-house tile through LINE message
  handling so CRM can record the guide.

## Safety

- No LINE real send was executed by Codex.
- No OpenAI API execution, Supabase direct connection, production DB direct operation, DB migration,
  Nginx/DNS/HTTPS/certbot change, or secret/raw-log display was performed.
- The existing customer-facing LINE account remains the customer account.
- The separate `アマミホーム 相談受付` account remains staff-notification-only.

## Verification

- `npx pnpm@10.12.1 vitest run tests/integration/line-webhook.test.ts tests/integration/line-rich-menu-operator.test.ts`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`

## Next

- Apply the updated customer rich menu definition to LINE after validation.
- Continue one item at a time with the next selected customer flow.

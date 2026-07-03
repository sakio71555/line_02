# Loop 319: catalog request rich menu guidance

## Goal

Implement the next customer rich-menu flow one item at a time: tapping `資料請求` should guide
the customer to the download page and record sanitized CRM evidence that the page was 案内済み.

## Scope

- Change only the initial/default customer rich menu `資料請求` area from a direct URI action to a
  message action.
- Handle the exact message text `資料請求` in the LINE webhook through the existing guide-action
  path.
- Reply with a short catalog request guide containing the public download URL.
- Record `資料請求ページ案内済み` in the customer timeline.
- Do not create an unreplied staff alert for this guide-only action.

## Result

- Added `initial.catalog_request` to the domain guide-action resolver.
- Reused the existing webhook reply handling for customer rich-menu guide actions.
- Catalog request guide taps create a system timeline record with the public download URL as source
  metadata.
- The customer-facing rich menu definition now routes the catalog request tile through LINE message
  handling so CRM can record the guide.

## Safety

- No LINE real send was executed by Codex.
- No OpenAI API execution, Supabase direct connection, production DB direct operation, DB migration,
  Nginx/DNS/HTTPS/certbot change, or secret/raw-log display was performed during implementation.
- The existing customer-facing LINE account remains the customer account.
- The separate `アマミホーム 相談受付` account remains staff-notification-only.

## Verification

- `npx pnpm@10.12.1 vitest run tests/integration/line-webhook.test.ts tests/integration/line-rich-menu-operator.test.ts`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

## Next

- Apply the updated customer rich menu definition to LINE after validation.
- Continue one item at a time with the next selected customer flow.

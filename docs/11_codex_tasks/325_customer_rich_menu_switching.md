# Loop 325: customer rich menu switching

## Goal

Add production-facing customer rich menu switching so staff can switch an individual customer between the initial, negotiation, and aftercare LINE rich menus from the customer detail screen.

## Scope

- Add customer rich menu lifecycle types: `initial`, `negotiation`, and `aftercare`.
- Add Admin API client and customer-detail action wiring for per-customer menu switching.
- Add Admin API endpoint to link a customer's LINE user to a configured rich menu ID.
- Add timeline recording for menu switches.
- Extend the LINE client boundary with per-user rich menu linking.
- Extend the LINE rich menu operator so all three lifecycle menus can be created and the initial menu can be set as default.
- Keep rich menu IDs and LINE target identifiers out of API responses, docs, logs, and commits.

## Out of scope

- LINE real message sending by Codex.
- OpenAI API execution.
- Supabase direct DB access or psql.
- Nginx, DNS, HTTPS, certbot, or package changes.
- Recording LINE userId, tokens, rich menu IDs, raw logs, or customer private data in docs.

## Result

- Customer detail now includes a `LINEメニュー切替` panel with three switch actions.
- The API links the selected lifecycle menu to the customer's LINE account only when the corresponding runtime rich menu ID is configured.
- Missing menu IDs return a safe blocked response instead of guessing.
- Rich menu creation tooling can create the three lifecycle menus and write runtime IDs to an operator-provided env file without printing them.

## Verification

- Added integration coverage for the Admin client rich menu switch request.
- Added authenticated Admin API coverage for successful, missing-ID, and invalid-menu switch cases.
- Added customer action panel rendering coverage for the three switch buttons.
- Added LINE rich menu operator coverage for lifecycle menu creation without exposing IDs or tokens.

## Safety

- No LINE real send was executed by Codex.
- Rich menu IDs are not printed by the operator output.
- Customer LINE user IDs are not returned in the switch response.
- Staff notification, customer notification, and rich menu switching remain separated by runtime configuration.

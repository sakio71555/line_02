# Task 331: Customer archive and broadcast

## Goal

Add a recoverable customer removal control and a protected way to send one message to every eligible LINE-connected customer in the selected tenant.

## Scope

- Archive and restore customers from the customer detail screen without deleting conversation history or registered information.
- Exclude archived customers from the default customer list, active operations, and broadcast recipients.
- Add a dedicated Admin broadcast screen with recipient counts, explicit confirmation, a recipient limit, and duplicate-submit protection.
- Restrict customer archive/restore and broadcast operations to owner and manager roles.
- Record successful broadcast deliveries in each customer's LINE conversation history.

## Safety boundary

- No physical customer deletion; archived customer data remains recoverable.
- No archived, LINE-unlinked, cross-tenant, or duplicate LINE recipient is included in a broadcast.
- Broadcast stays disabled unless the existing real LINE send gates and the separate broadcast flag are enabled.
- One attempt per recipient, no automatic retry, and no individual recipient data in the aggregate result.
- No real LINE message, OpenAI API call, production database connection, secret access, VPS operation, or production deployment during implementation.

## Completion checks

- Archive requires an explicit confirmation and resolves the customer's outstanding alerts.
- Restore returns the customer to the active list without reopening resolved alerts.
- Preview and send use the same tenant-scoped, deduplicated recipient selection.
- Role, tenant, confirmation, limit, duplicate-submit, history, desktop, and mobile navigation behavior are covered by tests.
- `git diff --check`, lint, typecheck, unit tests, integration tests, and build pass.

## Result

- Added recoverable customer archive and restore controls. Archive removes the customer from normal operations, preserves customer and LINE history, and resolves outstanding alerts.
- Added a dedicated broadcast page with aggregate recipient counts, owner/manager authorization, a separate runtime enable flag, exact confirmation text, a recipient limit, and duplicate-submit protection.
- Broadcast selection is tenant-scoped, excludes archived and LINE-unlinked customers, and deduplicates matching LINE destinations.
- Each recipient is attempted once with no automatic retry. Successful deliveries are recorded in the customer's LINE conversation history.
- Validation passed: `git diff --check`, lint, typecheck (10/10 packages), test (1,350 passed and 4 skipped), integration test, and build (10/10 packages).
- Implementation validation did not send a real LINE message, call an external API, connect to the production database, or inspect customer data. Production deployment is performed only by the explicit follow-up instruction.

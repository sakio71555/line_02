# Task 332: AdminLTE-inspired admin UI refresh

## Objective

Refresh the existing admin UI with the information hierarchy of the AdminLTE dashboard while preserving all current APIs and production behavior.

Reference: <https://adminlte.io/themes/AdminLTE/index2.html>

## Scope

- Group desktop navigation by staff workflow.
- Add a persistent desktop context bar with direct access to the inbox and settings.
- Convert dashboard counts into compact information boxes.
- Tighten list, section, task, and quick-action presentation for repeated operational use.
- Preserve the mobile header and bottom navigation with responsive two-column metrics.

## Safety boundary

- No API, LINE delivery, customer data, authentication, or database behavior changes.
- No production LINE send, OpenAI call, or database operation during UI validation.
- Existing tenant brand colors remain the source of the primary accent color.

## Completion checks

- `git diff --check`: pass
- Secret-pattern boolean check: pass
- `npx pnpm@10.12.1 lint`: pass
- `npx pnpm@10.12.1 typecheck`: pass
- `npx pnpm@10.12.1 test`: pass, 1,350 passed and 4 skipped
- `npx pnpm@10.12.1 test:integration`: pass, 1,350 passed and 4 skipped
- `npx pnpm@10.12.1 build`: pass
- Desktop and mobile browser screenshots: pass for Home and Customers

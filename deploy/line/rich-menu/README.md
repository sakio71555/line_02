# LINE rich menu assets

This directory contains the customer-facing rich menu package for the Amami Home customer LINE Official Account.
Keep this menu on the customer-facing account. Do not apply it to the separate internal staff notification account.

## Current menu

- Asset directory: `deploy/line/rich-menu/amamihome-default`
- Definition: `rich-menu.json`
- Image: `rich-menu.png`
- Current default lifecycle: `amamihome-initial`
- Actions: message and HTTPS URI actions
- LINE message send: not performed by dry-run

## Lifecycle menus

- Initial: `deploy/line/rich-menu/amamihome-initial`
- Negotiation: `deploy/line/rich-menu/amamihome-negotiation`
- Aftercare: `deploy/line/rich-menu/amamihome-aftercare`
- Action key manifest: `deploy/line/rich-menu/amamihome-lifecycle-actions.json`
- Generate lifecycle assets: `python3 scripts/ops/generate_line_rich_menu_lifecycle_assets.py`

The initial menu is the default rich menu. Negotiation and aftercare menus are prepared for a later
per-customer rich menu switch. Customer registration and contact change should be wired through LIFF
identity verification before CRM writes are enabled.

## Design variants

- Variant assets: `deploy/line/rich-menu/amamihome-variants`
- Generate variants: `python3 scripts/ops/generate_line_rich_menu_variants.py`
- These are design drafts and are not the active lifecycle default.

## Validate without applying

```sh
npx pnpm@10.12.1 exec tsx scripts/ops/line_rich_menu_operator.ts --dry-run
```

The dry-run prints sanitized booleans only. It does not call the LINE API and does not print tokens.

## Apply to LINE Official Account

Apply changes only after operator approval:

```sh
LINE_RICH_MENU_APPLY_APPROVED=YES npx pnpm@10.12.1 exec tsx scripts/ops/line_rich_menu_operator.ts --apply
```

The apply command reads `LINE_CHANNEL_ACCESS_TOKEN` from the runtime environment. It does not print the token or the rich menu ID.

## Remove the default rich menu

Use this only when the LINE Official Account is the separate internal staff notification account.
Do not use it on the customer-facing account during normal operation.
The command cancels the default rich menu without sending LINE messages:

```sh
LINE_RICH_MENU_REMOVE_APPROVED=YES npx pnpm@10.12.1 exec tsx scripts/ops/line_rich_menu_operator.ts --remove-default
```

The remove command reads `LINE_CHANNEL_ACCESS_TOKEN` from the runtime environment. It does not print the token or the rich menu ID.

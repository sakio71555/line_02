# LINE rich menu assets

This directory contains the production rich menu package for the Amami Home LINE Official Account.

## Current menu

- Asset directory: `deploy/line/rich-menu/amamihome-default`
- Definition: `rich-menu.json`
- Image: `rich-menu.png`
- Actions: message actions only
- LINE message send: not performed by dry-run

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

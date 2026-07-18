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

## Publication safety

Every mutating command (`--apply`, `--asset-dir ... --apply`, `--apply-lifecycle`, and
`--remove-default`)
requires the following runtime values in addition to its approval flag and LINE access token:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TENANT_ID`
- `LINE_CHANNEL_ID`

The operator first creates an owner-specific local lock under the ignored
`tmp/locks/line-rich-menu-publication.lock/` directory, then acquires a Supabase runtime lease. The
shared lease is scoped by tenant and a hash of the stable LINE channel ID, so separate clones or
hosts using the same Supabase project and tenant cannot publish to the same LINE channel at the same
time. Access-token rotation does not change the lease key.

The shared lease is renewed while a LINE API request is in flight. If ownership is lost, the
operator stops before another LINE mutation or local output write. A stale local lock is not removed
automatically because it may still belong to a live process. Confirm that no publication process is
running before manually removing a stale lock.

Supabase lease RPC requests have a 10-second timeout. Acquire or renewal timeouts stop publication
before the next mutation. A release timeout is reported as `cleanup_required=true`, while the
owner-specific local lock is still released so a stalled network request cannot leave the repository
permanently blocked.

If LINE accepts a mutation but its response is lost, or if the shared lease is lost during the final
completion check, the operator reports `cleanup_required=true`. It does not guess the current LINE
state or automatically delete a menu that may be live; an operator must verify the default menu and
created menus before another publication.

## Apply lifecycle menus

Use this for the production customer-facing account when all three lifecycle menus must exist before per-customer switching:

```sh
LINE_RICH_MENU_APPLY_APPROVED=YES npx pnpm@10.12.1 exec tsx scripts/ops/line_rich_menu_operator.ts --apply-lifecycle --rich-menu-env-output <root-only-env-file>
```

This creates the initial, negotiation, and aftercare rich menus, sets the initial menu as the default, and writes the runtime rich menu IDs to the operator-provided root-only env file. The command output prints sanitized booleans only; it does not print the access token, LIFF ID, or rich menu IDs.

## Remove the default rich menu

Use this only when the LINE Official Account is the separate internal staff notification account.
Do not use it on the customer-facing account during normal operation.
The command cancels the default rich menu without sending LINE messages:

```sh
LINE_RICH_MENU_REMOVE_APPROVED=YES npx pnpm@10.12.1 exec tsx scripts/ops/line_rich_menu_operator.ts --remove-default
```

The remove command reads `LINE_CHANNEL_ACCESS_TOKEN` from the runtime environment. It does not print the token or the rich menu ID.

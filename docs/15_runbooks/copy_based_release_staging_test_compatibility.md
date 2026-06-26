# Copy-Based Release Staging Test Compatibility

## Purpose

This runbook records the compatibility requirements for testing a copy-based VPS release archive before any active deploy update.

It does not approve public production enablement.

## Background

Loop 121 stopped before active deploy because VPS staging full test failed for copy-based source assumptions:

- staging source has no `.git`.
- release archives intentionally exclude `.env*`.
- VPS Node.js 20.20.2 has no default global `WebSocket`.

Loop 121.1 patched those test/runtime-helper assumptions and validated the patched archive in VPS staging only.

## Compatibility Rules

### Source Identity

Dev-loop context collection must not require `.git` in copy-based staging source.

Allowed fallback markers:

- `.deploy-source`
- `.deploy-manifest.txt`
- `release-manifest.txt`
- parent `release-manifest.txt`
- `DEPLOYED_COMMIT`

If no marker exists, context collection may continue as `copy_based` with unknown commit.

### Env Contract

Release archives continue to exclude `.env*`.

Tests that need env key names may use:

```text
deploy/vps/taiyolabel/env/staging-env-contract.example
```

This file is intentionally not named `.env*`, contains no real values, and can be included in copy-based release archives.

### Node 20 WebSocket

Supabase client boundary tests must not require real WebSocket network access.

When Node.js lacks default `globalThis.WebSocket`, tests may install a test-only shim that:

- only satisfies constructor lookup.
- throws if code attempts to open an actual WebSocket.
- is not used by application runtime.

### Fresh pnpm Install

Root-level Vitest tests that render Admin UI components must resolve React through the Admin workspace dependency, not an accidental local hoist.

This avoids depending on a developer machine's pre-existing `node_modules` shape.

### Check-Config-Only Helpers

`--check-config-only` should parse and validate env shape only. It must not require:

- psql installed.
- DB network access.
- migration apply.
- schema / grant / RLS queries.

psql path/version checks remain required for real execution modes.

## Loop 121.1 Evidence

```text
patch_id=loop1211-20260626-185306
archive_sha256=ca6d1283323db65dc1778b8045c3a009a5279c17459aafc70f2cdf0a04f22c4b
staging_path=/root/deploy-staging/amami-line-crm/loop1211-20260626-185306
active_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
```

Passed in VPS staging:

```text
npx pnpm@10.12.1 install --frozen-lockfile
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
```

## Safety Boundary

Loop 121.1 did not:

- update `/var/www/amami-line-crm`.
- restart Admin/API services.
- change or reload Nginx.
- run external public smoke.
- touch DNS or certbot.
- call LINE/OpenAI/Supabase real services.
- create, display, or modify `.env` values.

## Next Gate

Active copy-based redeploy requires a separate explicit loop. It must preserve active `.env*`, backup current active source, update only after staging gates pass, restart only the existing localhost-only services, and keep Nginx/public exposure out of scope unless separately approved.

```text
production_readiness=production_no_go
```

## Loop 122 Follow-Up

Loop 122 used this compatibility patch for an active localhost-only copy-based redeploy.

```text
release_candidate=2a9a746940b5f7a707af4c042bb9225d3dea258b
staging_path=/root/deploy-staging/amami-line-crm/loop122-extract-20260626-190958/source
staging_install_lint_typecheck_test_integration_build=success
active_source_after=2a9a746940b5f7a707af4c042bb9225d3dea258b
active_deploy_updated=yes
nginx_reload_restart=no
external_smoke=no
production_readiness=production_no_go
```

Public production enablement remains out of scope.

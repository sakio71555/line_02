# 342 First staff owner bootstrap

## Goal

Ensure a tenant cannot begin staff management without an administrator while keeping the existing invitation workflow and production behavior intact.

## Changes

- Force the first staff membership in a tenant to the owner role in the API and repository boundaries.
- Serialize the database bootstrap by tenant and enforce the same owner rule inside the atomic PostgreSQL function.
- Show the first registration as a fixed administrator role and give an explicit next action in the empty state.
- Preserve the selected role for every registration after the first tenant member.

## Safety

- No real staff identity is created by this task; the operator must enter the actual administrator name and email.
- No LINE message, OpenAI request, customer data operation, Nginx change, DNS change, HTTPS change, or secret output is performed.
- Existing tenant data is not rewritten by the migration.

## Verification

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

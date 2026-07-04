# Loop 327: aftercare rich menu structured flows

## Goal

Add CRM-backed LINE conversation flows for the aftercare rich menu items that require staff handling.

## Scope

- Add structured LINE flows for:
  - `修理・点検依頼`
  - `定期点検予約`
  - `不具合を相談`
  - `保証・メンテナンス`
- Preserve the exact customer and bot conversation messages in the customer timeline.
- Store CRM classification fields for aftercare category, subcategory, target area, urgency, and desired response.
- Reflect urgent aftercare choices in alert severity.
- Generate staff notification details for aftercare staff with production Admin customer links.
- Keep `連絡先変更` on the existing LIFF form route and `担当者に相談` on the existing shared contact-staff flow.

## Out of scope

- LINE real send by Codex.
- OpenAI API execution.
- Supabase direct DB access, psql, or migration.
- Nginx, DNS, HTTPS, certbot, package, or runtime secret changes.
- Recording LINE user IDs, tokens, raw logs, or customer private data in docs.

## Result

- Aftercare rich menu actions now start structured staff-handled flows.
- Repair/trouble flows ask for urgency and photo/video guidance without forcing unrelated questions.
- Periodic inspection asks for desired inspection date/time and concern area.
- Warranty/maintenance is routed to aftercare staff with AI auto-reply disabled.

## Verification

- `git diff --check`
- `npx pnpm@10.12.1 exec vitest run tests/integration/line-webhook.test.ts`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Next

- Deploy the validated API/Admin runtime to VPS if the implementation checks pass.
- Continue UI/notification polish only from observed production behavior.

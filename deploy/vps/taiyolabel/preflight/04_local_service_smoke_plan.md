# 04 Local Service Smoke Plan

These commands are for a later VPS execution Loop only. Loop 108 does not execute them.

Planned local upstreams:

- API: `127.0.0.1:8788`
- Admin: `127.0.0.1:3002`

Install/build command shape:

```bash
npx pnpm@10.12.1 install --frozen-lockfile
npx pnpm@10.12.1 build
```

API start script:

```text
npx pnpm@10.12.1 --filter @amami-line-crm/api start
```

Admin start script:

```text
npx pnpm@10.12.1 --filter @amami-line-crm/admin start
```

Future local smoke:

```bash
curl -sS http://127.0.0.1:8788/health || true
curl -sS http://127.0.0.1:3002/ || true
```

Do not call LINE webhook, LINE push, OpenAI, Supabase mutation, or customer data endpoints in the first local smoke.

No-Go:

- install or build fails.
- API cannot bind `127.0.0.1:8788`.
- Admin cannot bind `127.0.0.1:3002`.
- local smoke returns an unexpected result.

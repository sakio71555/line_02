# Production Start Script and Port Boundary

## Purpose

Loop 107で、VPS deployment前に必要だったproduction start scriptとlocal upstream port境界をrepo内で整えた。

このrunbookは起動境界の確認用であり、VPS作業手順そのものではない。VPS SSH、systemd install、nginx reload、certbot、production smokeは後続Loopで扱う。

## Start Scripts

| app | package | build | start |
| --- | --- | --- | --- |
| API | `@amami-line-crm/api` | `npx pnpm@10.12.1 --filter @amami-line-crm/api build` | `npx pnpm@10.12.1 --filter @amami-line-crm/api start` |
| Admin | `@amami-line-crm/admin` | `npx pnpm@10.12.1 --filter @amami-line-crm/admin build` | `npx pnpm@10.12.1 --filter @amami-line-crm/admin start` |

Root build remains:

```text
npx pnpm@10.12.1 build
```

## API Binding

Production API binding is resolved in `apps/api/src/index.ts`.

Host precedence:

1. `API_HOST`
2. `HOST`
3. `127.0.0.1` in production

Port precedence:

1. `API_PORT`
2. `PORT`
3. `8788` in production
4. `4000` in non-production

Planned VPS API env:

```text
API_HOST=127.0.0.1
HOST=127.0.0.1
API_PORT=8788
PORT=8788
```

This keeps the production API service behind nginx and avoids accidental public `0.0.0.0` binding by default.

## Admin Binding

Admin uses the Next.js production server.

Planned VPS Admin env:

```text
HOSTNAME=127.0.0.1
PORT=3002
ADMIN_HOST=127.0.0.1
ADMIN_PORT=3002
```

`HOSTNAME` / `PORT` are the Next.js runtime binding values. `ADMIN_HOST` / `ADMIN_PORT` are retained as deployment documentation values for consistency with nginx and systemd.

## Systemd Template Commands

API:

```text
ExecStart=/usr/bin/env npx pnpm@10.12.1 --filter @amami-line-crm/api start
```

Admin:

```text
ExecStart=/usr/bin/env npx pnpm@10.12.1 --filter @amami-line-crm/admin start
```

The templates still must not be installed directly without a dedicated deployment Loop.

## Nginx Alignment

The planned nginx upstreams remain:

- Admin: `127.0.0.1:3002`
- API: `127.0.0.1:8788`

The nginx templates stay scoped to `admin.taiyolabel.site` and `api.taiyolabel.site`, do not use `default_server`, and do not reuse the existing `app.ajnl.net` certificate path.

## Local Verification Shape

Before any VPS execution, a later Loop should perform a local build/start smoke:

1. Build API and Admin.
2. Start API with production-like local binding:
   - `APP_ENV=production`
   - `NODE_ENV=production`
   - `API_HOST=127.0.0.1`
   - `API_PORT=8788`
3. Start Admin with:
   - `NODE_ENV=production`
   - `HOSTNAME=127.0.0.1`
   - `PORT=3002`
4. Curl local upstreams only.
5. Stop both processes.

Do not use production secrets for the local smoke unless a later explicit Loop approves it.

## Still No-Go

Loop 107 removes the start script and API port boundary blockers, but production deployment remains No-Go because:

- VPS SSH has not been executed in this Loop。
- systemd services have not been installed or started。
- nginx config has not been installed or reloaded。
- SSL/certbot has not been executed。
- external smoke has not been executed。
- LINE webhook has not been configured。
- LINE/OpenAI real APIs are not enabled。
- production Supabase smoke is not executed here。

Final status remains:

```text
production_no_go
```

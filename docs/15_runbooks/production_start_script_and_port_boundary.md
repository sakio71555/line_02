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

Loop 109のlocalhost-only VPS smokeで、APIのtsc出力は `apps/api/dist/apps/api/src/index.js`、Next.js Adminは `next start --hostname 127.0.0.1` の明示が必要であることを確認した。start scriptsとworkspace package exportsはこの出力に合わせて同期する。

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

Admin uses the Next.js production server with an explicit localhost hostname.

Planned VPS Admin env:

```text
HOSTNAME=127.0.0.1
PORT=3002
ADMIN_HOST=127.0.0.1
ADMIN_PORT=3002
```

The Admin `start` script passes `--hostname 127.0.0.1`; `PORT` remains the Next.js runtime port value. `ADMIN_HOST` / `ADMIN_PORT` are retained as deployment documentation values for consistency with nginx and systemd.

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

## Loop 253 Local Verification Result

Loop 253 executed the local-only production start verification checklist using existing scripts and safe local defaults.

```txt
loop_253_local_production_verification_status=pass
api_start_script_present=true
admin_start_script_present=true
api_production_bind_boundary_checked=true
admin_production_start_boundary_checked=true
local_start_without_external_runtime_possible=true
api_build_status=pass
admin_build_status=pass
api_local_start_status=pass
api_local_health_check=pass
admin_local_start_status=pass
admin_local_login_check=pass
api_process_stop_check=pass
admin_process_stop_check=pass
curl_scope=local_only
external_runtime_required=false_for_local_safe_defaults
operator_env_required=false_for_local_safe_defaults
production_no_go=true
dr_readiness_status=not_ready_restore_failed
classifier_route_status=frozen
```

No VPS, Nginx, DNS, HTTPS, certbot, public smoke, Supabase connection, LINE real send, OpenAI API call, `psql`, `pg_restore`, restore, DB change, package operation, `.env` display/change, or production runtime change was performed.

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

## Loop 108 Follow-up

Loop 108 adds the VPS dry deployment preflight command pack, rollback runbook, and No-Go checklist. It does not execute VPS SSH, systemd, nginx, certbot, external smoke, LINE/OpenAI, or Supabase commands.

Next operator docs:

- `docs/15_runbooks/vps_dry_deployment_preflight_commands.md`
- `docs/15_runbooks/vps_dry_deployment_rollback.md`
- `docs/15_runbooks/vps_dry_deployment_no_go_checklist.md`

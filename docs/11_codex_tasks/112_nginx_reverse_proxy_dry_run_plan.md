# Loop 112: Nginx reverse proxy dry-run plan

## Purpose

Loop 111でVPS localhost-only review環境のAPI/Adminが動作することを確認した。Loop 112では、Nginxで外部公開する前に、reverse proxyのdry-run計画とplaceholder exampleをrepo内に整理する。

このLoopではNginx公開は行わない。

## Scope

- VPSの現状をread-onlyで確認する。
- API/Adminのlocalhost bindとhealth状態を確認する。
- 既存Nginx設定にamami-line-crmがまだ有効化されていないことを確認する。
- repo内にreverse proxy dry-run runbookを追加する。
- repo内にNginx reverse proxy exampleを追加する。
- production readiness docsとdev logを更新する。
- secret scanと通常の品質ゲートを実行する。
- commitし、remote設定済みならpushする。

## Out of Scope

- `/etc/nginx/sites-available` / `sites-enabled` への反映。
- Nginx reload / restart。
- `nginx -t` を本番設定へ向けて実行すること。
- certbot / HTTPS issue。
- DNS変更。
- public port追加。
- `.env` 作成・変更、secret表示。
- LINE API、OpenAI API、Supabase実接続。
- API/Admin runtime、UI、DB schemaの変更。

## Starting State

- local branch: `main...origin/main`
- local start status: clean
- latest local commit before this Loop: `2cd6d78 docs: record VPS localhost redeploy and mobile review`
- VPS review target remains localhost-only:
  - API: `127.0.0.1:8788`
  - Admin: `127.0.0.1:3002`
- production readiness remains:

```text
production_no_go
```

## VPS Read-only Confirmation

Loop 112 uses only read-only confirmation on the VPS.

Confirmed items to collect without printing secrets:

- `/var/www/amami-line-crm` exists.
- `DEPLOYED_COMMIT` records the deployed source.
- API/Admin services are active.
- API/Admin listen on `127.0.0.1:8788` / `127.0.0.1:3002`.
- The review ports are not bound to `0.0.0.0` or `::`.
- API `/health` returns `200`.
- Admin `/login` returns `200`.
- `/etc/nginx/sites-enabled/amami-line-crm` is absent.
- Current Nginx summary does not route public traffic to amami-line-crm.

Do not print `.env` values, tokens, database URLs, Authorization headers, LINE identifiers, or production logs.

Loop 112 result:

- hostname: `vm-227d8253-eb`
- release path: `/var/www/amami-line-crm`
- release style: copy-based release without `.git`
- `DEPLOYED_COMMIT`: `176cb34fc6059ecabfb9826daacaabc2a437bebe`
- `nginx`: active
- `amami-line-crm-api.service`: active
- `amami-line-crm-admin.service`: active
- API health: `200`
- Admin `/login`: `200`
- `127.0.0.1:8788` and `127.0.0.1:3002` are localhost-bound.
- no public bind found for review ports `3002` / `8788`.
- `/etc/nginx/sites-enabled/amami-line-crm`: absent.
- `/etc/nginx/sites-available/amami-line-crm`: absent.

## Added Nginx Example

Added:

```text
deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example
```

The example intentionally uses:

```text
server_name _CHANGE_ME_;
```

This prevents accidental copy-paste as a ready production config. A later Loop must replace the placeholder, copy to the VPS, run config test, and decide whether to reload Nginx.

Planned upstreams:

| path | upstream | purpose |
| --- | --- | --- |
| `/` | `http://127.0.0.1:3002` | Admin UI |
| `/api/` | `http://127.0.0.1:8788/api/` | API routes |
| `/api/health` | `http://127.0.0.1:8788/health` | API health check through public path |

The example includes `Host`, `X-Forwarded-*`, `X-Real-IP`, and websocket upgrade headers.

## Dry-run Plan

Future dry-run should happen in a separate explicit Loop:

1. Re-run local quality gates.
2. Re-confirm VPS services and localhost bind.
3. Copy the example to a temporary review filename, not directly to `sites-enabled`.
4. Replace `_CHANGE_ME_` with the approved host.
5. Verify config syntax in an isolated review step.
6. Confirm no conflict with existing `default`, `ehime-portal`, or `line-transport` sites.
7. Stop if the config test fails.
8. Only a later explicit public-enable Loop may create the `sites-enabled` symlink and reload Nginx.

Loop 112 stops before step 3.

## Curl Examples for a Later Loop

Use Host header based smoke only after the config is intentionally staged:

```bash
curl -sS -H 'Host: _CHANGE_ME_' http://127.0.0.1/api/health
curl -sS -I -H 'Host: _CHANGE_ME_' http://127.0.0.1/
```

Do not use real secrets in curl examples.

## Go / No-Go

Go for a later Nginx enablement Loop requires:

- local `lint` / `typecheck` / `test` / `test:integration` / `build` pass.
- secret scan has no real secret values.
- API/Admin services are healthy on localhost.
- review ports are not public-bound.
- `_CHANGE_ME_` has been replaced with an approved host.
- `nginx -t` passes in that future Loop.
- rollback command is prepared.

No-Go if:

- `.env` values must be displayed to proceed.
- current Nginx config already routes the same host elsewhere.
- API/Admin health checks fail.
- review ports are public-bound unexpectedly.
- `nginx -t` fails.
- production Auth/LINE/OpenAI/Supabase gates are being mixed into the same Loop.

## Rollback Boundary

Loop 112 does not modify Nginx, so no runtime rollback is needed.

For a future enablement Loop, rollback must be scoped to amami-line-crm only:

```bash
sudo rm -f /etc/nginx/sites-enabled/amami-line-crm
sudo nginx -t
sudo systemctl reload nginx
```

Only reload after a passing config test.

## Test / Validation

Loop 112 validates:

- Nginx example has placeholder host and localhost upstreams.
- Nginx example includes forwarding headers.
- docs keep `production_no_go`.
- docs explicitly say not to reload/restart Nginx, run certbot, change DNS, or expose public traffic in this Loop.
- local quality gates pass.

## Result

Loop 112 adds only docs and a repo-local example config. It does not change runtime behavior.

## Next Loop Candidates

1. Loop 113: Nginx reverse proxy staged config test
2. Loop 114: LINE webhook production dry-run checklist
3. Loop 115: Supabase production runtime preflight

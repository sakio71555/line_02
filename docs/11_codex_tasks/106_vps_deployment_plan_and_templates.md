# Loop 106: VPS Deployment Plan and Templates

## Goal

`taiyolabel.site` を使った将来のVPS deploymentに備えて、既存VPSを壊さないためのrunbook、nginx template、systemd template、env example、rollback手順をrepo内へ追加する。

Loop 106ではVPSへ接続せず、production deployも行わない。

## Scope

- VPS監査結果をdocsへ記録する。
- `admin.taiyolabel.site` と `api.taiyolabel.site` の予定upstreamを整理する。
- nginx HTTP bootstrap / SSL templateを追加する。
- systemd service templateを追加する。
- production env exampleを追加する。
- SSL / certbot / secret投入 / rollback手順をrunbook化する。
- 既存アプリを壊さないNo-Go条件を明文化する。
- docs validation testを追加する。
- production readiness finalを更新する。

## Out of Scope

- VPSへのSSH。
- VPS上のコマンド実行。
- git clone / rsync / pnpm install。
- `.env.production` 作成。
- systemd service作成。
- nginx設定配置、`nginx -t`、reload。
- certbot実行。
- LINE webhook設定。
- LINE API / OpenAI API呼び出し。
- production/staging Supabase接続。
- dependency追加、`package.json` / lockfile変更。

## VPS Audit Summary

- VPS: `160.251.174.201`
- OS: Ubuntu 24.04.3 LTS
- Node: v20.20.2
- corepack: 0.34.6
- pnpm: global commandなし
- git: 2.43.0
- nginx: active/running
- system restart required表示あり。Loop 106ではrestart禁止。

Existing ports:

- 80 / 443: nginx
- 8080: nginx / ehime-portal系
- 127.0.0.1:8001: line-transport API / uvicorn
- 127.0.0.1:3100: ehime crawler admin / node

Existing nginx:

- sites-enabled: `default`, `ehime-portal`, `line-transport`
- conf.d: `ehime-subsidy-route-map.conf`

Existing systemd:

- `ehime-crawler-admin.service`
- `line-transport-api.service`
- `nginx.service`

Existing SSL:

- `/etc/letsencrypt/live/app.ajnl.net`
- certificate domains: `app.ajnl.net`, `api.ajnl.net`
- `taiyolabel.site` 用証明書は未作成。

Planned placement:

- `/var/www/amami-line-crm`

## Planned Routing

| public host | local upstream | app |
| --- | --- | --- |
| `admin.taiyolabel.site` | `127.0.0.1:3002` | amami-line-crm admin |
| `api.taiyolabel.site` | `127.0.0.1:8788` | amami-line-crm api |

Planned names do not conflict with current audit:

- port 3002: 空き
- port 8788: 空き
- systemd service prefix `amami-line-crm-*`: 未使用
- placement `/var/www/amami-line-crm`: 未使用

## Added Templates

- `deploy/vps/taiyolabel/README.md`
- `deploy/vps/taiyolabel/nginx/amami-line-crm-http-bootstrap.conf.template`
- `deploy/vps/taiyolabel/nginx/amami-line-crm-ssl.conf.template`
- `deploy/vps/taiyolabel/systemd/amami-line-crm-api.service.template`
- `deploy/vps/taiyolabel/systemd/amami-line-crm-admin.service.template`
- `deploy/vps/taiyolabel/env/api.env.example`
- `deploy/vps/taiyolabel/env/admin.env.example`

## Important No-Go Found in Repo

Current package scripts do not define production `start` scripts:

- `apps/api/package.json` has `dev`, `build`, `typecheck` only.
- `apps/admin/package.json` has `dev`, `build`, `typecheck` only.

Also, `apps/api/src/index.ts` currently starts the API server on a fixed port in code. The planned `127.0.0.1:8788` upstream needs a later production start/port boundary before real deployment.

Therefore the systemd templates are fail-closed placeholders. They must not be installed until a later Loop adds and verifies real production start scripts and port configuration.

## LINE Webhook Route

Code currently defines:

```text
POST /api/line/webhook/:webhookSecret
```

Future LINE webhook URL should therefore be:

```text
https://api.taiyolabel.site/api/line/webhook/<webhookSecretPath>
```

Do not write the real webhook secret path into docs or screenshots.

## Test Coverage

`tests/integration/vps-deployment-plan.test.ts` validates:

- templates exist。
- nginx templates contain `admin.taiyolabel.site` / `api.taiyolabel.site`。
- nginx templates contain `127.0.0.1:3002` / `127.0.0.1:8788`。
- nginx templates do not contain `default_server`。
- nginx templates do not reuse existing `app.ajnl.net` cert path。
- systemd templates are fail-closed and mention `amami-line-crm-api/admin`。
- env examples do not contain secret-like values。
- docs preserve `production_no_go`。

## Production Readiness Impact

Progress:

- DNS/VPS audit result recorded。
- deployment plan and rollback plan prepared。
- admin/api host and port policy documented。
- nginx/systemd/env templates prepared。

Still No-Go:

- No VPS deploy。
- No SSL issue。
- No production start scripts。
- No API port configurability for planned 8788 upstream。
- No LINE webhook setup。
- No OpenAI real API smoke。
- No production Supabase connection。

Final status remains:

```text
production_no_go
```

## Next Loop Candidates

- Loop 107: production start script and port boundary plan
- Loop 108: VPS deployment preflight dry-run checklist
- Loop 109: production readiness final re-check

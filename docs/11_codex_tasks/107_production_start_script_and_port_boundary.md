# Loop 107: production start script and port boundary

## Goal

Loop 106で残った `production start scripts` 未定義と、API planned port `8788` がruntime codeへ接続されていない問題を解消する。

今回はrepo内の起動境界とVPS templateの整合だけを扱う。VPS接続、systemd install、nginx reload、certbot、production smokeは行わない。

## Scope

- `apps/api` にproduction用 `start` scriptを追加する。
- `apps/admin` にproduction用 `start` scriptを追加する。
- API serverのhost/port解決をenv境界へ切り出す。
- production APIはdefaultで `127.0.0.1:8788` にbindする。
- development/testの既存挙動はできるだけ維持する。
- `deploy/vps/taiyolabel` のsystemd/env templateをstart scriptとport境界へ合わせる。
- nginx planned upstream `127.0.0.1:3002` / `127.0.0.1:8788` と整合する静的testを追加する。
- README、runbook、dev loop、production readiness、dev logを更新する。

## Out of Scope

- VPS SSH。
- `/var/www/amami-line-crm` 作成。
- systemd service作成、start、restart。
- nginx設定配置、`nginx -t`、reload。
- certbot実行。
- production/staging Supabase接続。
- LINE webhook設定、LINE API送信。
- OpenAI API呼び出し。
- `.env.production` 作成。
- dependency追加、`pnpm install`。

## Added Start Scripts

| package | script | command |
| --- | --- | --- |
| `@amami-line-crm/api` | `start` | `node dist/index.js` |
| `@amami-line-crm/admin` | `start` | `next start` |

VPS templateではglobal `pnpm` を前提にせず、既存方針に合わせて以下を使う。

```text
npx pnpm@10.12.1 --filter @amami-line-crm/api start
npx pnpm@10.12.1 --filter @amami-line-crm/admin start
```

## API Port Boundary

API serverは `resolveApiServerListenOptions` でlisten optionを決める。

production判定:

- `APP_ENV=production`
- または `NODE_ENV=production`

host precedence:

1. `API_HOST`
2. `HOST`
3. production default `127.0.0.1`
4. development/testでは未指定のまま既存挙動を維持

port precedence:

1. `API_PORT`
2. `PORT`
3. production default `8788`
4. development/test default `4000`

invalid portは無視し、productionでは `8788`、non-productionでは `4000` へfallbackする。

## Admin Port Boundary

AdminはNext.js標準の `next start` を使う。

VPS template / env exampleでは以下を揃える。

- `HOSTNAME=127.0.0.1`
- `PORT=3002`
- `ADMIN_HOST=127.0.0.1`
- `ADMIN_PORT=3002`

`ADMIN_HOST` / `ADMIN_PORT` はdeployment document valueとして残し、実際のNext.js bindingは `HOSTNAME` / `PORT` を使う。

## Systemd Template Policy

Loop 106のfail-closed `ExecStart` は、Loop 107で実在するstart script呼び出しへ更新した。

ただしtemplateはまだrepo内のtemplateであり、VPSへinstallしていない。実サーバー反映は後続Loopのpreflight、backup、build、local smoke、nginx/certbot手順を通してから行う。

## Test Coverage

`tests/integration/production-start-port-boundary.test.ts` で以下を確認する。

- API production defaultが `127.0.0.1:8788` になる。
- API development defaultはport `4000` を維持する。
- `API_HOST` / `API_PORT` が `HOST` / `PORT` より優先される。
- API/Admin packageに `start` scriptがある。
- systemd templateが存在するstart scriptを呼ぶ。
- env exampleとnginx upstreamが `127.0.0.1:3002` / `127.0.0.1:8788` で整合する。
- nginx templateに `default_server` と既存 `app.ajnl.net` cert pathがない。
- production readinessは引き続き `production_no_go`。

`tests/integration/vps-deployment-plan.test.ts` も、Loop 106のfail-closed期待からLoop 107後のstart script境界期待へ更新した。

## Production Readiness Impact

Resolved in Loop 107:

- production start scripts are defined。
- API planned port `8788` is wired to runtime code。
- systemd templates reference real package scripts。
- Admin planned port `3002` is represented by `HOSTNAME` / `PORT`。

Still No-Go:

- VPS deploy is not executed。
- systemd services are not installed。
- nginx config is not installed or reloaded。
- SSL/certbot is not executed。
- external smoke is not executed。
- LINE webhook is not configured。
- LINE/OpenAI real APIs are not enabled。
- production Supabase smoke is not executed in this Loop。

Final status remains:

```text
production_no_go
```

## Next Loop Candidates

- Loop 108: VPS deployment preflight dry-run checklist
- Loop 109: production build/start local smoke without VPS
- Loop 110: VPS deployment execution gate

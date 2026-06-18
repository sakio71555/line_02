# Loop 109: VPS localhost-only mock deployment execution

## Goal

既存VPSへ `amami-line-crm` を配置し、外部公開せず `127.0.0.1` bindだけでAPI/Adminを起動する。ユーザーはSSH tunnel経由でAdmin UIの使用感を確認する。

今回のLoopではNginx設定追加、Nginx reload、certbot、LINE webhook設定、LINE/OpenAI/Supabase実接続は行わない。

## Scope

- ローカルmainの品質ゲート確認。
- VPS read-only audit。
- 既存Nginx/site/service/cert状態のバックアップ。
- `/var/www/amami-line-crm` へのrelease配置。
- `/etc/amami-line-crm/api.env` と `/etc/amami-line-crm/admin.env` のreview/mock値作成。
- VPS上で `npx pnpm@10.12.1 install --frozen-lockfile` と `npx pnpm@10.12.1 build`。
- `amami-line-crm-api.service` と `amami-line-crm-admin.service` のlocalhost-only systemd service作成。
- `systemctl start` のみ実行し、`enable` はしない。
- `127.0.0.1:8788` と `127.0.0.1:3002` のlocal curl smoke。
- SSH tunnel確認手順の記録。
- VPS smokeで見つかったproduction start/export境界の最小修正。

## Out of Scope

- Nginx設定追加、`nginx -t`、reload/restart。
- certbot / HTTPS化。
- LINE webhook登録。
- LINE API / OpenAI API呼び出し。
- Supabase production/staging接続。
- `.env.production` 作成。
- real secret投入。
- 既存 `default` / `ehime-portal` / `line-transport` の変更。
- 既存Nginx、既存systemd service、既存証明書の変更。
- `apt update` / `apt upgrade` / reboot。

## Execution Notes

- VPS: `160.251.174.201`
- Release directory: `/var/www/amami-line-crm`
- Review env directory: `/etc/amami-line-crm`
- API: `127.0.0.1:8788`
- Admin: `127.0.0.1:3002`
- Services:
  - `amami-line-crm-api.service`
  - `amami-line-crm-admin.service`
- Services are started but not enabled.

Initial service smoke exposed two start-boundary issues:

- API compiled output still contains extensionless ESM relative imports, so localhost review uses `tsx src/index.ts`.
- Workspace packages used by API export `dist/<package>/src/index.js` in the current build layout.
- Admin `next start` needed explicit `--hostname 127.0.0.1`; relying on env alone allowed a public bind on the VPS.

The Loop updates package start/export metadata and records the correction before re-running smoke.

## Review / Mock Env

The VPS env files use review/mock values only:

- `REPOSITORY_RUNTIME=in_memory`
- `AUTH_SESSION_VERIFIER=fake`
- `LINE_MESSAGING_ENABLED=false`
- `LINE_REAL_PUSH_ENABLED=false`
- `AI_PROVIDER=mock`
- `OPENAI_REAL_API_ENABLED=false`

No LINE token, OpenAI key, Supabase URL/key, DB URL, JWT, Bearer token, database password, project ref, or real customer data is written to docs.

## SSH Tunnel For User Review

Mac側の別ターミナルで:

```bash
ssh -L 3002:127.0.0.1:3002 -L 8788:127.0.0.1:8788 root@160.251.174.201
```

ブラウザ:

```text
http://localhost:3002
```

## Production Readiness

This Loop is still review/mock only. Production remains:

```text
production_no_go
```

Remaining blockers:

- Nginx public routing is not installed.
- SSL/certbot is not executed.
- `admin.taiyolabel.site` / `api.taiyolabel.site` external smoke is not executed.
- Admin real login smoke is not executed.
- LINE webhook is not configured.
- LINE/OpenAI real smoke is not executed.
- Supabase production connection is not executed.

## Rollback

If rollback is needed, stop and remove only amami-line-crm assets:

- `amami-line-crm-api.service`
- `amami-line-crm-admin.service`
- `/var/www/amami-line-crm`
- `/etc/amami-line-crm`

Do not touch existing Nginx config, existing sites, existing services, or existing certificates.

## Test Coverage

- Existing local lint/typecheck/test/test:integration/build remain required.
- `tests/integration/production-start-port-boundary.test.ts` covers corrected start scripts and workspace package exports.

## Next Loop

- Loop 110: User tunnel review and UI checklist

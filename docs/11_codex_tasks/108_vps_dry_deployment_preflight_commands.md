# Loop 108: VPS dry deployment preflight commands

## Goal

`taiyolabel.site` 向けVPS実作業へ進む前に、既存アプリを壊さないためのdry deployment preflight command pack、rollback、No-Go checklistをrepo内に整備する。

Loop 108ではVPSへSSHせず、VPS上のコマンド、nginx、systemd、certbot、LINE/OpenAI/Supabase接続を実行しない。

## Scope

- Loop 106 / 107のdeployment templatesとstart/port boundaryを前提にpreflight docsを追加する。
- VPS read-only audit command packを作る。
- release directory、secret env、dependency install/build、local service smoke、systemd、nginx、certbot、external smokeの順序を整理する。
- rollback runbookを作る。
- No-Go checklistを作る。
- static testsでdocsの存在、host/port整合、既存アプリ保護、`production_no_go` 維持を確認する。
- README、dev loop、production readiness、external services checklist、dev logを更新する。

## Out of Scope

- VPS SSH。
- VPS上のコマンド実行。
- VPS上のfile作成、git clone、rsync、pnpm install、build。
- systemd作成、start、enable、restart。
- nginx config配置、`nginx -t`、reload。
- certbot実行。
- `.env.production` 作成。
- `.env.staging` 閲覧。
- secret値表示。
- LINE webhook設定、LINE API呼び出し。
- OpenAI API呼び出し。
- Supabase production/staging接続。
- RLS / migration / GRANT変更。
- dependency追加、lockfile変更。

## Added Docs

- `docs/15_runbooks/vps_dry_deployment_preflight_commands.md`
- `docs/15_runbooks/vps_dry_deployment_rollback.md`
- `docs/15_runbooks/vps_dry_deployment_no_go_checklist.md`
- `deploy/vps/taiyolabel/preflight/README.md`
- `deploy/vps/taiyolabel/preflight/01_read_only_audit.md`
- `deploy/vps/taiyolabel/preflight/02_prepare_release_directory.md`
- `deploy/vps/taiyolabel/preflight/03_env_secret_injection_checklist.md`
- `deploy/vps/taiyolabel/preflight/04_local_service_smoke_plan.md`
- `deploy/vps/taiyolabel/preflight/05_nginx_http_bootstrap_plan.md`
- `deploy/vps/taiyolabel/preflight/06_certbot_ssl_plan.md`
- `deploy/vps/taiyolabel/preflight/07_external_smoke_plan.md`
- `deploy/vps/taiyolabel/preflight/99_rollback_plan.md`

## Preflight Order

1. Phase 0: Read-only audit。
2. Phase 1: Release directory preparation。
3. Phase 2: Secret env file creation。
4. Phase 3: Dependency install / build。
5. Phase 4: Local service smoke。
6. Phase 5: systemd service registration。
7. Phase 6: nginx HTTP bootstrap。
8. Phase 7: certbot SSL issue。
9. Phase 8: HTTPS nginx config。
10. Phase 9: external smoke。
11. Phase 10: LINE webhook URL registration。
12. Phase 11: OpenAI/LINE real gates still disabled。

All phases are documented only in Loop 108. None are executed.

## Safety Notes

- Existing nginx `default` / `ehime-portal` / `line-transport` configs are not overwritten.
- Existing `/var/www/ehime-portal`, `/var/www/line-transport`, `/var/www/html` are not touched.
- Existing `app.ajnl.net` / `api.ajnl.net` certificate is not reused or modified.
- Planned new site name is `amami-line-crm`.
- Planned local upstreams remain `127.0.0.1:3002` and `127.0.0.1:8788`.
- Initial real provider flags remain disabled: `LINE_MESSAGING_ENABLED=false`, `LINE_REAL_PUSH_ENABLED=false`, `AI_PROVIDER=mock`, `OPENAI_REAL_API_ENABLED=false`.

## Test Coverage

`tests/integration/vps-dry-deployment-preflight.test.ts` validates:

- preflight, rollback, and No-Go runbooks exist。
- preflight docs contain `admin.taiyolabel.site`, `api.taiyolabel.site`, `127.0.0.1:3002`, and `127.0.0.1:8788`。
- docs state Loop 108 does not execute VPS SSH, systemd, nginx, certbot, production smoke, LINE/OpenAI, or Supabase connection。
- rollback docs list assets to remove and assets not to touch。
- nginx templates do not use `default_server` and do not reuse the existing ajnl certificate path。
- env examples contain no obvious secret-like values。
- production readiness remains `production_no_go`。

## Production Readiness Impact

Progress in Loop 108:

- VPS dry deployment preflight command pack created。
- rollback runbook created。
- No-Go checklist created。
- secret injection checklist created。
- nginx/systemd/certbot pre-execution checks documented。

Still No-Go:

- VPS deploy not executed。
- systemd/nginx/certbot not executed。
- production Supabase connection not executed。
- Admin real login smoke not executed。
- LINE webhook and real LINE smoke not executed。
- OpenAI real smoke not executed。
- production external smoke not executed。

Final status remains:

```text
production_no_go
```

## Next Loop Candidate

- Loop 109: VPS dry deployment execution gate

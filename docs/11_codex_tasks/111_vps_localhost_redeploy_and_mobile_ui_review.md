# Loop 111: VPS localhost-only redeploy and mobile UI review

## Purpose

Loop 110で追加したmobile-first Admin UIを、既存VPSのlocalhost-only review環境へ反映し、外部公開なしでAPI/Adminが動くことと、スマートフォン幅で最低限崩れないことを確認する。

## Scope

- ローカルで `lint` / `typecheck` / `test` / `test:integration` / `build` を再実行する。
- secret scanを実行し、実値らしいsecretがないことを確認する。
- VPS review環境をread-only preflightする。
- Go条件を満たした場合だけ、VPSのlocalhost-only review環境を更新する。
- SSH tunnel経由でmobile UI smoke reviewを行う。
- 証跡をdocsとdev logへ残す。
- 明確なmobile UI小崩れだけ、`apps/admin` の表示範囲で最小修正する。

## Out of Scope

- Nginx公開、HTTPS/certbot、DNS変更。
- public port追加。
- `.env` 作成・変更、secret表示。
- Supabase runtime接続、migration、RLS、Auth/JWT変更。
- LINE API、OpenAI API、Supabase本番/staging接続。
- API contract変更、依存追加、lockfile変更。

## Starting State

- Local start status: clean。
- Branch: `main...origin/main`。
- Expected UI commit: `6b0b827 feat: modernize admin UI for mobile`。
- VPS review環境は旧commit `516e07ee6746c04a57e6ff222aeb9a74e678c13d`。
- VPS release directoryはgit worktreeではなく、`DEPLOYED_COMMIT` で配置commitを記録するcopy-based releaseだった。

## Local Verification

VPSへ触る前と、UI tap target修正後に以下を実行した。

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

Result:

- `test` / `test:integration`: 97 files passed / 1 skipped、647 passed / 4 skipped。
- `build`: 10 package successful。
- Next.js ESLint plugin warningは既存警告として継続。

## Secret Scan

以下のパターンを確認した。

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `Authorization: Bearer`
- `sk-`
- `eyJ`
- `postgresql://`

Result:

- 実secretらしい値はなし。
- 検出はtests fixture、template文字列、docs内の `<token>` / `<access_token>` / fake valueのみ。

## VPS Preflight

確認結果:

- `/var/www/amami-line-crm` exists。
- releaseはcopy-basedで `.git` は存在しない。
- `DEPLOYED_COMMIT` は旧commit `516e07ee6746c04a57e6ff222aeb9a74e678c13d`。
- rollback backup directoryあり。
- `/etc/amami-line-crm/api.env` / `admin.env` の存在確認済み。
- env値は表示せず、safe flagの一致だけ確認。
- API/Admin services are active。
- `127.0.0.1:8788` / `127.0.0.1:3002` でlisten。
- `0.0.0.0` / `::` のreview port bindなし。

Safe flags confirmed:

- `APP_ENV=development`
- `REPOSITORY_RUNTIME=in_memory`
- `AUTH_SESSION_VERIFIER=fake`
- `LINE_MESSAGING_ENABLED=false`
- `LINE_REAL_PUSH_ENABLED=false`
- `AI_PROVIDER=mock`
- `OPENAI_REAL_API_ENABLED=false`
- Admin API base is `http://127.0.0.1:8788`
- dev tenant header is enabled only for review。

## Redeploy

Go条件を満たしたため、VPSで以下を行った。

- backup作成: `/root/deploy-backups/amami-line-crm/loop111-20260622-153449`
- local git archiveをVPS release directoryへstream展開。
- `npx pnpm@10.12.1 build`。
- `amami-line-crm-api.service` / `amami-line-crm-admin.service` をrestart。
- Nginx、certbot、DNS、public portは触っていない。

最初に `6b0b827dc2b9edf3a497def59dc107eda15bb27b` を反映した後、Browser smokeで戻るリンクのtap targetが小さいことを確認したため、`fix: polish admin mobile review issues` を追加した。

Final VPS deployed commit:

```text
176cb34fc6059ecabfb9826daacaabc2a437bebe
```

## Post-deploy Smoke

- API `/health`: `200`、`external_connections: "disabled"`。
- API `/`: `404` expected。
- Admin `/`: `200`。
- Admin `/login`: `200`。
- Admin `/select-tenant`: `200`。
- Admin `/customers`: `200`。
- Admin `/customers/customer_demo_yamada_taro`: `200` after demo seed。
- Admin `/alerts`: `200`。
- `POST /api/dev/seed-demo-data`: `200` with `x-tenant-id: tenant_amamihome`。
- `POST /api/admin/alerts/check-unreplied`: `200`。
- `POST /api/admin/alerts/notify-open`: `200`。
- alert aggregate after notify: total 1, `notified: 1`。

## Browser Mobile Smoke

SSH tunnel:

```text
localhost:3002 -> VPS 127.0.0.1:3002
localhost:8788 -> VPS 127.0.0.1:8788
```

Checked viewport/page matrix:

- 375 x 667
- 390 x 844
- 430 x 932
- 768 x 1024
- 1280 x 800

Pages:

- `/`
- `/login`
- `/select-tenant`
- `/customers`
- `/customers/customer_demo_yamada_taro`
- `/alerts`
- `/permission-denied`
- `/session-expired`

Result:

- 40 checks completed。
- Horizontal overflow: 0。
- Fatal page text: 0。
- Main nav missing on app pages: 0。
- Login nav violation: 0。
- 戻るリンクのtap targetを44px以上へ修正済み。

Residual note:

- `role-visibility-note` 内の準備画面リンク `/permission-denied` はinline technical linkとして一部viewportで小さく検出される。主要CTAではないが、初心者向けUIとしては後続Loopで「準備画面を見る」button風表示へ整理するとよい。

## Production Readiness

Still:

```text
production_no_go
```

理由:

- Nginx公開、HTTPS、DNS、external smokeは未実施。
- real Supabase Auth login/session/token smokeは未完了。
- LINE real push / OpenAI real APIは未接続。
- Supabase runtimeはreview環境で使っていない。

## Next Loop Candidates

1. Loop 112: Nginx公開前 reverse proxy dry-run plan
2. Loop 113: LINE webhook production dry-run checklist
3. Loop 114: Supabase staging connection preflight

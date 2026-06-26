# Loop 121.1: copy-based VPS staging test compatibility patch

## Goal

Loop 121で判明したcopy-based VPS staging testの互換性問題を、active deployへ進まずに解消する。

## Scope

- copy-based sourceに `.git` が無い場合でもdev-loop repo context収集を止めない。
- release archiveが `.env*` を除外しても、testが参照できる安全な非dotenv env contractを用意する。
- Node.js 20.20.2でdefault `WebSocket` が無い環境でも、Supabase client boundary testsを実ネットワークなしで実行できるようにする。
- root packageから直接 `react` が見えないfresh pnpm install環境でも、Admin UI static testsをVitest上で解決できるようにする。
- `--check-config-only` helperはenv parseのみを確認し、psql未導入VPS stagingでも失敗しないようにする。
- local quality gateとVPS staging quality gateを確認する。
- docs/dev log/runbookを更新する。

## Out of Scope

- active deploy更新。
- `/var/www/amami-line-crm` へのrsync。
- systemd restart。
- Nginx sites-enabled変更、reload、restart。
- DNS、certbot、HTTPS、external smoke。
- LINE/OpenAI/Supabase実接続。
- API/Auth/RLS/runtime/migration behavior変更。
- dependency追加、lockfile変更。
- `.env` 作成、表示、変更。

## Changes

- `scripts/dev-loop/lib/repo-context.mjs`
  - repo root自身に `.git` が無いcopy-based sourceでは、`.deploy-source`、`.deploy-manifest.txt`、`release-manifest.txt`、親階層の `release-manifest.txt`、`DEPLOYED_COMMIT` からsource identityを読む。
  - markerが無い場合でも `copy_based` / commit unknownとしてcontext生成を継続する。
- `deploy/vps/taiyolabel/env/staging-env-contract.example`
  - `.env*` ではない、archive-safeなstaging env contractを追加した。
  - 実値は入れず、key名とmock/disabled初期方針だけを保持する。
- Supabase client boundary tests
  - `tests/helpers/test-only-websocket.ts` を追加し、constructor存在チェックだけを満たすtest-only shimを使う。
  - shimが実WebSocket接続を開こうとした場合は失敗する。
- `vitest.config.ts`
  - root integration testsからAdmin workspaceのReactを解決するtest-only aliasを追加した。
- `scripts/dev-loop/*staging*.mjs`
  - `--check-config-only` ではenv parseだけを確認し、psql version / path確認とDB queryは通常実行時だけにした。

## VPS Staging Result

```text
patch_id=loop1211-20260626-185306
base_commit=86e2f45c8a6fb07f6b37e7c1f818614b71fd03ab
archive_sha256=ca6d1283323db65dc1778b8045c3a009a5279c17459aafc70f2cdf0a04f22c4b
staging_path=/root/deploy-staging/amami-line-crm/loop1211-20260626-185306
active_source_before_after=176cb34fc6059ecabfb9826daacaabc2a437bebe
active_deploy_updated=no
systemd_restart=no
nginx_reload_restart=no
public_smoke=no
```

VPS staging passed:

- `npx pnpm@10.12.1 install --frozen-lockfile`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

## Safety Boundary

- The patched archive was extracted only under `/root/deploy-staging/amami-line-crm/loop1211-20260626-185306/source`.
- Extracted staging source had no `.git` and no `.env*`.
- Active `/var/www/amami-line-crm` source remained `176cb34fc6059ecabfb9826daacaabc2a437bebe`.
- No active rsync, service restart, Nginx reload/restart, DNS/certbot/external smoke, LINE/OpenAI/Supabase real connection was performed.

## Remaining Risk

- Latest main is still not active on the VPS review environment.
- Loop 121.1 proves staging compatibility only. Active copy-based redeploy still needs a separate explicit Go loop.
- production readiness remains `production_no_go`.

## Next Loop

Loop 122: copy-based VPS active localhost-only redeploy final gate

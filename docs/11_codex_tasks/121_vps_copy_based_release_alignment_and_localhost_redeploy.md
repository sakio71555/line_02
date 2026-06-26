# Loop 121: VPS copy-based release alignment and localhost-only redeploy

## Goal

Loop 120でVPS release directory `/var/www/amami-line-crm` がcopy-basedで `.git` を持たないことが分かったため、local `origin/main` からrelease archiveを作り、VPS stagingで検証してからlocalhost-only review環境へ反映できるか確認する。

## Scope

- Local clean `origin/main` のrelease candidateを固定する。
- project `tmp/releases/` 配下にrelease archive、checksum、manifestを作る。
- `.env*` をarchiveへ含めない。
- VPS stagingは `/root/deploy-staging/amami-line-crm/` だけを使う。
- VPS backup/evidenceは `/root/deploy-backups/amami-line-crm/` だけを使う。
- VPS active sourceは、staging test/buildが通った場合だけrsyncで更新する。
- localhost-only smokeは `127.0.0.1:8788` と `127.0.0.1:3002` に限定する。

## Out of Scope

- Nginx `sites-enabled` 変更。
- Nginx reload/restart。
- DNS / certbot / HTTPS / external smoke。
- LINE / OpenAI / Supabase実接続。
- API / Auth / RLS / runtime / migration / UI変更。
- `.env` 作成・変更・表示・copy。
- dependency追加、lockfile変更。

## Result

```text
release_candidate_commit=e1eeb2d7be37074258aa5aade48d7b03a1cd7ac1
previous_vps_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
local_archive=tmp/releases/loop121-e1eeb2d/amami-line-crm-e1eeb2d7be37074258aa5aade48d7b03a1cd7ac1.tar
archive_sha256=f5ab2e23ef8de82a97c0b858b8099ea693474e3b90b4209892f137d85297f98e
backup_path=/root/deploy-backups/amami-line-crm/loop121-20260626-180347
staging_path=/root/deploy-staging/amami-line-crm/loop121-20260626-180347
active_deploy_updated=no
systemd_restart=no
nginx_reload_restart=no
public_smoke=no
production_readiness=production_no_go
```

## What Happened

- Local baseline `lint`、`typecheck`、`test`、`test:integration`、`build` は成功した。
- `176cb34..HEAD` の差分はdocs/runbook/deploy example/static tests中心で、API/Auth/RLS/runtime/migration/lockfile変更はなかった。
- release archiveは作成済みで、`.env*` を含まないことを確認した。
- VPS active source backupを作成し、active `.env*` は値を読まずに保持対象として確認した。
- archiveをVPS stagingへ転送し、checksum一致とstaging sourceの `.env*` 不在を確認した。
- VPS stagingで `install --frozen-lockfile`、`lint`、`typecheck` は成功した。
- VPS stagingで `test` が失敗したため、active deployへは進まなかった。
- VPS stagingで `build` 単体は成功した。
- active `/var/www/amami-line-crm` は `176cb34fc6059ecabfb9826daacaabc2a437bebe` のまま。
- API `/health`、Admin `/login`、Admin `/customers` は既存active sourceで `200` のまま。

## No-Go Reason

VPS staging full test failed before active deploy.

Known failure categories:

- copy-based staging source has no `.git`, while GPT/Codex handoff tests expect git context.
- release archive excludes `.env*`, while staging env template tests expect `.env.staging.example`.
- VPS Node.js is `20.20.2`; Supabase client boundary tests need native WebSocket or an approved Node/runtime compatibility plan.

Because staging full test did not pass, `rsync` to active deploy, `systemctl restart`, and localhost smoke after restart were not executed.

## Safety Boundary

- `.env` values were not displayed.
- `.env*` files were not copied into the release archive.
- active `.env*` files were not changed.
- Nginx reload/restart was not run.
- DNS/certbot/HTTPS/external smoke was not run.
- LINE/OpenAI/Supabase real connections were not run.
- production readiness remains `production_no_go`.

## Test Summary

Local:

- `git diff --check`: success.
- `npx pnpm@10.12.1 lint`: success.
- `npx pnpm@10.12.1 typecheck`: success.
- `npx pnpm@10.12.1 test`: 105 files passed / 1 skipped, 683 tests passed / 4 skipped.
- `npx pnpm@10.12.1 test:integration`: 105 files passed / 1 skipped, 683 tests passed / 4 skipped.
- `npx pnpm@10.12.1 build`: 10 packages successful.

VPS staging:

- `npx pnpm@10.12.1 install --frozen-lockfile`: success.
- `npx pnpm@10.12.1 lint`: success.
- `npx pnpm@10.12.1 typecheck`: success.
- `npx pnpm@10.12.1 test`: failed.
- `npx pnpm@10.12.1 build`: success.

## Next Loop Candidates

- Loop 121.1: copy-based VPS staging test compatibility patch.
- Loop 122: repeat copy-based localhost-only redeploy after staging test compatibility passes.
- Loop 123: decide whether VPS review source should remain copy-based or become a git worktree.

# Loop 122: copy-based VPS active localhost-only redeploy final gate

## Goal

Loop 121.1でVPS staging full validationが通ったcopy-based release archive方式を使い、VPS localhost-only review環境のactive sourceをlatest mainへ揃える。

## Scope

- local latest `origin/main` をrelease candidateとして固定する。
- release archive、checksum、manifestをproject `tmp/releases/` 配下で作成する。
- archiveから `.env*`、`.git`、`node_modules` を除外する。
- VPS stagingでinstall、lint、typecheck、test、test:integration、buildを再確認する。
- active `/var/www/amami-line-crm` をbackupし、`.env*` を保持したままrsyncでsourceを更新する。
- active側でinstall/buildを通し、既存のlocalhost-only review servicesをrestartする。
- localhost-only smoke、listener確認、evidence保存を実施する。
- docs、runbook、production readiness、dev log、static testを更新する。

## Out of Scope

- Nginx `sites-enabled` 変更。
- Nginx reload/restart。
- DNS変更、certbot、HTTPS有効化、external public smoke。
- LINE webhook設定変更、LINE本番送信。
- OpenAI実API呼び出し。
- Supabase実接続、RLS/Auth/runtime/migration変更。
- `.env` の表示、作成、変更、secret injection。
- dependency追加、lockfile変更。

## Start State

```text
local_head=2a9a746940b5f7a707af4c042bb9225d3dea258b
branch=main...origin/main
worktree=clean
previous_active_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
deploy_path=/var/www/amami-line-crm
active_release_shape=copy-based without .git
sites_enabled_amami_line_crm=absent
production_readiness=production_no_go
```

## Loop 121 / 121.1 Handoff

- Loop 121 stopped before active deploy because VPS staging full test failed.
- Loop 121.1 patched copy-based staging compatibility and passed VPS staging install/lint/typecheck/test/test:integration/build.
- Active source still remained `176cb34fc6059ecabfb9826daacaabc2a437bebe` before Loop 122.

## Release Candidate

```text
release_candidate=2a9a746940b5f7a707af4c042bb9225d3dea258b
release_short=2a9a746
previous_active_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
rollback_candidate=176cb34fc6059ecabfb9826daacaabc2a437bebe
local_archive=tmp/releases/loop122-2a9a746/amami-line-crm-2a9a746940b5f7a707af4c042bb9225d3dea258b.tar
archive_sha256=9ca1d4e5794e5741c0e4767cad69e0d45c95b102297f1d6e355bcb17d0d73939
release_manifest=tmp/releases/loop122-2a9a746/release-manifest.txt
archive_env_policy=.env* excluded from archive; active .env* preserved on VPS
```

The first archive attempt included tracked `.env.example` / `.env.staging.example`, so it was discarded before VPS use. The final archive was recreated with `.env*` path exclusion and verified to contain no `.env*`, `.git`, or `node_modules`.

## VPS Staging Validation

```text
staging_path=/root/deploy-staging/amami-line-crm/loop122-extract-20260626-190958/source
checksum=success
forbidden_files_check=no .env/.git/node_modules
node=v20.20.2
pnpm=10.12.1
install_frozen_lockfile=success
lint=success
typecheck=success
test=107 passed / 1 skipped files, 691 passed / 4 skipped tests
test_integration=107 passed / 1 skipped files, 691 passed / 4 skipped tests
build=success
```

## Active Backup And Deploy

```text
backup_evidence_path=/root/deploy-backups/amami-line-crm/loop122-20260626-190958
active_backup_path=/root/deploy-backups/amami-line-crm/loop122-20260626-190958/active-source-before.tar
active_backup_sha256=1372463b2d72993ef1c9d509f6ef771a76bd48fc50f53f26f921822f53da568d
active_source_after=2a9a746940b5f7a707af4c042bb9225d3dea258b
active_deploy_updated=yes
active_install_frozen_lockfile=success
active_build=success
```

Active rsync used excludes for `.env`, `.env.*`, `node_modules`, `.next/cache`, and `tmp`.

## Env Preservation

Only `.env*` filenames were recorded. Values were not displayed.

```text
env_files_before_rsync=.env.staging.example,.env.example
env_files_after_rsync=.env.staging.example,.env.example
env_files_final=.env.staging.example,.env.example
```

## Deploy Markers

`.deploy-source`:

```text
2a9a746940b5f7a707af4c042bb9225d3dea258b
```

`.deploy-manifest.txt`:

```text
release_candidate=2a9a746940b5f7a707af4c042bb9225d3dea258b
deploy_method=copy_archive_loop122
source_archive_checksum=9ca1d4e5794e5741c0e4767cad69e0d45c95b102297f1d6e355bcb17d0d73939
runtime=localhost-only review
admin=127.0.0.1:3002
api=127.0.0.1:8788
production_readiness=production_no_go
```

## Process Restart

Existing services only:

```text
amami-line-crm-api.service=restart success / active
amami-line-crm-admin.service=restart success / active
```

No new systemd unit was created. No pm2 registration was used.

## Localhost Smoke

```text
api /health=200
admin /login=200
admin /select-tenant=200
admin /customers=200
admin /alerts=200
```

Listener check:

```text
api=127.0.0.1:8788
admin=127.0.0.1:3002
18080=absent
sites_enabled_amami_line_crm=absent
```

The host still has unrelated Nginx listeners on public 80/443/8080, but the Amami LINE CRM services remained bound to localhost and no Nginx active include was enabled for this app.

## Safety Boundary

- Nginx reload/restart was not run.
- Nginx `sites-enabled` was not changed.
- DNS/certbot/HTTPS/external smoke was not run.
- Firewall was not changed.
- LINE/OpenAI/Supabase real connections were not run.
- `.env` values were not displayed or changed.
- API/Auth/RLS/migration/runtime behavior was not changed.
- dependency and lockfile were not changed.
- production readiness remains `production_no_go`.

## Rollback Plan

Do not run rollback unless explicitly approved.

```bash
ACTIVE="/var/www/amami-line-crm"
BACKUP_DIR="/root/deploy-backups/amami-line-crm/loop122-20260626-190958"
RESTORE_DIR="/root/deploy-staging/amami-line-crm/loop122-rollback-<timestamp>"

mkdir -p "$RESTORE_DIR"
tar -xf "${BACKUP_DIR}/active-source-before.tar" -C "$RESTORE_DIR"

rsync -a --delete \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules' \
  --exclude='.next/cache' \
  --exclude='tmp' \
  "${RESTORE_DIR}/amami-line-crm/" \
  "${ACTIVE}/"

cd "$ACTIVE"
npx pnpm@10.12.1 install --frozen-lockfile
npx pnpm@10.12.1 build
sudo systemctl restart amami-line-crm-api.service amami-line-crm-admin.service
curl -sS -o /dev/null -w "api /health %{http_code}\n" http://127.0.0.1:8788/health
curl -sS -o /dev/null -w "admin /login %{http_code}\n" http://127.0.0.1:3002/login
```

Rollback triggers include active build failure, service restart failure, localhost smoke failure, public bind drift, env file loss, secret exposure, real external connection suspicion, or tenant leakage suspicion.

## Remaining Risk

- DNS owner unknown.
- DNS rollback owner unknown.
- Nginx enable approver unknown.
- Certificate approver unknown.
- Maintenance window unknown.
- ACME method undecided.
- client-facing final hostname undecided.
- external smoke not run.
- production secret injection not performed.

## Next Loop Candidates

1. Loop 123: corrected Nginx candidate reload smoke.
2. Loop 124: ACME selected-method dry-run plan.
3. Loop 125: LINE webhook production URL dry-run checklist.
4. Loop 126: Supabase staging connection preflight.
5. Loop 127: owner approval record update.

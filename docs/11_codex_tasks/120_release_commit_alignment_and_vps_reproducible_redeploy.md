# Loop 120: release commit alignment and VPS reproducible redeploy

## Goal

Record the release candidate, rollback candidate, and VPS localhost-only review source alignment status before any public Nginx, DNS, HTTPS, LINE webhook, OpenAI, or Supabase production work.

This Loop attempted to proceed only as far as the existing safe boundary allowed. The VPS review release directory was found to be copy-based and not a git worktree, so `git pull --ff-only origin main` was not attempted.

## Scope

- Confirm local `main` matches `origin/main`.
- Run local quality gates before VPS work.
- Classify the diff from the previous VPS deployed source to local HEAD.
- Select release, rollback, and config source commits.
- Inspect the VPS localhost-only review environment.
- Store non-secret VPS evidence under the existing deploy backup root.
- Keep Nginx active config, DNS, certbot, HTTPS, LINE, OpenAI, Supabase, API/Auth/RLS/runtime/migration, and UI unchanged.
- Update docs, dev log, and static tests.

## Out of Scope

- Nginx `sites-enabled` changes.
- Nginx reload/restart.
- certbot, HTTPS, DNS changes, DNS provider API, TXT query, or external smoke.
- LINE webhook changes or LINE API calls.
- OpenAI API calls.
- Supabase real connection, migration, RLS, Auth/JWT, or runtime switch.
- `.env` creation, modification, copy, or display.
- dependency changes, lockfile changes, `pnpm add`, `git reset`, `git stash`, `git rebase`, or force push.
- API/Auth/RLS/runtime/migration/UI code changes.

## Start State

```text
workdir=/Users/sakio/Desktop/PROJECT/amami-line-crm
branch=main...origin/main
worktree=clean
local_head=5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db
local_head_subject=docs: add domain release approval record
approved_host=admin.taiyolabel.site
approved_host_role=review/admin hostname
production_readiness=production_no_go
```

## Release Provenance

```text
release_candidate_commit=5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db
release_candidate_reason=latest origin/main with Loop 119 domain and release approval evidence
rollback_candidate_commit=176cb34fc6059ecabfb9826daacaabc2a437bebe
rollback_candidate_reason=last known VPS localhost-only review source with successful smoke before release alignment
config_source_commit=5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db
nginx_candidate_source=deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example
```

## `176cb34..HEAD` Diff Classification

| classification | result | notes |
| --- | --- | --- |
| runtime_app_change | no | No `apps/api`, `apps/admin`, `apps/liff`, package runtime, or migration file changed after `176cb34`. |
| admin_ui_change | no app code | Only admin mobile review docs/tests were updated after `176cb34`; the UI implementation was already in the rollback source. |
| api_runtime_change | no | No API route/runtime file changed. |
| auth_change | no | No Auth/JWT runtime file changed. |
| rls_migration_change | no | No migration/RLS SQL changed. |
| line_openai_supabase_gate_change | no | No real connection gate code changed. |
| nginx_template_change | yes | Repo-local Nginx examples and candidate planning docs were added. Active Nginx was not changed in this Loop. |
| preflight_script_change | yes | Read-only domain/DNS/HTTPS preflight helper was added before this Loop. |
| docs_only_change | yes | Domain, Nginx, approval, readiness, and dev log docs were added/updated. |
| tests_only_change | yes | Static integration tests were added for docs/runbook safety gates. |
| runbook_change | yes | VPS/Nginx/domain/release runbooks were added/updated. |

Go/No-Go before VPS redeploy:

```text
local_quality_gate=passed
diff_safety_classification=passed
vps_redeploy_go=no
no_go_reason=VPS release directory is copy-based and has no .git worktree, so fast-forward-only pull cannot be performed safely.
```

## VPS Preflight Result

```text
vps_host=vm-227d8253-eb
vps_ssh=root@160.251.174.201
vps_deploy_path=/var/www/amami-line-crm
vps_release_git_worktree=absent
vps_before_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
vps_after_source=176cb34fc6059ecabfb9826daacaabc2a437bebe
release_candidate_match=no
fast_forward_attempted=no
admin_api_restart_attempted=no
```

The VPS review directory still uses the earlier copy-based release shape from Loop 111. Because Loop 120 only allowed a fast-forward git update, converting the release directory or streaming a new archive was not performed.

## VPS Evidence

```text
evidence_path=/root/deploy-backups/amami-line-crm/loop120-20260626-174138
```

Stored evidence is non-secret and includes:

- hostname/date.
- before/after deployed source.
- git worktree absence marker.
- listener snapshots.
- `nginx -t` output.
- localhost API `/health` result.
- localhost Admin `/login` result.
- No-Go marker explaining why fast-forward was not attempted.

The evidence does not copy `.env`, secrets, private keys, certificates, node_modules, database dumps, or public logs.

## Local Quality Gate

Before VPS work:

- `git diff --check`: success.
- `npx pnpm@10.12.1 lint`: success.
- `npx pnpm@10.12.1 typecheck`: success.
- `npx pnpm@10.12.1 test`: success.
- `npx pnpm@10.12.1 test:integration`: success.
- `npx pnpm@10.12.1 build`: success.

## VPS Smoke Result

Because source alignment did not proceed, this smoke reflects the existing VPS source `176cb34fc6059ecabfb9826daacaabc2a437bebe`.

| check | result |
| --- | --- |
| API `/health` on `127.0.0.1:8788` | `200` |
| Admin `/login` on `127.0.0.1:3002` | `200` |
| Admin `/select-tenant` | `200` |
| Admin `/customers` | `200` |
| Admin `/alerts` | `200` |
| `3002` / `8788` bind | localhost-only |
| `18080` listener | absent |
| `/etc/nginx/sites-enabled/amami-line-crm.conf` | absent |
| Nginx reload/restart | not run |

## Rollback Rehearsal Plan

No rollback was executed because no VPS source update or service restart happened.

If a future approved release changes the VPS source and rollback is required, prefer a reviewed branch/tag or a copy-based release backup rather than leaving production in a detached HEAD. A rollback must be explicitly approved before execution.

Rollback trigger examples:

- API `/health` fails.
- Admin `/login` fails.
- process binds to public address instead of localhost.
- `18080` remains after diagnostic work.
- `sites-enabled` is unexpectedly present.
- test/build fails.
- tenant leakage suspicion.
- secret exposure.
- LINE/OpenAI/Supabase real connection accidentally enabled.

Future rollback command shape, after explicit approval:

```text
git checkout main
git pull --ff-only origin main
# if rolling back, use an approved rollback branch/tag or approved commit restore process
npx pnpm@10.12.1 build
# restart only existing Admin/API review process according to runbook
curl -sS -o /dev/null -w "api /health %{http_code}\n" http://127.0.0.1:8788/health
curl -sS -o /dev/null -w "admin /login %{http_code}\n" http://127.0.0.1:3002/login
```

## Safety Boundary

Not performed:

- Nginx `sites-enabled` change.
- Nginx reload/restart.
- DNS change, DNS provider API, TXT query, certbot, HTTPS, external smoke.
- firewall change or public port addition.
- LINE webhook setting change or LINE API call.
- OpenAI API call.
- Supabase real connection.
- `.env` display, copy, creation, or modification.
- API/Auth/RLS/runtime/migration/UI code change.
- dependency or lockfile change.

## Production Readiness

```text
production_readiness=production_no_go
```

Reasons retained:

- DNS owner unknown.
- DNS rollback owner unknown.
- Nginx enable approver unknown.
- Certificate approver unknown.
- Maintenance window unknown.
- ACME method undecided.
- client-facing final hostname undecided.
- external smoke not executed.
- production secret injection not executed.
- VPS latest-main alignment not completed because the release directory is not a git worktree.

## Residual Risks

- VPS review source remains `176cb34fc6059ecabfb9826daacaabc2a437bebe`, not the local release candidate.
- A future Loop must choose either a git-worktree release shape or an explicitly approved copy/archive redeploy shape.
- Owner/approver fields remain unknown.
- Public Nginx, HTTPS, DNS, external smoke, LINE webhook, LINE/OpenAI/Supabase real connections remain No-Go.

## Next Loop Candidates

1. Loop 121: corrected Nginx candidate reload smoke.
2. Loop 122: ACME selected-method dry-run plan.
3. Loop 123: LINE webhook production URL dry-run checklist.
4. Loop 124: Supabase staging connection preflight.
5. Loop 125: owner approval record update.


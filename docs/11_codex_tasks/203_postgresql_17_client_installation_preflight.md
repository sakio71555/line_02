# Loop 203: PostgreSQL 17 Client Installation Preflight

## 1. Purpose

Prepare for a future PostgreSQL 17 client installation before retrying Supabase backup export.

This Loop is preflight only. It records the current VPS OS/package state, PostgreSQL 17 client installation candidates, safety boundaries, rollback planning, and Go/No-Go conditions. It does not install packages and does not run `pg_dump`.

## 2. Scope

Completed:

- Confirmed local repo state before work.
- Read VPS OS/package state with read-only commands.
- Confirmed current PostgreSQL client package state without running `pg_dump`.
- Confirmed current APT sources do not expose `postgresql-client-17`.
- Documented candidate installation approaches and rollback boundaries.
- Updated task doc, runbook, dev log, and Obsidian-facing notes.

Out of scope and not performed:

- `apt update`, `apt install`, `apt upgrade`, package source addition, repository key addition, package removal, symlink changes, or `update-alternatives` changes.
- `pg_dump` execution, `psql` execution, Supabase connection, DB export, backup artifact creation, or restore.
- DB URL display, `.env` display, secret file display, raw log display, LINE/OpenAI/Nginx/DNS/HTTPS/certbot/public smoke, or production runtime changes.
- Push.

## 3. Confirmed VPS State

```txt
vps_preflight_status=completed_read_only
os_id=ubuntu
os_version=24.04.3_LTS
os_codename=noble
kernel=6.8.0-107-generic
pg_dump_available=true
current_pg_dump_path=/usr/bin/pg_dump
current_pg_dump_wrapper=/usr/share/postgresql-common/pg_wrapper
current_pg_dump_binary=/usr/lib/postgresql/16/bin/pg_dump
current_pg_dump_version_source=postgresql-client-16_package
current_pg_dump_version=16.14-0ubuntu0.24.04.1
current_pg_dump_major=16
detected_server_major_or_version=17.6
version_mismatch_status=pg_dump_server_version_mismatch
postgresql_client_package=postgresql-client 16+257build1.1
postgresql_client_16_package=postgresql-client-16 16.14-0ubuntu0.24.04.1
postgresql_client_common_package=postgresql-client-common 257build1.1
postgresql_common_installed=false
libpq5_package=16.14-0ubuntu0.24.04.1
postgresql_apt_source_detected=false
postgresql_17_client_candidate_available=false_current_apt_cache
pg_dump_17_binary_candidate_path=/usr/lib/postgresql/17/bin/pg_dump
```

`pg_dump --version` was intentionally not executed because this Loop forbids `pg_dump` execution. The current version is derived from the installed `postgresql-client-16` package and the previously recorded Loop 202 mismatch state.

## 4. Installation Candidate Analysis

| Candidate | Current Finding | Risk / Note |
| --- | --- | --- |
| OS standard repository `postgresql-client-17` | Not available in current Ubuntu 24.04 APT cache | Immediate install from current sources is No-Go. |
| PostgreSQL official APT repository | Likely required for PostgreSQL 17 client on this VPS | Requires separate operator approval, source/key addition plan, and rollback plan. |
| Keep existing `pg_dump` 16.14 | Required | Do not remove or break current package. |
| Use explicit PostgreSQL 17 binary path | Preferred | Future backup runbook should call `/usr/lib/postgresql/17/bin/pg_dump`, not bare `pg_dump`. |
| Change `/usr/bin/pg_dump` or `update-alternatives` | Not recommended | Avoid global default changes unless a later Loop proves they are required. |

## 5. Recommended Policy

- Do not retry backup export with PostgreSQL client 16.
- Do not install PostgreSQL 17 client in the same Loop as export execution.
- Prefer installing PostgreSQL 17 client side-by-side with the existing 16 client.
- Prefer explicit path usage: `/usr/lib/postgresql/17/bin/pg_dump`.
- Keep `/usr/bin/pg_dump` / pg_wrapper global behavior unchanged unless a later Loop explicitly approves otherwise.
- After installation, verify only the PostgreSQL 17 client binary version first. DB connection/export remains a separate Loop.

## 6. Install-Preflight Rollback Plan

Before a future install Loop:

- Capture package inventory for:
  - `postgresql-client`
  - `postgresql-client-16`
  - `postgresql-client-17`
  - `postgresql-client-common`
  - `postgresql-common`
  - `libpq5`
- Capture relevant PostgreSQL APT source files and package policy output without secrets.
- If adding PostgreSQL official APT repository, document:
  - added source file path
  - added keyring file path
  - rollback command to remove source/keyring
  - package list added by install
- Do not change `/usr/bin/pg_dump`, `pg_wrapper`, symlinks, or `update-alternatives`.
- Stop after install/version verification if any package conflict, path ambiguity, or version mismatch remains.
- Do not proceed to DB export, artifact handling, or restore in the installation Loop.

## 7. Loop 204 Go / No-Go

```txt
loop_204_install_ready=false_without_operator_approval_for_pgdg_source
loop_204_preparation_ready=true
```

Go conditions for a future install Loop:

- Operator explicitly approves PostgreSQL official APT repository source/key addition, or another PostgreSQL 17 client source is approved.
- Rollback plan for source/key/package additions is documented.
- Existing `pg_dump` 16.14 preservation is documented.
- Future runbook uses explicit PostgreSQL 17 binary path.
- Secret scan remains clean.

No-Go conditions:

- PostgreSQL 17 client source remains unapproved.
- Package source rollback is unclear.
- Install plan would require changing global `/usr/bin/pg_dump` or `update-alternatives`.
- Secret contamination is suspected.
- The Loop would combine install with export/restore.

## 8. Verification

- `git status --short`
- `git diff --check`
- secret literal check
- `npx pnpm@10.12.1 lint`

Typecheck/test were not required because this Loop is docs-only and no runtime code changed.

## 9. Next Loop

```txt
Loop 204: PostgreSQL 17 client installation approval and execution
```

Loop 204 must remain installation/version-verification only unless the operator explicitly creates a separate export Loop.

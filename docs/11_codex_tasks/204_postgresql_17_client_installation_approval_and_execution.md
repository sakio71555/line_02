# Loop 204: PostgreSQL 17 Client Installation Approval And Execution

## 1. Purpose

Install a PostgreSQL 17 client on the VPS so future Supabase backup export can use a PostgreSQL 17-compatible `pg_dump` binary.

This Loop installs the client and verifies binary versions only. It does not connect to Supabase, export the database, create a backup artifact, or perform restore.

## 2. Scope

Completed:

- Confirmed repo start state was clean.
- Captured pre-install VPS package/path inventory.
- Added PostgreSQL official APT repository for Ubuntu noble.
- Ran `apt update`.
- Installed `postgresql-client-17` with minimal package scope.
- Verified `/usr/lib/postgresql/17/bin/pg_dump` exists and reports PostgreSQL 17.
- Confirmed PostgreSQL 16 client binary remains present.
- Confirmed PostgreSQL server package was not installed.
- Updated task doc, runbooks, dev log, and Obsidian-facing notes.

Out of scope and not performed:

- Supabase connection, `psql` DB connection, `pg_dump` DB connection, DB export, backup artifact creation, restore.
- DB URL display, `.env` display, secret file display, raw log display.
- LINE, OpenAI, Nginx, DNS, HTTPS, certbot, public smoke, production runtime changes, push.

## 3. Package Operations

```txt
pgdg_source_added=true
pgdg_source_file=/etc/apt/sources.list.d/pgdg.list
pgdg_key_file=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
apt_update_executed=true
apt_install_executed=true
postgresql_client_17_installed=true
installed_package=postgresql-client-17 17.10-1.pgdg24.04+1
dependency_upgraded=libpq5 18.4-1.pgdg24.04+1
postgresql_server_17_installed=false
```

The install simulation showed one new package and one dependency upgrade:

```txt
new_package=postgresql-client-17
upgraded_package=libpq5
postgresql-client-common_upgrade=false
postgresql_server_install=false
```

## 4. pg_dump Verification

```txt
pg_dump_17_path=/usr/lib/postgresql/17/bin/pg_dump
pg_dump_17_path_present=true
pg_dump_17_version=17.10
pg_dump_17_version_check_passed=true
pg_dump_16_path=/usr/lib/postgresql/16/bin/pg_dump
pg_dump_16_version=16.14
pg_dump_16_preserved=true
usr_bin_pg_dump_path=/usr/bin/pg_dump
usr_bin_pg_dump_symlink_target=../share/postgresql-common/pg_wrapper
usr_bin_pg_dump_symlink_modified=false
pg_wrapper_package_modified=false
pg_dump_update_alternatives_modified=false
manual_update_alternatives_modified=false
bare_pg_dump_version_after=17.10
```

`/usr/bin/pg_dump` remains the same pg_wrapper symlink. Because PostgreSQL 17 is now installed side-by-side, the bare `pg_dump --version` resolves to 17.10 through pg_wrapper. Future backup commands must still use the explicit path `/usr/lib/postgresql/17/bin/pg_dump` to avoid ambiguity.

The package post-install output reported a `psql.1.gz` manpage alternative update. No `pg_dump` alternative was present or changed.

## 5. Rollback Plan

Rollback was not executed in this Loop. If rollback becomes necessary:

- Remove `postgresql-client-17`.
- Review whether `libpq5` must be downgraded from `18.4-1.pgdg24.04+1` to the Ubuntu `16.14-0ubuntu0.24.04.1` package.
- Remove or disable `/etc/apt/sources.list.d/pgdg.list` if PGDG is no longer needed.
- Remove `/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc` only if no PGDG packages remain in use.
- Run package-policy checks before and after rollback.
- Do not combine rollback with DB export or restore.

Because `/usr/bin/pg_dump`, pg_wrapper, symlinks, and pg_dump alternatives were not manually changed, rollback scope remains limited to the package/source/key additions and the `libpq5` dependency upgrade.

## 6. Go / No-Go For Loop 205

```txt
loop_205_backup_export_retry_ready=true_after_operator_approval
```

Go conditions now met:

- `pg_dump_17_path_present=true`.
- `pg_dump_17_version_check_passed=true`.
- `pg_dump_16_preserved=true`.
- `postgresql_server_17_installed=false`.
- `secrets_recorded=false`.
- Obsidian/runbook/dev log updated.

Loop 205 must still be a separate controlled backup export Loop. It must use the explicit PostgreSQL 17 path and must not display DB URLs or raw logs.

## 7. Verification

- `git status --short`
- `git diff --check`
- secret literal check
- `npx pnpm@10.12.1 lint`

Typecheck/test were not required because this Loop changed docs and VPS package state only; no runtime application code changed.

## 8. Next Loop

```txt
Loop 205: Supabase backup export retry with explicit pg_dump 17 path
```

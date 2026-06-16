# psql Availability Setup

## Purpose

Supabase staging migration applyへ進む前に、`psql` を安全に用意するための手順を整理する。

このrunbookは手動準備の案内であり、CodexがインストールやOS設定変更を実行するものではない。Supabase接続、DB接続、migration applyはこのrunbookでは行わない。

## Audience

- staging migration applyを準備する作業者
- PostgreSQL client toolsをローカルに用意する人
- Supabase staging apply前のGo / No-Goを確認する人

## Current State

- Loop 076で `.env.staging` verificationは値を表示せず成功した。
- Loop 076で `psql --version` は利用できず、migration applyはNo-Goになった。
- Loop 077でも `psql` は利用できない状態として記録した。
- Loop 078ではCodex shellが `~/.zshrc` を読まない前提で、`command -v psql` に加えて `/usr/local/opt/libpq/bin/psql` と `/opt/homebrew/opt/libpq/bin/psql` を確認し、absolute pathで `psql` を使う。
- Supabase CLIはversion確認だけを行い、接続系コマンドは実行しない。
- runtimeは引き続き `in_memory` のままにする。

## Why psql Is Needed

現在の安全なstaging migration apply方針では、DB URLを表示せずに、承認済みのmigration SQLを明示的なapply Loopで扱うために `psql` が必要になる。

`psql` がない状態では、別手段へ勝手に切り替えない。`supabase db push` や `supabase link` を自動実行せず、No-Goとして停止する。

## Check Commands

以下は存在確認だけを行う。DB接続文字列は使わない。

```bash
cd /Users/sakio/Desktop/PROJECT/amami-line-crm
command -v psql || true
psql --version
node scripts/dev-loop/check-psql-readiness.mjs
```

Expected when available:

```text
[ok] psql is available
```

Expected when missing:

```text
[no-go] psql is not available
```

## Options When psql Is Missing

### Option A: Postgres.app

Mac向けにPostgreSQL toolsをまとめて入れられる選択肢。`psql` を含み、GUIで管理しやすい。PATH設定が必要な場合がある。

Codexはインストールしない。作業者が必要に応じて手動で導入する。

### Option B: Homebrew libpq

`psql` などPostgreSQL client toolsだけを入れたい場合の候補。full PostgreSQL serverを入れずに済む可能性がある。PATH設定が必要な場合がある。

例として以下のような手順があり得るが、Codexは実行しない。

```bash
brew install libpq
```

PATH設定例。環境差があるため、実行前に作業者が確認する。

```bash
echo 'export PATH="$(brew --prefix libpq)/bin:$PATH"' >> ~/.zshrc
```

### Option C: Homebrew PostgreSQL

PostgreSQL server/tools一式を入れる候補。`psql` が含まれる。server不要ならlibpqの方が軽い可能性がある。

例として以下のような手順があり得るが、Codexは実行しない。

```bash
brew install postgresql
```

### Option D: Supabase CLI Only

Supabase CLIは使える可能性がある。ただし今回の方針では `supabase db push` などを自動実行しない。まず `psql` が使える状態を優先する。

## Recommended Order

1. 作業者が手動で `psql` を用意する。
2. `psql --version` が通ることを確認する。
3. `.env.staging` を値非表示のscriptで再確認する。
4. `git status --short` がcleanであることを確認する。
5. 次Loopでmigration apply retryへ進むか判断する。

Codexはinstallしない。`brew install`、Postgres.app install、PATH恒久変更、OS設定変更は作業者が判断して手動で行う。

## PATH Check

`psql` を入れた後に見つからない場合は、作業者がPATHを確認する。

```bash
command -v psql || true
psql --version
```

PATH例は環境により異なる。docs、README、dev log、Codex promptにはsecretやDB URLを書かない。

## Re-run After Setup

`psql` 準備後に以下を再実行する。

```bash
cd /Users/sakio/Desktop/PROJECT/amami-line-crm
psql --version
node scripts/dev-loop/verify-staging-env.mjs --file .env.staging
node scripts/dev-loop/check-psql-readiness.mjs
git status --short
```

## Conditions For The Next Apply Loop

次Loopでapplyへ進むには、少なくとも以下を満たす。

- `psql --version` が成功する。
- `node scripts/dev-loop/check-psql-readiness.mjs` が成功する。
- `node scripts/dev-loop/verify-staging-env.mjs --file .env.staging` が成功する。
- `.env.staging` はgitignore対象のまま。
- staging projectでありproductionではないことを人間が確認する。
- migration applyの明示許可がある。
- `git status --short` がclean。
- lint / typecheck / test / test:integration / buildが成功する。
- RLS未実装でありstaging限定であることを理解している。

## Do Not Do

- Codexはインストールしない。
- `brew install` をCodexが実行しない。
- Postgres.app installをCodexが実行しない。
- OS設定変更やPATH恒久変更をCodexが実行しない。
- Supabase接続しない。
- `psql` でDB接続しない。
- migration applyしない。
- `supabase link` しない。
- `supabase db push` しない。
- `.env.staging` の値を表示しない。
- DB URL、Supabase URL、project ref、key、passwordをdocsやlogに書かない。
- runtime/API/UI/DB schemaを変更しない。
- git pushしない。

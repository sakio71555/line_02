# Staging Env Local Fill Verification

## Purpose

ローカルで作成済みの `.env.staging` を、値を表示せずに検証するためのrunbookです。

Supabase stagingへ接続する前に、必須envが埋まっていること、LINE本送信が無効であること、OpenAIがmockのままであること、repository runtimeがin-memoryのままであることを確認します。

## Audience

- `.env.staging` を入力した作業者
- staging接続へ進む前の確認者
- secretを扱う担当者

## Preconditions

- `.env.staging.example` をコピーして `.env.staging` を作成済み。
- `.env.staging` はgit管理しない。
- `.env.staging` の値をdocs、README、dev log、Codex prompt、commitに書かない。
- Supabase接続、migration apply、LINE送信、OpenAI API呼び出しはまだ行わない。

## Verification Command

```bash
node scripts/dev-loop/verify-staging-env.mjs --file .env.staging
```

The output does not show secret values. It only shows whether required keys are present and whether safe flags are still locked.

## Expected OK Output Shape

```text
[ok] staging env verification passed
[ok] SUPABASE_URL is present
[ok] SUPABASE_ANON_KEY is present
[ok] SUPABASE_SERVICE_ROLE_KEY is present
[ok] SUPABASE_DB_URL is present
[ok] LINE_REAL_PUSH_ENABLED=false
[ok] AI_PROVIDER=mock
[ok] REPOSITORY_RUNTIME=in_memory
```

## No-Go Examples

Stop and fix `.env.staging` locally if any of these appear:

```text
[ng] SUPABASE_URL is missing or unsafe
[ng] SUPABASE_DB_URL is missing or unsafe
[ng] LINE_REAL_PUSH_ENABLED is missing or unsafe
[ng] AI_PROVIDER is missing or unsafe
[ng] REPOSITORY_RUNTIME is missing or unsafe
```

Do not paste the failing value into Codex or docs. Only key names are safe to share.

## Secret Rule

secretを表示しない。

Do not run:

```bash
cat .env.staging
head .env.staging
tail .env.staging
less .env.staging
echo $SUPABASE_SERVICE_ROLE_KEY
echo $SUPABASE_DB_URL
```

Do not write these to docs, README, dev log, Codex, or commits:

- Supabase URL / anon key / service role key / DB URL values
- Supabase project ref
- LINE channel secret / access token values
- OpenAI API key
- `.env.staging` raw content
- production logs
- real customer information
- LINE userId

## Go Conditions

Proceed to the next staging connection Loop only when:

- verification command exits `0`.
- required Supabase values are present.
- `LINE_REAL_PUSH_ENABLED=false`.
- `LINE_MESSAGING_ENABLED=false`.
- `AI_PROVIDER=mock`.
- `REPOSITORY_RUNTIME=in_memory`.
- `APP_ENV=staging`.
- `.env.staging` remains git-ignored.
- no secret value has been pasted into docs / README / dev log / Codex.

## Still Not Allowed

- Supabase connection.
- `supabase link`.
- `supabase db push`.
- migration apply / reset / repair.
- LINE API real send.
- OpenAI API call.
- API runtime switch.
- git push without a separate explicit instruction.

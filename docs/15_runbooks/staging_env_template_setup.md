# Staging Env Template Setup

## Purpose

`.env.staging.example` を使い、Supabase stagingへ進む前に必要なenv名と安全flagをローカルで準備するためのrunbookです。

このrunbookは実接続手順ではありません。Supabase接続、migration apply、LINE送信、OpenAI API呼び出し、runtime switchは別Loopで扱います。

## Audience

- staging検証を準備する開発者
- Supabase / LINE / OpenAI keyを扱う担当者
- migration applyやruntime switchへ進む前の確認者

## Important Secret Rule

実keyをdocs/README/dev log/Codexに書かない。

以下も書かない:

- Supabase project ref
- Supabase URL / anon key / service role key / DB URLの実値
- LINE channel secret / access tokenの実値
- OpenAI API keyの実値
- `.env` 値
- 実顧客情報
- LINE userId
- 本番ログ

## Files

Tracked template:

```text
.env.staging.example
```

Local untracked file to create later by a human:

```text
.env.staging
```

Codex must not create `.env.staging` in Loop 074.

## Copy Step For A Future Human Operation

When a human is ready to fill staging values locally, copy the template:

```bash
cp .env.staging.example .env.staging
```

Do not paste the resulting values into docs, README, dev logs, Codex prompts, or commits.

## Items To Fill

### Supabase Staging

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
```

Rules:

- Use staging project values only.
- Confirm the project is not production.
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only.
- Never expose service role key to browser, LIFF, or Next.js client components.
- `SUPABASE_DB_URL` is for migration / DB verification only.

### LINE Staging / Test Channel

```env
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_WEBHOOK_SECRET_PATH=
STAFF_LINE_GROUP_ID=
LINE_MESSAGING_ENABLED=false
LINE_REAL_PUSH_ENABLED=false
```

Rules:

- Use a staging/test LINE channel only.
- Keep `LINE_REAL_PUSH_ENABLED=false` until a later Loop explicitly enables real send.
- Keep `LINE_MESSAGING_ENABLED=false` while LINE messaging is not wired.
- Do not use production LINE channel values.

### OpenAI / GPT

```env
OPENAI_API_KEY=
OPENAI_MODEL=
AI_PROVIDER=mock
```

Rules:

- Keep `AI_PROVIDER=mock` for staging preparation.
- Leave `OPENAI_API_KEY` blank until a later Loop explicitly enables OpenAI.
- Do not call OpenAI from this setup step.

### Runtime Safety

```env
APP_ENV=staging
REPOSITORY_RUNTIME=in_memory
```

Rules:

- Keep repository runtime as `in_memory` until a later Loop explicitly wires Supabase.
- `APP_ENV=staging` helps distinguish staging from local development and production.

## `.gitignore` Check

`.gitignore` must keep real env files out of git:

```text
.env
.env.local
.env.staging
.env.production
```

`.env.staging.example` is a safe template and should remain tracked.

## Next Conditions Before Connection

Before any Supabase connection or migration apply:

- Human has filled `.env.staging` locally.
- Target project is confirmed as staging.
- Production project is not used.
- No real key or project ref is written to docs / README / dev log / Codex.
- `git status --short` is clean.
- lint / typecheck / test / test:integration pass.
- A separate Loop explicitly authorizes connection or apply.

## Do Not Do In This Runbook

- Do not connect to Supabase.
- Do not run `supabase link`.
- Do not run `supabase db push`.
- Do not run migration apply/reset/repair.
- Do not enable real LINE push.
- Do not call OpenAI.
- Do not switch API runtime.
- Do not write secrets to the repo.

# External Services Setup Checklist

## Purpose

VPS deployment前後に必要な外部サービス設定を、secret値なしで確認するためのchecklistです。

Loop 106では外部サービスへ接続しません。

## DNS

Current known state:

- domain: `taiyolabel.site`
- DNS management: お名前.com
- name servers: `01.dnsv.jp`, `02.dnsv.jp`, `03.dnsv.jp`, `04.dnsv.jp`
- `admin.taiyolabel.site` -> `160.251.174.201`
- `api.taiyolabel.site` -> `160.251.174.201`

Before deploy:

- confirm A records still point to the intended VPS。
- confirm no existing production host uses the same names。
- confirm TTL and propagation are acceptable。

## Supabase

Required env names:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

Rules:

- values are filled manually outside git。
- service role key is server-side only。
- DB URL is for migration/verification only。
- browser, LIFF, and client components must not receive service role key。
- production/staging target must be explicitly chosen before deployment。

## Admin Auth

Before production enablement:

- Admin real login/session smoke is required。
- access token must not be displayed。
- access token must not be independently stored in localStorage or cookie。
- `selectedTenantId` remains a selector and is revalidated server-side。

## LINE

Known state:

- LINE business account exists。

Future webhook URL shape:

```text
https://api.taiyolabel.site/api/line/webhook/<webhookSecretPath>
```

Rules:

- do not write the real webhook secret path into docs。
- do not write LINE channel secret/access token into docs。
- keep `LINE_MESSAGING_ENABLED=false` and `LINE_REAL_PUSH_ENABLED=false` until explicit real smoke approval。
- safe test recipient must be decided before any real push。

## OpenAI

Known state:

- GPT API key exists.

Rules:

- do not write key values into docs。
- keep `AI_PROVIDER=mock` and `OPENAI_REAL_API_ENABLED=false` until explicit real smoke approval。
- decide cost/rate limit policy before enablement。
- keep AI draft/support output separate from LINE sending。

## Nginx / SSL

Before certbot:

- HTTP bootstrap route is active。
- `nginx -t` passes。
- existing `app.ajnl.net` certificate is not reused。
- cert name `amami-line-crm-taiyolabel` is confirmed。
- API local upstream is `127.0.0.1:8788` and Admin local upstream is `127.0.0.1:3002` after Loop 107 start/port boundary verification。

## Final Gate

Production remains No-Go until:

- VPS deploy smoke passes。
- SSL smoke passes。
- Admin real login smoke passes。
- LINE safe recipient smoke is explicitly approved and completed。
- OpenAI real API smoke is explicitly approved and completed。
- rollback owner and rollback steps are confirmed。

## Production start and port boundary

Loop 107ではproduction start scriptsとAPI/Admin local port境界をrepo内で整えました。これは外部サービス接続ではなく、VPS実配置前の起動境界整備です。nginx/certbot/systemd実行、LINE webhook設定、OpenAI/LINE real enablementは後続Loopで明示的に扱います。

## VPS dry deployment preflight

Loop 108ではVPS dry deployment preflight command pack、rollback、No-Go checklistを追加しました。これは将来ユーザーがVPS上で実行する前の手順整理であり、CodexはVPS SSH、nginx/systemd/certbot、LINE/OpenAI、Supabase接続を実行していません。詳細は `docs/15_runbooks/vps_dry_deployment_preflight_commands.md` を参照してください。

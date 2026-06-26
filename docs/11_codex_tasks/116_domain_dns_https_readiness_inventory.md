# Loop 116: Domain / DNS / HTTPS readiness inventory

## Purpose

Loop 115でNginx candidateのpath routingは確認できた。Loop 116では、実ドメイン公開、DNS、HTTPS、LINE webhook URLへ進む前に、ドメイン候補、Nginx/ACME前提、アプリ側URL/cookie/redirect前提をdocs-onlyで棚卸しする。

## Scope

- Repo内のドメイン候補、public URL、Nginx template、env exampleを確認する。
- VPSをread-onlyで確認し、Nginx、listener、certbot、既存証明書、firewallの非secret summaryを記録する。
- DNS/HTTPS readiness checklistを作成する。
- HTTP bootstrap / HTTPS reverse proxyのplaceholder exampleを追加する。
- read-only preflight scriptを追加する。
- static testで、placeholder、禁止操作、No-Go状態を守る。

## Out of Scope

- 実ドメイン決定。
- DNS変更、CAA/DNSSEC/firewall変更。
- Nginx active config変更、`sites-enabled`変更、reload/restart。
- HTTPS発行、certbot実行、renew。
- external HTTP/HTTPS smoke。
- `.env` 作成、編集、表示。
- LINE/OpenAI/Supabase実接続。
- API/Auth/RLS/runtime/migration/UI変更。

## Starting State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Branch: `main...origin/main`
- Start status: clean
- Latest commit at start: `f24e44a docs: diagnose Nginx host header routing`
- Repo-local `MEMORY.md`: absent
- Production readiness: `production_no_go`

## Domain Inventory

| candidate | source | status | note |
| --- | --- | --- | --- |
| `amamihome.net` | tenant official domain / knowledge seed | not deployment host | アマミホーム公式情報の参照先。Admin/API公開hostとしては未承認。 |
| `admin.taiyolabel.site` | Loop 106 VPS deployment env/template docs | historical candidate | 旧planではAdmin/APIを別hostに分ける前提。DNS ownership/current pointingはLoop 116では未確認。 |
| `api.taiyolabel.site` | Loop 106 VPS deployment env/template docs | historical candidate | LINE webhook URL候補として記録あり。ただしLoop 112以降はsingle-host path routing candidateも存在。 |
| `_CHANGE_ME_` | Loop 112/115 placeholder template | placeholder | 実ドメイン未決定を示すためのplaceholder。 |
| `amami-line-crm.invalid` | Loop 112-115 dry-run | placeholder-only | localhost/Host header dry-run専用。実公開には使わない。 |
| `app.ajnl.net` / `api.ajnl.net` | existing VPS certificate/config docs | existing other app | 既存証明書と既存site。amami-line-crm用に再利用しない。 |

## Decision Matrix

| item | current decision | readiness |
| --- | --- | --- |
| Admin canonical hostname | undecided | blocker |
| API public方式 | undecided: historical separate host vs Loop 115 single-host `/api/` path | blocker |
| API public prefix | candidate `/api/` with `/api/health -> /health` mapping | needs approval |
| LINE webhook URL | route is `/api/line/webhook/:webhookSecret`; host undecided | blocker |
| Auth callback URL | not integrated yet | future Auth loop |
| Cookie domain | host-only for selected tenant cookie; no explicit domain | review before HTTPS |
| Certificate SAN names | undecided | blocker |
| DNS provider | unknown | blocker |
| Domain ownership | unconfirmed | blocker |
| ACME method | undecided | blocker |

Because the canonical public hostname is not yet approved, Loop 116 did not run public DNS queries.

## Application HTTPS Readiness

| area | observation | readiness |
| --- | --- | --- |
| Admin API base URL | `API_BASE_URL` defaults to `http://localhost:4000`; env examples point to `https://api.taiyolabel.site` | needs final domain decision |
| Selected tenant transport | Admin sends `x-selected-tenant-id`; this is a selector, not authentication | OK as boundary, still not auth |
| Selected tenant cookie | `SameSite=Lax`, `Path=/`, no explicit `Secure` / `HttpOnly` | review before production HTTPS |
| Authorization header | Admin helper forwards Bearer token from provider only | keep server-side/token-hidden |
| CORS | single-host `/api/` path avoids browser CORS; separate API host may require explicit CORS review | architecture decision needed |
| Forwarded headers | Nginx examples set `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-Port` | OK for proxy baseline |
| Health route | API route is `/health`; public proxy candidate maps `/api/health` to upstream `/health` | confirmed in Loop 115 standalone |
| LINE webhook | signature verification route exists; public URL remains undecided | blocker |

## VPS Read-only Inventory

Read-only SSH target:

```text
root@160.251.174.201
```

Observed summary:

- Hostname: `vm-227d8253-eb`
- Timezone: `Asia/Tokyo`
- Nginx: `nginx/1.24.0 (Ubuntu)`
- `nginx -t`: success
- Nginx service: active
- Public listeners: `0.0.0.0:80`, `0.0.0.0:443`, `[::]:80`, `[::]:443`
- App listeners: `127.0.0.1:8788`, `127.0.0.1:3002`
- `127.0.0.1:18080`: absent
- `/etc/nginx/sites-available/amami-line-crm.conf`: present
- `/etc/nginx/sites-enabled/amami-line-crm.conf`: absent
- Existing certbot version: `certbot 2.9.0`
- Existing certbot plugins: `nginx`, `standalone`, `webroot`
- Existing Let's Encrypt live name observed: `app.ajnl.net`
- certbot timer: present
- UFW allows 22, 80, 443, 8080

No VPS mutation, Nginx reload/restart, certbot issuance, DNS change, external smoke, or secret display was performed.

## ACME Method Readiness

Current recommendation:

```text
acme_method = undecided
```

Reason:

- Canonical hostname is not approved.
- DNS provider and ownership are unknown.
- CAA/DNSSEC status is unknown.
- Certificate SAN list is unknown.
- Public external smoke is not approved.

Future choice:

- HTTP-01 webroot can be considered if a single canonical hostname is approved and port 80 reaches this Nginx host.
- DNS-01 can be considered if wildcard certificates, blocked port 80, or DNS-provider automation is required.
- Do not reuse the existing `app.ajnl.net` certificate.

## Added Files

- `deploy/vps/taiyolabel/nginx/amami-line-crm.http-bootstrap.conf.example`
- `deploy/vps/taiyolabel/nginx/amami-line-crm.https.conf.example`
- `deploy/vps/taiyolabel/preflight/check_domain_dns_https_readiness.sh`
- `docs/15_runbooks/domain_dns_https_readiness_checklist.md`
- `tests/integration/domain-dns-https-readiness.test.ts`

The Nginx examples remain placeholder-based. The preflight script is read-only and does not perform HTTP requests or system changes.

## Test Coverage

Static tests verify:

- Loop 116 docs and templates exist.
- Templates keep `_CHANGE_ME_` placeholders and do not hard-code `taiyolabel.site` or `.invalid` names.
- HTTP bootstrap contains a temporary diagnostic header.
- HTTPS template contains SSL placeholders and omits HSTS.
- The preflight script rejects placeholders and lacks active publish commands.
- The runbook records `production_no_go` and approval inputs.
- Production readiness remains No-Go.

## Judgment

```text
production_no_go
```

Reasons:

- Canonical Admin/API hostname is undecided.
- DNS provider and ownership are unconfirmed.
- ACME method and certificate SAN list are undecided.
- HTTPS/certbot/external smoke are not executed.
- System Nginx reload/restart was not executed in this Loop.
- LINE/OpenAI/Supabase real connections were not performed.

## Next Loop Candidates

1. Loop 117: real domain decision and DNS provider confirmation plan
2. Loop 118: real domain Nginx enable plan
3. Loop 119: HTTPS issuance dry-run approval gate

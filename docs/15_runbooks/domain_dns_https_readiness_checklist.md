# Domain / DNS / HTTPS Readiness Checklist

## Purpose

This runbook is the Loop 116 public-exposure gate before any real domain, DNS, or HTTPS work. It is a checklist and evidence record only.

## Current Status

```text
production_no_go
domain_selection=unknown
domain_ownership=unconfirmed
dns_provider=unknown
acme_method=undecided
nginx_public_enablement=not_approved
https_issue=not_executed
external_smoke=not_executed
```

## Hard Boundary

Do not proceed to public exposure until a later Loop explicitly approves it.

Forbidden in this runbook:

- changing DNS records, CAA, DNSSEC, or firewall rules.
- changing active Nginx includes.
- Nginx reload/restart.
- HTTPS certificate issuance or renewal.
- external HTTP/HTTPS smoke.
- displaying `.env`, token, key, private key, LINE userId, or production logs.
- LINE/OpenAI/Supabase real connections.

## Domain Inventory

| name | type | current use | action |
| --- | --- | --- | --- |
| `amamihome.net` | official tenant domain | knowledge/reference content | Do not assume it is the Admin/API host. |
| `admin.taiyolabel.site` | historical deployment candidate | old Admin env/template docs | Confirm ownership and DNS before reuse. |
| `api.taiyolabel.site` | historical deployment candidate | old API/env/webhook docs | Confirm ownership and DNS before reuse. |
| `_CHANGE_ME_` | placeholder | repo-local templates | Replace only after approval. |
| `amami-line-crm.invalid` | dry-run placeholder | localhost Host-header tests | Never use for public DNS. |
| `app.ajnl.net` / `api.ajnl.net` | existing VPS app/certificate | other active site | Do not reuse for amami-line-crm. |

## User Approval Input Sheet

Fill these before any real-domain enablement Loop:

```text
Approved Admin hostname:
Approved API public style: single-host /api path OR separate API hostname
Approved API hostname or prefix:
Approved LINE webhook public URL:
Approved certificate names:
DNS provider:
DNS account owner:
DNS A/AAAA target:
CAA policy:
DNSSEC status:
ACME method: HTTP-01 webroot OR DNS-01
Rollback owner:
Maintenance window:
External smoke approver:
```

Do not write tokens, API keys, DNS credentials, or certificate private key material in this sheet.

## Repo Evidence

- `deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example` is the Loop 115 path-routing candidate.
- `deploy/vps/taiyolabel/nginx/amami-line-crm.http-bootstrap.conf.example` is the placeholder HTTP bootstrap example.
- `deploy/vps/taiyolabel/nginx/amami-line-crm.https.conf.example` is the placeholder HTTPS example.
- `deploy/vps/taiyolabel/preflight/check_domain_dns_https_readiness.sh` is a read-only preflight helper.

## VPS Read-only Evidence

Loop 116 read-only observations:

- Host: `root@160.251.174.201`
- Hostname: `vm-227d8253-eb`
- Nginx: `nginx/1.24.0 (Ubuntu)`
- `nginx -t`: success
- Nginx service: active
- Public listeners: 80 and 443
- App listeners: `127.0.0.1:8788` and `127.0.0.1:3002`
- `sites-enabled` amami-line-crm include: absent
- Existing Let's Encrypt live name: `app.ajnl.net`
- Certbot: installed with nginx, standalone, and webroot plugins
- Certbot timer: present
- UFW: 22, 80, 443, and 8080 allowed

No active Nginx config, DNS, HTTPS certificate, firewall, env, or app runtime change was made.

## DNS Checklist

Before public enablement:

- [ ] Canonical hostname selected.
- [ ] Domain owner confirmed.
- [ ] DNS provider confirmed.
- [ ] A/AAAA records point to the approved VPS address.
- [ ] Conflicting records are absent.
- [ ] CAA policy allows the chosen CA.
- [ ] DNSSEC status is understood.
- [ ] TTL and rollback plan are documented.

Loop 116 did not run DNS checks because the canonical hostname is not yet approved.

## HTTPS / ACME Checklist

- [ ] Choose HTTP-01 webroot or DNS-01.
- [ ] Confirm certificate names / SAN list.
- [ ] Confirm port 80 path if HTTP-01 is used.
- [ ] Confirm DNS credential handling if DNS-01 is used.
- [ ] Confirm existing `app.ajnl.net` certificate is not reused.
- [ ] Confirm private key material will never enter the repo, logs, or Codex prompt.
- [ ] Run a dedicated approval Loop before issuance.

Current recommendation is to keep `acme_method=undecided`.

## Application HTTPS Checklist

- [ ] Decide single-origin `/api/` path vs separate API hostname.
- [ ] Align `API_BASE_URL`, `ADMIN_PUBLIC_ORIGIN`, `API_PUBLIC_ORIGIN`, and `APP_BASE_URL`.
- [ ] Confirm selected tenant cookie attributes before HTTPS production.
- [ ] Confirm Bearer token is never stored or displayed.
- [ ] Confirm `x-selected-tenant-id` remains a selector, not authentication.
- [ ] Confirm `Authorization` and `x-selected-tenant-id` pass through the proxy.
- [ ] Confirm LINE webhook URL shape after hostname is approved.
- [ ] Confirm CORS policy if separate API hostname is selected.

## Read-only Preflight Helper

The helper can be used only for read-only checks:

```bash
deploy/vps/taiyolabel/preflight/check_domain_dns_https_readiness.sh --domain example.com --host example.com --expected-ip 203.0.113.10
```

It rejects placeholder names and prints DNS/Nginx/listener/certbot summaries. It does not perform HTTP requests and does not change system configuration.

## Go / No-Go

Stay No-Go if any of these are true:

- hostname is undecided.
- DNS ownership/provider is unknown.
- ACME method is undecided.
- active Nginx change is not explicitly approved.
- external smoke is not approved.
- Auth/LINE/OpenAI/Supabase production gates are incomplete.

Current judgment:

```text
production_no_go
```

# Production Quick Rollback Card

## Purpose

Quickly move the production runtime to an approved rollback target after explicit rollback approval.

Do not use this card for exploratory diagnosis. If there is no explicit rollback approval, record a rollback recommendation and stop.

## Rollback Targets

### A. Disable LINE Only

Use when LINE outbound behavior is the concern and OpenAI/Admin/API are otherwise healthy.

Target:

```txt
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=openai
OpenAI systemd drop-in=present
REPOSITORY_RUNTIME=supabase
```

### B. Disable OpenAI Only

Use when OpenAI runtime behavior, latency, parsing, cost, or provider errors are the concern and LINE outbound behavior remains approved.

Target:

```txt
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
REPOSITORY_RUNTIME=supabase
```

### C. Safe Mode

Use when multiple areas are uncertain or the operator wants the safest receive/admin baseline.

Target:

```txt
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
REPOSITORY_RUNTIME=supabase
```

## Commands

Run only the approved target on the VPS after explicit approval. The exact implementation command depends on the selected target and must not print env values.

For LINE only or safe mode, use the approved LINE disable helper:

```bash
/root/bin/amami-line-disable-line-real-push.sh
systemctl restart amami-line-crm-api.service
```

For OpenAI only or safe mode, remove the approved OpenAI runtime drop-in through a separate rollback Loop, run daemon reload, then restart only the API service. Do not cat or display the OpenAI runtime env file.

Then verify:

```bash
curl --noproxy "*" -sS -o /dev/null -w "api-direct /health rollback %{http_code}\n" \
  http://127.0.0.1:8788/health

curl -sS -o /dev/null -w "https api-health rollback %{http_code}\n" \
  https://admin.taiyolabel.site/api/health

curl -sS -o /dev/null -w "https admin-api-no-header-customers rollback %{http_code}\n" \
  https://admin.taiyolabel.site/api/admin/customers
```

For LINE invalid-signature verification, use the approved secret-safe helper pattern. Do not print or record the webhook suffix.

Expected verification:

```txt
api_direct_health=200
https_api_health=200
https_admin_api_no_header_customers=401
https_line_invalid_signature=401_or_400_or_403
```

## Do Not

- Do not display env values.
- Do not cat secret files.
- Do not record webhook suffixes.
- Do not record LINE user identifiers, reply tokens, inbound bodies, or outbound bodies.
- Do not change Nginx, DNS, or certbot.
- Do not apply Supabase schema/RLS changes.
- Do not send additional LINE messages.
- Do not run OpenAI real API smoke.

## After Rollback

1. Record sanitized health results.
2. Record whether rollback succeeded.
3. Keep exact secret values out of docs and final reports.
4. Open a separate incident follow-up Loop.

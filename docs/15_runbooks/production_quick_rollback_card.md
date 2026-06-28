# Production Quick Rollback Card

## Purpose

Quickly return from line-only production to safe receive-only mode after explicit rollback approval.

Do not use this card for exploratory diagnosis. If there is no explicit rollback approval, record a rollback recommendation and stop.

## Rollback Target

```txt
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
REPOSITORY_RUNTIME=supabase
```

## Commands

Run only on the VPS after explicit approval:

```bash
/root/bin/amami-line-disable-line-real-push.sh
systemctl restart amami-line-crm-api.service
```

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
- Do not enable OpenAI runtime.
- Do not send additional LINE messages.

## After Rollback

1. Record sanitized health results.
2. Record whether rollback succeeded.
3. Keep exact secret values out of docs and final reports.
4. Open a separate incident follow-up Loop.

# 07 External Smoke Plan

These commands are for a later VPS execution Loop only. Loop 108 does not execute them.

Future external smoke after nginx and SSL are intentionally installed:

```bash
curl -I https://admin.taiyolabel.site/
curl -I https://api.taiyolabel.site/
curl -sS https://api.taiyolabel.site/health || true
```

Do not call:

- LINE webhook endpoint.
- LINE push endpoint.
- OpenAI-backed endpoints.
- Supabase mutation endpoints.
- customer data endpoints.

Future LINE webhook URL shape:

```text
https://api.taiyolabel.site/api/line/webhook/<webhookSecretPath>
```

Do not register this URL in LINE Developers during Loop 108.

Real API gates remain disabled:

```text
LINE_MESSAGING_ENABLED=false
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OPENAI_REAL_API_ENABLED=false
```

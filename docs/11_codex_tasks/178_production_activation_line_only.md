# Loop 178: Production Activation Line Only

## Purpose

Record the approved line-only production activation.

This Loop changes only the LINE real push runtime flag. It does not enable OpenAI runtime, does not change Nginx/DNS/certbot, and does not change Supabase schema or RLS.

## Approved Operator Tokens

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=YES
ALLOW_RUNTIME_ACTIVATION_CHANGES=YES
ACTIVATION_MODE=line_only
ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO
ALLOW_ADDITIONAL_LINE_SEND_SMOKE=NO
```

## Scope

- Confirm pre-activation health and safety checks.
- Enable only `LINE_REAL_PUSH_ENABLED=true` using the approved VPS helper.
- Restart only the API service.
- Confirm post-activation health and safety checks.
- Keep `AI_PROVIDER=mock`.
- Keep OpenAI runtime drop-in absent.
- Keep Nginx/DNS/certbot unchanged.
- Keep Supabase schema/RLS unchanged.
- Do not perform an additional LINE send.

## Out of Scope

- Additional LINE message smoke.
- OpenAI real API call or runtime enablement.
- Nginx config change, reload, restart, DNS change, certbot, or HTTPS change.
- Supabase migration, RLS, schema change, write smoke, or endpoint change.
- API/Auth/RLS/runtime feature changes.
- UI changes.
- Secret display or `.env` edits.

## Pre-Activation Evidence

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
api_direct_health_loop178_pre=200
https_api_health_loop178_pre=200
https_admin_root_loop178_pre=200
https_admin_customers_loop178_pre=200
https_admin_api_no_header_customers_loop178_pre=401
https_line_invalid_signature_loop178_pre=401
```

## Activation Result

```txt
activation_mode=line_only
runtime_activation_changes=performed
line_real_push_final_enable=performed
activation_result=success
rollback_performed=false
production_readiness=production_go
```

## Final Runtime State

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
Nginx/DNS/certbot changes=none
Supabase schema/RLS changes=none
additional_line_send_performed=false
openai_real_api_performed=false
```

## Final Safety Evidence

```txt
api_direct_health_loop178_line_activated=200
https_api_health_loop178_line_activated=200
api_direct_health_loop178_final=200
https_api_health_loop178_final=200
https_admin_root_loop178_final=200
https_admin_customers_loop178_final=200
https_admin_api_no_header_customers_loop178_final=401
https_line_invalid_signature_loop178_final=401
```

## Safety Boundary

- Secret values were not displayed or recorded.
- Webhook path values were not displayed or recorded.
- LINE user identifiers, reply tokens, inbound bodies, and outbound bodies were not recorded.
- OpenAI model values, prompts, request bodies, responses, and provider outputs were not recorded.
- Supabase endpoints, keys, and DB URLs were not recorded.
- No additional LINE send was performed in this Loop.

## Rollback

Rollback was not needed.

If a future rollback is required:

1. Disable LINE real push with the approved helper.
2. Restart only the API service.
3. Confirm API direct health returns `200`.
4. Confirm HTTPS API health returns `200`.
5. Confirm no-header Admin API customers returns `401`.
6. Confirm invalid-signature LINE webhook returns `401`.

## Test Coverage

- Static docs tests confirm the Loop 178 task doc and runbook exist.
- Static docs tests confirm line-only activation state is recorded.
- Static docs tests confirm OpenAI, Nginx/DNS/certbot, Supabase schema/RLS, and additional LINE send remained out of scope.
- Static docs tests check that secret-shaped values, webhook paths, identifiers, and bodies are not recorded.

## Next Loop

```txt
Loop 179: first-hour production monitoring
```

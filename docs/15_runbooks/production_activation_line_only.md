# Production Activation Line Only

## Purpose

This runbook records the Loop 178 line-only production activation.

The approved action was limited to enabling LINE real push. OpenAI runtime, Nginx/DNS/certbot, Supabase schema/RLS, and additional LINE send remained out of scope.

## Approval

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

## Pre-Activation State

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

## Action

- Enabled only `LINE_REAL_PUSH_ENABLED=true` through the approved VPS helper.
- Restarted only the API service.
- Did not perform an additional LINE send.
- Did not enable OpenAI runtime.
- Did not change Nginx, DNS, certbot, Supabase schema, or RLS.

## Result

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

## Final Verification

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
- Additional LINE send was not performed.

## Rollback

Rollback was not performed because activation succeeded.

Rollback procedure for a future incident:

1. Disable LINE real push with the approved helper.
2. Restart only the API service.
3. Confirm API direct health.
4. Confirm HTTPS API health.
5. Confirm no-header Admin API rejection.
6. Confirm invalid-signature LINE webhook rejection.

## Next Loop

```txt
Loop 179: first-hour production monitoring
```

## Loop 179 Monitoring Follow-up

Loop 179 completed read-only first-hour monitoring after line-only activation.

```txt
monitoring_status=healthy
rollback_recommended=false
runtime_changes_performed=false
line_send_performed=false
openai_real_api_performed=false
```

Production readiness remains Go for line-only monitoring.

Details are recorded in [first_hour_production_monitoring.md](first_hour_production_monitoring.md).

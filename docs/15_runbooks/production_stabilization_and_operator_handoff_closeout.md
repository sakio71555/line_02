# Production Stabilization and Operator Handoff Closeout

## Purpose

This runbook is the operator closeout record after line-only production activation and healthy first-hour monitoring.

It is for operations handoff. It does not enable OpenAI runtime, change LINE settings, change Nginx/DNS/certbot, change Supabase schema/RLS, or send additional LINE messages.

## Closeout Status

```txt
closeout_status=complete
production_readiness=production_go
activation_mode=line_only
monitoring_status=healthy
rollback_recommended=false
handoff_complete=true
runtime_changes_performed=false
line_send_performed=false
openai_real_api_performed=false
nginx_dns_certbot_changes=none
supabase_schema_rls_changes=none
```

## Current Production State

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
api_service_active=true
admin_service_active=true
```

## Closeout Verification

```txt
api_direct_health_loop180_closeout=200
https_api_health_loop180_closeout=200
https_admin_root_loop180_closeout=200
https_admin_customers_loop180_closeout=200
https_admin_api_no_header_customers_loop180_closeout=401
https_line_invalid_signature_loop180_closeout=401
```

## What Is Live

- HTTPS Admin route.
- LINE webhook receive path.
- Supabase-backed persistence runtime.
- LINE real push enabled for approved line-only production.
- Admin API no-header rejection.
- LINE signature verification.

## What Is Intentionally Not Live

- OpenAI runtime.
- OpenAI systemd drop-in.
- Additional LINE send tests.
- New Nginx/DNS/certbot changes beyond the existing HTTPS setup.
- New Supabase schema/RLS changes.
- Supabase write smoke.

## Daily Operations Checklist

1. API direct health returns `200`.
2. HTTPS API health returns `200`.
3. Admin root or customers route returns `200`.
4. Admin API no-header customers returns `401`.
5. LINE invalid-signature check returns `401`, `400`, or `403`.
6. API journal summary has no critical error classification.
7. Nginx error summary has no new actionable error.
8. Disk, memory, and load are within normal range.
9. Record only sanitized status values.

## Weekly Operations Checklist

1. Review dependency update candidates.
2. Review backup readiness and restore path.
3. Review Supabase usage and quota dashboards without recording endpoints or keys.
4. Review LINE delivery/error dashboard without recording user identifiers or message bodies.
5. Confirm runbooks still match runtime.
6. Confirm rollback owner availability.
7. Convert improvements into small Loop tasks.

## Incident Response Checklist

### LINE Send Issue

1. Stop any manual resend attempt.
2. Preserve sanitized timestamps and status codes.
3. Check whether line-only rollback should be recommended.
4. If rollback is approved, use the quick rollback card.

### Webhook Issue

1. Confirm HTTPS API health.
2. Confirm invalid-signature rejection.
3. Check sanitized API journal classification.
4. Do not record webhook suffix, request body, reply token, or user identifier.

### Supabase Issue

1. Confirm API health and Admin API no-header rejection.
2. Review sanitized runtime classification.
3. Do not display endpoint, key, DB URL, or SQL connection string.
4. Plan any schema/RLS/write verification as a separate Loop.

### API Service Down

1. Check service active state.
2. Check sanitized journal classification.
3. Restart only with explicit incident approval.
4. Re-run health and invalid-signature checks after recovery.

### Admin Service Down

1. Check service active state.
2. Confirm API health independently.
3. Check sanitized Admin service logs.
4. Re-run Admin route smoke after recovery.

## Immediate Rollback Card

Use [production_quick_rollback_card.md](production_quick_rollback_card.md) after explicit approval.

Rollback target:

```txt
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
REPOSITORY_RUNTIME=supabase
```

Rollback verification:

```txt
api_direct_health=200
https_api_health=200
https_admin_api_no_header_customers=401
https_line_invalid_signature=401_or_400_or_403
```

## Future Activation

OpenAI runtime activation remains a separate explicit Loop.

Before any OpenAI runtime activation:

- Confirm operator approval.
- Keep prompt and response bodies out of docs and final reports.
- Keep API key and model value out of docs and final reports.
- Run a single controlled smoke only when approved.
- Roll back to `AI_PROVIDER=mock` if the smoke fails.

## Safety Boundary

- Secret values were not displayed or recorded.
- Webhook path values were not displayed or recorded.
- LINE user identifiers, reply tokens, inbound bodies, and outbound bodies were not recorded.
- OpenAI API key, model values, prompts, request bodies, responses, and provider outputs were not recorded.
- Supabase endpoints, keys, and DB URLs were not recorded.
- No additional LINE send was performed.
- No runtime changes were performed.

## Next Loop

```txt
Loop 181: OpenAI runtime activation planning
```

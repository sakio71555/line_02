# Loop 145A: LINE webhook secret path single-segment remediation

## Goal

Replace the runtime LINE webhook secret path with a one-segment URL-safe value so the production HTTPS webhook URL reaches the existing route:

```txt
POST /api/line/webhook/:webhookSecret
```

This Loop records the remediation and verification only. It does not enable LINE real push/reply and does not change API code, Nginx, DNS, certbot, OpenAI, Supabase, Auth, RLS, runtime mode, or UI.

## Scope

- Keep the working tree clean before remediation.
- Confirm the existing route expects a single path segment.
- Rotate only the VPS `LINE_WEBHOOK_SECRET_PATH` through a root-only helper.
- Keep `LINE_REAL_PUSH_ENABLED=false`.
- Confirm the runtime env file by key names only.
- Confirm the new webhook path shape without displaying the value.
- Restart only `amami-line-crm-api.service`.
- Confirm direct and HTTPS health stay `200`.
- Confirm direct and HTTPS invalid-signature webhook POST reach the route and return `401`.
- Ask the human operator to update LINE Developers Console with the same value.
- Ask the human operator to press LINE Developers Console Verify.
- Record LINE Developers verification result without recording the secret path value.
- Update docs, dev log, production readiness, and static integration tests.

## Out of Scope

- Secret, token, or actual webhook path display.
- `secret file cat`, `.env cat`, raw `systemctl show -p Environment`, or raw journal output.
- LINE real push/reply.
- `LINE_REAL_PUSH_ENABLED=true`.
- LINE Messaging API send call.
- OpenAI real API.
- Supabase real connection.
- Supabase migration / RLS changes.
- Nginx config changes.
- Nginx reload/restart.
- certbot rerun.
- DNS changes.
- API/Auth/RLS/runtime/migration/UI code changes.
- production Go decision.

## Remediation Summary

The previous Loop 144 diagnosis found:

```txt
classification=B_API_route_path_mismatch
root_cause=LINE_WEBHOOK_SECRET_PATH_contains_slash_and_does_not_match_single_segment_route
```

Loop 145A rotated `LINE_WEBHOOK_SECRET_PATH` to a one-segment value. The actual value is not recorded. An intermediate value was treated as exposed after being pasted outside the intended secret channel, so it was rotated again before final verification.

## Runtime Env Result

```txt
line_runtime_env_file=/etc/amami-line-crm/line-runtime.env
line_runtime_env_file_permissions=root_only
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
```

## Shape Check Result

```txt
format_check=passed
LINE_WEBHOOK_SECRET_PATH: single-segment; value not displayed
process_webhook_path_contains_slash=false
process_webhook_path_contains_whitespace=false
process_webhook_path_min_length_ok=true
```

## API Health Result

```txt
api_restart=success
api_service=active
direct_health_http_code=200
https_api_health_http_code=200
```

## Route Matrix Result

```txt
direct_api_prefixed_invalid_signature=401
direct_non_api_prefixed_invalid_signature=404
https_api_prefixed_invalid_signature=401
https_current_path_valid_signature_dry_run=400
https_known_wrong_path_valid_signature=404
```

The `401` results show that the correct `/api/line/webhook/:webhookSecret` path reaches the webhook handler and fails safely on invalid signature.

The known-wrong path returns `404`, which confirms that a LINE Developers Console URL mismatch would still appear as `404`.

The local valid-signature dry-run used a minimal dummy body and returned `400`; this was not treated as LINE verification failure because LINE Developers Console verification succeeded with its own platform request.

## LINE Developers Verification

```txt
line_developers_console_url_updated_by_operator=yes
line_developers_verification_result=success
line_real_push_reply=not_performed
line_messaging_api_send=not_performed
```

Codex did not operate the LINE Developers Console. The human operator updated the URL and pressed Verify.

## Safety Boundary

```txt
secret_values_recorded=no
actual_webhookSecretPath_recorded=no
nginx_change=no
nginx_reload_restart=no
dns_change=no
certbot_rerun=no
line_real_push_reply=not_performed
openai_real_api=no
supabase_real_connection=no
production_readiness=production_no_go
```

## Test Coverage

- Static integration test confirms the Loop 145A task doc and runbook exist.
- Static integration test confirms the single-segment remediation, `401` invalid-signature route matrix, and LINE Developers verification success are recorded.
- Static integration test confirms secret assignments, concrete webhook URL paths, tokens, database URLs, private key references, and production Go state are not recorded.

## Remaining Risks

- LINE real receive event smoke has not been performed.
- LINE real push/reply remains disabled.
- LINE webhook usage toggle state should be included in the next real receive smoke checklist.
- Supabase real connection and OpenAI real API remain outside this Loop.
- production readiness remains `production_no_go`.

## Next Loop Candidates

1. Loop 146: LINE real receive event smoke
2. Loop 147: Supabase staging secret injection checklist
3. Loop 148: OpenAI provider production gate
4. Loop 149: production Go/No-Go review

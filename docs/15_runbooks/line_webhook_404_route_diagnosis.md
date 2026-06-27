# LINE Webhook 404 Route Diagnosis

## Purpose

Record the Loop 144 diagnosis for an actual LINE webhook invalid-signature dry-run returning `404` after LINE runtime secrets were connected to the VPS API service.

This is a diagnosis record. It does not authorize LINE Developers verification, LINE real push/reply, Nginx changes, DNS changes, certbot, OpenAI, Supabase, or production Go.

## Safety Rules

- Do not display or record LINE secret values.
- Do not display or record the actual `webhookSecretPath`.
- Do not print `secret file cat`, `.env cat`, `systemctl show -p Environment`, or raw journal output.
- Keep `LINE_REAL_PUSH_ENABLED=false`.
- Do not use LINE Developers verification until route status is safe.

## Expected API Behavior

```txt
route_path=/api/line/webhook/:webhookSecret
method=POST
active_env_name=LINE_WEBHOOK_SECRET_PATH
inactive_env_name=LINE_WEBHOOK_SECRET
unknown_webhook_path_status=404
invalid_signature_status=401
malformed_body_status=400
signature_verification=verifyLineSignature
```

If the request reaches the route with the correct path value and an invalid signature, the expected status is `401`.

## Runtime State

```txt
api_service=active
line_runtime_environmentfile=connected
direct_health=200
https_api_health=200
process_env_line_keys=present
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
```

The API process has the LINE env keys loaded. Values were never displayed.

## Route Matrix Result

```txt
direct_api_prefixed_invalid_signature=404
direct_non_api_prefixed_invalid_signature=404
https_api_prefixed_invalid_signature=404
direct_api_prefixed_404_body=text/plain_404_not_found
```

Because direct API and HTTPS both returned `404`, this is not a pure Nginx proxy-path problem.

Because the direct API body was framework `404 Not Found`, not JSON `unknown_webhook_path`, the request did not reach the registered webhook handler.

## Shape Diagnosis

```txt
webhookSecretPath_compare=yes
process_webhook_path_present=true
process_webhook_path_single_segment_safe=false
process_webhook_path_contains_slash=true
process_webhook_path_contains_query_or_fragment_marker=false
process_webhook_path_contains_whitespace=false
process_webhook_path_contains_shell_quote=false
```

The value itself is not recorded. The shape check shows it contains a slash, so it cannot match the current one-segment route parameter.

## Sanitized Journal Summary

```txt
journal_sanitized_secret_like_remaining=false
journal_sanitized_interesting_lines=0
```

## Diagnosis

```txt
classification=B_API_route_path_mismatch
root_cause=LINE_WEBHOOK_SECRET_PATH_contains_slash_and_does_not_match_single_segment_route
fix_applied=no_code_or_nginx_fix_in_this_loop
environmentfile_connected=yes
actual_webhook_invalid_signature_dry_run_result=404
line_developers_verification_result=not_performed
line_real_push_reply=not_performed
production_readiness=production_no_go
```

## Next Remediation

Recommended next Loop:

```txt
Loop 145A: LINE webhook secret path single-segment remediation
```

Minimum expected work:

- Keep secret values outside Codex.
- Replace `LINE_WEBHOOK_SECRET_PATH` with a one-segment URL-safe value.
- Keep `LINE_REAL_PUSH_ENABLED=false`.
- Restart only the API service.
- Confirm `/health=200`.
- Confirm direct and HTTPS invalid-signature webhook POST return `401`.
- Only then proceed to LINE Developers verification.

Alternative:

```txt
Loop 145B: API wildcard webhook route plan
```

Use this only if multi-segment webhook paths are required. It needs explicit API route design and tests first.

## Loop 145A Update

Loop 145A followed the recommended remediation path.

```txt
LINE_WEBHOOK_SECRET_PATH: single-segment; value not displayed
direct_api_prefixed_invalid_signature=401
direct_non_api_prefixed_invalid_signature=404
https_api_prefixed_invalid_signature=401
line_developers_verification_result=success
line_real_push_reply=not_performed
production_readiness=production_no_go
```

The actual webhook secret path value is not recorded.

# Loop 144: LINE webhook 404 route diagnosis

## Goal

Diagnose why the actual LINE webhook invalid-signature dry-run returned `404` after the LINE runtime EnvironmentFile was connected and API health stayed green.

This Loop is diagnosis-only for code and Nginx. It does not change API code, Nginx config, DNS, certbot, LINE Developers Console, or runtime secrets.

## Scope

- Confirm the repository starts clean on `main...origin/main`.
- Confirm local route implementation and expected webhook statuses.
- Confirm the VPS API process has LINE runtime env keys loaded, redacted only.
- Run a route matrix without displaying the real `webhookSecretPath`.
- Confirm whether direct API and HTTPS behave differently.
- Confirm the sanitized journal has no secret-like values left.
- Classify the root cause.
- Update docs, dev log, production readiness, and static integration tests.

## Out of Scope

- Secret, token, or actual webhook path display.
- `secret file cat`, `.env cat`, or `systemctl show -p Environment`.
- LINE Developers Console verification.
- LINE real push/reply.
- `LINE_REAL_PUSH_ENABLED=true`.
- OpenAI real API.
- Supabase real connection.
- Nginx config changes.
- Nginx reload/restart.
- certbot rerun.
- DNS changes.
- API/Auth/RLS/runtime/migration/UI code changes.
- production Go decision.

## Route Implementation

```txt
route_path=/api/line/webhook/:webhookSecret
method=POST
unknown_webhook_path_status=404
invalid_signature_status=401
malformed_body_status=400
signature_header=x-line-signature
signature_verification=verifyLineSignature
active_env_name=LINE_WEBHOOK_SECRET_PATH
inactive_env_name=LINE_WEBHOOK_SECRET
```

## VPS Runtime Checks

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

The API process had the LINE runtime env keys loaded. The values were not displayed.

## Route Matrix

```txt
direct_api_prefixed_invalid_signature=404
direct_non_api_prefixed_invalid_signature=404
https_api_prefixed_invalid_signature=404
direct_api_prefixed_404_body=text/plain_404_not_found
```

Direct API and HTTPS both returned `404`. This rules out a pure Nginx proxy path mismatch.

The direct API response body was the framework `404 Not Found` response, not the route's JSON `unknown_webhook_path` response. That means the request did not reach the registered `POST /api/line/webhook/:webhookSecret` handler.

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

The actual `LINE_WEBHOOK_SECRET_PATH` value is not recorded, but the shape check shows it contains a slash and is not safe as a single URL path segment.

## Sanitized Journal Summary

```txt
journal_sanitized_secret_like_remaining=false
journal_sanitized_interesting_lines=0
```

No raw journal output containing secrets was recorded in repo docs.

## Diagnosis Classification

```txt
classification=B_API_route_path_mismatch
root_cause=LINE_WEBHOOK_SECRET_PATH_contains_slash_and_does_not_match_single_segment_route
fix_applied=no_code_or_nginx_fix_in_this_loop
environmentfile_connected=yes
line_developers_verification_result=not_performed
line_real_push_reply=not_performed
production_readiness=production_no_go
```

The API route expects one path segment after `/api/line/webhook/`. Because the configured webhook secret path contains a slash, the request is split into multiple path segments and does not match `:webhookSecret`.

## Recommended Next Loop

Use a dedicated remediation Loop. Do not fix it inside this diagnosis Loop.

Options:

1. `Loop 145A: LINE webhook secret path single-segment remediation`
   - Replace the VPS `LINE_WEBHOOK_SECRET_PATH` with a one-segment URL-safe value.
   - Keep `LINE_REAL_PUSH_ENABLED=false`.
   - Reconnect/restart API and confirm direct/HTTPS invalid-signature returns `401`.
   - Only then ask for LINE Developers verification.
2. `Loop 145B: API wildcard webhook route plan`
   - Only if the team intentionally wants multi-segment webhook paths.
   - Requires API route design, tests, and docs before runtime use.

Recommended path is Loop 145A because it is smaller and safer.

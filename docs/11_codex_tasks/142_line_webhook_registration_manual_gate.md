# Loop 142: LINE webhook registration manual gate

## Goal

Prepare the human-operated LINE Developers Console registration gate for the production candidate webhook URL.

Codex must not change LINE Developers Console settings. This Loop only records the manual steps, pre-checks, post-checks, and safety boundary.

## Scope

- Document the manual registration URL pattern.
- Document the pre-registration checklist.
- Document the LINE Developers Console manual steps.
- Document the post-registration verification checklist.
- Keep `production_readiness=production_no_go`.
- Update README, development loop docs, LINE webhook runbooks, production readiness, dev log, and static integration tests.
- Commit and push.

## Out of Scope

- LINE Developers Console changes.
- LINE webhook URL registration by Codex.
- Webhook usage toggle by Codex.
- LINE API calls.
- LINE production sends.
- LINE channel secret display.
- LINE access token display.
- OpenAI real API.
- Supabase real connection or migration.
- RLS changes.
- Production secret injection.
- `.env` display or mutation.
- DNS changes.
- certbot execution or certificate renewal.
- Nginx config changes.
- Nginx reload or restart.
- VPS command execution.
- API/Auth/RLS/runtime/migration/UI changes.
- production Go decision.

## Manual Registration URL Pattern

```txt
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
actual_webhook_secret_path_recorded=no
line_webhook_registration=manual_only_not_done_by_codex
line_developers_console_change_by_codex=no
```

The real `webhookSecretPath` is not recorded in docs, tests, commits, terminal output, or reports. It is managed outside the repository and is entered only by the human operator in the LINE Developers Console Webhook URL field.

## Pre-registration Checklist

Before a human registers the URL in LINE Developers Console:

```txt
https_ready_for_review=true
line_webhook_ready_for_registration=true
https_api_health=200
route_path=/api/line/webhook/:webhookSecret
webhook_secret_path_real_value_managed_outside_docs=true
line_channel_secret_displayed=no
line_access_token_displayed=no
production_readiness=production_no_go
```

Also confirm:

- The URL uses `https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>`.
- The real `webhookSecretPath` is available to the human operator through approved secret handling.
- LINE channel secret and access token are not displayed in docs or logs.
- LINE real push remains disabled until a separate explicit Loop.

## Manual Steps for Human Operator

The human operator performs these steps outside Codex:

1. Open LINE Developers Console.
2. Select the target Provider and Messaging API Channel.
3. Open Messaging API settings.
4. Register `https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>` in the Webhook URL field.
5. Turn Webhook usage ON.
6. Press Verify if needed.
7. Check existing response, greeting, and auto-response settings.
8. Do not perform real LINE send testing until a separate explicit approval Loop.

## Post-registration Checklist

After the human registration:

```txt
line_developers_console_verification_result=record_without_secret
api_log_webhook_arrival=confirm_if_secret_safe
invalid_signature_or_secret_mismatch=none_expected
webhook_5xx=none_expected
line_real_push_triggered=no
```

If API logs are checked, do not copy request bodies, signatures, tokens, LINE user IDs, or real customer information into docs or reports.

## Post-registration Verification Plan

Run only after a separate explicit post-registration verification Loop is approved:

```txt
sudo nginx -t
direct_api_health=/health
https_api_health=https://admin.taiyolabel.site/api/health
log_check=secret_safe_only
```

Potential log locations depend on the server configuration and must be confirmed in that future Loop. Do not guess or record secret-bearing log content.

## Safety Boundary

```txt
line_developers_console_change_by_codex=no
line_webhook_registration_by_codex=no
line_webhook_usage_toggle_by_codex=no
line_api_call=no
line_real_push=no
line_channel_secret_displayed=no
line_access_token_displayed=no
openai_real_api=no
supabase_real_connection=no
supabase_migration=no
rls_change=no
production_secret_injection=no
env_display_or_mutation=no
dns_change=no
certbot_rerun=no
nginx_config_change=no
nginx_reload_restart=no
vps_command_execution=no
production_readiness=production_no_go
```

## Production Readiness

`production_readiness` remains `production_no_go`.

Remaining No-Go reasons:

- LINE webhook is not registered by Codex and must be registered manually.
- LINE real push is not approved.
- Supabase real connection has not executed.
- OpenAI real API has not executed.
- Production secret injection has not executed.

## Test

- Static integration test checks the manual gate docs, URL pattern, pre/post registration checklists, manual steps, No-Go readiness, safety boundary, and secret/token exclusion.

## Next Loop Candidates

1. Loop 143: LINE webhook post-registration verification.
2. Loop 144: Supabase staging secret injection checklist.
3. Loop 145: OpenAI provider production gate.
4. Loop 146: production Go/No-Go review.

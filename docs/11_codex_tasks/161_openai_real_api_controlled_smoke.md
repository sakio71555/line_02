# Loop 161: OpenAI real API controlled smoke

## Goal

Confirm whether the VPS review runtime is ready for a one-call OpenAI real API smoke, without recording secrets or customer content.

This Loop did not perform the real API smoke because the required runtime env file was not present.

## Scope

- Reconfirm the OpenAI provider implementation boundary.
- Check the VPS runtime state with redacted env output only.
- Check whether the root-only OpenAI runtime helper exists.
- Check whether the root-only OpenAI runtime env file exists.
- Keep `/health` healthy.
- Keep LINE real push/reply disabled.
- Record the result in docs, tests, and dev log.

## Out of Scope

- OpenAI API real call without the required env and approval.
- LINE real push/reply.
- Supabase migration, RLS, or write smoke.
- Nginx, DNS, certbot, or HTTPS config changes.
- Secret value display or recording.
- Production promotion.

## Implementation Check

```txt
openai_provider_classification=B_real_provider_wired_but_no_safe_external_smoke_route
provider_boundary_exists=true
real_http_transport_wired=true
runtime_ai_provider_switch=implemented
api_default_provider=mock
startup_openai_call=false
```

The code has `OpenAiProvider` and `FetchOpenAiResponsesTransport`, and `AI_PROVIDER=openai` can select it at API startup. The available public API routes use customer timeline or RAG source data, so this Loop did not identify a dedicated non-customer external smoke route.

## VPS Runtime Check

```txt
api_service=active
admin_service=active
api_direct_health_loop161_start=200
https_api_health_loop161_start=200
repository_runtime_final=supabase
ai_provider_final=mock
line_real_push_enabled=false
openai_helper_status=exists
openai_runtime_env=absent
openai_format_check=skipped_absent
openai_environment_file_connection=skipped_absent
openai_real_api_smoke=not_performed
openai_real_api_smoke_reason=openai_runtime_env_absent_pending_human_input
openai_response_body_recorded=no
openai_api_key_recorded=no
openai_ready=false
```

## Safety Re-smoke

```txt
api_direct_health_loop161_final=200
https_api_health_loop161_final=200
customers_no_header_loop161=401
line_invalid_signature_loop161=401
final_ai_provider_mock=true
final_line_real_push_enabled_false=true
final_repository_runtime_supabase=true
production_readiness=production_no_go
```

## Secret Handling

Values were not displayed or recorded for:

- OpenAI API key.
- OpenAI model value.
- Authorization bearer token.
- LINE channel secret.
- LINE channel access token.
- LINE webhook path value.
- LINE user ID.
- LINE message body.
- Supabase endpoint values and keys.
- PostgreSQL connection strings.

## Test Content

- New integration test checks the Loop 161 task doc and runbook exist.
- It checks `openai_real_api_smoke=not_performed` and `openai_ready=false`.
- It checks `production_readiness=production_no_go`.
- It checks no secret-looking values are recorded in the changed docs.

## Decision

OpenAI real API smoke remains pending. The next OpenAI step needs operator-provided runtime env and explicit one-call smoke approval, or a dedicated safe provider-level smoke route.

## Next

```txt
Loop 162: OpenAI runtime env input and controlled smoke retry
```

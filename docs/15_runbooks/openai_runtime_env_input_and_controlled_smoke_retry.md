# OpenAI Runtime Env Input and Controlled Smoke Retry

## Purpose

Record Loop 162: adding a safe internal OpenAI provider smoke command, deploying it to the VPS review runtime, and running one controlled non-customer smoke after operator approval.

This runbook intentionally records only status. It does not record OpenAI keys, model values, prompts, response bodies, bearer tokens, LINE identifiers, webhook path values, Supabase endpoint values, or DB URLs.

## Preconditions

Required before an OpenAI real API smoke:

- VPS OpenAI runtime env file exists.
- OpenAI API key is configured; value is not displayed.
- OpenAI model is configured; value is not displayed.
- `OPENAI_REAL_API_SMOKE_APPROVED=YES`.
- Prompt is fixed and non-personal.
- Exactly one OpenAI provider call is attempted.
- No retry is performed.
- The API is returned to mock AI after the smoke.

## Internal Smoke Command

```txt
scripts/smoke/openai-provider-smoke.ts
```

The command is internal only. It is not exposed as an HTTP route.

Sanitized output fields:

```txt
openai_smoke=success|failed|not_performed
provider=openai|not_openai
model=configured; value not displayed
response_received=true|false
response_body_recorded=false
prompt_recorded=false
api_key_recorded=false
error_class=OpenAiProviderError
```

## Loop 162 Result

```txt
release_candidate=62e9712212b4c1aea2d158279aabc8cca5e46c35
archive_sha256=346bf0b0918dc0ccaec33acae6bbf0f28de273b67915fc7e640fa4d06f56c691
vps_staging_validation=success
active_deploy=success
api_restart=success
admin_restart=success
openai_runtime_env_exists=true
openai_runtime_env_approval=YES
openai_environment_file_connection=temporary
openai_real_api_smoke=performed_once
openai_real_api_smoke_status=failed
openai_smoke_error_class=OpenAiProviderError
openai_response_body_recorded=no
openai_prompt_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
api_direct_health_after_openai_rollback=200
https_api_health_after_openai_rollback=200
openai_ready=false
production_readiness=production_no_go
```

## Notes

- The first smoke script run returned `not_performed` because an ad-hoc SSH command does not inherit the API service `EnvironmentFile`.
- That first run did not call OpenAI.
- The approved run loaded the root-only runtime env in the command process and made exactly one OpenAI provider call.
- The call failed with sanitized `OpenAiProviderError`.
- The API systemd OpenAI drop-in was removed after the smoke.
- The root-only runtime env file remains present on the VPS for future operator-controlled use, but it is not attached to the API service.

## Final Runtime State

```txt
ai_provider_final=mock
openai_ready=false
line_real_push_enabled=false
line_real_push_reply=not_performed
api_direct_health=200
https_api_health=200
admin_root=200
customers_page=200
admin_customers_no_header=401
line_unknown_webhook=404
production_readiness=production_no_go
```

## Next

```txt
Loop 163: OpenAI smoke failure diagnosis without recording secrets
```

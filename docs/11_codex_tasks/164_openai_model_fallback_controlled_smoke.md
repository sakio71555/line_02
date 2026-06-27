# Loop 164: OpenAI model fallback controlled smoke

## Goal

Record one operator-approved OpenAI provider smoke after the operator updated the configured model value outside the repository.

This Loop is a controlled smoke and documentation Loop. It does not make OpenAI the steady-state runtime.

## Scope

- Confirm the VPS OpenAI runtime env file exists with root-only permissions.
- Confirm required OpenAI env keys are present without displaying values.
- Temporarily attach the OpenAI runtime `EnvironmentFile` to the API service.
- Run exactly one internal OpenAI provider smoke with fixed non-personal input.
- Record only sanitized status fields.
- Remove the OpenAI runtime drop-in and return the API to mock AI.
- Verify API health, HTTPS health, unauthorized admin API behavior, and LINE invalid-signature behavior.
- Update docs, dev log, and static tests.

## Out of Scope

- Recording OpenAI API key, model value, prompt body, raw response body, or authorization headers.
- Additional OpenAI retries.
- Customer timeline, LINE message body, RAG source, or tenant data in the smoke input.
- LINE real push/reply.
- Supabase migration, write smoke, RLS, or schema changes.
- Nginx, DNS, certbot, or HTTPS changes.
- Production Go.

## Result

```txt
openai_runtime_env=exists
openai_runtime_env_mode=root_only
openai_format_check=passed
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
openai_environment_file_connection=temporary
openai_model_fallback_smoke=performed_once
openai_model_fallback_smoke_status=failed
openai_model_fallback_error_class=OpenAiProviderError
openai_model_fallback_error_status=unavailable
openai_model_fallback_error_code=unavailable
openai_model_fallback_error_type=unavailable
openai_model_fallback_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
line_real_push_enabled=false
openai_ready=false
production_readiness=production_no_go
```

## Safety Checks

```txt
api_direct_health_after_openai_dropin=200
https_api_health_after_openai_dropin=200
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
api_direct_health_loop164_final=200
https_api_health_loop164_final=200
admin_customers_no_header_loop164=401
line_invalid_signature_loop164=401
```

## Test Coverage

- Added static docs coverage for Loop 164.
- Confirmed the Loop records exactly one sanitized failed smoke and final rollback to mock AI.
- Confirmed docs do not record OpenAI key values, model values, prompt bodies, raw response bodies, LINE webhook path values, LINE user IDs, LINE message bodies, Supabase endpoint values, DB URLs, bearer tokens, or private keys.

## Remaining Risk

- The model fallback did not change the sanitized failure classification.
- The smoke still fails as `I_unknown_sanitized`, so OpenAI remains not ready.
- The next Loop should inspect request shape or provider transport behavior without raw provider output or additional paid retries.

## Next

```txt
Loop 165: OpenAI request-shape/provider transport remediation
```

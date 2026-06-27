# OpenAI Model Fallback Controlled Smoke

## Purpose

Record Loop 164: a single operator-approved OpenAI provider smoke after the operator changed the configured model value outside Git and outside Codex output.

This runbook keeps OpenAI as a controlled external boundary. It does not promote OpenAI to steady-state runtime.

## Secret and Data Rules

Never record:

- OpenAI API key values.
- OpenAI model values.
- Authorization or bearer tokens.
- Prompt body.
- Raw OpenAI response body.
- Customer timeline, LINE message body, or RAG source content.
- LINE webhook path values.
- LINE user identifiers.
- Supabase endpoint values, keys, DB URLs, or Postgres URLs.

Allowed phrases:

```txt
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
```

## Preconditions

```txt
openai-runtime.env=exists
openai_runtime_env_mode=root_only
openai_format_check=passed
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
OPENAI_REAL_API_SMOKE_APPROVED=YES
api_direct_health_before_smoke=200
https_api_health_before_smoke=200
openai_smoke_command=exists
```

## Procedure Summary

1. Confirm the API and Admin services are active.
2. Confirm `/health` over direct localhost API and HTTPS.
3. Confirm the OpenAI runtime env has required keys without displaying values.
4. Temporarily attach the OpenAI runtime `EnvironmentFile`.
5. Restart the API and confirm `/health`.
6. Run exactly one internal provider smoke with fixed non-personal input.
7. Remove the OpenAI runtime drop-in.
8. Restart the API and confirm final mock runtime.
9. Check HTTPS health, admin unauthorized behavior, and LINE invalid-signature behavior.

## Loop 164 Result

```txt
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
openai_smoke_command_exit=1
```

## Rollback Result

```txt
openai_systemd_dropin_present_final=false
repository_runtime_final=supabase
ai_provider_final=mock
line_real_push_enabled=false
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
api_direct_health_loop164_final=200
https_api_health_loop164_final=200
admin_customers_no_header_loop164=401
line_invalid_signature_loop164=401
openai_ready=false
line_reply_push_ready=false
production_readiness=production_no_go
```

## Interpretation

The model fallback did not resolve the provider smoke failure. The classification remains `I_unknown_sanitized`, with no provider status/code/type available through the sanitized boundary.

Do not repeat paid smoke calls blindly. The next Loop should inspect request shape, provider transport, and network/runtime behavior using secret-safe probes and tests. Any future OpenAI API call still requires a separate explicit one-call approval.

## Next

```txt
Loop 165: OpenAI request-shape/provider transport remediation
```

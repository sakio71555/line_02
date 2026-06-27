# OpenAI Runtime Secret Injection and Controlled Smoke

## Purpose

Provide the operator handoff for enabling OpenAI real API runtime later.

Loop 157-160 created the helper but did not run an OpenAI real API call.

## Current State

```txt
openai_runtime_env=absent
openai_runtime_helper=/root/bin/amami-line-set-openai-runtime-secrets.sh
openai_real_api_smoke=not_performed
openai_ready=false
production_readiness=production_no_go
```

## Required Human Inputs

- OpenAI API key.
- OpenAI model name.
- Explicit approval for one paid smoke call.

Do not paste values into docs, Git, chat, screenshots, or dev logs.

## Operator Steps

1. SSH to the VPS in a terminal controlled by the operator.
2. Run `/root/bin/amami-line-set-openai-runtime-secrets.sh`.
3. Enter the requested values without recording them.
4. Decide whether one paid smoke call is approved.
5. Restart the API only in a later Loop that explicitly authorizes OpenAI runtime connection.
6. Run exactly one controlled smoke using dummy or non-personal data.
7. If any failure occurs, return to `AI_PROVIDER=mock`.

## No-Go Conditions

- Missing OpenAI API key.
- Missing OpenAI model.
- Paid smoke not approved.
- Any request would include real customer content.
- Any output would record the full OpenAI response or secret values.

## Allowed Result Recording

```txt
openai_runtime_env=configured; value not recorded
openai_model=configured; value not recorded
openai_real_api_smoke=performed_once
openai_real_api_smoke_status=success_or_failure_code_only
```

## Disallowed Result Recording

- API key values.
- Authorization headers.
- Full prompts containing customer data.
- Full OpenAI response text.
- Billing details.

## Next

```txt
Loop 161: OpenAI real API controlled smoke
```

## Loop 161 Result

```txt
openai_helper_status=exists
openai_runtime_env=absent
openai_format_check=skipped_absent
openai_environment_file_connection=skipped_absent
openai_real_api_smoke=not_performed
openai_real_api_smoke_reason=openai_runtime_env_absent_pending_human_input
openai_response_body_recorded=no
openai_api_key_recorded=no
openai_ready=false
production_readiness=production_no_go
```

OpenAI runtime env was not present on the VPS, so no EnvironmentFile was connected and no real OpenAI request was sent. Final runtime stayed on `AI_PROVIDER=mock`.

## Loop 162 Result

```txt
openai_runtime_env=configured; value not recorded
openai_model=configured; value not recorded
openai_real_api_smoke=performed_once
openai_real_api_smoke_status=failed
openai_smoke_error_class=OpenAiProviderError
openai_response_body_recorded=no
openai_prompt_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_environment_file_connection=temporary
openai_systemd_dropin_present_final=false
openai_ready=false
production_readiness=production_no_go
```

The API service was returned to mock AI after the smoke. The root-only runtime env file remains on the VPS for operator-controlled future use, but the systemd drop-in is not attached.

## Loop 163 Result

```txt
openai_runtime_env=configured; value not recorded
openai_model=configured; value not recorded
openai_diagnostic_smoke=performed_once
openai_diagnostic_smoke_status=failed
openai_diagnostic_error_classification=I_unknown_sanitized
openai_key_replacement_smoke=performed_once
openai_key_replacement_smoke_status=failed
openai_key_replacement_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_environment_file_connection=temporary
openai_systemd_dropin_present_final=false
openai_ready=false
production_readiness=production_no_go
```

The operator replaced the API key outside Codex. The replacement value was not displayed or recorded. The API service was returned to mock AI after the follow-up smoke.

## Loop 164 Result

```txt
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
openai_model_fallback_smoke=performed_once
openai_model_fallback_smoke_status=failed
openai_model_fallback_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_environment_file_connection=temporary
openai_systemd_dropin_present_final=false
ai_provider_final=mock
openai_ready=false
production_readiness=production_no_go
```

The operator-configured model value was not recorded. The API service was returned to mock AI after the smoke.

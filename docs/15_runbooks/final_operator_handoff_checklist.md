# Final Operator Handoff Checklist

## Purpose

Give the operator a short checklist after Loop 157-160.

The system is reviewable, but production remains No-Go until the remaining approvals and controlled smokes are complete.

## Current Review State

```txt
https_ready_for_review=true
line_receive_ready=true
official_account_auto_response_ready=true
supabase_ready=true
supabase_receive_persistence_ready=true
openai_ready=false
line_reply_push_ready=false
production_readiness=production_no_go
```

## If OpenAI Real API Will Be Used

1. Run `/root/bin/amami-line-set-openai-runtime-secrets.sh` on the VPS.
2. Enter the OpenAI API key outside Codex.
3. Enter the OpenAI model outside Codex.
4. Decide whether one paid smoke call is approved.
5. Run the controlled smoke in a dedicated Loop.
6. Record only status and redacted readiness.

## If LINE Real Reply / Push Will Be Used

1. Confirm Official Account response message remains OFF.
2. Confirm the test recipient outside Codex.
3. Confirm the one test message outside Codex.
4. Run `/root/bin/amami-line-set-line-real-push-flag.sh` only in an approved Loop.
5. Send exactly one test message.
6. Run `/root/bin/amami-line-disable-line-real-push.sh` immediately after the test.
7. Record only status and redacted readiness.

## Final Go / No-Go Inputs

Required before promotion:

- HTTPS remains healthy.
- LINE receive remains healthy.
- Supabase persistence remains healthy.
- OpenAI is either intentionally mock or controlled smoke passed.
- LINE reply/push is either intentionally disabled or controlled smoke passed.
- Final operator Go is recorded.

## Still No-Go

```txt
supabase_write_smoke=not_performed
openai_real_api_smoke=not_performed
line_real_push_reply=not_performed
final_operator_go=not_performed
production_readiness=production_no_go
```

## Secret Rule

Do not record secrets, webhook path values, LINE user identifier values, message bodies, Supabase endpoint values, DB URLs, OpenAI keys, or bearer tokens.

## Loop 161 Follow-up

```txt
openai_runtime_env=absent
openai_real_api_smoke=not_performed
openai_real_api_smoke_reason=openai_runtime_env_absent_pending_human_input
openai_ready=false
line_real_push_enabled=false
line_real_push_reply=not_performed
production_readiness=production_no_go
```

Next operator action for OpenAI is to provide the runtime env through the root-only helper in a dedicated Loop, then approve exactly one non-customer controlled smoke. Until then the API stays on mock AI.

## Loop 162 Follow-up

```txt
openai_runtime_env=present; values not recorded
openai_real_api_smoke=performed_once
openai_real_api_smoke_status=failed
openai_smoke_error_class=OpenAiProviderError
openai_response_body_recorded=no
openai_api_key_recorded=no
openai_prompt_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
openai_ready=false
line_real_push_enabled=false
line_real_push_reply=not_performed
production_readiness=production_no_go
```

Next operator action for OpenAI is not another paid retry. First diagnose the sanitized provider failure without recording secrets or raw response bodies, then decide whether a second approved smoke is necessary in a separate Loop.

## Loop 163 Follow-up

```txt
openai_diagnostic_smoke=performed_once
openai_diagnostic_smoke_status=failed
openai_diagnostic_error_classification=I_unknown_sanitized
openai_key_replacement_smoke=performed_once
openai_key_replacement_smoke_status=failed
openai_key_replacement_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_api_key_recorded=no
openai_prompt_body_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
openai_ready=false
line_real_push_enabled=false
line_real_push_reply=not_performed
production_readiness=production_no_go
```

The operator replaced the OpenAI API key outside Codex, but the follow-up smoke still failed with the same sanitized unknown classification. Next operator action is not another blind retry. Use a dedicated secret-safe remediation Loop.

## Loop 164 Follow-up

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
openai_systemd_dropin_present_final=false
ai_provider_final=mock
line_real_push_enabled=false
openai_ready=false
production_readiness=production_no_go
```

The model fallback smoke still failed. Do not move to LINE real reply/push until OpenAI readiness is either intentionally deferred as mock or remediated with a successful controlled smoke and separate operator approval.

## Loop 165 Follow-up

```txt
raw_responses_smoke_status=success
provider_boundary_smoke_status=failed
provider_boundary_error_classification=I_unknown_sanitized
provider_boundary_retry_performed=no
openai_response_body_recorded=no
openai_api_key_recorded=no
openai_prompt_body_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
openai_api_connectivity_ready=true
openai_provider_runtime_ready=false
production_readiness=production_no_go
```

Next operator action is not LINE real reply/push yet. First decide whether to run a provider output contract remediation Loop and approve any future paid OpenAI smoke separately.

## Loop 166 Follow-up

OpenAI provider smoke still is not production-ready.

```txt
provider_output_parser_remediation=applied
provider_output_text_extracted=true
provider_boundary_error_classification=G_response_parse_bug
openai_ready=false
line_reply_push_ready=false
production_readiness=production_no_go
```

Operator-facing Go/No-Go should continue to treat OpenAI as No-Go until the JSON output contract smoke succeeds and rollback to mock is verified again.

## Loop 167 Follow-up

OpenAI remains No-Go for production use.

```txt
provider_boundary_smoke=performed_once
provider_output_text_extracted=true
json_contract_parse_success=true
json_contract_schema_valid=false
parse_stage=schema_validation
classification=G_response_parse_bug
response_body_recorded=no
prompt_body_recorded=no
api_key_recorded=no
model_value_recorded=no
ai_provider_final=mock
line_real_push_enabled=false
openai_ready=false
line_reply_push_ready=false
production_readiness=production_no_go
```

Operator-facing Go/No-Go should continue to block production until OpenAI schema validation succeeds, LINE real reply/push is explicitly smoked, and final Go is recorded.

## Loop 168 Follow-up

OpenAI provider-boundary readiness is now true after schema-specific prompt tightening.

```txt
provider_boundary_smoke=performed_once
provider_boundary_smoke_status=success
provider_output_text_extracted=true
json_contract_parse_success=true
json_contract_schema_valid=true
parse_stage=none
schema_missing_fields=none
schema_invalid_fields=none
response_body_recorded=false
prompt_body_recorded=false
api_key_recorded=false
model_value_recorded=false
openai_systemd_dropin_present_final=false
ai_provider_final=mock
line_real_push_enabled=false
openai_ready=true
line_reply_push_ready=false
production_readiness=production_no_go
```

Operator-facing Go/No-Go should now focus on LINE real reply/push controlled smoke and final Go. Do not enable OpenAI permanently without a separate production runtime decision.

## Loop 169 Follow-up

LINE real reply/push is planned but still not performed.

```txt
outbound_implementation_classification=A_real_line_push_client_fully_wired_but_disabled_by_flag
preferred_smoke_mode=push
recommended_target_selection=operator_sends_fresh_test_message_before_smoke
recommended_execution_path=existing_staff_reply_route
line_real_push_enable_helper_status=exists
line_real_push_disable_helper_status=exists
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_CHANNEL_SECRET configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
target_user_id_recorded=false
outgoing_message_body_recorded=false
line_real_reply_push_performed=false
line_reply_push_ready=false
line_reply_push_plan_ready=true
AI_PROVIDER=mock
OpenAI systemd drop-in absent
production_readiness=production_no_go
```

Before Loop 170, the operator must confirm Webhook ON, response message OFF, AI response message OFF or unavailable, one fresh test LINE message, one real LINE reply/push smoke approval, and no retry / no bulk / no broadcast.

## Loop 170 Follow-up

LINE real reply/push remains not performed because the required human approval gate was not satisfied.

```txt
human_approval_gate_satisfied=false
human_gate_not_satisfied=true
preferred_smoke_mode=push
execution_path=existing_staff_reply_route
target_user_selected=false
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body_recorded=false
LINE_REAL_PUSH_ENABLED_temporarily_enabled=false
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
retry_performed=false
bulk_send_performed=false
multicast_performed=false
broadcast_performed=false
group_send_performed=false
room_send_performed=false
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
AI_PROVIDER=mock
OpenAI systemd drop-in absent
production_readiness=production_no_go
```

Operator-facing next action is to decide whether to repeat a dedicated human approval gate for exactly one controlled LINE reply/push smoke. Do not send until all approval tokens are explicitly confirmed.

## Loop 171 Follow-up

The human approval gate was satisfied, but the live review runtime did not provide an authenticated staff route for the existing staff reply endpoint.

```txt
human_approval_gate_satisfied=true
fresh_test_target_selected=true
target_user_selected=true
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body_recorded=false
authenticated_staff_route_status=401
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
reason=authenticated_staff_route_unavailable
LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
production_readiness=production_no_go
```

Next operator-facing action is not another send attempt. First diagnose the authenticated staff route without retrying LINE delivery.

## Loop 172 Follow-up

The authenticated staff route diagnosis is complete. Do not retry LINE delivery through a weakened route.

```txt
authenticated_staff_route_available=false
authenticated_staff_route_unavailable_reason=admin_auth_runtime_unavailable_for_authenticated_staff_route
route_auth_requirements_summary=Authorization + selected tenant + authenticated staff + send_staff_reply permission
do_not_relax_auth=true
do_not_add_public_test_route=true
recommended_next_execution_path=internal_cli_smoke_command
internal_cli_default_mode=dry_run
internal_cli_smoke_path_ready=true
internal_cli_execute_mode_implemented=false
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body_recorded=false
line_real_reply_push_performed=false
line_send_attempted_once=false
LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
line_reply_push_internal_smoke_ready=true
production_readiness=production_no_go
```

Operator-facing next action is a dedicated Loop 173 internal CLI one-message controlled smoke. It must keep explicit approval, no retry, no bulk, and one-send lock requirements.

## Loop 173 Follow-up

The internal CLI one-message controlled smoke succeeded and immediately rolled back to disabled LINE real push.

```txt
internal_cli_execute_mode_implemented=true
execution_path=internal_cli_smoke_command
target_user_selected=true
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body=fixed non-personal smoke text; value not recorded
outgoing_message_body_recorded=false
LINE_REAL_PUSH_ENABLED_temporarily_enabled=true
line_send_attempted_once=true
line_send_result=success
retry_performed=false
bulk_multicast_broadcast_group_room=false
send_attempt_lock_present=true
send_attempt_count=1
duplicate_send_detected=false
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
api_direct_health_loop173_final=200
https_api_health_loop173_final=200
customers_no_header_loop173=401
line_invalid_signature_loop173=401
AI_PROVIDER=mock
OpenAI systemd drop-in absent
line_reply_push_ready=true
production_readiness=production_no_go
```

Operator-facing next action is not another LINE send. It is a separate final production Go/No-Go review.

## Loop 174 Follow-up

The final pre-Go readiness packet is complete, but production Go is not recorded.

```txt
https_ready_for_review=true
line_receive_ready=true
official_account_auto_response_ready=true
supabase_ready=true
supabase_receive_persistence_ready=true
openai_provider_controlled_smoke_ready=true
line_reply_push_ready=true
final_operator_go=false
production_readiness=production_no_go
```

Remaining No-Go reason:

- Final operator production Go is not recorded.

## Loop 175 Final Operator Handoff

### 1. Current Final Runtime State

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OpenAI drop-in absent
production_readiness=production_no_go
```

Runtime activation was not changed in this review.

### 2. Verified Capabilities

- HTTPS review URL is healthy.
- LINE receive and signature verification are ready.
- Supabase receive persistence is ready.
- OpenAI provider controlled smoke is ready, while final runtime remains mock.
- LINE one-message push smoke succeeded once, while final real push remains disabled.
- Security checks reject no-header Admin API access and invalid LINE signatures.

### 3. Go Decision

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=NO
final_operator_go=false
go_ready_but_operator_go_pending=true
production_readiness=production_no_go
remaining_no_go_reasons=final operator production Go not recorded
```

### 4. Activation Note

- Runtime activation was not changed in this review.
- Enabling persistent LINE real push requires a separate explicit activation step.
- Enabling OpenAI runtime requires a separate explicit activation step.
- Nginx, DNS, certbot, reload, and restart changes were not performed in this Loop.

### 5. Rollback Checklist

1. Confirm `LINE_REAL_PUSH_ENABLED=false`.
2. If LINE real push is ever enabled in a future Loop, run the approved disable helper on rollback.
3. Confirm `AI_PROVIDER=mock`.
4. Remove the OpenAI drop-in if it appears unexpectedly.
5. Restart API only after an explicit rollback action requires it.
6. Confirm API direct health returns `200`.
7. Confirm HTTPS API health returns `200`.
8. Confirm invalid-signature webhook requests are rejected.
9. Confirm no-header Admin API customer access is rejected.

### 6. First-Hour Monitoring Checklist

Use this only after a future explicit production activation Loop.

1. API health.
2. HTTPS health.
3. Admin root and customers route health.
4. Webhook 2xx/4xx pattern.
5. LINE send errors without automatic retry.
6. Supabase read/write errors.
7. No secret logging.
8. Rollback owner availability.

## Loop 176 Operator Final Activation Planning

### 1. Decision Tokens

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=NO
ALLOW_RUNTIME_ACTIVATION_CHANGES=NO
ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
```

### 2. Current Runtime State

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OpenAI drop-in absent
production_readiness=production_no_go
runtime_activation_changes=not_performed
```

### 3. Activation Options

- Safe Mode: keep the current state.
- LINE real push final activation: future explicit approval only, with rollback helper ready.
- OpenAI runtime final activation: future explicit approval only, with drop-in rollback ready.
- Combined activation: avoid unless explicitly approved; activate one subsystem at a time.

### 4. Monitoring and Rollback

- Confirm API direct health, HTTPS health, Admin routes, no-header Admin API rejection, and invalid-signature rejection.
- Keep secret values, webhook path values, LINE identifiers, reply tokens, exact message bodies, OpenAI model values, provider responses, Supabase endpoints, and DB URLs out of logs and docs.
- Roll back LINE by restoring `LINE_REAL_PUSH_ENABLED=false`.
- Roll back OpenAI by removing the runtime drop-in and confirming `AI_PROVIDER=mock`.

### 5. Next Decision

```txt
Loop 177: explicit production activation with operator approval
```

## Loop 177 Explicit Activation Handoff

### 1. Operator Tokens

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=NO
ALLOW_RUNTIME_ACTIVATION_CHANGES=NO
ACTIVATION_MODE=review_only
ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO
ALLOW_ADDITIONAL_LINE_SEND_SMOKE=NO
```

### 2. Decision

```txt
activation_performed=false
activation_result=not_performed
runtime_activation_changes=not_performed
rollback_performed=false
production_readiness=production_no_go
```

### 3. Final Runtime State

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OpenAI drop-in absent
Nginx/DNS/certbot changes=none
Supabase schema/RLS changes=none
```

### 4. Safety

- Additional LINE send was not performed.
- OpenAI real API was not performed.
- API restart was not performed.
- No secret values, webhook path values, LINE identifiers, reply tokens, message bodies, OpenAI model values, provider responses, Supabase endpoints, DB URLs, bearer tokens, or private keys were recorded.

### 5. Next Decision

```txt
Loop 178: production activation approval retry
```

## Loop 178 Line-Only Activation Handoff

### 1. Operator Tokens

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=YES
ALLOW_RUNTIME_ACTIVATION_CHANGES=YES
ACTIVATION_MODE=line_only
ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO
ALLOW_ADDITIONAL_LINE_SEND_SMOKE=NO
```

### 2. Decision

```txt
activation_result=success
runtime_activation_changes=performed
line_real_push_final_enable=performed
rollback_performed=false
```

### 3. Final Runtime State

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
Nginx/DNS/certbot changes=none
Supabase schema/RLS changes=none
additional_line_send_performed=false
openai_real_api_performed=false
```

### 4. Final Checks

```txt
api_direct_health_loop178_final=200
https_api_health_loop178_final=200
https_admin_root_loop178_final=200
https_admin_customers_loop178_final=200
https_admin_api_no_header_customers_loop178_final=401
https_line_invalid_signature_loop178_final=401
```

### 5. Next Operational Checkpoint

```txt
Loop 179: first-hour production monitoring
```

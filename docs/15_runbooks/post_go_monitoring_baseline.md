# Post-Go Monitoring Baseline

## Purpose

This runbook records the first post-Go monitoring baseline after the operator accepted a scope-limited production Go for the current LINE/API/Admin runtime.

It does not introduce automation, cron, additional LINE sends, public smoke reruns, infrastructure changes, DB changes, OpenAI calls, Supabase restore, package operations, or service restarts.

## Scope-Limited Go

```txt
operator_final_decision=production_go
production_go=true
production_no_go=false
production_go_scope=line_api_admin_current_runtime
production_go_record_scope_limited=true
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
restricted_actions_remain_no_go=true
```

## Baseline Evidence

The following evidence is operator-side sanitized metadata only:

```txt
line_real_push_smoke_status=pass
line_message_send_attempt_count=1
line_message_send_success=true
line_message_send_retry_executed=false
post_send_api_health=200
public_smoke_status=pass
public_api_health=200
public_admin_root=200
public_customers_no_auth=401
line_identifier_recorded=false
message_body_recorded=false
line_api_response_body_recorded=false
```

## Monitoring Categories

```txt
direct_api_health_check=http_127_0_0_1_8788_health_expected_200
direct_api_health_expected=200
public_api_health_check=https_admin_taiyolabel_site_api_health_expected_200
public_api_health_expected=200
public_admin_root_check=https_admin_taiyolabel_site_root_expected_200
public_admin_root_expected=200
unauthenticated_customers_guard=https_admin_taiyolabel_site_api_admin_customers_expected_401
public_customers_no_auth_expected=401
line_send_retry_check=do_not_retry_without_new_operator_approval
line_send_retry_policy=no_retry_without_new_operator_approval
one_send_lock_preservation=preserve_send_attempt_lock
one_send_lock_policy=preserve_send_attempt_lock
line_identifier_recording_policy=never_record
message_body_recording_policy=never_record
line_api_response_body_recording_policy=never_record
dr_known_risk=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
```

## Suggested Cadence

```txt
post_go_first_hour=manual_check_if_operator_available
post_go_same_day=manual_check_after_major_change_or_customer_report
post_go_daily=health_and_auth_guard_check
first_day_monitoring=health_and_auth_guard_manual_checks
post_change_monitoring=run_readonly_health_checks_after_any_change
customer_report_response=check_public_api_health_and_admin_root_before_mutating_anything
line_send_incident_response=do_not_retry_preserve_lock_record_sanitized_status
automation_or_cron_added=false
```

## Loop 271 Read-Only Monitoring Result

```txt
post_go_monitoring_review_created=true
post_go_monitoring_readonly_check_status=pass
public_api_health_current=200
public_admin_root_current=200
public_customers_no_auth_current=401
post_go_monitoring_status=pass
monitoring_failure_reason=none
```

## Restricted Actions

These actions remain No-Go unless a future Loop provides explicit approval and a new safety boundary:

```txt
additional_line_send_without_new_approval=no_go
retry_without_new_approval=no_go
bulk_send=no_go
multicast=no_go
broadcast=no_go
customer_target_uncontrolled_send=no_go
openai_auto_reply_production_activation=no_go
supabase_restore=no_go
db_change=no_go
nginx_change=no_go
dns_change=no_go
https_certbot_change=no_go
package_install=no_go
apt_operation=no_go
classifier_route_status=frozen
```

## Recording Rules

Do not record raw logs, secret values, env values, DB URLs, tokens, LINE identifiers, LINE user/group/room IDs, message bodies, LINE API response bodies, SQL text, DB object names, role names, package names, extension names, production logs, dumps, or row content.

Use only sanitized pass/fail/status metadata.

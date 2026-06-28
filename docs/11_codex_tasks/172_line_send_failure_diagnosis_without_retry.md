# Loop 172: LINE Send Failure Diagnosis Without Retry

## Goal

Diagnose why Loop 171 stopped at `authenticated_staff_route_unavailable`, keep LINE real reply/push disabled, and prepare a private internal dry-run path for the next one-message smoke.

This Loop is diagnosis and preflight only. It does not retry LINE delivery.

## Scope

- Inspect the existing staff reply route and authenticated staff guard from code.
- Record the route auth requirements without recording tokens or identifiers.
- Keep staff auth strict; do not add public test routes.
- Add an internal target preflight command for dry-run target selection only.
- Add tests for the preflight output and secret-safe Loop 172 docs.
- Update runbooks, readiness docs, README, and dev log.

## Out of Scope

- LINE real push or reply.
- Enabling `LINE_REAL_PUSH_ENABLED`.
- Retry, bulk, multicast, broadcast, group, or room send.
- Relaxing staff auth or allowing production dev headers.
- Adding unauthenticated public smoke routes.
- OpenAI real API rerun.
- Supabase migration/write smoke/RLS changes.
- Nginx, DNS, certbot, reload, or restart changes.
- Recording LINE token, channel secret, webhook path value, LINE user identifier, reply token, inbound body, outbound body, staff auth token, OpenAI secret, or Supabase secret.

## Loop 171 Diagnosis

```txt
line_real_reply_push_performed=false
line_send_attempted_once=false
line_send_result=not_performed
reason=authenticated_staff_route_unavailable
authenticated_staff_route_available=false
authenticated_staff_route_unavailable_reason=admin_auth_runtime_unavailable_for_authenticated_staff_route
LINE_REAL_PUSH_ENABLED=false
production_readiness=production_no_go
```

Loop 171 was a safety stop, not a send failure. No LINE delivery request was issued.

## Existing Staff Reply Route Requirements

```txt
existing_staff_reply_route=POST /api/admin/customers/:customerId/reply
route_auth_requirements_summary=Authorization + selected tenant + authenticated staff + send_staff_reply permission
tenant_context_required=authenticated_staff
selected_tenant_header_required=x-selected-tenant-id
dev_header_real_send_allowed=false
fake_bearer_production_allowed=false
supabase_auth_jwt_required_for_authenticated_route=true
send_staff_reply_permission_required=true
real_line_push_confirmation_required=true
idempotency_key_required=true
```

The route resolves tenant context through the authenticated staff runtime before real LINE delivery. The current review runtime did not expose an authenticated staff route for the live smoke, so the route correctly returned an authenticated-staff failure instead of sending.

## Guardrail Decision

```txt
do_not_relax_auth=true
do_not_add_public_test_route=true
production_dev_header_for_real_send=false
retry=false
bulk_multicast_broadcast_group_room=false
```

Real LINE delivery is a high-risk action. The next send attempt should not bypass route auth. If the browser/session path is not available, use a VPS-internal CLI smoke path with explicit gates and one-send lock.

## Execution Path Decision

```txt
recommended_next_execution_path=internal_cli_smoke_command
internal_cli_smoke_path=scripts/smoke/line-real-push-target-preflight.ts
internal_cli_default_mode=dry_run
internal_cli_smoke_path_ready=true
internal_cli_execute_mode_implemented=false
line_reply_push_internal_smoke_ready=true
```

The Loop 172 CLI only reads the Admin customer list through the API and selects a fresh tenant-scoped candidate count. It never calls LINE, never prints target identifiers, and has no execute mode.

## Dry-Run Output Contract

```txt
line_push_smoke_mode=dry_run
target_user_selected=true_or_false
distinct_target_count=0_or_1_or_multiple
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body_recorded=false
would_send=false
line_send_attempted_once=false
line_real_push_enabled_required=true
internal_cli_execute_mode_implemented=false
```

## Next Execute Gate Design

The next Loop may add or use a send-capable internal command only if all gates are explicit:

```txt
LINE_REAL_PUSH_ENABLED_required=true
explicit_one_message_approval_required=true
no_retry_no_bulk_no_broadcast_ack_required=true
one_send_lock_required=true
target_user_selected_required=true
```

Recommended lock directory:

```txt
one_send_lock_directory=/var/lib/amami-line-crm/smoke/line-real-single-message/
one_send_lock_file=send-attempted.lock
```

Do not create the send-attempted lock in Loop 172 because no send is attempted.

## Test Coverage

- Added target preflight tests proving dry-run output, tenant scoped target counting, no identifiers/body output, and no execute mode.
- Added Loop 172 docs test covering auth diagnosis, no auth relaxation, internal CLI recommendation, secret redaction, final disabled state, and production No-Go.

## Safety Result

```txt
line_real_reply_push_performed=false
line_send_attempted_once=false
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
openai_real_api_rerun=false
OpenAI systemd drop-in absent
nginx_dns_certbot_change_performed=false
nginx_reload_restart_performed=false
production_readiness=production_no_go
```

## Remaining Risks

- LINE real reply/push has still not been smoked.
- The internal CLI currently performs target preflight only; it has no execute mode.
- A future send Loop must add or invoke an explicit one-send lock, enable LINE real push only for the smoke window, and roll back to disabled.

## Next Loop Candidate

```txt
Loop 173: LINE real push internal CLI one-message controlled smoke
```

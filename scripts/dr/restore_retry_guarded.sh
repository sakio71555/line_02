#!/usr/bin/env bash
set -euo pipefail
set +x

mode="preflight"
case "${1:-}" in
  ""|"--preflight")
    mode="preflight"
    ;;
  "--execute")
    mode="execute"
    ;;
  "--self-test-classifier")
    mode="self_test_classifier"
    ;;
  *)
    mode="invalid"
    ;;
esac

emit() {
  printf '%s=%s\n' "$1" "$2"
}

restore_failure_category="none"
restore_failure_category_confidence="not_applicable"
restore_failure_category_source="not_applicable"
restore_failure_classifier_used="false"
raw_failure_output_printed="false"
raw_failure_output_recorded="false"
raw_failure_output_retained="false"
transient_failure_capture_used="false"
transient_failure_capture_cleanup_status="not_used"
transient_failure_capture_file=""

cleanup_transient_failure_capture() {
  if [ -n "$transient_failure_capture_file" ] && [ -e "$transient_failure_capture_file" ]; then
    if rm -f "$transient_failure_capture_file" >/dev/null 2>&1; then
      transient_failure_capture_cleanup_status="removed"
    else
      transient_failure_capture_cleanup_status="failed_sanitized"
      raw_failure_output_retained="true"
    fi
  elif [ "$transient_failure_capture_used" = "true" ]; then
    transient_failure_capture_cleanup_status="removed"
  else
    transient_failure_capture_cleanup_status="not_used"
  fi
}

trap 'cleanup_transient_failure_capture >/dev/null 2>&1 || true' EXIT

classify_restore_failure() {
  local raw="$1"
  local normalized
  normalized="$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]')"

  restore_failure_category="unknown_restore_target_compatibility_category"
  restore_failure_category_confidence="low"
  restore_failure_category_source="helper_sanitized_stderr_classifier"
  restore_failure_classifier_used="true"

  case "$normalized" in
    *"authentication"*|*"password"*|*"connection refused"*|*"could not connect"*|*"ssl"*|*"no route to host"*|*"timeout expired"*)
      restore_failure_category="connection_or_auth_to_dr_target_category"
      restore_failure_category_confidence="high"
      ;;
    *"unsupported version"*|*"unsupported archive"*|*"server version mismatch"*|*"input file appears to be a text format dump"*)
      restore_failure_category="incompatible_dump_or_target_version_category"
      restore_failure_category_confidence="high"
      ;;
    *"extension"*|*"control file"*|*"could not open extension"*)
      restore_failure_category="missing_or_unavailable_extension_category"
      restore_failure_category_confidence="high"
      ;;
    *"must be owner"*|*"permission denied"*|*"role"*|*"owner"*|*"acl"*)
      restore_failure_category="role_or_ownership_permission_category"
      restore_failure_category_confidence="high"
      ;;
    *"platform managed"*|*"managed schema"*|*"supabase managed"*)
      restore_failure_category="dump_contains_platform_managed_schema_category"
      restore_failure_category_confidence="medium"
      ;;
    *"already exists"*|*"duplicate"*|*"schema conflict"*|*"relation conflict"*)
      restore_failure_category="schema_or_object_conflict_category"
      restore_failure_category_confidence="high"
      ;;
    *"grant"*|*"revoke"*|*"policy"*|*"row-level security"*|*"rls"*|*"privilege"*)
      restore_failure_category="unsupported_privilege_or_policy_category"
      restore_failure_category_confidence="medium"
      ;;
    *"dependency"*|*"depends on"*|*"referenced object"*|*"does not exist"*)
      restore_failure_category="dump_restore_order_or_dependency_category"
      restore_failure_category_confidence="medium"
      ;;
    *"timeout"*|*"timed out"*|*"out of memory"*|*"no space left"*|*"resource"*|*"canceling statement"*)
      restore_failure_category="timeout_or_resource_limit_category"
      restore_failure_category_confidence="medium"
      ;;
  esac
}

reset_classifier_result() {
  restore_failure_category="none"
  restore_failure_category_confidence="not_applicable"
  restore_failure_category_source="not_applicable"
  restore_failure_classifier_used="false"
  raw_failure_output_printed="false"
  raw_failure_output_recorded="false"
  raw_failure_output_retained="false"
  transient_failure_capture_used="false"
  transient_failure_capture_cleanup_status="not_used"
}

emit_classifier_result() {
  emit "restore_failure_category" "$restore_failure_category"
  emit "restore_failure_category_confidence" "$restore_failure_category_confidence"
  emit "restore_failure_category_source" "$restore_failure_category_source"
  emit "restore_failure_classifier_used" "$restore_failure_classifier_used"
  emit "raw_failure_output_printed" "$raw_failure_output_printed"
  emit "raw_failure_output_recorded" "$raw_failure_output_recorded"
  emit "raw_failure_output_retained" "$raw_failure_output_retained"
  emit "transient_failure_capture_used" "$transient_failure_capture_used"
  emit "transient_failure_capture_cleanup_status" "$transient_failure_capture_cleanup_status"
}

self_test_case() {
  local name="$1"
  local fixture="$2"
  local expected="$3"
  classify_restore_failure "$fixture"
  if [ "$restore_failure_category" = "$expected" ]; then
    emit "classifier_test_${name}" "pass"
    return 0
  fi
  emit "classifier_test_${name}" "failed"
  return 1
}

if [ "$mode" = "self_test_classifier" ]; then
  self_test_status="pass"
  self_test_case "connection_or_auth_to_dr_target_category" "connection refused while connecting to target" "connection_or_auth_to_dr_target_category" || self_test_status="failed"
  self_test_case "missing_or_unavailable_extension_category" "extension control file unavailable" "missing_or_unavailable_extension_category" || self_test_status="failed"
  self_test_case "role_or_ownership_permission_category" "must be owner permission denied" "role_or_ownership_permission_category" || self_test_status="failed"
  self_test_case "schema_or_object_conflict_category" "duplicate object already exists" "schema_or_object_conflict_category" || self_test_status="failed"
  self_test_case "timeout_or_resource_limit_category" "statement timeout due to resource limit" "timeout_or_resource_limit_category" || self_test_status="failed"
  self_test_case "unknown_restore_target_compatibility_category" "unclassified restore failure" "unknown_restore_target_compatibility_category" || self_test_status="failed"
  emit "self_test_status" "$self_test_status"
  emit "restore_execution_in_self_test" "false"
  emit "db_connection_in_self_test" "false"
  emit "raw_failure_output_printed" "false"
  emit "raw_failure_output_recorded" "false"
  emit "raw_failure_output_retained" "false"
  if [ "$self_test_status" = "pass" ]; then
    exit 0
  fi
  exit 1
fi

target_scope="${DR_RESTORE_TARGET_SCOPE:-}"
confirm="${DR_RESTORE_CONFIRM:-}"
db_url="${DR_RESTORE_DB_URL:-}"
artifact_path="${DR_RESTORE_ARTIFACT_PATH:-}"
restore_tool="${DR_RESTORE_TOOL:-}"
allow_psql="${DR_RESTORE_ALLOW_PSQL:-false}"
lock_root="${DR_RESTORE_LOCK_DIR:-/var/lock}"

scope_category="unknown"
target_scope_confirmed="false"
case "$target_scope" in
  "dr_validation_target"|"staging_restore_target")
    scope_category="$target_scope"
    target_scope_confirmed="true"
    ;;
  "current_production"|"production")
    scope_category="current_production"
    ;;
  *)
    scope_category="unknown"
    ;;
esac

operator_secret_context_available="false"
if [ -n "$db_url" ]; then
  operator_secret_context_available="true"
fi

operator_artifact_context_available="false"
if [ -n "$artifact_path" ]; then
  operator_artifact_context_available="true"
fi

artifact_exists="false"
artifact_nonempty="false"
if [ "$operator_artifact_context_available" = "true" ]; then
  if [ -f "$artifact_path" ]; then
    artifact_exists="true"
  fi
  if [ -s "$artifact_path" ]; then
    artifact_nonempty="true"
  fi
fi

restore_tool_selected="none"
tool_command=""
tool_available="false"
case "$restore_tool" in
  "pg_restore")
    restore_tool_selected="pg_restore"
    if command -v pg_restore >/dev/null 2>&1; then
      tool_command="$(command -v pg_restore)"
      tool_available="true"
    fi
    ;;
  "psql")
    if [ "$allow_psql" = "true" ]; then
      restore_tool_selected="psql"
      if command -v psql >/dev/null 2>&1; then
        tool_command="$(command -v psql)"
        tool_available="true"
      fi
    else
      restore_tool_selected="none"
    fi
    ;;
  *)
    restore_tool_selected="none"
    ;;
esac

failure_reason="none"
helper_preflight_status="pass"

if [ "$mode" = "invalid" ]; then
  helper_preflight_status="blocked"
  failure_reason="invalid_mode"
elif [ "$target_scope_confirmed" != "true" ]; then
  helper_preflight_status="blocked"
  failure_reason="target_scope_not_allowed"
elif [ "$confirm" != "single_restore_retry_approved" ]; then
  helper_preflight_status="blocked"
  failure_reason="explicit_confirm_missing"
elif [ "$operator_secret_context_available" != "true" ]; then
  helper_preflight_status="blocked"
  failure_reason="secret_context_missing"
elif [ "$operator_artifact_context_available" != "true" ]; then
  helper_preflight_status="blocked"
  failure_reason="artifact_context_missing"
elif [ "$artifact_exists" != "true" ]; then
  helper_preflight_status="blocked"
  failure_reason="artifact_missing"
elif [ "$artifact_nonempty" != "true" ]; then
  helper_preflight_status="blocked"
  failure_reason="artifact_empty"
elif [ "$restore_tool_selected" = "none" ]; then
  helper_preflight_status="blocked"
  failure_reason="restore_tool_not_selected"
elif [ "$tool_available" != "true" ]; then
  helper_preflight_status="blocked"
  failure_reason="restore_tool_unavailable"
fi

emit_common() {
  emit "helper_preflight_status" "$helper_preflight_status"
  emit "restore_target_scope_confirmed" "$target_scope_confirmed"
  emit "restore_target_scope_category" "$scope_category"
  emit "operator_secret_context_available" "$operator_secret_context_available"
  emit "operator_artifact_context_available" "$operator_artifact_context_available"
  emit "artifact_exists" "$artifact_exists"
  emit "artifact_nonempty" "$artifact_nonempty"
  emit "restore_tool_selected" "$restore_tool_selected"
  emit "restore_retry_attempt_limit" "1"
  emit "retry_allowed" "false"
  emit "stop_on_first_failure" "true"
}

emit_safety() {
  emit "raw_log_recorded" "false"
  emit "secret_recorded" "false"
  emit "db_url_recorded" "false"
  emit "artifact_path_recorded" "false"
  emit "artifact_filename_recorded" "false"
  emit "artifact_content_recorded" "false"
  emit "artifact_hash_recorded" "false"
  emit "artifact_exact_size_recorded" "false"
  emit "sql_recorded" "false"
  emit "db_object_recorded" "false"
  emit "role_recorded" "false"
  emit "package_name_recorded" "false"
  emit "extension_name_recorded" "false"
}

if [ "$mode" = "preflight" ]; then
  reset_classifier_result
  emit_common
  emit "restore_retry_attempted" "false"
  emit "restore_retry_success" "not_attempted"
  emit "failure_reason" "$failure_reason"
  emit "pg_restore_executed" "false"
  emit "psql_executed" "false"
  emit "supabase_connection_attempted" "false"
  emit "db_change_performed" "false"
  emit_classifier_result
  emit_safety
  if [ "$helper_preflight_status" = "pass" ]; then
    exit 0
  fi
  exit 1
fi

if [ "$helper_preflight_status" != "pass" ]; then
  reset_classifier_result
  emit_common
  emit "restore_retry_attempted" "false"
  emit "restore_retry_success" "not_attempted"
  emit "failure_reason" "$failure_reason"
  emit "pg_restore_executed" "false"
  emit "psql_executed" "false"
  emit "supabase_connection_attempted" "false"
  emit "db_change_performed" "false"
  emit_classifier_result
  emit_safety
  exit 1
fi

if [ ! -d "$lock_root" ] || [ ! -w "$lock_root" ]; then
  reset_classifier_result
  emit_common
  emit "restore_retry_attempted" "false"
  emit "restore_retry_success" "not_attempted"
  emit "failure_reason" "attempt_lock_unavailable"
  emit "pg_restore_executed" "false"
  emit "psql_executed" "false"
  emit "supabase_connection_attempted" "false"
  emit "db_change_performed" "false"
  emit_classifier_result
  emit_safety
  exit 1
fi

attempt_lock="${lock_root%/}/amami-line-crm-dr-restore-retry.lock"
if ! mkdir "$attempt_lock" 2>/dev/null; then
  reset_classifier_result
  emit_common
  emit "restore_retry_attempted" "false"
  emit "restore_retry_success" "not_attempted"
  emit "failure_reason" "attempt_lock_exists"
  emit "pg_restore_executed" "false"
  emit "psql_executed" "false"
  emit "supabase_connection_attempted" "false"
  emit "db_change_performed" "false"
  emit_classifier_result
  emit_safety
  exit 1
fi

restore_success="false"
pg_restore_executed="false"
psql_executed="false"
failure_output=""
transient_failure_capture_used="true"
transient_failure_capture_file="$attempt_lock/restore-failure.capture"

if [ "$restore_tool_selected" = "pg_restore" ]; then
  pg_restore_executed="true"
  if "$tool_command" --no-owner --no-privileges --dbname "$db_url" "$artifact_path" >"$transient_failure_capture_file" 2>&1; then
    restore_success="true"
  fi
elif [ "$restore_tool_selected" = "psql" ]; then
  psql_executed="true"
  if "$tool_command" "$db_url" -f "$artifact_path" >"$transient_failure_capture_file" 2>&1; then
    restore_success="true"
  fi
fi

if [ -f "$transient_failure_capture_file" ]; then
  failure_output="$(cat "$transient_failure_capture_file" 2>/dev/null || true)"
fi
cleanup_transient_failure_capture

emit_common
emit "restore_retry_attempted" "true"
emit "pg_restore_executed" "$pg_restore_executed"
emit "psql_executed" "$psql_executed"
emit "supabase_connection_attempted" "true"
emit "db_change_performed" "true"

if [ "$restore_success" = "true" ]; then
  restore_failure_category="none"
  restore_failure_category_confidence="not_applicable"
  restore_failure_category_source="not_applicable"
  restore_failure_classifier_used="false"
  emit "restore_retry_success" "true"
  emit "failure_reason" "none"
  emit_classifier_result
  emit_safety
  exit 0
fi

classify_restore_failure "$failure_output"
emit "restore_retry_success" "false"
emit "failure_reason" "sanitized_restore_failed"
emit_classifier_result
emit_safety
exit 1

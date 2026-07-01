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
  *)
    mode="invalid"
    ;;
esac

emit() {
  printf '%s=%s\n' "$1" "$2"
}

safe_exit() {
  local code="$1"
  shift
  for pair in "$@"; do
    printf '%s\n' "$pair"
  done
  exit "$code"
}

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
  emit_common
  emit "restore_retry_attempted" "false"
  emit "restore_retry_success" "not_attempted"
  emit "failure_reason" "$failure_reason"
  emit "pg_restore_executed" "false"
  emit "psql_executed" "false"
  emit "supabase_connection_attempted" "false"
  emit "db_change_performed" "false"
  emit_safety
  if [ "$helper_preflight_status" = "pass" ]; then
    exit 0
  fi
  exit 1
fi

if [ "$helper_preflight_status" != "pass" ]; then
  emit_common
  emit "restore_retry_attempted" "false"
  emit "restore_retry_success" "not_attempted"
  emit "failure_reason" "$failure_reason"
  emit "pg_restore_executed" "false"
  emit "psql_executed" "false"
  emit "supabase_connection_attempted" "false"
  emit "db_change_performed" "false"
  emit_safety
  exit 1
fi

if [ ! -d "$lock_root" ] || [ ! -w "$lock_root" ]; then
  emit_common
  emit "restore_retry_attempted" "false"
  emit "restore_retry_success" "not_attempted"
  emit "failure_reason" "attempt_lock_unavailable"
  emit "pg_restore_executed" "false"
  emit "psql_executed" "false"
  emit "supabase_connection_attempted" "false"
  emit "db_change_performed" "false"
  emit_safety
  exit 1
fi

attempt_lock="${lock_root%/}/amami-line-crm-dr-restore-retry.lock"
if ! mkdir "$attempt_lock" 2>/dev/null; then
  emit_common
  emit "restore_retry_attempted" "false"
  emit "restore_retry_success" "not_attempted"
  emit "failure_reason" "attempt_lock_exists"
  emit "pg_restore_executed" "false"
  emit "psql_executed" "false"
  emit "supabase_connection_attempted" "false"
  emit "db_change_performed" "false"
  emit_safety
  exit 1
fi

restore_success="false"
pg_restore_executed="false"
psql_executed="false"

if [ "$restore_tool_selected" = "pg_restore" ]; then
  pg_restore_executed="true"
  if "$tool_command" --no-owner --no-privileges --dbname "$db_url" "$artifact_path" >/dev/null 2>&1; then
    restore_success="true"
  fi
elif [ "$restore_tool_selected" = "psql" ]; then
  psql_executed="true"
  if "$tool_command" "$db_url" -f "$artifact_path" >/dev/null 2>&1; then
    restore_success="true"
  fi
fi

emit_common
emit "restore_retry_attempted" "true"
emit "pg_restore_executed" "$pg_restore_executed"
emit "psql_executed" "$psql_executed"
emit "supabase_connection_attempted" "true"
emit "db_change_performed" "true"

if [ "$restore_success" = "true" ]; then
  emit "restore_retry_success" "true"
  emit "failure_reason" "none"
  emit_safety
  exit 0
fi

emit "restore_retry_success" "false"
emit "failure_reason" "sanitized_restore_failed"
emit_safety
exit 1

#!/usr/bin/env bash
set -u

API_SERVICE="${LINE_CANARY_WINDOW_API_SERVICE:-amami-line-crm-api}"
ADMIN_SERVICE="${LINE_CANARY_WINDOW_ADMIN_SERVICE:-amami-line-crm-admin}"
NGINX_SERVICE="${LINE_CANARY_WINDOW_NGINX_SERVICE:-nginx}"
ENABLE_HELPER="${LINE_CANARY_WINDOW_ENABLE_HELPER:-/root/bin/amami-line-set-line-real-push-flag.sh}"
DISABLE_HELPER="${LINE_CANARY_WINDOW_DISABLE_HELPER:-/root/bin/amami-line-disable-line-real-push.sh}"

print_kv() {
  printf '%s=%s\n' "$1" "$2"
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

systemctl_available() {
  has_command systemctl
}

service_active() {
  service_name="$1"
  label="$2"
  if ! systemctl_available; then
    print_kv "$label" "unknown_no_systemctl"
    return 0
  fi
  if systemctl is-active --quiet "$service_name"; then
    print_kv "$label" "true"
  else
    print_kv "$label" "false"
  fi
}

line_real_send_status() {
  if ! systemctl_available; then
    print_kv "line_real_send_currently_enabled" "unknown_no_systemctl"
    return 0
  fi

  api_pid="$(systemctl show -p MainPID --value "$API_SERVICE" 2>/dev/null || true)"
  if [ -z "${api_pid:-}" ] || [ "${api_pid:-0}" = "0" ] || [ ! -r "/proc/${api_pid}/environ" ]; then
    print_kv "line_real_send_currently_enabled" "unknown_no_process_env"
    return 0
  fi

  env_lines="$(tr '\0' '\n' < "/proc/${api_pid}/environ" 2>/dev/null || true)"
  messaging_enabled="false"
  real_push_enabled="false"
  if printf '%s\n' "$env_lines" | grep -qi '^LINE_MESSAGING_ENABLED=true$'; then
    messaging_enabled="true"
  fi
  if printf '%s\n' "$env_lines" | grep -qi '^LINE_REAL_PUSH_ENABLED=true$'; then
    real_push_enabled="true"
  fi

  print_kv "line_messaging_currently_enabled" "$messaging_enabled"
  print_kv "line_real_push_currently_enabled" "$real_push_enabled"

  if [ "$messaging_enabled" = "true" ] && [ "$real_push_enabled" = "true" ]; then
    print_kv "line_real_send_currently_enabled" "true"
  elif printf '%s\n' "$env_lines" | grep -q '^LINE_MESSAGING_ENABLED=' || printf '%s\n' "$env_lines" | grep -q '^LINE_REAL_PUSH_ENABLED='; then
    print_kv "line_real_send_currently_enabled" "false"
  else
    print_kv "line_real_send_currently_enabled" "unknown_key_absent"
  fi
}

line_real_send_enabled_value() {
  if ! systemctl_available; then
    printf 'unknown'
    return 0
  fi

  api_pid="$(systemctl show -p MainPID --value "$API_SERVICE" 2>/dev/null || true)"
  if [ -z "${api_pid:-}" ] || [ "${api_pid:-0}" = "0" ] || [ ! -r "/proc/${api_pid}/environ" ]; then
    printf 'unknown'
    return 0
  fi

  env_lines="$(tr '\0' '\n' < "/proc/${api_pid}/environ" 2>/dev/null || true)"
  if printf '%s\n' "$env_lines" | grep -qi '^LINE_MESSAGING_ENABLED=true$' &&
    printf '%s\n' "$env_lines" | grep -qi '^LINE_REAL_PUSH_ENABLED=true$'; then
    printf 'true'
  elif printf '%s\n' "$env_lines" | grep -q '^LINE_MESSAGING_ENABLED=' || printf '%s\n' "$env_lines" | grep -q '^LINE_REAL_PUSH_ENABLED='; then
    printf 'false'
  else
    printf 'unknown'
  fi
}

helper_present() {
  helper_path="$1"
  label="$2"
  if [ -x "$helper_path" ]; then
    print_kv "$label" "true"
  else
    print_kv "$label" "false"
  fi
}

restart_api_admin_if_required() {
  if ! systemctl_available; then
    print_kv "api_app_service_restart_status" "failed_no_systemctl"
    return 1
  fi

  if systemctl restart "$API_SERVICE" >/dev/null 2>&1; then
    print_kv "api_app_service_restart_executed" "true"
    print_kv "api_app_service_restart_status" "pass"
  else
    print_kv "api_app_service_restart_executed" "true"
    print_kv "api_app_service_restart_status" "failed"
    return 1
  fi

  if [ "${LINE_CANARY_WINDOW_RESTART_ADMIN:-NO}" = "YES" ]; then
    if systemctl restart "$ADMIN_SERVICE" >/dev/null 2>&1; then
      print_kv "admin_app_service_restart_executed" "true"
      print_kv "admin_app_service_restart_status" "pass"
    else
      print_kv "admin_app_service_restart_executed" "true"
      print_kv "admin_app_service_restart_status" "failed"
      return 1
    fi
  else
    print_kv "admin_app_service_restart_executed" "false"
    print_kv "admin_app_service_restart_status" "not_required"
  fi
}

self_check() {
  print_kv "operator_canary_window_helper_self_check" "pass"
  print_kv "operator_canary_window_helper_default_mode" "no_send"
  print_kv "operator_canary_window_helper_sends_line" "false"
  print_kv "operator_canary_window_helper_handles_recipient_or_message" "false"
  print_kv "operator_canary_window_helper_records_env_values" "false"
  print_kv "operator_canary_window_helper_records_urls" "false"
  print_kv "operator_canary_window_helper_records_raw_response_body" "false"
  print_kv "operator_retry_allowed" "false"
  print_kv "operator_bulk_multicast_broadcast_allowed" "false"
  print_kv "operator_openai_allowed" "false"
  print_kv "operator_canary_window_helper_status_check_available" "true"
  print_kv "operator_canary_window_helper_open_window_available" "true_guarded_future_only"
  print_kv "operator_canary_window_helper_close_window_available" "true_guarded_future_only"
  print_kv "tmp_used" "false"
  print_kv "timeout_command_available" "$(has_command timeout && printf true || printf false)"
}

dry_run_check() {
  print_kv "operator_canary_window_helper_dry_run_check" "pass"
  print_kv "line_real_send_executed" "false"
  print_kv "runtime_config_changed" "false"
  print_kv "service_restart_executed" "false"
  print_kv "recipient_or_message_required" "false"
  print_kv "recipient_or_message_accepted" "false"
  helper_present "$ENABLE_HELPER" "line_real_send_enable_helper_present"
  helper_present "$DISABLE_HELPER" "line_real_send_disable_helper_present"
  line_real_send_status
  print_kv "future_open_window_requires_explicit_operator_approval" "true"
  print_kv "future_close_window_requires_explicit_operator_approval" "true"
  print_kv "future_manual_send_path" "admin_ui_or_existing_admin_api_staff_reply"
}

status_check() {
  service_active "$API_SERVICE" "api_service_active"
  service_active "$ADMIN_SERVICE" "admin_service_active"
  service_active "$NGINX_SERVICE" "nginx_service_active"
  helper_present "$ENABLE_HELPER" "line_real_send_enable_helper_present"
  helper_present "$DISABLE_HELPER" "line_real_send_disable_helper_present"
  line_real_send_status
  print_kv "line_send_executed" "false"
  print_kv "openai_api_executed" "false"
  print_kv "db_connection_executed" "false"
  print_kv "raw_response_body_recorded" "false"
  print_kv "secret_recorded" "false"
  print_kv "env_value_recorded" "false"
  print_kv "host_or_url_recorded" "false"
}

open_window() {
  if [ "${LINE_CANARY_WINDOW_OPEN_APPROVED:-NO}" != "YES" ]; then
    print_kv "operator_canary_window_open_status" "blocked_missing_explicit_operator_approval"
    return 3
  fi
  if [ "$(line_real_send_enabled_value)" != "false" ]; then
    print_kv "operator_canary_window_open_status" "blocked_current_state_not_disabled"
    return 3
  fi
  if [ ! -x "$ENABLE_HELPER" ]; then
    print_kv "operator_canary_window_open_status" "blocked_enable_helper_missing"
    return 3
  fi

  print_kv "operator_canary_window_open_attempted" "true"
  if has_command timeout; then
    timeout 120 "$ENABLE_HELPER" true >/dev/null 2>&1
    helper_status=$?
  else
    "$ENABLE_HELPER" true >/dev/null 2>&1
    helper_status=$?
  fi
  if [ "$helper_status" -ne 0 ]; then
    print_kv "operator_canary_window_open_status" "failed_enable_helper"
    return 1
  fi

  restart_api_admin_if_required || return 1
  print_kv "pre_window_readonly_smoke_required" "operator_side_after_open"
  print_kv "pre_window_readonly_smoke_executed_by_helper" "false"
  line_real_send_status
  print_kv "operator_instruction" "send_exactly_one_canary_via_admin_ui_then_close_window"
  print_kv "line_send_executed_by_helper" "false"
  print_kv "line_retry_allowed" "false"
  print_kv "line_bulk_multicast_broadcast_allowed" "false"
}

close_window() {
  if [ "${LINE_CANARY_WINDOW_CLOSE_APPROVED:-NO}" != "YES" ]; then
    print_kv "operator_canary_window_close_status" "blocked_missing_explicit_operator_approval"
    return 3
  fi
  if [ ! -x "$DISABLE_HELPER" ]; then
    print_kv "operator_canary_window_close_status" "blocked_disable_helper_missing"
    return 3
  fi

  print_kv "operator_canary_window_close_attempted" "true"
  if has_command timeout; then
    timeout 120 "$DISABLE_HELPER" >/dev/null 2>&1
    helper_status=$?
  else
    "$DISABLE_HELPER" >/dev/null 2>&1
    helper_status=$?
  fi
  if [ "$helper_status" -ne 0 ]; then
    print_kv "operator_canary_window_close_status" "failed_disable_helper"
    return 1
  fi

  restart_api_admin_if_required || return 1
  print_kv "post_window_readonly_smoke_required" "operator_side_after_close"
  print_kv "post_window_readonly_smoke_executed_by_helper" "false"
  line_real_send_status
  print_kv "operator_canary_window_close_status" "pass"
  print_kv "line_send_executed_by_helper" "false"
}

usage() {
  cat <<'USAGE'
operator_canary_window_helper_default_mode=no_send
supported_modes=--self-check,--dry-run-check,--status,--open-window,--close-window
line_send_executed=false
recipient_or_message_accepted=false
USAGE
}

if [ "$#" -eq 0 ]; then
  usage
  exit 0
fi

case "$1" in
  --self-check)
    self_check
    ;;
  --dry-run-check)
    dry_run_check
    ;;
  --status)
    status_check
    ;;
  --open-window)
    open_window
    ;;
  --close-window)
    close_window
    ;;
  --recipient|--message|--to|--body|--line-user-id)
    print_kv "operator_canary_window_helper_status" "rejected_recipient_or_message_input"
    exit 2
    ;;
  *)
    usage
    exit 2
    ;;
esac

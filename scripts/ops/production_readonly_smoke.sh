#!/usr/bin/env bash
set -u

timeout_seconds="${CURL_TIMEOUT_SECONDS:-10}"
missing_config=0
failed_check=0

check_status() {
  label="$1"
  expected="$2"
  variable_name="$3"
  endpoint_value="${!variable_name:-}"

  if [ -z "$endpoint_value" ]; then
    printf '%s=not_configured\n' "$label"
    missing_config=1
    return
  fi

  status_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$timeout_seconds" "$endpoint_value" 2>/dev/null || true)"
  if [ -z "$status_code" ]; then
    status_code="request_failed"
  fi

  printf '%s=%s\n' "$label" "$status_code"
  if [ "$status_code" != "$expected" ]; then
    failed_check=1
  fi
}

check_status "public_api_health_status_code" "200" "PUBLIC_API_HEALTH_URL"
check_status "public_admin_root_status_code" "200" "PUBLIC_ADMIN_ROOT_URL"
check_status "public_customers_no_auth_status_code" "401" "PUBLIC_CUSTOMERS_NO_AUTH_URL"

printf 'raw_response_body_printed=false\n'
printf 'authenticated_check_executed=false\n'
printf 'line_send_executed=false\n'
printf 'openai_api_executed=false\n'
printf 'db_connection_executed=false\n'
printf 'supabase_connection_executed=false\n'
printf 'endpoint_url_recorded=false\n'
printf 'secret_read=false\n'

if [ "$missing_config" -eq 1 ]; then
  printf 'readonly_smoke_status=not_configured\n'
  exit 2
fi

if [ "$failed_check" -eq 1 ]; then
  printf 'readonly_smoke_status=failed\n'
  exit 1
fi

printf 'readonly_smoke_status=pass\n'

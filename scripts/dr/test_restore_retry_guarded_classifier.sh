#!/usr/bin/env bash
set -euo pipefail
set +x

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
helper="$script_dir/restore_retry_guarded.sh"

output="$(bash "$helper" --self-test-classifier)"

require_line() {
  local expected="$1"
  if ! printf '%s\n' "$output" | grep -Fx "$expected" >/dev/null 2>&1; then
    printf 'classifier_validation_status=failed\n'
    printf 'missing_expected_key=true\n'
    exit 1
  fi
}

require_line "classifier_test_connection_or_auth_to_dr_target_category=pass"
require_line "classifier_test_missing_or_unavailable_extension_category=pass"
require_line "classifier_test_role_or_ownership_permission_category=pass"
require_line "classifier_test_schema_or_object_conflict_category=pass"
require_line "classifier_test_timeout_or_resource_limit_category=pass"
require_line "classifier_test_unknown_restore_target_compatibility_category=pass"
require_line "self_test_status=pass"
require_line "restore_execution_in_self_test=false"
require_line "db_connection_in_self_test=false"
require_line "raw_failure_output_printed=false"
require_line "raw_failure_output_recorded=false"
require_line "raw_failure_output_retained=false"

printf 'classifier_validation_status=pass\n'
printf 'restore_execution_in_classifier_validation=false\n'
printf 'db_connection_in_classifier_validation=false\n'

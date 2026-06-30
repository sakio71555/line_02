# Production Vs DR Readiness Matrix

This matrix separates app / production readiness from disaster recovery readiness. It prevents a failed restore drill from being treated as the only production readiness signal, while still keeping `production_no_go` until a separate review is completed.

| area | status | reason_scope | evidence | next_review | go_status |
| --- | --- | --- | --- | --- | --- |
| DR readiness | `not_ready_restore_failed` | restore drill has not succeeded | `docs/15_runbooks/restore_drill_planning.md`, `docs/17_story_matrix/dr_readiness_story_matrix.md` | minimum DR fallback plan or future isolated restore remediation | No-Go |
| Classifier route | `frozen` | repeated operator payload absent | `docs/11_codex_tasks/251_classifier_route_freeze_and_dr_production_readiness_split.md` | resume only after `human_provided_valid_strict_sanitized_payload` | No-Go for classifier route |
| App readiness | `separate_review_required` | app path not evaluated in Loop 251 | `docs/16_handoff/latest_codex_result.md` | Loop 252 app production path review without DR blocker coupling | Not decided |
| Production readiness | `separate_review_required` | `production_no_go` reasons must be split before final decision | `docs/11_codex_tasks/251_classifier_route_freeze_and_dr_production_readiness_split.md` | Loop 252 app production path review without DR blocker coupling | `production_no_go` maintained |

## Current State

```txt
dr_readiness_status=not_ready_restore_failed
classifier_route_status=frozen
app_readiness_status=separate_review_required
production_readiness_status=separate_review_required
production_no_go=true
production_no_go_reason_scope=must_be_split
production_go_changed=false
```

## Safety

```txt
docs_only=true
restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
line_real_send_executed=false
openai_api_executed=false
production_runtime_changed=false
secrets_recorded=false
db_url_recorded=false
raw_log_recorded=false
package_name_recorded=false
extension_name_recorded=false
```

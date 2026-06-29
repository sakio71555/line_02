# Verification Matrix

Stage 1 verification matrix for this goal.

## Safe-To-Run Now

These checks do not require production, external APIs, DB connections, restore, packages, cluster changes, or secrets.

| verification_id | target | command_or_method | expected_result | safe_to_run_now | requires_secret | requires_production | requires_external_api | requires_cost | requires_db_connection | requires_restore | prohibited_without_operator_approval | current_status | risk_notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V-001 | Git status | `git status --short` and `git status -sb` | clean before/after commits or known docs-only diff | true | false | false | false | false | false | false | false | passed_stage_2 | No secrets printed. |
| V-002 | Whitespace | `git diff --check` | no whitespace errors | true | false | false | false | false | false | false | false | passed_stage_2 | Required before commit. |
| V-003 | Docs links | static file existence checks for newly linked docs | all referenced local docs exist | true | false | false | false | false | false | false | false | passed_stage_2 | Link target existence only, no browser. |
| V-004 | Secret pattern boolean check | grep against changed docs for known secret patterns, returning boolean only | `secret_pattern_check=passed` | true | false | false | false | false | false | false | false | passed_stage_2_changed_files | Do not print matching lines. A broad all-repo pattern can match existing placeholders, so this goal records the changed-file boolean check. |
| V-005 | Lint | `npx pnpm@10.12.1 lint` | pass | true | false | false | false | false | false | false | false | passed_stage_2 | Static repo check. |
| V-006 | Typecheck | `npx pnpm@10.12.1 typecheck` | pass | true | false | false | false | false | false | false | false | passed_stage_2 | Safe local typecheck completed. |
| V-007 | Unit tests | `npx pnpm@10.12.1 test` | pass | true | false | false | false | false | false | false | false | passed_stage_2 | `199 passed / 1 skipped`, `1212 passed / 4 skipped`. |
| V-008 | Integration tests | `npx pnpm@10.12.1 test:integration` | pass | true | false | false | false | false | false | false | false | passed_stage_2 | `199 passed / 1 skipped`, `1212 passed / 4 skipped`. |
| V-009 | Handoff dry-run | update `docs/16_handoff/latest_*` with sanitized goal result | paste-ready review prompt | true | false | false | false | false | false | false | false | passed_stage_2 | Never paste secrets/raw logs. |
| V-010 | Obsidian completeness | ensure Decisions / DevelopmentLog / Risks / Checklist exist | all four sections present | true | false | false | false | false | false | false | false | passed_stage_2 | Required by this goal. |

## Blocked Or Operator Approval Required

These checks are not allowed in this goal.

| verification_id | target | blocked_reason | safe_to_run_now | requires_secret | requires_production | requires_external_api | requires_cost | requires_db_connection | requires_restore | prohibited_without_operator_approval | next_loop_candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BV-001 | Supabase DB connection | DB connection and secrets are prohibited in this goal. | false | true | true | false | false | true | false | true | future Supabase smoke loop with explicit approval |
| BV-002 | Backup export | `pg_dump` and artifact creation are prohibited in this goal. | false | true | true | false | false | true | false | true | future backup automation loop |
| BV-003 | Restore retry | restore, `pg_restore`, target DB creation, and artifact operations are prohibited. | false | false | true | false | false | false | true | true | Loop 216 then future restore retry |
| BV-004 | Diagnostic raw log review | raw log display/copy is prohibited. | false | false | false | false | false | false | false | true | Loop 216 operator-only sanitized subcategory review |
| BV-005 | LINE real send | Real LINE send can affect users. | false | true | true | true | false | true | false | true | dedicated controlled one-message smoke |
| BV-006 | OpenAI real API | API call may cost money and expose prompt/response handling risks. | false | true | true | true | true | false | false | true | dedicated OpenAI runtime/cost loop |
| BV-007 | Nginx/DNS/HTTPS/certbot/public smoke | Public exposure and infra changes are prohibited. | false | false | true | true | false | false | false | true | dedicated infra loop with approval |
| BV-008 | Package or cluster changes | package/cluster changes are prohibited. | false | false | true | false | false | false | false | true | dedicated package/cluster loop |

## Stage 2 Rule

Stage 2 may run only `safe_to_run_now=true` checks. If a story needs a blocked check, record it as `blocked_operator_approval_required` and split it into a future loop.

# Loop 186: Production Monitoring Automation Dry-Run

## Purpose

Move the current production monitoring checks from manual commands toward a repeatable dry-run script.

This Loop adds and validates a read-only monitoring script. It does not install cron, systemd timers, or notifications.

## Scope

- Add `scripts/monitoring/production-monitoring-dry-run.ts`.
- Check API/Admin health, Admin no-header rejection, LINE invalid-signature rejection, runtime classifications, sanitized journal/Nginx summaries, and resource status.
- Redact secret values, webhook suffixes, LINE identifiers, message bodies, OpenAI values, Supabase values, DB URLs, bearer tokens, and private keys.
- Return exit status `0` for healthy, `1` for degraded, and `2` for failed.
- Validate locally and on VPS staging.
- Deploy the script to the active VPS source without service restart.
- Run one VPS dry-run.
- Update runbooks, dev log, and static tests.

## Out of Scope

- cron creation.
- systemd timer creation.
- monitoring notification sending.
- runtime flag changes.
- additional LINE send.
- OpenAI API execution.
- Supabase write, migration, or RLS changes.
- Nginx config change, reload, or restart.
- DNS or certbot changes.
- `.env` display or modification.

## Script

```txt
scripts/monitoring/production-monitoring-dry-run.ts
```

Example:

```bash
npx pnpm@10.12.1 exec tsx scripts/monitoring/production-monitoring-dry-run.ts --dry-run
```

The script is dry-run by default. `--json` and `--since` are optional. It has no execute mode.

## Checks Included

```txt
api_health=200
https_api_health=200
admin_root=200
admin_customers=200
admin_api_no_header_customers=401
line_invalid_signature=401/400/403
runtime_repository=supabase
runtime_line_real_push_enabled=true
runtime_ai_provider=openai
openai_dropin=present
journal_api_* sanitized summary
journal_admin_* sanitized summary
nginx_* sanitized summary
resource_load_1m
resource_memory_used_percent
resource_disk_used_percent
secrets_recorded=false
```

## VPS Dry-Run Result

Final VPS active dry-run result:

```txt
production_monitoring_dry_run=healthy
exit_status=0
api_health=200
https_api_health=200
admin_root=200
admin_customers=200
admin_api_no_header_customers=401
line_invalid_signature=401
runtime_repository=supabase
runtime_line_real_push_enabled=true
runtime_ai_provider=openai
openai_dropin=present
critical_errors_detected=false
secrets_recorded=false
```

## Deployment Notes

```txt
final_script_commit=cf9846b
archive_sha256=33084e123448e6c84f6fa138d467ae1c8a0a3cc700de0e6f2c002e3c43c323b0
vps_staging_validation=passed
active_deploy=completed
api_restart_performed=false
admin_restart_performed=false
nginx_reload_performed=false
```

An earlier dry-run was degraded because the OpenAI drop-in detector looked for a fixed file name. The final script detects an `openai*.conf` drop-in file name without reading its contents.

## Safety Boundary

- Secret values were not displayed or recorded.
- Webhook suffix values were not displayed or recorded.
- LINE user identifiers, reply tokens, inbound bodies, and outbound bodies were not recorded.
- OpenAI API key, model value, prompt body, response body, and provider output were not recorded.
- Supabase URL, keys, project ref, and DB URL were not recorded.
- No additional LINE send was performed.
- No OpenAI real API call was performed.
- No runtime flags were changed.
- No cron or systemd timer was installed.
- No notification was sent.

## Tests

- `production-monitoring-automation-dry-run.test.ts` covers script existence, dry-run/read-only behavior, forbidden command absence, labels, redaction, env parsing, and output formatting.
- `production-monitoring-automation-dry-run-docs.test.ts` covers docs/runbook/dev-log coverage for Loop 186.

## Next Loop

```txt
Loop 187: OpenAI usage and cost monitoring plan
```

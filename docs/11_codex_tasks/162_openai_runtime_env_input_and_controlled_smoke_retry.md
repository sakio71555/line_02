# Loop 162: OpenAI runtime env input and controlled smoke retry

## Goal

Add a safe internal OpenAI provider smoke command, deploy it to the VPS review runtime, and run exactly one controlled non-customer OpenAI smoke after operator-provided runtime env approval.

## Scope

- Add a project-local smoke command for the OpenAI provider boundary.
- Keep the smoke command internal; do not add a public HTTP smoke route.
- Use a fixed non-personal prompt and do not record response bodies.
- Deploy the command to the VPS review runtime after local and staging validation.
- Accept OpenAI runtime values only through the root-only VPS helper.
- Temporarily attach the OpenAI runtime env to the API service only for the smoke.
- Remove the OpenAI systemd drop-in after the smoke and return API runtime to mock AI.
- Update docs, runbooks, dev log, and tests.

## Out of Scope

- Public OpenAI smoke endpoint.
- Customer timeline, LINE message body, or RAG source content in the smoke prompt.
- OpenAI response body logging.
- OpenAI API key, model value, authorization header, or billing detail logging.
- LINE real push/reply.
- Supabase migration, write smoke, or RLS changes.
- Nginx, DNS, certbot, or HTTPS changes.
- Production Go.

## Implementation

Added:

```txt
scripts/smoke/openai-provider-smoke.ts
tests/integration/openai-provider-smoke-script.test.ts
```

The smoke command:

- Requires `AI_PROVIDER=openai`.
- Requires `OPENAI_API_KEY` and `OPENAI_MODEL`.
- Requires `OPENAI_REAL_API_SMOKE_APPROVED=YES`.
- Uses `OpenAiProvider` and the real fetch transport.
- Calls `draftReply` once with a fixed non-personal message.
- Prints only sanitized status lines.
- Does not print the model value, API key, prompt body, or response body.

## VPS Result

```txt
release_candidate=62e9712212b4c1aea2d158279aabc8cca5e46c35
archive_sha256=346bf0b0918dc0ccaec33acae6bbf0f28de273b67915fc7e640fa4d06f56c691
vps_staging_validation=success
active_deploy=success
api_restart=success
admin_restart=success
openai_runtime_env_exists=true
openai_real_api_smoke_approval=YES
openai_smoke_command_added=true
openai_smoke=failed
openai_smoke_error_class=OpenAiProviderError
openai_response_body_recorded=false
openai_api_key_recorded=false
openai_prompt_recorded=false
openai_systemd_dropin_present_final=false
api_health_after_rollback=200
https_api_health_after_rollback=200
production_readiness=production_no_go
```

The first CLI run was `not_performed` because systemd `EnvironmentFile` values are not inherited by an ad-hoc SSH command. That run did not call OpenAI. The actual approved smoke loaded the root-only runtime env in the command process and made a single OpenAI provider call.

The provider reached the OpenAI boundary but returned `OpenAiProviderError`. No retry was performed.

## Safety Boundary

- OpenAI secret values were not printed or documented.
- OpenAI response body was not printed or documented.
- Model value was treated as configured but not recorded.
- The temporary API `EnvironmentFile` drop-in was removed after the smoke.
- Final API/Admin health checks passed.
- LINE real push/reply stayed disabled.
- Production readiness remains `production_no_go`.

## Test Coverage

- Smoke script exits as `not_performed` when provider is not OpenAI.
- Missing env values are reported as sanitized `not_performed`.
- Approved smoke path calls the provider boundary once.
- Failure output keeps response body, prompt, and API key unrecorded.
- Docs record Loop 162 without leaking secrets or endpoint values.

## Residual Risks

- OpenAI provider real smoke failed with `OpenAiProviderError`; the sanitized smoke intentionally does not record the raw upstream body.
- `openai_ready=false` until a future controlled smoke succeeds.
- The root-only OpenAI runtime env file exists on the VPS, but it is not attached to the API service after rollback.

## Next

```txt
Loop 163: OpenAI smoke failure diagnosis without recording secrets
```

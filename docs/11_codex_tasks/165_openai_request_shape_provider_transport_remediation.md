# Loop 165: OpenAI request-shape / provider transport remediation

## Goal

Classify the previously unknown OpenAI smoke failure without recording secrets, prompt body, model value, or raw OpenAI response body.

## Scope

- Add a raw Responses API diagnostic smoke script.
- Split provider smoke into:
  - two-stage raw + provider smoke for local/fake tests.
  - provider-boundary-only smoke for VPS use after a separate raw diagnostic.
- Keep provider requests on the Responses API with `store: false` and bounded `max_output_tokens`.
- Improve provider parse failure classification.
- Add tests for request shape, raw diagnostics, provider-only smoke, and sanitized classification.
- Deploy the remediation to the VPS review runtime using copy-based redeploy.
- Run one raw diagnostic smoke and, only after raw success, one provider-boundary smoke.
- Roll back the API to mock AI after smoke checks.

## Out of Scope

- Keeping OpenAI enabled as steady-state runtime.
- Repeating paid OpenAI retries.
- Recording OpenAI key, model value, prompt body, raw response body, organization ID, or project ID.
- LINE real push/reply.
- Supabase migration, write smoke, RLS changes, or production Go.
- Nginx, DNS, certbot, or HTTPS changes.

## Implementation

- `packages/ai/src/index.ts`
  - Responses API request includes `max_output_tokens: 800` and `store: false`.
  - Provider output field mismatches now classify as `G_response_parse_bug` instead of falling through to unknown.
- `scripts/smoke/openai-raw-responses-smoke.ts`
  - Sends a minimal raw Responses API diagnostic request.
  - Records only sanitized status fields.
- `scripts/smoke/openai-provider-smoke.ts`
  - Runs raw first and skips provider if raw fails.
  - Exposes a provider-boundary smoke function for already-diagnosed raw success.
- `scripts/smoke/openai-provider-boundary-smoke.ts`
  - Runs provider boundary only, avoiding repeated raw diagnostic calls.

## VPS Smoke Result

```txt
release_candidate_final=d57b2095ab904969a8d0d1ef96f7cb9fc579a614
raw_responses_smoke=performed_once
raw_responses_smoke_status=success
raw_responses_http_status=200
provider_boundary_smoke=performed_once
provider_boundary_smoke_status=failed
provider_boundary_error_classification=I_unknown_sanitized
provider_boundary_retry_performed=no
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_dropin_final=removed
ai_provider_final=mock
api_direct_health_final=200
https_api_health_final=200
admin_customers_no_header_final=401
line_invalid_signature_final=401
openai_api_connectivity_ready=true
openai_provider_runtime_ready=false
production_readiness=production_no_go
```

## Interpretation

The raw Responses API diagnostic reached OpenAI and returned HTTP 200, so the remaining failure is not basic network reachability or gross auth failure.

The provider-boundary smoke still failed once. Because the final parse-classification hardening was added after that single provider smoke, no second paid provider retry was performed in this Loop.

## Safety Boundary

- The fixed raw prompt was non-personal and not recorded.
- No customer timeline, LINE message body, RAG source content, or tenant data was sent in the smoke.
- No secret value, model value, webhook path, LINE user ID, or raw OpenAI response was recorded.
- API returned to mock AI after smoke.

## Tests

- `tests/integration/openai-raw-responses-smoke-script.test.ts`
- `tests/integration/openai-provider-smoke-script.test.ts`
- `tests/integration/openai-smoke-error-classification.test.ts`
- `tests/integration/openai-request-shape-provider-transport-remediation.test.ts`

## Next

```txt
Loop 166: OpenAI provider output contract remediation
```

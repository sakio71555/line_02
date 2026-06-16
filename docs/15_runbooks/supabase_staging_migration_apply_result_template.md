# Supabase Staging Migration Apply Result Template

> Do not write secrets, `.env` values, Supabase project refs, production logs, LINE userId, or real customer information in this file.

## Summary

- Date / time:
- Operator:
- Target environment: staging only
- Target migration:
- Related commit:
- Start `git status --short`:
- End `git status --short`:

## Approval

- Human approval received:
- Confirmation that target is staging:
- Confirmation that target is not production:
- Confirmation that project ref was checked locally and not written here:
- Confirmation that dummy data only is used:
- Confirmation that RLS is not production-ready yet:

## Commands Run

```text
# Record commands actually run.
# Do not paste secrets, project refs, or env values.
```

## Result

- Migration apply result:
- Exit status / observed result:
- Error summary, if any:

## Tables Checked

- [ ] `tenants`
- [ ] `tenant_line_settings`
- [ ] `tenant_ai_settings`
- [ ] `staff_users`
- [ ] `staff_tenant_memberships`
- [ ] `customers`
- [ ] `consultations`
- [ ] `messages`
- [ ] `alerts`
- [ ] `knowledge_pages`
- [ ] `construction_cases`
- [ ] `reservations`

## Indexes Checked

- [ ] `customers_tenant_line_user_id_unique`
- [ ] `messages_tenant_line_message_id_unique`
- [ ] `customers_tenant_id_idx`
- [ ] `customers_tenant_response_mode_idx`
- [ ] `messages_tenant_customer_created_at_idx`
- [ ] `alerts_tenant_status_severity_idx`
- [ ] `knowledge_pages_tenant_id_idx`
- [ ] `knowledge_pages_tenant_allowed_for_ai_idx`
- [ ] `staff_tenant_memberships_tenant_status_idx`

## Constraints Checked

- [ ] `tenants.id` primary key
- [ ] `tenants.slug` unique
- [ ] tenant-owned tables reference `tenants(id)`
- [ ] `customers.tenant_id + line_user_id` unique when `line_user_id` is not null
- [ ] `messages.tenant_id + line_message_id` unique when `line_message_id` is not null
- [ ] `staff_users.tenant_id + email` unique
- [ ] `staff_tenant_memberships.tenant_id + staff_user_id` unique

## RLS State

- RLS enabled:
- RLS policies present:
- Notes:

## Issues

- Issue:
- Impact:
- Evidence without secrets:

## Response

- Action taken:
- Follow-up needed:
- Owner:

## Rollback

- Rollback needed:
- Rollback option considered:
- Rollback executed:
- Reason if not executed:

## Go / No-Go After Apply

- Can proceed to next loop:
- Reason:
- Next loop:

## Notes

- Keep this record free of real customer information, LINE userId, API keys, `.env` values, Supabase project refs, and production logs.

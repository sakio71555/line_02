# Loop 324: customer channel staff notification temporary fallback

## Goal

Allow a temporary staff notification path through the existing customer-facing `アマミホーム` LINE channel while the separate staff notification account's LINE Developers channel/token access is unresolved.

## Scope

- Add an explicit runtime flag for temporary customer-channel staff notification fallback.
- When the flag is enabled, `通知テスト` sent to the existing customer-facing LINE channel captures the notification target.
- Do not record the setup trigger as a customer CRM message or unresolved customer alert.
- When the flag is enabled, staff alert notifications use the existing customer-facing LINE channel token.
- Prevent the separate staff notification webhook from overwriting the runtime notification target while the fallback is enabled.

## Out of scope

- LINE real send by Codex.
- Token value, LINE userId, groupId, roomId, webhook secret path, or raw log recording.
- Nginx, DNS, HTTPS, certbot, OpenAI, Supabase direct DB, or production DB changes.
- Rich menu changes.

## Result

- Added `STAFF_LINE_USE_CUSTOMER_CHANNEL_FOR_NOTIFICATIONS`.
- Customer-facing LINE `通知テスト` can now be used as a temporary staff notification target setup trigger.
- During fallback operation, the operator should send `通知テスト` to the existing customer-facing `アマミホーム` account, not the separate `アマミホーム 相談通知` account.
- Separate staff notification webhook setup is skipped while the fallback flag is enabled to avoid cross-channel target capture.
- Staff notification delivery can use `LINE_CHANNEL_ACCESS_TOKEN` in fallback mode.

## Verification

- Added integration coverage for customer-channel target capture without CRM customer logging.
- Added integration coverage to ensure the separate staff webhook does not refresh targets during fallback mode.
- Added integration coverage for runtime staff notification push using the customer channel token in fallback mode.

## Safety

- No secret values are recorded.
- Target identifiers are not returned in API responses, docs, or commits.
- LINE message sending is not executed by Codex.
- The fallback is opt-in and can be removed after the separate `アマミホーム 相談通知` channel token becomes available.

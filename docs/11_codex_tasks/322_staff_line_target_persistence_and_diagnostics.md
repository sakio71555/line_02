# Loop 322: staff LINE target persistence and diagnostics

## Scope

- Persist the staff notification LINE target captured from the staff webhook to a runtime env file.
- Keep the captured target value out of API responses, logs, docs, and commits.
- Add sanitized production logging for staff webhook processing and setup reply outcomes.
- Preserve LINE Messaging API status code metadata without recording response bodies.
- Add integration coverage for safe target persistence.

## Out of scope

- LINE real customer send.
- Staff broadcast, retry, or multicast.
- Secret, webhook path, raw body, LINE userId, groupId, roomId, or response body recording.
- Supabase/production DB direct connection, restore, pg_restore, psql, Nginx/DNS/HTTPS/certbot changes.

## Result

- Staff webhook target capture can write a root-only runtime env file while returning only booleans and categories.
- `通知テスト` setup replies now expose sanitized failure category/status metadata when LINE reply fails.
- Tests cover target persistence without outputting the target ID or runtime file path in the API response.

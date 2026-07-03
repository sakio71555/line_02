# Loop 323: staff LINE runtime config enablement

## Scope

- Fix staff notification LINE webhook processing so the production VPS can capture the notification target when the staff LINE runtime credentials are configured.
- Keep the existing production/customer runtime behavior unchanged.
- Preserve sanitized API responses and logs without outputting target IDs, webhook paths, tokens, message bodies, or raw LINE payloads.
- Add integration coverage for a VPS process that is labeled as development but has staff LINE runtime credentials configured.

## Out of scope

- LINE real customer send, retry, broadcast, multicast, or staff notification test send by Codex.
- Changing global `APP_ENV` / `NODE_ENV` on the VPS.
- Secret, webhook path, LINE userId, groupId, roomId, raw body, message body, or LINE API response body recording.
- Supabase/production DB direct connection, restore, pg_restore, psql, Nginx/DNS/HTTPS/certbot changes.

## Result

- Staff LINE target capture and setup reply now depend on staff LINE runtime credential presence instead of the global production runtime flag.
- This avoids broad runtime-mode changes while allowing the staff notification account webhook to capture its first notification target on the production VPS.
- Tests cover target capture and runtime-file persistence when `APP_ENV`/`NODE_ENV` are development-labeled but staff LINE runtime credentials are present.
- Responses and logs continue to expose only booleans, counts, source type, and sanitized status categories.

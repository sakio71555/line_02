# Supabase Alerts/Knowledge Staging Runtime Plan

> Do not write secrets, `.env` values, Supabase project refs, DB URLs, production logs, LINE userId, or real customer information in this file.

## Purpose

customers/messagesのSupabase staging smokeが通った後、次に `alerts` と `knowledge_pages` をstaging runtimeへ進めるための確認runbookです。

このrunbookは設計・手順整理です。runtime switch、API変更、migration変更、RLS SQL、Supabase接続、LINE/OpenAI接続はこのLoopでは行いません。

## Current State

- staging schema is applied.
- staging PostgREST/Data API `service_role` grants are applied.
- dummy customers/messages/knowledge pages are seeded in staging.
- customers/messages Supabase runtime smoke passed through explicit injection.
- default runtime remains `in_memory`.
- alerts runtime is not switched.
- knowledge/RAG runtime is not switched.
- RLS is not implemented.
- production readiness remains No-Go.

## Inventory

| area | current state | next staging need |
| --- | --- | --- |
| alerts list | in-memory repository | Supabase alert repository fake tests, then runtime injection |
| unreplied check | reads customers and writes alerts | avoid mixed runtime; inject Supabase customers/messages + alerts together |
| notify-open | in-memory alert + `MockStaffNotifier` | persist alert status update in Supabase, keep notifier mock |
| knowledge_pages | static/in-memory RAG source | use Supabase repository with `tenant_id` + `allowed_for_ai` |
| RAG search | keyword search, no embeddings | prove Supabase knowledge rows produce same search shape |
| RAG answer draft | `MockAiProvider`, response only | keep response-only, attach Supabase sources, no save/send |

## Alerts Runtime Checklist

Target routes:

- `GET /api/admin/alerts`
- `POST /api/admin/alerts/check-unreplied`
- `POST /api/admin/alerts/notify-open`

- [ ] Add or confirm fake client coverage for `SupabaseAlertRepository`.
- [ ] Confirm alert inserts include `tenant_id`.
- [ ] Confirm alert reads filter by `tenant_id`.
- [ ] Confirm open alert list filters `tenant_id + status`.
- [ ] Confirm duplicate lookup filters `tenant_id + customer_id + alert_type + status`.
- [ ] Confirm status update filters `tenant_id + alert_id`.
- [ ] Confirm Supabase errors are wrapped as `SupabaseRepositoryError` without leaking secrets.
- [ ] Add runtime injection only after fake tests pass.
- [ ] Keep default runtime `in_memory`.
- [ ] Keep `MockStaffNotifier`; do not connect real LINE notification.

## knowledge_pages / RAG Runtime Checklist

Target routes:

- `POST /api/admin/rag/search`
- `POST /api/admin/rag/answer-draft`

- [ ] Add or confirm fake client coverage for `SupabaseKnowledgePageRepository`.
- [ ] Confirm query filters `tenant_id`.
- [ ] Confirm query filters `allowed_for_ai = true`.
- [ ] Confirm defensive row filtering excludes wrong tenant and disallowed rows.
- [ ] Confirm mapping includes `title`, `url`, `category`, `source_type`, `content`, `last_crawled_at`.
- [ ] Confirm RAG search returns sources with `excerpt` and `score`.
- [ ] Confirm RAG answer draft remains response-only.
- [ ] Do not add crawling, embedding, pgvector, OpenAI, or LINE send.

## Staging Smoke Checklist

Alerts smoke:

- [ ] Use dummy tenant `tenant_amamihome` only.
- [ ] Use explicit Supabase runtime injection, not default runtime change.
- [ ] Run unreplied alert check.
- [ ] List alerts and confirm only tenant alerts are returned.
- [ ] Run notify-open with mock notifier.
- [ ] Confirm status changes from `open` to `notified`.
- [ ] Confirm restart-equivalent app instance can read persisted alert.

Knowledge/RAG smoke:

- [ ] Use seeded dummy `knowledge_pages`.
- [ ] Search `オンライン相談`.
- [ ] Search `施工事例`.
- [ ] Search `メンテナンス`.
- [ ] Search `SoToNo MA`.
- [ ] Confirm sources are tenant scoped.
- [ ] Confirm `allowed_for_ai=false` rows are excluded.
- [ ] Confirm RAG answer draft includes sources and remains response-only.

## service_role / RLS Rules

- `service_role` is server-side only.
- `service_role` bypasses RLS, so repository `tenant_id` filters remain mandatory.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser, LIFF, or Next client components.
- Do not grant broad table DML to `anon` or `authenticated`.
- Supabase repository failures should remain `SupabaseRepositoryError` and not print secret/env values.
- RLS SQL remains a separate future Loop.
- Production remains No-Go until RLS, Supabase Auth/JWT, selectedTenantId, and production dev_header rejection are implemented and tested.

## Stop Conditions

Stop and split into a new Loop if any of these are needed:

- migration SQL change
- RLS SQL
- `.env` creation or value display
- Supabase production connection
- API runtime switch beyond the scoped staging injection
- real LINE notification
- OpenAI API call
- Web crawling
- embedding or vector search
- admin UI changes

## Follow-up Loop Candidates

```text
Loop 082: Supabase alert repository fake-client hardening
Loop 083: Supabase knowledge repository fake-client hardening
Loop 084: Supabase alerts runtime boundary
Loop 085: Supabase alerts staging smoke
Loop 086: Supabase knowledge/RAG runtime boundary
Loop 087: Supabase knowledge/RAG staging smoke
Loop 088: RLS policy SQL draft for customers/messages/alerts/knowledge
```

## Related Docs

- [Loop 081: Supabase Alerts/Knowledge Staging Runtime Plan](../11_codex_tasks/081_supabase_alerts_knowledge_staging_runtime_plan.md)
- [Supabase Staging Verification Final Record](supabase_staging_verification_final_record.md)
- [RLS/Auth Production Readiness](rls_auth_production_readiness.md)
- [Supabase Staging Persistence Checklist](supabase_staging_persistence_checklist.md)
- [Loop 023: Supabase Alert Repository](../11_codex_tasks/023_supabase_alert_repository.md)
- [Loop 024: Supabase Knowledge Repository](../11_codex_tasks/024_supabase_knowledge_repository.md)

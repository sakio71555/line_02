# Authenticated Staff Route Rollout Completion Audit

## Purpose

Loop 092で、現在の主要Admin API routeに対する authenticated_staff runtime rollout が完了したことを記録する監査メモです。

この監査はproduction readinessではありません。productionは引き続きNo-Goです。

## Completion Summary

| group | rollout status | loop |
| --- | --- | --- |
| customer read routes | done | Loop 089 |
| customer write / AI routes | done | Loop 090 |
| alerts routes | done | Loop 091 |
| RAG routes | done | Loop 092 |
| production dev_header rejection | done | Loop 093 |

## Completed Admin Routes

以下のAdmin routeは、`Authorization: Bearer` pathで `x-selected-tenant-id` を受け取り、active `staff_tenant_memberships` で再検証してから verified `AdminTenantContext.tenantId` を使う。

| route | group | AdminAction | tenant rule |
| --- | --- | --- | --- |
| `GET /api/admin/customers` | customer read | `view_customers` | verified tenant only |
| `GET /api/admin/customers/:customerId` | customer read | `view_customer_detail` | verified tenant + customer |
| `GET /api/admin/customers/:customerId/timeline` | customer read | `view_timeline` | verified tenant + customer |
| `POST /api/admin/customers/:customerId/reply` | customer write | `send_staff_reply` | verified tenant + customer |
| `POST /api/admin/customers/:customerId/ai-summary` | AI write | `create_ai_summary` | verified tenant + customer timeline |
| `POST /api/admin/customers/:customerId/ai-reply-draft` | AI draft | `create_ai_reply_draft` | verified tenant + customer timeline |
| `GET /api/admin/alerts` | alerts | `view_alerts` | verified tenant alerts |
| `POST /api/admin/alerts/check-unreplied` | alerts | `check_unreplied_alerts` | verified tenant customers + alerts |
| `POST /api/admin/alerts/notify-open` | alerts | `notify_open_alerts` | verified tenant alerts + MockStaffNotifier |
| `POST /api/admin/rag/search` | RAG | `search_rag` | verified tenant knowledge + `allowed_for_ai=true` |
| `POST /api/admin/rag/answer-draft` | RAG | `create_rag_answer_draft` | verified tenant knowledge + `allowed_for_ai=true` + MockAiProvider |

## Excluded Routes

以下はauthenticated_staff Admin route rollout対象外です。

| route | reason |
| --- | --- |
| `POST /api/dev/seed-demo-data` | dev-only utility。productionではdisabled。production hardeningは別Loop |
| `POST /api/line/webhook/:webhookSecret` | LINE webhook secret + signatureがtrust boundary。staff sessionではない |
| `GET /health` | health/check route。tenant-owned Admin dataではない |

## selectedTenantId Audit

Rules confirmed by route rollout tests:

- `selectedTenantId` は権限ではなくselector。
- `x-selected-tenant-id` は認証ではなくselector。
- raw `x-selected-tenant-id` をrepository、service、RAG search、AI provider、notifierへ渡さない。
- active membershipが1つなら未指定でそのtenantを使う。
- 複数active membershipsで未指定なら `tenant_selection_required`。
- membership外なら `tenant_membership_denied`。
- invalid formatならsession lookup前に `invalid_selected_tenant_id`。
- repository / service / provider / notifierへ渡すtenant idは verified `AdminTenantContext.tenantId` のみ。

## RAG Audit

Loop 092で確認したRAG固有条件:

- `POST /api/admin/rag/search` はverified tenantのknowledgeだけを返す。
- `POST /api/admin/rag/answer-draft` はverified tenantのsourceだけをMockAiProviderへ渡す。
- `allowed_for_ai=false` knowledgeはsearch結果にもanswer sourceにも使わない。
- 他tenant knowledgeをsourceへ混ぜない。
- OpenAI APIは呼ばない。
- LINEへ送信しない。

## Compatibility Kept

- local/test向け `dev_header` / `x-tenant-id` pathは維持。
- `dev_header` pathでは `x-selected-tenant-id` を無視する。
- default runtimeは `in_memory`。
- response shapeは維持。

## Loop 093 Production Gate

- production modeではAdmin routeの `x-tenant-id` / `dev_header` pathを拒否する。
- production modeでBearerなしのAdmin routeは `authenticated_staff_required`。
- production modeで `x-selected-tenant-id` 単体を認証扱いしない。
- production modeで `POST /api/dev/seed-demo-data` は `dev_route_not_allowed`。
- local/dev/testの `x-tenant-id` / `dev_header` 互換は維持する。

## Loop 094A RLS Draft

- `packages/db/migrations/0003_rls_core_tables.sql` をRLS SQL draftとして追加。
- staging applyは未実施。
- production readinessは引き続きNo-Go。

## Production Readiness

production readiness: No-Go

No-Go理由:

- Supabase Auth/JWT本接続未実装。
- RLS SQL draftは未apply・未検証。
- Admin UI selected tenant保存未実装。
- LINE real push gate未実装。
- OpenAI real API gate未実装。

## Next

Loop 095: RLS local/staging apply verification.

## Related Docs

- [Loop 093: Production Dev Header Rejection Auth/JWT Boundary](../11_codex_tasks/093_production_dev_header_rejection_auth_jwt_boundary.md)
- [Loop 094A: RLS SQL Draft Review](../11_codex_tasks/094a_rls_sql_draft_review.md)

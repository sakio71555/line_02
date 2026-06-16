# Production Hardening Split Plan

## Purpose

Loop 085でstaging拡張検証版100%相当に到達した後、productionへ進むためのRLS/Auth/JWT hardeningを小さいLoopに分けるためのrunbookです。

このrunbookは実装手順ではなく、分割計画です。RLS SQL、Auth/JWT接続、API差し替え、Supabase接続、LINE/OpenAI実接続はこのrunbookでは行いません。

## Current Status

| area | status |
| --- | --- |
| customers/messages | staging runtime smoke済み |
| alerts | staging runtime smoke済み |
| knowledge_pages/RAG | staging runtime smoke済み |
| staging milestone | staging拡張検証版100%相当 |
| default runtime | `in_memory` |
| RLS | RLS未実装 |
| Auth/JWT | Auth/JWT未接続 |
| selectedTenantId | Loop 087でtransport boundary実装。Loop 088で全route rollout plan整理。Loop 089でcustomer read routesへ展開済み。write/AI/alerts/RAG / UI保存 / production runtime hardeningは未完了 |
| production dev_header rejection | 未実装 |
| LINE real push | disabled/mock |
| OpenAI real API | mock |
| production readiness | production No-Go |

## Production No-Go Reasons

- RLS未実装。
- Auth/JWT未接続。
- selectedTenantId transport boundaryは実装済みだが、全Admin route rollout、UI保存、production runtime hardeningは未完了。
- production dev_header rejection未実装。
- `service_role` はserver-side onlyであり、RLS bypass権限のためproduction authorizationそのものにはしない。
- LINE real push gate未実装。
- OpenAI real API gate未実装。

## Hardening Order

```text
Loop 087 selectedTenantId transport boundary
Loop 088 authenticated runtime full route rollout plan
Loop 089 authenticated runtime read-only routes
Loop 090 authenticated runtime side-effect routes
Loop 091 production dev_header rejection
Loop 092 RLS SQL draft review
Loop 093 RLS local/staging apply test
Loop 094 production readiness gate
Loop 095 LINE real push gate
Loop 096 OpenAI real API gate
```

## selectedTenantId Rules

- `selectedTenantId` は権限ではなくselector。
- Loop 087では初期transportとして `x-selected-tenant-id` headerを採用した。
- `x-selected-tenant-id` はauthenticated_staff runtime用であり、dev_header用の `x-tenant-id` とは別物。
- staffのactive membershipで必ず再検証する。
- 複数tenant所属で未選択なら `tenant_selection_required`。
- membership外のtenantなら `tenant_membership_denied`。
- repositoryへ渡すのは確定済み `AdminTenantContext.tenantId` のみ。
- raw `selectedTenantId` をdata filterに使わない。

Loop 087 implementation note:

- `x-selected-tenant-id` は代表authenticated routeで検証済み。
- invalid formatは `invalid_selected_tenant_id`。
- dev_header pathでは `x-selected-tenant-id` を無視し、既存 `x-tenant-id` 互換を維持する。
- production dev_header rejectionは後続Loopで扱う。

Loop 088 planning note:

- 全Admin route rolloutへ進む前に、customer read、customer write/AI、alerts、RAG、production dev_header rejectionを分割した。
- route matrixでは `GET /api/admin/customers` だけがrepresentative authenticated routeで、他のAdmin routeはまだ `dev_header` 互換であることを明記した。
- selectedTenantIdは各routeでactive membership再検証を前提にし、repositoryへは検証済み `AdminTenantContext.tenantId` のみ渡す。
- dev seed、LINE webhook、health/check routesはauthenticated_staff Admin route rollout対象外。
- 詳細は [Loop 088 task doc](../11_codex_tasks/088_authenticated_staff_runtime_full_route_rollout_plan.md) と [Authenticated Staff Runtime Route Rollout](authenticated_staff_runtime_route_rollout.md) を参照する。

Loop 089 implementation note:

- customer read routesへauthenticated_staff runtimeを展開済み。
- 対象は `GET /api/admin/customers`、`GET /api/admin/customers/:customerId`、`GET /api/admin/customers/:customerId/timeline` のみ。
- `x-selected-tenant-id` はactive membershipで再検証し、customer read repository/serviceへは検証済み `AdminTenantContext.tenantId` のみ渡す。
- customer write/AI、alerts、RAG、production dev_header rejection、Auth/JWT、RLS SQLは未実装のまま。

## Auth/JWT Rules

- production Admin APIは `Authorization: Bearer` を必須にする。
- Bearer tokenから得たuser idを `staff_users.auth_user_id` へmappingする。
- inactive staffは拒否する。
- inactive membershipは拒否する。
- role guardは `staff_tenant_memberships.role` を使う。
- errorsは `authenticated_staff_required`、`session_expired`、`tenant_selection_required`、`tenant_membership_denied`、`permission_denied` などで明確に返す。

## production dev_header rejection Rules

- local/dev/testでは `dev_header` 互換を維持してよい。
- stagingではdummy検証用に限定し、authenticated runtime検証を優先する。
- productionでは `x-tenant-id` / `dev_header` を拒否する。
- productionでは `Authorization: Bearer` + authenticated staff contextを必須にする。
- expected errorは `dev_tenant_header_not_allowed`。

## service_role Rules

- `service_role` はserver-side only。
- browser / LIFF / Next client componentへ絶対に出さない。
- `.env` 値、project ref、DB URL、token、keyはdocsやdev logに書かない。
- staging smokeではPostgREST/Data API accessのために使う。
- productionではrepository境界に閉じ、tenant filter testとauditを併用する。
- `service_role` はRLS bypass前提なので、RLS/Auth/JWT/role guardの代替にしない。

## RLS Split

RLSは次の順で扱う。

1. RLS SQL draftをdocs/test fixtureとしてレビューする。
2. local/test DBまたはstaging test DBへ適用する。
3. tenant Aのcontextでtenant B rowがselectできないことを確認する。
4. insert/update/deleteもtenant境界を確認する。
5. `service_role` bypass時はAPI/repository tenant filter testと組み合わせる。
6. production applyはGo/No-Go gate後に別Loopで扱う。

## LINE Real Push Gate

LINE real pushはproduction hardening完了後の別Loop。

- `LINE_REAL_PUSH_ENABLED=true` を明示するまで送信しない。
- server-side LineClientだけがtokenを扱う。
- authenticated staff contextと `send_staff_reply` permissionを必須にする。
- stagingではdummy recipient / safe channelだけで確認する。
- failed send時にmessage保存しない既存方針を維持する。

## OpenAI Real API Gate

OpenAI real APIはproduction hardening完了後の別Loop。

- `AI_PROVIDER=openai` を明示するまで呼ばない。
- `OPENAI_API_KEY` はserver-side only。
- tenant scoped messages/knowledgeだけを入力にする。
- AI does not auto-send to LINE.
- summary / reply draft / RAG answer draftはstaff assistに限定する。
- cost / rate limit / logging / error handlingを別Loopで確認する。

## Stop Conditions

以下が必要になったら、このrunbookの範囲を超える。

- migration SQL変更。
- RLS SQL apply。
- Supabase本番接続。
- `.env` 作成・変更。
- API route / runtime / repository / UI変更。
- LINE API実送信。
- OpenAI API実呼び出し。
- 実顧客情報の投入。

## Next Loop

Recommended next loop: Loop 087: selectedTenantId transport boundary.

理由:

- production tenant決定の入口であり、Auth/JWTやRLSより先にselectorの扱いを固定できる。
- dev_headerをproductionで拒否する前に、authenticated runtimeが安全にtenantを確定できる必要がある。
- selectedTenantIdをpermissionと誤用しないためのtestを先に置ける。

## Related Docs

- [Loop 080: RLS/Auth Production Readiness Plan](../11_codex_tasks/080_rls_auth_production_readiness_plan.md)
- [Loop 085: Supabase Knowledge/RAG Runtime Boundary](../11_codex_tasks/085_supabase_knowledge_rag_runtime_boundary.md)
- [Loop 086: RLS/Auth/JWT Production Hardening Split Plan](../11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md)
- [RLS/Auth Production Readiness](rls_auth_production_readiness.md)
- [Supabase Staging Verification Final Record](supabase_staging_verification_final_record.md)

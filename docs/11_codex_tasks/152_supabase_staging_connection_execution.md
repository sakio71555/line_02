# Loop 152: Supabase Staging Connection Execution

## Goal

VPS review環境で、operator入力済みのSupabase staging secretを使い、`REPOSITORY_RUNTIME=supabase` の起動確認と最小read smokeを行う。

今回の目的は、Supabase runtimeを本番Goへ進めることではなく、staging接続時に安全にfail / rollbackできることを確認すること。

## Scope

- root-only helperでSupabase runtime secretをoperatorが入力する。
- API serviceへSupabase runtime EnvironmentFileを一時接続する。
- API restart後にdirect `/health` とHTTPS `/api/health` を確認する。
- `GET /api/admin/customers` のread smokeを確認する。
- 問題があれば即時 `in_memory` へrollbackする。
- rollback helperを作る。
- Node.js 20 runtimeでSupabase clientが起動できるようにserver-side WebSocket transport境界を補強する。
- docs / test / dev logを更新する。

## Out of Scope

- Supabase migration変更。
- RLS SQL変更。
- Supabase production接続。
- write smoke。
- real customer data利用。
- OpenAI実API。
- LINE real push/reply。
- Nginx / DNS / certbot変更。
- secret値、DB URL、Supabase project URL、LINE webhook path値、tokenの記録。
- production Go判定。

## Execution Summary

```txt
operator_secret_entry=completed_outside_codex
supabase_runtime_env_file=present_root_only
supabase_runtime_env_values_recorded=no
repository_runtime_switch_attempted=REPOSITORY_RUNTIME=supabase
initial_api_restart=failed
initial_failure_cause=Node.js 20 WebSocket transport missing
node20_supabase_client_transport_fix=implemented
vps_staging_validation_after_fix=success
api_direct_health_with_supabase=200
https_api_health_with_supabase=200
health_runtime_data_backend=supabase
health_secret_free=true
admin_customers_read_smoke=500
supabase_rest_read_preflight=failed_dns_or_connection
supabase_rest_read_preflight_details_recorded=no
write_smoke=not_performed
rollback_to_in_memory=completed
line_invalid_signature_after_supabase=401
supabase_ready=false
production_readiness=production_no_go
```

## Implementation Notes

Node.js 20.20.2環境ではSupabase clientのrealtime初期化がnative WebSocket不足で失敗した。server-side Supabase client boundaryで `ws` transportを明示することで、startup時にAPI serviceが落ちないよう補強した。

この変更はclient boundaryに限定し、repository/APIの仕様は変えていない。

## Rollback

Supabase runtimeのread smokeが500になったため、runtime drop-inを外してAPIを `in_memory` に戻した。

```txt
rollback_helper=/root/bin/amami-line-disable-supabase-runtime.sh
rollback_runtime_data_backend=in_memory
rollback_api_direct_health=200
rollback_https_api_health=200
line_invalid_signature_after_supabase=401
```

## Safety

- Supabase secret値はdocs、test、commit、reportへ記録しない。
- Supabase URL / DB URL / service role key / anon keyの値は記録しない。
- LINE webhook path値、LINE userId、message bodyは記録しない。
- production readinessは `production_no_go` のまま維持する。
- Supabase read smoke failureの接続先詳細は記録しない。

## Result

Supabase runtime startup自体はNode.js 20 WebSocket transport補強後に成功したが、admin customers read smokeが500になったため、Supabase runtimeは未採用とした。

```txt
supabase_runtime_startup_ready=true
supabase_read_smoke_ready=false
supabase_ready=false
current_runtime_after_loop=in_memory
production_readiness=production_no_go
```

## Next Loop Candidate

Loop 153: Supabase staging DNS / connection preflight and read-smoke remediation

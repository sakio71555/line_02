# Loop 021: Supabase Client Boundary

## Goal

Supabase repository実装に入る前に、server-side Supabase client作成とenv validationの安全な境界を追加する。

## Scope

- `packages/db/src/supabase/config.ts`
- `packages/db/src/supabase/client.ts`
- `packages/db/src/supabase/index.ts`
- `@amami-line-crm/db` からのexport
- `@supabase/supabase-js` の最小依存追加
- unit test
- READMEとdev log更新

## Out of scope

- Supabase repository implementation
- CustomerRepository / MessageRepository / AlertRepository / KnowledgePageRepository のSupabase実装
- 既存API routeへのSupabase client接続
- admin UI / LIFF UIからSupabase clientを直接使う実装
- migration SQL変更
- `.env` 作成・変更
- 実際のSupabase URLやkeyの記入
- 本番DB接続
- OpenAI API呼び出し
- LINE API呼び出し
- Webクロール
- RLS policy実装

## Added Boundary

追加したserver-side境界:

- `readSupabaseConfigFromEnv(env)`
- `SupabaseConfigError`
- `createSupabaseServiceRoleServerClient(config)`
- `createSupabaseAnonServerClient(config)`

`readSupabaseConfigFromEnv` はmodule import時には実行されません。明示的に呼び出したときだけ、渡されたenvまたは `process.env` をvalidationします。

## Env Names

今回 `.env` は作成・変更しません。必要なenv名と用途だけをdocsに残します。

- `SUPABASE_URL`: Supabase project URL。
- `SUPABASE_ANON_KEY`: RLS前提で使うanon key。
- `SUPABASE_SERVICE_ROLE_KEY`: server-side repository層だけで使うservice role key。
- `SUPABASE_DB_URL`: local migrationやlocal DB検証用。

## Service Role Key Policy

- `SUPABASE_SERVICE_ROLE_KEY` はserver-side限定。
- browser、LIFF、Next.js client componentへ渡さない。
- service role clientはrepository層などserver-onlyの境界からだけ作る。
- service roleを使う場合でも、repository methodは必ず `tenant_id` 条件を持つ。

## Browser / LIFF Rule

今回のclient boundaryはserver-side用途です。browser-like runtimeでserver clientを作ろうとした場合はエラーにします。admin UIやLIFFからSupabase clientを直接使う設計にはしません。

## Repository Connection Status

今回のLoopでは、Supabase client boundaryを既存API routeやrepositoryへ接続していません。既存runtimeは引き続きin-memory repositoryを使います。

## Test Requirements

- required envが欠けている場合にvalidation errorになる。
- fake envでconfigを作れる。
- service role server client boundaryを作れる。
- anon server client boundaryを作れる。
- importしただけではenv validationが走らない。
- client生成時に実ネットワーク接続しない。
- browser-like runtimeではserver clientを作れない。

## External API / DB Policy

- 本番Supabaseには接続しない。
- OpenAI API、LINE APIは呼ばない。
- migration applyやRLS実装は行わない。

## Next Loop

Loop 022: Supabase customer/message repository

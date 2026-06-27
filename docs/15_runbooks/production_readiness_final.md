# Production Readiness Final Gate

## Purpose

productionへ進む直前に、staging検証、Auth/JWT、RLS、selectedTenantId、Admin UI token forwarding、LINE real push gate、OpenAI real API gateを一括で確認し、Go / No-Goを正直に判定する。

このrunbookでは本物LINE送信、OpenAI API実呼び出し、production DB接続、production deploy、production smokeは行わない。

## Current State

| area | status |
| --- | --- |
| staging CRM smoke | customers/messages、alerts、knowledge/RAG、real Auth user smoke済み |
| RLS | staging apply済み、authenticated role/JWT claim相当smoke済み |
| production dev header rejection | 実装済み |
| selectedTenantId | Admin UI保存と `x-selected-tenant-id` forwarding済み |
| Admin token forwarding | Bearer token provider境界済み、token保存/表示なし |
| Admin login/session boundary | fake auth clientでsign-in / refresh / logout / token provider連携を検証済み |
| production Auth runtime gate | `AUTH_SESSION_VERIFIER=supabase` でSupabase Auth client境界とStaffAuthLookup境界を自動構成できる |
| LINE real push gate | 複数gate、confirmation、idempotency、fake transport検証済み |
| OpenAI real API gate | 複数gate、draft-only、fake transport検証済み |
| VPS deployment plan | `taiyolabel.site` DNS/VPS audit、nginx/systemd/env templates、rollback plan追加済み |
| production start/port boundary | API/Admin start scriptsと `127.0.0.1:8788` / `127.0.0.1:3002` 境界追加済み |
| VPS dry deployment preflight | command pack、rollback、No-Go checklist追加済み |
| VPS localhost mock deployment | localhost-only review配置を実施。Nginx/SSL/LINE/OpenAI/Supabase実接続なし |
| VPS localhost mobile UI review | Loop 110 mobile Admin UIをlocalhost-only review環境へ再配置し、SSH tunnel経由のmobile smoke済み。Nginx/SSL/DNS/public公開なし |
| Nginx include dry-run final gate | `sites-available` candidate配置済み。一時 `sites-enabled` symlinkでinclude tree全体の `nginx -t` 成功を確認後、symlink削除済み。reload/restart/certbot/DNS/public公開なし |
| Nginx reload rollback dry-run | `amami-line-crm.invalid` のまま一時enable + reloadを実施し、Host header smokeで `/api/health` が `404` となったためNo-Go。symlink削除後に `nginx -t` とrollback reloadを実行済み |
| Nginx Host header routing diagnosis | standalone localhost-only Nginx `127.0.0.1:18080` でcandidate route shapeを確認し、`/api/health` は `200`。diagnostic headerをcandidateへ追加。system Nginx reload/restart未実施 |
| Corrected Nginx candidate reload smoke | Loop 123でlatest active sourceに対して `amami-line-crm.invalid` のtemporary include + reload smokeを再実施。`/api/health` は `404`、diagnostic headerも absent。cleanup trapでsymlink削除、rollback reload済み |
| Nginx server selection diagnosis | Loop 124でreload/restartなしにinclude tree、temporary symlink + `nginx -T`、server block map、current active curlを確認。candidateはtemp `nginx -T` に出るが、current active curlはLoop 123同様 `/api/health=404` / diagnostic header absent |
| Domain/DNS/HTTPS readiness | placeholder templateとread-only preflight helper追加済み。Loop 118で `admin.taiyolabel.site` を検証/管理用ホストとしてread-only DNS確認済み |
| Nginx listen/server_name/default_server diagnosis | Loop 127でservice/PID/listener、active default server、reload reflection、curl variants、dedicated access_log付きprobeを確認。`/__amami_probe=204`、`X-Amami-Line-Crm-Probe: loop127`、`result=probe_reached`。probe symlink/candidate削除、rollback reload済み |
| Real domain decision gate | Loop 117でdomain decision packet、DNS provider checklist、production domain approval sheetを追加。Loop 118でA record一致を確認したが、DNS owner、rollback owner、ACME method、Nginx enable approver、certificate approver、LINE webhook approverは未確定 |
| Approved domain DNS inventory | `admin.taiyolabel.site A 160.251.174.201` が期待IPと一致。TXT未取得、DNS変更なし、Nginx reload/restartなし、certbotなし、external smokeなし |
| Domain / release approval record | Loop 119でdomain owner、DNS change owner、DNS rollback owner、Nginx enable approver、Certificate approver、LINE webhook approver、External smoke approver、Maintenance window、Final Go/No-Go ownerの承認欄を追加。全て未確定のためNo-Go |
| Release commit alignment | Loop 120でrelease candidate `5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db` とrollback candidate `176cb34fc6059ecabfb9826daacaabc2a437bebe` を記録。VPS release dirはcopy-basedで `.git` がないためfast-forward-only redeployは未実施 |
| Copy-based archive redeploy | Loop 121でrelease archiveを作成しVPS stagingへ転送。checksum、`.env*` 除外、install/lint/typecheck/buildは確認したが、staging full testが失敗したためactive deploy、systemd restart、Nginx reload/restartは未実施 |
| Active localhost-only copy-based redeploy | Loop 122でrelease candidate `2a9a746940b5f7a707af4c042bb9225d3dea258b` をVPS active `/var/www/amami-line-crm` へ反映。staging full validation、active backup、`.env*` preservation、active build、existing service restart、localhost-only smokeは成功。Nginx reload/restart、DNS、certbot、HTTPS、external smokeは未実施 |
| Public launch readiness bundle | Loop 129-133でACME方式選定dry-run、real-domain Nginx enable gate、LINE webhook URL dry-run、owner approval matrix、Supabase staging preflightを追加。すべてplanning/static testのみで、production readinessは `production_no_go` |
| Owner approval values intake | Loop 134でhuman approval intake formとclient / operations confirmation questionsを追加。owner/approver valuesは未入力、client-facing final hostnameはundecided、DNS/Nginx/HTTPS/LINE/Supabase/secret injectionは未承認 |
| Client-facing approval request package | Loop 135でクライアント/運用者向けの承認依頼パッケージを追加。`admin.taiyolabel.site` で確認する内容、DNS/HTTPS/LINE/Supabaseの承認事項、返信フォームを整理。実作業・外部接続なし |
| Approval docs finalization | Loop 136で承認値をdocsへ反映。`admin.taiyolabel.site` はreview/admin hostnameかつ現時点のfinal hostname。ACME方式は `HTTP-01`、fallbackは `DNS-01`。実作業・外部接続なし |
| HTTP-01 HTTPS enable bundle | Loop 137-139で `admin.taiyolabel.site` のHTTP bootstrap、HTTP-01 certbot、HTTPS enable、external smokeを実施。`https_ready_for_review=true` だがLINE/OpenAI/Supabase/secret injection未完了のためNo-Go |
| HTTPS review checklist | Loop 140でHTTPS主要route、HTTP redirect、certificate summary、HSTS未設定、VPS read-only状態を確認。certbot再実行、Nginx reload/restart、LINE/OpenAI/Supabase実接続なし |
| LINE webhook production dry-run | Loop 141でcandidate URL pattern、HTTPS API health、dummy webhook POST/GET/empty POSTの安全拒否を確認。実secret path未記録、LINE Developers Console未変更、LINE API未接続 |
| LINE webhook registration manual gate | Loop 142で人間がLINE Developers Consoleへ登録するための手順、pre/post checklist、secret非記録ルールをdocs化。CodexによるLINE Console変更、Webhook usage toggle、LINE API call、real pushなし |
| LINE runtime secret injection attempt | Loop 143でroot-only helperによりLINE runtime secretsをVPSへ入力したが、API EnvironmentFile接続後のdirect healthが失敗。drop-inをrollbackし、actual webhook dry-runとLINE Developers verificationは未実施 |
| LINE webhook 404 route diagnosis | Loop 144でLINE runtime EnvironmentFile接続後のhealth復旧を確認。actual webhook invalid-signatureは404で、`LINE_WEBHOOK_SECRET_PATH` が1セグメントrouteに一致しないshapeと診断。LINE Developers verification未実施 |
| LINE webhook secret path remediation | Loop 145Aで`LINE_WEBHOOK_SECRET_PATH`を1セグメント値へ更新。direct/HTTPS healthは200、invalid-signature webhook POSTは401、LINE Developers verificationはsuccess。LINE real receive event smokeとLINE real push/replyは未実施 |
| LINE real receive event smoke | Loop 146でWebhook ON後の実LINE message/text eventを受信。`LineBotWebhook/2.0` POSTは200、tenant scoped customer/message保存とAdmin timeline確認済み。LINE real push/replyは未実施 |
| production deploy/smoke | 未実施 |

## Go Conditions

controlled production enablementへ進むには、少なくとも以下が必要です。

- production envで `x-tenant-id` / dev_header が拒否される。
- production Admin routeが `Authorization: Bearer` を必須にする。
- production runtimeでfake verifierがdefaultにならない。
- production runtimeでSupabase Auth clientとStaffAuthLookupが安全に自動構成される。
- Admin login/session/token取得とrefresh/logoutが実装・検証済み。
- selectedTenantIdがactive membershipで再検証される。
- RLSがproduction apply前にstagingでverified済み。
- LINE real pushはflags、authenticated_staff、permission、tenant一致、confirmation、idempotencyなしでは動かない。
- OpenAI real APIはprovider/key/model/tenant AI setting/RAG source/draft-only gateなしでは動かない。
- secrets、project ref、DB URL、token、LINE userId、実顧客情報をdocs/logへ出さない。
- rollback/recovery手順がある。

## No-Go Conditions

以下が残る場合はproduction No-Goです。

- Admin UIの実Supabase Auth client注入とreal login/session/token smokeが未完了。
- real LINE送信UI、実transport、安全な送信先smoke、永続audit/idempotency storeが未完了。
- OpenAI real HTTP transport、本番接続、cost/rate limit運用、prompt logging policyが未完了。
- HTTPS review URL is reachable, but LINE webhook registration, LINE real push, Supabase real connection, OpenAI real API, and production secret injection are not complete.
- production接続やsecret表示が必要になる。
- LINE real receive event smokeは成功したが、LINE real push/reply、安全な送信先smoke、永続audit/idempotency storeが未完了。
- Supabase real connectionが未実施。
- production secret injectionが未実施。

## Auth/JWT

済み:

- `SupabaseAuthSessionVerifier` 境界。
- fake Supabase auth client test。
- staging real Auth user smoke。
- production fake verifier default禁止。
- `AUTH_SESSION_VERIFIER=supabase` と明示注入されたclient/lookupでruntimeを作るgate。
- production runtimeでSupabase Auth client境界とStaffAuthLookup境界を自動構成するfactory。
- required env不足やruntime例外をsecret/token/URLなしでsafe failureすること。
- Admin UI session controller境界。
- fake auth clientによるsign-in / session read / refresh / logout検証。
- Admin API helperへsession token providerを渡す境界。

未完了:

- 実Supabase Auth clientをAdmin UIへ注入すること。
- staging/production相当でreal login/session/token取得、refresh、logoutをsmokeすること。

## selectedTenantId

- `selectedTenantId` はpermissionではなくselector。
- Admin UIは非secretのtenant selectorだけをlocalStorage/cookieへ保存する。
- Admin API helperは `x-selected-tenant-id` を送る。
- API側authenticated_staff runtimeでactive membership再検証後のtenantだけをrepositoryへ渡す。

## RLS

- core RLS SQLはstaging apply済み。
- authenticated role/JWT claim相当smoke済み。
- staging real Auth user smokeで `auth.uid()` と `staff_users.auth_user_id` の接続をdummy dataで確認済み。
- service_roleはserver-side onlyで、RLS bypass前提のためproduction authorizationの代替にしない。

## Production Dev Header Rejection

- production modeではAdmin routeの `x-tenant-id` / dev_header pathを拒否する。
- `x-selected-tenant-id` 単体を認証扱いしない。
- dev seed routeはproductionで拒否する。

## Admin UI Token Forwarding

- Admin API helperはaccess token providerから受け取ったtokenを `Authorization: Bearer` headerへだけ載せる。
- tokenはlocalStorage、cookie、UI、docs、dev log、error messageへ保存・表示しない。
- production-style configでは開発用 `x-tenant-id` を送らない。
- Loop 105ではfake auth clientからsessionを読み、token provider経由でAdmin API helperへ渡す境界を追加した。
- 実Supabase Auth client注入とreal login smokeは後続Loopで扱う。

## LINE Real Push Gate

real push pathは以下がすべて必要です。

- `LINE_MESSAGING_ENABLED=true`
- `LINE_REAL_PUSH_ENABLED=true`
- authenticated_staff runtime
- `send_staff_reply` permission
- `x-selected-tenant-id` present and membership revalidated
- customer tenant match
- send confirmation
- idempotency key

Loop 103では本物LINE API送信は未実施。

## OpenAI Real API Gate

real OpenAI pathは以下がすべて必要です。

- `AI_PROVIDER=openai`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- tenant AI settingsでOpenAIと対象機能がenabled
- RAG answer draftではsourceあり
- draft-only
- auto-sendなし

Loop 103ではOpenAI API実呼び出しは未実施。

## Staging Smoke

stagingでは以下をdummy dataで確認済み。

- customers/messages Supabase runtime smoke。
- alerts Supabase runtime smoke。
- knowledge_pages/RAG Supabase runtime smoke。
- RLS staging apply。
- authenticated role / JWT claim相当RLS smoke。
- real Auth user smoke。

## VPS Deployment Plan

Loop 106で `taiyolabel.site` 向けVPS deployment plan and templatesを追加した。

追加済み:

- `admin.taiyolabel.site` -> `127.0.0.1:3002` planned route。
- `api.taiyolabel.site` -> `127.0.0.1:8788` planned route。
- nginx HTTP bootstrap / SSL templates。
- systemd templates。
- API/Admin env examples。
- SSL/certbot、secret投入、LINE webhook、rollback、No-Go runbook。

Loop 107でproduction start/port boundaryを追加した。

追加済み:

- `@amami-line-crm/api` の `start` はLoop 109のlocalhost-only reviewでは `tsx src/index.ts` を使う。compiled API runtimeは別Loopで整理する。
- `@amami-line-crm/admin` の `start` はLoop 109で `next start --hostname 127.0.0.1` へ補正。
- API production default `127.0.0.1:8788`。
- Admin production env `HOSTNAME=127.0.0.1` / `PORT=3002`。
- systemd templatesの `npx pnpm@10.12.1 --filter ... start`。

Loop 108でVPS dry deployment preflight command packを追加した。

追加済み:

- read-only audit command pack。
- backup command pack。
- release directory plan。
- secret injection checklist。
- dependency install / build plan。
- local service smoke plan。
- systemd registration plan。
- nginx HTTP bootstrap plan。
- certbot SSL plan。
- external smoke plan。
- LINE webhook URL plan。
- rollback runbook。
- No-Go checklist。

未実施:

- nginx config install / `nginx -t` / reload。
- certbot issue。
- production deploy / external smoke。
- production Supabase connection。
- Admin real login smoke。
- LINE webhook registration and real LINE smoke。
- OpenAI real smoke。

Loop 109でlocalhost-only mock deploymentを実施する。対象は `/var/www/amami-line-crm`、`/etc/amami-line-crm/*.env`、`amami-line-crm-api.service`、`amami-line-crm-admin.service`、`127.0.0.1:8788` / `127.0.0.1:3002` local smokeだけ。Nginx設定、`nginx -t`、reload、certbot、LINE webhook、LINE/OpenAI/Supabase実接続は未実施のまま維持する。

Loop 109 smokeで、API/Adminのstart境界とworkspace package exportsはVPS上の実build出力に合わせて補正した。これによりlocalhost-only reviewは前進するが、public production deployment remains No-Go until nginx/SSL/external smoke/Auth/LINE/OpenAI production gates are completed.

## Secret Handling

docs、dev log、test snapshot、error responseに以下を書かない。

- Supabase URL/key/project ref/DB URL/password。
- Authorization token。
- JWT secret。
- LINE channel token / secret。
- LINE userId実値。
- OpenAI API key。
- 実顧客情報。

## Rollback / Recovery

- production deploy前にDB backup、migration rollback/recovery、service role grant recovery、feature flag rollbackを確認する。
- LINE/OpenAI real enablementはfeature flagsで停止できる状態にする。
- production smokeはsafe tenant / safe recipient / dummy dataに限定する。

## Manual Checks Before Production Enablement

- production env valuesは値非表示でpresence/safetyだけ確認する。
- Admin loginで実Bearer tokenを取得し、表示しない。
- Loop 105時点ではfake auth client境界のみのため、real login smokeは未実施として扱う。
- VPS deploymentはLoop 109でlocalhost-only review配置まで進めるが、Nginx公開、SSL、external smoke、LINE webhook、LINE/OpenAI/Supabase実接続は未実施として扱う。
- Loop 110ではAdmin UIをモバイルファーストに刷新するが、API/Auth/RLS/LINE/OpenAI gateやVPS配置は変更しない。VPS localhost-only review環境は旧commitのままで、UI反映には別Loopの再配置が必要。
- Loop 111ではAdmin mobile UIをVPS localhost-only review環境へ再配置し、Browser smokeで横スクロールなし、主要routeの致命的エラーなし、localhost-only bind維持を確認した。Nginx公開、HTTPS、DNS、external smoke、LINE/OpenAI/Supabase実接続は未実施のまま。
- Loop 112ではNginx reverse proxy dry-run planとplaceholder exampleを追加し、`/etc/nginx/sites-available/amami-line-crm.conf` へcandidateを配置して `nginx -t` 成功を確認した。`sites-enabled` 作成、Nginx reload/restart、certbot、DNS変更、public公開は未実施のまま。
- Loop 113では一時的に `/etc/nginx/sites-enabled/amami-line-crm.conf` symlinkを作成し、Nginx include tree全体で `nginx -t` 成功を確認した。確認後symlinkは削除済みで、Nginx reload/restart、certbot、DNS変更、public公開は未実施のまま。
- Loop 114では `amami-line-crm.invalid` のまま一時的に `/etc/nginx/sites-enabled/amami-line-crm.conf` symlinkを作成し、`nginx -t` 後に `sudo systemctl reload nginx` を実行した。Host header smokeで `/api/health` が `404` となったためNo-Goとして扱い、symlink削除、`nginx -t`、rollback reloadを実行済み。実ドメイン、DNS、HTTPS/certbot、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 115では `127.0.0.1:18080` のstandalone localhost-only NginxでHost header routingを診断し、candidate route shapeでは `/api/health` が `200` になることを確認した。今後のserver block選択確認用に `X-Amami-Line-Crm-Proxy` diagnostic headerをcandidateへ追加したが、system Nginx reload/restart未実施、temporary symlink削除済み、real domain/DNS/HTTPS/public smokeは未実施。
- Loop 116では実ドメイン、DNS、HTTPS公開前のreadiness inventoryを追加した。canonical hostname、DNS provider、domain ownership、ACME method、certificate SAN、LINE webhook public URLは未決定のまま、placeholder-based HTTP/HTTPS examplesとread-only preflight helperだけを追加した。Nginx active config変更、reload/restart、certbot、DNS変更、external smokeは未実施。
- Loop 117ではreal domain decision and DNS provider confirmation planとして、domain decision packet、DNS provider checklist、production domain approval sheetを追加した。候補は分類したがcanonical hostnameは `unknown` のまま維持し、DNS query、DNS変更、Nginx active config変更、reload/restart、certbot、external smoke、LINE webhook登録は未実施。
- Loop 118では `admin.taiyolabel.site` を検証/管理用ホストとして承認し、TXTを除くread-only DNS confirmationを実施した。A recordは `160.251.174.201` と一致し、AAAA/CNAME/CAA/DSは未設定だった。NSから `dnsv.jp / GMO DNS` と推定したが、DNS ownerとrollback ownerは未確定。VPS read-only確認では `nginx -t` 成功、`sites-enabled` candidateなし、localhost API/Admin 200を確認した。Nginx reload/restart、certbot、DNS変更、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 119ではdomain and release approval recordとDNS/Nginx rollback owner checklistを追加した。`admin.taiyolabel.site` はreview/admin hostnameとして記録し、client-facing final hostnameはundecidedのまま。DNS owner、DNS rollback owner、Nginx enable approver、Certificate approver、ACME method、LINE webhook approver、Maintenance window、Final Go/No-Go ownerが未確定のため、actual enable、certbot、HTTPS、external smokeへ進めない。
- Loop 120ではrelease candidateとrollback candidateを明示し、VPS localhost-only review環境のsource整合を監査した。VPS deployed sourceは `176cb34fc6059ecabfb9826daacaabc2a437bebe` のままで、release directoryがcopy-basedかつ `.git` なしだったため `git pull --ff-only origin main` は未実行。evidenceは `/root/deploy-backups/amami-line-crm/loop120-20260626-174138` に保存し、direct API `/health`、Admin `/login` / `/select-tenant` / `/customers` / `/alerts` は既存sourceで `200`。Nginx reload/restart、DNS、certbot、HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 121ではcopy-based release archiveをVPS stagingへ転送し、checksum一致、`.env*` 除外、install、lint、typecheck、buildを確認した。しかしfull `test` がcopy-based/no-env-template/Node.js 20 compatibilityで失敗したため、active source更新、systemd restart、Nginx reload/restartへ進まずNo-Goとした。active sourceは `176cb34fc6059ecabfb9826daacaabc2a437bebe` のまま。evidenceは `/root/deploy-backups/amami-line-crm/loop121-20260626-180347` に保存した。
- Loop 121.1ではcopy-based staging test compatibility patchを追加し、patched archive `loop1211-20260626-185306` をVPS stagingで検証した。staging sourceは `.git` / `.env*` なしで、`install --frozen-lockfile`、`lint`、`typecheck`、`test`、`test:integration`、`build` が成功した。ただしactive source更新、systemd restart、Nginx reload/restart、DNS、certbot、HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施で、active sourceは `176cb34fc6059ecabfb9826daacaabc2a437bebe` のまま。
- Loop 122ではcopy-based release archiveを `.env*` / `.git` / `node_modules` なしで再作成し、VPS staging `/root/deploy-staging/amami-line-crm/loop122-extract-20260626-190958/source` で `install --frozen-lockfile`、`lint`、`typecheck`、`test`、`test:integration`、`build` を成功させた。active source backupは `/root/deploy-backups/amami-line-crm/loop122-20260626-190958/active-source-before.tar`、active source afterは `2a9a746940b5f7a707af4c042bb9225d3dea258b`。active `.env*` はファイル名のみ前後一致を確認し、既存 `amami-line-crm-api.service` / `amami-line-crm-admin.service` をrestart、API `/health` とAdmin `/login` / `/select-tenant` / `/customers` / `/alerts` はlocalhostで `200`。Nginx reload/restart、DNS、certbot、HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 123ではcorrected Nginx candidateを `amami-line-crm.invalid` のまま一時 `sites-enabled` symlinkでincludeし、`sudo nginx -t` と `sudo systemctl reload nginx` を実行した。Host header smokeは `/` が `200`、`/api/health` が `404` で、`X-Amami-Line-Crm-Proxy` diagnostic headerもabsentだったためNo-Go。cleanup trapでsymlink削除、rollback `nginx -t`、rollback reloadを実行し、direct API `/health` とAdmin `/login` は `200` へ戻った。実ドメイン、DNS、certbot/HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 124ではNginx server selectionをreload/restartなしで診断した。`nginx.conf` は `conf.d/*.conf` と `sites-enabled/*` をincludeし、temporary symlink中の `nginx -T` にはcandidate、`amami-line-crm.invalid`、`127.0.0.1:3002`、`127.0.0.1:8788`、`X-Amami-Line-Crm-Proxy`、`/api/health` mappingが出た。symlink削除後 `nginx -t` は成功。現在active curlは `/=200`、`/api/health=404`、`/login=404`、diagnostic header absentで、Loop 123と同じfailure shape。修正は未適用で、実ドメイン、DNS、certbot/HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 125ではdiagnostic専用probe server blockを一時作成し、`amami-line-crm.invalid` のHost headerがreload後にprobeへ到達するかを確認した。probeは `nginx -T` に出たが、reload smokeでは `/__amami_probe=404`、`X-Amami-Line-Crm-Probe` absent、`/=200`、`/api/health=404` となり、`server_selection=probe_not_reached`。probe symlinkとcandidateは削除済み、rollback `nginx -t` とrollback reloadは完了。real domain、`admin.taiyolabel.site` Host header、DNS変更、certbot/HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 127ではLoop 125をdedicated access_log付きprobeで再診断した。Nginx service active、MainPID `426936`、port 80はNginx、active default serverは `_`、reload後worker PID変更とjournal error count `0` を確認した。`amami-line-crm.invalid` の `/__amami_probe` は `204` と `X-Amami-Line-Crm-Probe: loop127` を返し、probe access logにも記録されたため `result=probe_reached`。probe symlink/candidateは削除済み、rollback reload済み。real domain、`admin.taiyolabel.site` Host header、DNS変更、certbot/HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 128では既存app Nginx candidateをrepo templateと照合し、差分がdry-run用 `server_name amami-line-crm.invalid` だけであることを確認した。一時 `sites-enabled` symlink、`nginx -t`、reload、localhost Host header smokeにより `/`, `/login`, `/select-tenant`, `/customers`, `/alerts`, `/api/health` が `200` かつ `X-Amami-Line-Crm-Proxy: amami-line-crm` を返したため `invalid_host_candidate_smoke=success`。symlink削除、rollback `nginx -t`、rollback reload、direct API/Admin smokeは完了済み。real domain、`admin.taiyolabel.site` Host header、DNS変更、certbot/HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 129ではACME HTTP-01 / DNS-01 selected-method dry-run planを追加した。`acme_method=undecided` のままで、certbot、ACME challenge、DNS変更、HTTPS、external smokeは未実施。
- Loop 130ではreal-domain Nginx enable approval gateを追加した。`real_domain_enable_status=no_go` のままで、`server_name admin.taiyolabel.site` 設定、real-domain symlink、Nginx reload/restart、external smokeは未実施。
- Loop 131ではLINE webhook production URL dry-run checklistを追加した。candidate URLは `https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>` だが登録未承認で、LINE Developers変更、LINE API call、LINE本番送信は未実施。
- Loop 132ではowner approval status matrixを追加し、Domain owner、DNS owner、Nginx enable approver、Certificate approver、ACME method approver、LINE webhook approver、External smoke approver、Maintenance window、Final Go/No-Go owner、Supabase staging approver、Production secret injection approverを `unknown / pending` のまま記録した。
- Loop 133ではSupabase staging connection preflight planを追加した。`supabase_staging_status=no_go` のままで、Supabase接続、psql接続、migration apply、RLS変更、service role key表示、DB URL表示は未実施。
- Loop 134ではhuman approval intake formとclient / operations confirmation questionsを追加した。owner/approver valuesは未入力で、Domain owner、DNS change owner、DNS rollback owner、Nginx enable approver、Certificate approver、ACME method approver、LINE webhook approver、External smoke approver、Maintenance window、Final Go/No-Go owner、Supabase staging approver、Production secret injection approver、client-facing final hostnameは未確定のまま。DNS変更、certbot/HTTPS、Nginx reload/restart、external smoke、LINE/OpenAI/Supabase実接続、production secret injectionは未実施。

## Loop 134 Minimal Go Conditions

### Loop 135: client-facing approval request package

- クライアント/運用者に送れる承認依頼パッケージがある。
- `admin.taiyolabel.site` がreview/admin hostnameであることを説明する。
- DNS / HTTPS / LINE / Supabase の承認事項を返信フォームにする。
- public/external actionは実行しない。

### Loop 136: ACME method decision after client approval

- ACME method approverが決まる。
- Certificate approverが決まる。
- DNS ownerが決まる。
- DNS rollback ownerが決まる。

### Loop 137: real-domain Nginx enable controlled smoke

- Nginx enable approverが決まる。
- Maintenance windowが決まる。
- External smoke approverが決まる。
- DNS rollback ownerが決まる。
- `admin.taiyolabel.site` を使う明示承認がある。
- rollback手順承認済み。

### Loop 138: LINE webhook dry-run with approved HTTPS URL

- LINE official account adminが決まる。
- LINE webhook approverが決まる。
- HTTPS URLが確定する。
- Webhook secret path方針が決まる。
- real pushはdisabledのまま確認する承認がある。

### Loop 139: Supabase staging secret injection checklist

- Supabase staging project ownerが決まる。
- staging project URLが用意される。
- secret injection ownerが決まる。
- service role keyを表示しない運用が決まる。
- RLS/migration確認者が決まる。
- rollback to `in_memory` 方針が決まる。
- selectedTenantIdのmissing/wrong/validを確認する。
- productionでdev headerが拒否されることを確認する。
- LINE/OpenAI flagsはoffのまま起動確認する。
- real enablementは別Loopの明示許可で行う。

## Loop 136 Approval Values Finalization

Loop 136では、以下をdocsへ反映した。

```txt
review_admin_hostname=admin.taiyolabel.site
client_facing_final_hostname=admin.taiyolabel.site
separate_final_hostname=no
dns_owner=Project owner / requestor
dns_change_owner=Project owner / requestor
dns_rollback_owner=Project owner / requestor
nginx_enable_approver=Project owner / requestor
certificate_approver=Project owner / requestor
acme_method_approver=Project owner / requestor
acme_method=HTTP-01
fallback_acme_method=DNS-01 if HTTP-01 fails
line_webhook_approver=Project owner / requestor
external_smoke_approver=Project owner / requestor
maintenance_window=now / approved by Project owner
final_go_no_go_owner=Project owner / requestor
supabase_staging_approver=Project owner / requestor
production_secret_injection_approver=Project owner / requestor
```

Loop 136で実施していないこと:

- DNS変更。
- certbot / ACME challenge / certificate issuance / HTTPS。
- Nginx active config変更、`sites-enabled`変更、reload/restart。
- external HTTP/HTTPS smoke。
- LINE webhook登録、LINE API、本番LINE送信。
- OpenAI実API。
- Supabase実接続、migration、RLS変更。
- production secret injection。
- `.env` 作成・変更・表示。

## Loop 137-139 HTTP-01 HTTPS Enable Bundle

Loop 137-139では、承認済みの `admin.taiyolabel.site` に対してHTTP bootstrap、HTTP-01 certbot、HTTPS enable、external smokeを実施した。

```txt
http_bootstrap=success
http_root=200
http_login=200
http_customers=200
http_alerts=200
http_api_health=200
http_acme_probe=200
certbot_http01_result=success
certificate_path=/etc/letsencrypt/live/admin.taiyolabel.site/fullchain.pem
certificate_subject=CN=admin.taiyolabel.site
certificate_issuer=Let's Encrypt YE1
certificate_not_before=Jun 27 03:56:29 2026 GMT
certificate_not_after=Sep 25 03:56:28 2026 GMT
https_root=200
https_login=200
https_customers=200
https_alerts=200
https_api_health=200
http_redirect=302 https://admin.taiyolabel.site/login
hsts_enabled=no
https_ready_for_review=true
production_readiness=production_no_go
Project owner email configured; value not recorded
```

Evidence:

```txt
evidence_dir=/root/deploy-backups/amami-line-crm/loop137-139-20260627-135350
rollback_executed=no
```

Loop 137-139で実施していないこと:

- DNS変更。
- TXT取得。
- DNS-01。
- wildcard証明書。
- firewall変更。
- LINE webhook登録。
- LINE real push。
- OpenAI実API。
- Supabase実接続。
- Supabase migration / RLS変更。
- production secret injection。
- `.env` 作成・変更・表示。
- private key内容表示。
- API/Auth/RLS/runtime/migration/UI変更。
- production Go decision。

## Loop 140 HTTPS Review Checklist

Loop 140では、`https://admin.taiyolabel.site` がレビュー用HTTPS URLとして短時間確認に使える状態かをread-onlyで再確認した。

```txt
https_root=200
https_login=200
https_select_tenant=200
https_customers=200
https_alerts=200
https_api_health=200
http_root_redirect=302 https://admin.taiyolabel.site/
http_login_redirect=302 https://admin.taiyolabel.site/login
certificate_subject=CN=admin.taiyolabel.site
certificate_issuer=Let's Encrypt YE1
certificate_not_before=Jun 27 03:56:29 2026 GMT
certificate_not_after=Sep 25 03:56:28 2026 GMT
hsts_enabled=no
nginx_test=success
sites_enabled=present
certificate_fullchain_exists=yes
certificate_private_key_presence_checked=yes
api_direct_health=200
admin_direct_login=200
certbot_rerun=no
nginx_config_change=no
nginx_reload_restart=no
private_key_content_displayed=no
private_key_path_recorded=no
production_readiness=production_no_go
https_ready_for_review=true
```

Loop 140で実施していないこと:

- DNS変更。
- certbot再実行。
- 証明書更新。
- Nginx設定変更。
- Nginx reload/restart。
- LINE webhook登録。
- LINE real push。
- OpenAI実API。
- Supabase実接続。
- Supabase migration / RLS変更。
- production secret injection。
- `.env` 作成・変更・表示。
- private key内容表示。
- API/Auth/RLS/runtime/migration/UI変更。
- production Go decision。

## Loop 141 LINE Webhook Production Dry-run

Loop 141では、LINE Developers Consoleへ本番Webhook URLを登録する前に、candidate URL patternとHTTPS経由のdummy webhook拒否動作を確認した。

```txt
method=POST
route=/api/line/webhook/:webhookSecret
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
actual_webhook_secret_path_recorded=no
signature_header=x-line-signature
signature_verification=verifyLineSignature
signature_body=raw request body
unknown_webhook_path=404
invalid_signature=401 for known path with configured channel secret
https_api_health=200
dummy_invalid_signature_post_status=404
dummy_get_status=404
dummy_empty_post_status=404
dummy_invalid_signature_accepted_2xx=no
dummy_invalid_signature_5xx=no
line_webhook_ready_for_registration=true
line_webhook_registration=not_done
line_api_call=not_done
line_real_push_status=disabled
nginx_test=success
sites_enabled=present
api_direct_health=200
admin_direct_login=200
production_readiness=production_no_go
https_ready_for_review=true
```

Loop 141で実施していないこと:

- LINE Developers Console変更。
- LINE webhook URL本登録。
- LINE API呼び出し。
- LINE本番送信。
- LINE channel secret表示。
- LINE access token表示。
- OpenAI実API。
- Supabase実接続。
- Supabase migration / RLS変更。
- production secret injection。
- `.env` 作成・変更・表示。
- private key内容表示。
- DNS変更。
- certbot再実行。
- Nginx設定変更。
- Nginx reload/restart。
- API/Auth/RLS/runtime/migration/UI変更。
- production Go decision。

## Loop 142 LINE Webhook Registration Manual Gate

Loop 142では、人間がLINE Developers Consoleで登録するためのmanual gateだけを追加した。CodexはLINE Developers Consoleを変更していない。

```txt
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
actual_webhook_secret_path_recorded=no
webhook_secret_path_real_value_managed_outside_docs=true
https_ready_for_review=true
line_webhook_ready_for_registration=true
https_api_health=200
route_path=/api/line/webhook/:webhookSecret
line_webhook_registration=manual_only_not_done_by_codex
line_developers_console_change_by_codex=no
line_webhook_registration_by_codex=no
line_webhook_usage_toggle_by_codex=no
line_api_call=no
line_real_push=no
line_channel_secret_displayed=no
line_access_token_displayed=no
openai_real_api=no
supabase_real_connection=no
production_secret_injection=no
env_display_or_mutation=no
dns_change=no
certbot_rerun=no
nginx_config_change=no
nginx_reload_restart=no
vps_command_execution=no
production_readiness=production_no_go
```

Manual registration steps are recorded in `docs/15_runbooks/line_webhook_registration_manual_gate.md`. The real `webhookSecretPath` is not recorded in docs, tests, commits, terminal output, or reports.

Post-registration verification remains a future Loop. The future verification should record only non-secret outcomes such as LINE Developers Console verification result, secret-safe API log arrival summary, absence of invalid signature / secret mismatch, absence of 5xx, and no LINE real push trigger.

Loop 142で実施していないこと:

- LINE Developers Console変更。
- LINE webhook URL本登録。
- Webhook usage toggle。
- LINE API呼び出し。
- LINE本番送信。
- LINE channel secret表示。
- LINE access token表示。
- OpenAI実API。
- Supabase実接続。
- Supabase migration / RLS変更。
- production secret injection。
- `.env` 作成・変更・表示。
- DNS変更。
- certbot再実行。
- Nginx設定変更。
- Nginx reload/restart。
- VPS command execution。
- API/Auth/RLS/runtime/migration/UI変更。
- production Go decision。

## Loop 143 LINE Runtime Secret Injection Attempt

Loop 143では、VPSにroot-only secret入力helperを作成し、operatorがCodex外terminalでLINE runtime secretsを入力した。値そのものはCodex、docs、tests、commit、reportに記録していない。

```txt
helper_path=/root/bin/amami-line-set-line-runtime-secrets.sh
line_runtime_env_file=/etc/amami-line-crm/line-runtime.env
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
dropin_path=/etc/systemd/system/amami-line-crm-api.service.d/20-line-runtime.conf
dropin_added=yes
api_service_restart_attempted=yes
api_service_active_after_restart=active
api_direct_health_after_line_runtime=000
api_direct_health_after_line_runtime_result=failed
dropin_removed=yes
api_service_restart_after_rollback=success
api_service_active_after_rollback=active
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
api_environment_files_after_rollback=/etc/amami-line-crm/api.env only
actual_webhook_invalid_signature_dry_run_result=not_performed
line_developers_verification_result=not_performed
actual_webhookSecretPath=not_recorded
line_real_push_reply=not_performed
production_readiness=production_no_go
```

Loop 143で実施していないこと:

- LINE API呼び出し。
- LINE real push/reply。
- actual webhook invalid-signature dry-run。
- LINE Developers Console verification。
- LINE secret/token/path値の表示または記録。
- OpenAI実API。
- Supabase実接続。
- Supabase migration / RLS変更。
- Nginx設定変更。
- Nginx reload/restart。
- certbot再実行。
- DNS変更。
- `.env` 作成・変更・表示。
- private key内容表示。
- API/Auth/RLS/runtime/migration/UI code変更。
- production Go decision。

## Loop 144 LINE Webhook 404 Route Diagnosis

Loop 144では、LINE runtime EnvironmentFileをAPI serviceへ再接続した状態でhealthを確認し、その後actual webhook invalid-signatureが404になる原因をsecret非表示で診断した。

```txt
line_runtime_environmentfile=connected
api_service=active
direct_health=200
https_api_health=200
process_env_line_keys=present
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
direct_api_prefixed_invalid_signature=404
direct_non_api_prefixed_invalid_signature=404
https_api_prefixed_invalid_signature=404
direct_api_prefixed_404_body=text/plain_404_not_found
webhookSecretPath_compare=yes
process_webhook_path_single_segment_safe=false
process_webhook_path_contains_slash=true
journal_sanitized_secret_like_remaining=false
classification=B_API_route_path_mismatch
root_cause=LINE_WEBHOOK_SECRET_PATH_contains_slash_and_does_not_match_single_segment_route
fix_applied=no_code_or_nginx_fix_in_this_loop
line_developers_verification_result=not_performed
line_real_push_reply=not_performed
production_readiness=production_no_go
```

Loop 144で実施していないこと:

- LINE Developers Console verification。
- LINE API呼び出し。
- LINE real push/reply。
- LINE secret/token/path値の表示または記録。
- OpenAI実API。
- Supabase実接続。
- Supabase migration / RLS変更。
- Nginx設定変更。
- Nginx reload/restart。
- certbot再実行。
- DNS変更。
- `.env` 作成・変更・表示。
- private key内容表示。
- API/Auth/RLS/runtime/migration/UI code変更。
- production Go decision。

## Final Judgment

`production_no_go`

理由:

- Admin UIのsession境界はfake auth clientで検証済みだが、実Supabase Auth client注入とreal login/session/token smokeが未完了。
- LINE本送信はgate済みだが、実送信UI、実transport、安全なrecipient smoke、永続audit/idempotency storeが未完了。
- OpenAI real API gateとfake transport境界は追加済みだが、実HTTP transport、本番接続、cost/rate limit運用は未完了。
- VPS deployment plan/templates、production start/port boundary、dry preflight command pack、localhost-only review配置、Nginx include dry-run final gate、Nginx reload rollback dry-run、Host header routing diagnosis、Domain/DNS/HTTPS readiness inventory、approved domain DNS inventory、domain/release approval record、release commit alignment record、copy-based archive deploy attempt、copy-based staging test compatibility patch、active localhost-only copy-based redeploy、corrected Nginx candidate reload smoke、Nginx server selection diagnosis、diagnostic probe server block reload smoke、listen/server_name/default_server diagnosis、corrected app Nginx candidate proxy remediation、public launch readiness bundle、approval docs finalization、HTTP-01 HTTPS enable bundle、HTTPS review checklist、LINE webhook production dry-run、LINE webhook registration manual gate、LINE runtime secret injection attempt、LINE webhook 404 route diagnosis、LINE webhook secret path remediation、LINE real receive event smokeは追加済み。Loop 146で実LINE受信は成功したが、LINE real push、Supabase staging接続、production secret injection、OpenAI実APIは未実施。

この判定は、Loop 146時点でもcontrolled production Goへ進むにはLINE real push、Supabase staging、production secret injection、OpenAI実API、追加Loop、人間承認が必要であることを示す。

## Loop 147-150 Production Integration Fast Lane

Loop 147-150では、Supabase persistence gate、OpenAI provider gate、LINE real reply/push controlled gate、LINE Official Account auto-response checklist、final production Go/No-Goを横断確認した。

```txt
production_integration_fast_lane=completed_as_no_go_review
https_ready_for_review=true
line_receive_ready=true
supabase_ready=false
openai_ready=false
line_reply_push_ready=false
official_account_auto_response_ready=false
production_readiness=production_no_go
```

判定:

- Supabase repositories and runtime bundle exist, but deployed API startup does not yet wire `REPOSITORY_RUNTIME=supabase` into `createApiApp()`.
- OpenAI provider and gate exist, but deployed API startup still defaults to mock and real HTTP transport/runtime wiring is incomplete.
- LINE real push gate and `RealLineClient` boundary exist, but deployed API startup still defaults to mock line client, so real reply/push smoke is not ready.
- LINE Official Account auto-response OFF is still pending before real reply/push smoke.
- Supabase/OpenAI/LINE secret helpers were not created in this Loop because runtime wiring must be remediated first.

No-Go理由:

```txt
supabase_runtime_startup_wiring_incomplete=true
openai_real_transport_runtime_wiring_incomplete=true
line_real_client_runtime_wiring_incomplete=true
official_account_auto_response_off_confirmed=false
final_operator_go_approval=false
production_readiness=production_no_go
```

未実施:

- Supabase secret injection.
- Supabase real connection.
- OpenAI real API.
- LINE real reply/push.
- Nginx config change.
- Nginx reload/restart.
- DNS change.
- certbot rerun.
- production Go decision.

次Loopは `Loop 151: production runtime wiring remediation plan` とする。

## Loop 151 Production Runtime Wiring Remediation

Loop 151では、deployed API startupへ進めるためのruntime wiringを実装した。

```txt
runtime_wiring_ready=true
repository_runtime_switch=implemented
ai_provider_runtime_switch=implemented
line_client_runtime_switch=implemented
default_data_backend=in_memory
default_ai_provider=mock
default_line_real_push_enabled=false
https_ready_for_review=true
line_webhook_verify_success=true
line_receive_ready=true
supabase_ready=false
openai_ready=false
line_reply_push_ready=false
production_readiness=production_no_go
```

実装内容:

- API startupが `REPOSITORY_RUNTIME` を読み、in-memory / Supabase repository bundleを選択する。
- API startupが `AI_PROVIDER` を読み、MockAiProvider / OpenAiProviderを選択する。
- API startupが `LINE_REAL_PUSH_ENABLED` を読み、MockLineClient / RealLineClient境界を選択する。
- `LINE_REAL_PUSH_ENABLED=false` では、access tokenが設定されていてもmock modeに留める。
- `/health` は外部接続に依存しない。

未実施:

- Supabase real connection。
- OpenAI real API smoke。
- LINE real push/reply。
- Nginx/DNS/certbot変更。
- secret/token/path/LINE userId/message bodyの表示または記録。

No-Go理由:

```txt
supabase_real_connection_smoke_pending=true
openai_real_api_controlled_smoke_pending=true
line_real_reply_push_single_message_smoke_pending=true
official_account_auto_response_off_confirmed=false
final_operator_go_approval=false
production_readiness=production_no_go
```

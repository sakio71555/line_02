# 333 Operations security and search remediation

## Goal

Operations workspaceの権限、tenant整合性、担当者一覧、横断検索のレビュー指摘4件を解消し、本番へ反映する。

## Changes

- authenticatedのoperations書き込みを禁止し、書き込みを権限検査済みAPIへ限定
- audit閲覧をowner/managerへ限定
- customer、consultation、alert、staff、mention参照のtenant整合性をDBで検証
- 担当者一覧をstaff_tenant_memberships基準のservice-role RPCへ変更
- 横断検索を全顧客対象のservice-role DB RPCへ変更し、先頭100件制限と本番N+1を解消

## Safety

- LINE送信、OpenAI API実行、顧客データ表示は行わない
- migrationとアプリは既存APIレスポンスを維持する
- lint、typecheck、test、integration test成功後に本番反映する

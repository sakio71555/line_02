# Task 341: Tenant staff management

## Goal

管理画面からテナントごとの担当者を安全に登録し、権限変更、利用停止、再開、招待再送を行えるようにする。

## Scope

- 設定画面に担当者登録と担当者一覧を追加する
- 管理者、責任者、担当者の3権限を日本語で選択できるようにする
- Supabase Authの招待と担当者レコードを紐付ける
- 初回ログイン時に招待待ちの所属を有効化する
- 担当者の利用停止と再開をテナント単位で行う
- 最後の有効な管理者は停止または権限降格できないようにする
- 操作を監査履歴へ保存する

## Safety Boundary

- 担当者管理APIは認証済みの管理者だけが利用できる
- すべての検索、作成、更新は選択中テナントへ限定する
- 招待用のservice role keyはAPI runtimeだけで使用し、管理画面へ返さない
- 同じメールアドレスの同時登録と、最後の管理者の同時更新をDB advisory lockで直列化する
- Auth連携済みかつ初回ログイン済みの担当者だけを日常運用の担当者候補へ表示する
- 招待失敗時は招待待ちの状態を明示し、再送で復旧できるようにする
- secret、招待URL、認証レスポンス本文をログやdocsへ記録しない

## Implementation Result

- `/settings/staff`に担当者登録フォームと担当者一覧を追加した
- 担当者名、メールアドレス、権限を登録し、Supabase Authの招待メールを送信できるようにした
- 招待が中断または重複した場合は、Authユーザーをメールアドレスで照合して安全に復旧する
- 初回ログイン時に招待待ちの所属を有効化し、利用可能な担当者として表示する
- 担当者名と権限の変更、利用停止、再開、招待メール再送を追加した
- 現在ログイン中の担当者自身の停止を防止した
- 最後の有効な管理者を失う更新をAPI、domain、DBの各境界で防止した
- 担当者管理DB関数をservice role専用にし、テナント境界と認証ユーザーの一意性をDBでも検証した
- 管理画面のAPIクライアント、表示状態、server action、レスポンシブUIを追加した

## Validation

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`
- 担当者管理、認証境界、APIクライアント、DB repositoryのfocused tests

## Deployment Boundary

- migrationを本番Supabaseへ1回だけ適用する
- copy-based runbookに従ってAPIとAdminをVPSへ反映する
- APIとAdminだけを再起動し、Nginx設定、DNS、HTTPS、certbot、packageは変更しない
- 本番反映後にservice status、API health、Admin root、未認証保護を確認する
- LINE実送信、OpenAI API実行、顧客データ変更は行わない

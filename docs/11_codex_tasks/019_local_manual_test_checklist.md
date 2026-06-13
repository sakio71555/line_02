# Loop 019: Local Manual Test Checklist

## Goal

現在までに実装したMVP相当のローカル確認手順を、開発者が迷わず実行できるrunbookとして整理する。

## Status

Implemented in Loop 019. This is documentation only; no product feature or runtime code was changed.

## Scope

- `docs/15_runbooks/local_manual_test_checklist.md`
- README link update
- dev loop docs update
- Obsidian dev log update

## Out of scope

- apps/api changes
- apps/admin changes
- packages changes
- DB schema changes
- Supabase connection
- LINE API connection
- OpenAI API connection
- LIFF implementation
- auth implementation
- package script changes
- new dependencies

## Acceptance Criteria

- API/Admin起動手順がある。
- demo seed投入手順がある。
- 管理画面の主要確認手順がある。
- 期待結果とトラブルシュートがある。
- 本番未対応範囲が明記されている。
- READMEからrunbookへ辿れる。
- dev logにLoop 019が追記されている。

## Test requirements

- `git diff --check`
- `npx pnpm@10.12.1 lint` if possible

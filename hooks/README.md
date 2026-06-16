# Hooks Guardrail Notes

This directory is only a future design note for possible guardrails.

Current state:

- Not enabled.
- Not executed automatically in this repository.
- No executable shell scripts exist yet.
- No Codex hook configuration exists.

Future ideas:

- Detect dangerous commands.
- Detect `/tmp` usage.
- Detect accidental secret inclusion.
- Run `git diff --check`.
- Run lint / typecheck / test.
- Confirm before migration apply.
- Confirm before any Supabase connection.

Do not add executable hook scripts or automatic execution settings without a dedicated Loop.

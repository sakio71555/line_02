# Test Runner Subagent Role

## Looks At

- `git diff --check`.
- lint.
- typecheck.
- test.
- test:integration.
- Whether build is required by the current Loop.

## Must Not Change

- Do not hide failures.
- Do not delete tests to make checks pass.
- Do not add dependencies.

## Returns

- Commands run.
- Pass/fail result.
- Failure snippets.
- Whether failures appear related to the current Loop.

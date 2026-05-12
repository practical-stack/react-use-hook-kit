---
name: git-atomic-commit
description: Analyze the current Git working tree and create purpose-based atomic commits. Use when the user asks to commit changes, split changes into atomic commits, make suitable commit units, preview commit grouping, or run a dry-run commit plan.
---

# Git Atomic Commit

Create commits by logical purpose, not by file count or directory. Preserve user changes, never revert unrelated work, and never skip hooks.

## Workflow

1. Gather context in parallel when possible:
   - `git status --short --branch`
   - `git diff --stat`
   - `git diff --staged --stat`
   - `git log -30 --oneline`
   - `git branch --show-current`
2. Detect commit style from recent history:
   - Language: Korean or English.
   - Shape: semantic (`feat: ...`), plain, or short imperative.
   - Announce the detected style before committing.
3. Inspect changed files and diffs enough to understand intent.
4. Group changes by logical purpose:
   - Same feature, fix, or refactor belongs in one commit, even across many files.
   - Different purposes belong in different commits, even in the same directory.
   - Tests belong with the implementation they verify.
   - Config and lockfile changes belong with the change that required them unless they are independently meaningful.
5. Present a concise commit plan with files and justification.
6. If the user requested `--dry-run` or preview only, stop after the plan.
7. Otherwise, stage and commit each group in dependency order.
8. Verify the final status and report created commits.

## Non-Negotiable Rules

- Do not create one commit per file or one commit per directory.
- Do not split tests from the implementation they cover.
- Do not use `--no-verify`.
- Do not amend pushed commits unless explicitly requested.
- Do not commit secrets, `.env` files, credentials, or tokens. Stop and warn if they appear.
- Do not revert or discard changes unless explicitly requested.
- Match the detected repository commit style instead of defaulting blindly to semantic commits.

## Commit Planning Heuristics

- Prefer fewer, clearer commits over mechanical splitting.
- Separate user-facing behavior, test infrastructure, documentation-only changes, and CI/release changes when they are independently reviewable.
- Keep generated lockfile changes with dependency/package manifest changes.
- If a clean atomic split is impossible because hunks in one file are interleaved, either use patch staging carefully or explain why a combined commit is the safer unit.

## Output

For a dry run:

```text
COMMIT PLAN (dry-run)
=====================
Would create N commits:

COMMIT 1: feat: add OAuth2 login
  - src/auth/oauth.ts
  - src/auth/oauth.test.ts
  Justification: implementation and tests for one feature
```

After committing:

```text
COMMIT SUMMARY
==============
Created N commits:

1. abc1234 feat: add OAuth2 login
   - src/auth/oauth.ts
   - src/auth/oauth.test.ts
```

Also report whether the working tree is clean.

---
name: git-draft-pr
description: Create or update GitHub draft pull requests with concise Summary and Test sections. Use when the user asks to create a PR, make a draft PR, update an existing PR body, or prepare a pull request from the current branch.
---

# Git Draft PR

Create a new draft PR or update an existing PR description with a concise body. Prefer GitHub CLI (`gh`) when available.

## Mode Selection

- Create mode: user asks to create a PR and does not specify update.
- Update mode: user says update, `-u`, `--update`, or provides an existing PR number to edit.

## Create Mode

1. Validate Git state:
   - `git status --porcelain`
   - `git branch --show-current`
   - `gh auth status`
2. Stop if uncommitted changes exist. Tell the user to commit changes first unless they explicitly asked you to commit them as part of the task.
3. Stop if the current branch is `main` or `master`; ask for or create a feature branch first depending on the user's request.
4. Gather PR content from commits and diffs. If the purpose or implementation cannot be inferred confidently, ask:
   - `이 PR의 목적이나 해결하려는 문제는 무엇인가요?`
   - `구체적으로 어떻게 구현했나요? 주요 변경사항은?`
5. Compose the body:

```markdown
## Summary
- ...

## Test
- [ ] ...
```

6. Push the branch if it has no upstream:

```bash
git push -u origin $(git branch --show-current)
```

7. Create a draft PR:

```bash
gh pr create --draft --title "$TITLE" --body "$BODY"
```

## Update Mode

1. Find the PR:
   - If a PR number was provided: `gh pr view <number> --json number,title,url,body`
   - Otherwise: `gh pr view --json number,title,url,body`
2. Gather updated context from commits, diffs, and user-provided requirements.
3. Show a concise preview of the new body before editing when the change is substantial.
4. Update the PR:

```bash
gh pr edit <number> --body "$BODY"
```

## Body Guidelines

- Keep the Summary focused on what changed and why.
- Keep the Test section to commands actually run, or clearly mark unchecked items.
- Mention UI screenshots only as a follow-up note when UI changes need visual evidence.
- Do not invent tests.
- If CI/release behavior changed, include the relevant workflow or command in Test.

## Safety

- Create PRs as draft by default.
- Do not create a ready-for-review PR unless the user explicitly asks.
- Do not edit an unrelated PR; verify the PR number, title, and URL first.
- Do not push uncommitted changes.

## Output

For create success:

```text
Draft PR created: https://github.com/user/repo/pull/123
```

For update success:

```text
PR #123 updated: https://github.com/user/repo/pull/123
```

For failure, state the reason and the next concrete action.

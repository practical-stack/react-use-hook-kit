---
name: git-branch-name
description: Generate conventional Git branch names from a task description, Korean or English request, work summary, or current Git changes. Use when the user asks for a branch name, wants to create a branch, or asks to infer a branch name from current work.
---

# Git Branch Name

Generate a concise, safe branch name and show the ready-to-run checkout command. Do not execute Git commands unless the user explicitly asks to create the branch.

## Workflow

1. Parse the user's description for action, target, and context.
2. If the request refers to "current work", "현재 작업", or similar, inspect local context with `git status --short`, `git diff --stat`, and available task context.
3. Detect the branch type.
4. Convert the core meaning into English kebab-case.
5. Return the branch name, command, and brief analysis.

## Branch Types

Use these triggers to choose the prefix:

| Type | Korean triggers | English triggers |
| --- | --- | --- |
| `feat` | 추가, 구현, 기능, 새로운, 만들기 | add, implement, feature, create, new |
| `fix` | 수정, 버그, 오류, 에러, 해결, 고치기 | fix, bug, error, resolve, correct |
| `chore` | 설정, 환경, 의존성, 빌드, 배포 | config, setup, build, deploy, dependency |
| `docs` | 문서, README, 주석, 설명 | doc, readme, comment, documentation |
| `refactor` | 리팩토링, 개선, 정리, 구조 | refactor, improve, cleanup, restructure |
| `test` | 테스트, 검증, 스펙 | test, spec, verify |
| `style` | 스타일, 포맷, 린트 | style, format, lint, css |

Default to `feat` only when the type is genuinely unclear.

## Naming Rules

- Format: `{type}/{kebab-case-description}`
- Use lowercase ASCII letters, numbers, and hyphens only.
- Translate Korean keywords to concise English.
- Keep the full branch name under 50 characters when practical.
- Keep 2-4 essential words after the slash.
- Remove filler words, punctuation, and implementation details that do not clarify the branch purpose.

## Examples

| Input | Output |
| --- | --- |
| `사용자 로그인 기능 추가` | `feat/user-login` |
| `fix: 버튼 클릭 안됨` | `fix/button-click` |
| `OAuth2 인증 구현` | `feat/oauth2-auth` |
| `README 업데이트` | `docs/update-readme` |
| `코드 정리 및 리팩토링` | `refactor/code-cleanup` |
| `API 응답 에러 수정` | `fix/api-response-error` |
| `테스트 케이스 추가` | `test/add-test-cases` |
| `CI/CD 파이프라인 설정` | `chore/cicd-pipeline` |

## Output

For a successful request:

```markdown
**Branch Name:** `{generated-branch-name}`

```bash
git checkout -b {generated-branch-name}
```

**분석:**
- Type: {detected-type}
- Keywords: {extracted-keywords}
```

If the type is ambiguous, state that `feat` was chosen as the default.

If there is no usable description and current work cannot be inferred, ask for a short task description.

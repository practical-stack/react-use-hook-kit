---
name: test-convention
description: Write or review unit tests following the project test convention. Use when writing tests, reviewing test code, or when the user asks to add/fix/refactor tests. Trigger on "write test for", "test this function", "add unit tests", "테스트 작성", "테스트 추가", "테스트 리뷰". Do NOT use for integration tests, E2E tests, or component rendering tests.
---

# Unit Test Convention

Use this skill for project unit tests only. Do not apply it to integration tests, E2E tests, or component rendering tests unless the user explicitly asks to adapt the convention.

This project uses Vitest. Use `vi.` helpers such as `vi.useFakeTimers()`, `vi.setSystemTime()`, and `vi.fn()`. If a reference example uses `jest.`, translate it to the Vitest equivalent.

## Workflow

1. Identify the target source or test file from the user's request.
2. Read the target source code and nearby existing tests before editing.
3. Check whether the target is unit-testable:
   - Time dependencies: `new Date()` or `Date.now()` inside the function body
   - API or network dependencies: `fetch`, axios, or other HTTP calls
   - Runtime dependencies: `window`, `document`, `localStorage`, or browser APIs
   - Global mutable state: module-level mutable variables or singletons
4. If hard dependencies are mixed with business logic, prefer extracting pure logic before testing. Do not add excessive mocks to force-test impure code.
5. Read the relevant references below, then write or review tests according to them.
6. For hooks or utilities that may run in both server and browser contexts, include SSR and DOM-context test coverage unless the target is explicitly environment-specific.
7. Run the narrowest relevant test command through the repo package manager. If the command is unclear, inspect `package.json` and existing scripts first.
8. Report what changed and which verification command ran.

## References

Reference docs live in `references/`. Load only the files needed for the current task.

- `references/0-unit-test-standard.md`: Testable function design, dependency separation, pure logic extraction.
- `references/1-unit-test-convention.md`: Test file naming, `describe`/`test` structure, Given-When-Then comments, matcher guidance.
- `references/2-time-test.md`: Time-dependent logic, fake timers, fixed system time, timezone-sensitive tests.
- `references/3-parameterized-test.md`: `test.each` patterns, table format, array format, boundary-focused cases.

## Core Rules

- Use `.test.ts` or `.test.tsx`; do not create `.spec` files.
- Use `test()`, not `it()`.
- Use `describe(functionName.name, ...)` when a function identifier is available.
- Import `act`, `hooksCleanup`, `renderHook`, and `renderHookServer` from `react-use-hook-kit-testing` for hook tests.
- Include `// given`, `// when`, and `// then` comments in each test block.
- Name tests by concrete use case, not vague behavior.
- Name the primary result variable `actual`.
- Prefer boundary values over redundant middle cases.
- For list-like inputs, cover 0, 1, and 2 items unless more cases are materially different.
- Use `test.each` for repeated input-output mappings.
- Use inline snapshots for complex object, array, JSON, or multi-line string assertions when that improves maintainability.
- Assert core behavior only; avoid fragile assertions on incidental fields.

## Time Tests

- Prefer passing time as an explicit parameter when designing testable pure functions.
- When the implementation intentionally reads current time, use `vi.useFakeTimers()` and `vi.setSystemTime()`.
- Always restore real timers with `vi.useRealTimers()` in `afterEach`.
- Use explicit timestamps and timezones for timezone-sensitive assertions.

## SSR and DOM Tests

- When a hook or utility depends on browser APIs, test both SSR-safe behavior and DOM behavior.
- SSR tests should verify that importing or invoking the target without `window`/`document` does not throw and returns the expected server-side fallback.
- DOM tests should verify the browser path with an appropriate DOM environment and realistic browser API setup.
- Keep SSR and DOM expectations in separate tests so each runtime contract is clear.
- If only one runtime applies, state that in the test or final report instead of adding artificial coverage.

## Review Checklist

After writing or reviewing tests, verify:

- [ ] The target logic is appropriate for a unit test.
- [ ] The test file extension is `.test.ts` or `.test.tsx`.
- [ ] Tests use `test()`, not `it()`.
- [ ] Hook tests import `act`, `hooksCleanup`, `renderHook`, and `renderHookServer` from `react-use-hook-kit-testing`.
- [ ] Tests use Given-When-Then comments.
- [ ] The main result variable is named `actual`.
- [ ] Repetitive cases use `test.each`.
- [ ] Time-dependent tests use Vitest fake timers and restore real timers.
- [ ] Hooks or utilities with browser/runtime branching cover both SSR and DOM behavior.
- [ ] Assertions focus on stable, meaningful behavior.
- [ ] The relevant test command was run or the reason it could not run is documented.

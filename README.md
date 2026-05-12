# react-hook-kit

Small, typed React hooks for everyday UI state. The package is built as an
ESM-first npm library with CommonJS compatibility and subpath exports for
tree-shaking.

## Install

```bash
pnpm add react-hook-kit
```

`react-hook-kit` has peer dependencies on `react >=17 <20` and
`react-dom >=17 <20`.

## Hooks

```ts
import {
  useBoolean,
  useCounter,
  useDebounce,
  useLocalStorage,
  useToggle,
} from 'react-hook-kit'
```

Each hook also has a subpath export:

```ts
import { useBoolean } from 'react-hook-kit/use-boolean'
import { useCounter } from 'react-hook-kit/use-counter'
import { useDebounce } from 'react-hook-kit/use-debounce'
import { useLocalStorage } from 'react-hook-kit/use-local-storage'
import { useToggle } from 'react-hook-kit/use-toggle'
```

## Workspace

```text
apps/
  docs/              Astro documentation app with interactive demos
  compat-react-17/   React 17 compatibility fixture
  compat-react-18/   React 18 compatibility fixture
  compat-react-19/   React 19 compatibility fixture
packages/
  react-hook-kit/    Publishable library package
```

## Commands

```bash
pnpm build             # tsdown JS bundles + TypeScript declarations
pnpm dev               # Astro docs app
pnpm test              # library tests + React compatibility fixtures
pnpm typecheck         # package, docs, fixtures, and scripts
pnpm lint              # oxlint
pnpm format            # oxfmt write
pnpm format:check      # oxfmt check
pnpm sheriff           # import boundary check
pnpm knip              # unused files/dependencies check
pnpm check             # full validation pipeline
```

## Build

The library builds from `packages/react-hook-kit` with tsdown:

- ESM output: `dist/*.js`
- CommonJS output: `dist/*.cjs`
- Type declarations: `dist/*.d.ts`

React and React DOM remain external peer dependencies.

## License

MIT

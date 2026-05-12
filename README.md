# turborepo-pnpm-typescript-mono-template

Lean Turborepo + pnpm + TypeScript monorepo with a TanStack Start app and a Next.js 16 app pre-wired, plus a shared `sample` package. Default scope: `@repo`.

## Quick start

```bash
git clone <this-repo> my-monorepo
cd my-monorepo
node scripts/init.mts                     # removes template-only docs/
pnpm install
pnpm check
pnpm --filter @repo/tanstack-sample dev   # port 3001
pnpm --filter @repo/next-sample dev       # port 3002
```

## What's included

| Tool            | Version | Purpose                                   |
| --------------- | ------- | ----------------------------------------- |
| Turborepo       | ^2.9    | Task runner and cache                     |
| pnpm workspaces | v10     | `hoist=false`, catalog protocol           |
| TypeScript      | 6.x     | Strict, ESNext, Bundler resolution        |
| Vitest          | ^4.1    | Unit testing                              |
| oxlint          | ^1.60   | Linting (drop-in ESLint replacement)      |
| oxfmt           | ^0.45   | Formatting (drop-in Prettier replacement) |
| Sheriff         | ^0.19   | Import boundary enforcement               |
| Knip            | ^6.4    | Dead code / unused dep detection          |
| TanStack Start  | ^1.168  | `apps/tanstack-sample` (React 19 + Vite)  |
| Next.js         | ^16.0   | `apps/next-sample` (App Router)           |

## Structure

```text
apps/
  tanstack-sample/   # TanStack Start app (port 3001)
  next-sample/       # Next.js 16 app (port 3002)
packages/
  sample/            # shared library, source-level export
scripts/
  init.mts           # one-shot: deletes template-only docs/
  remove-app.mts     # removes an app + prunes all references (accepts `all`)
  remove-all.mts     # wipes every app + package, resets configs to a bare shell
```

## Commands

```bash
pnpm lint              # oxlint
pnpm format            # oxfmt (write)
pnpm format:check      # oxfmt --check
pnpm typecheck         # turbo run typecheck
pnpm test              # turbo run test
pnpm sheriff           # architectural boundary check
pnpm knip              # unused exports / deps
pnpm check             # lint + format:check + typecheck + test + sheriff + knip
pnpm build             # turbo run build
pnpm dev               # turbo run dev
```

## Live Types

`@repo/sample` exports `./src/index.ts` directly, so apps consume the package source without a package build step. TypeScript uses `moduleResolution: "Bundler"` and `customConditions: ["@repo/source"]`; Vite also registers `@repo/source`. Next.js uses `transpilePackages: ['@repo/sample']` so workspace TypeScript under `node_modules` is compiled by Next.

See [docs/](docs/README.md) for the setup guide: pnpm workspace, TypeScript module resolution, Live Types, and Turborepo + tsconfig references.

## Customizing scope / package name

The template ships with `@repo/*`. To rename:

```bash
# Bulk rename via your editor's find-and-replace:
#   @repo/        -> @yourscope/
#   sample        -> yourpkg    (rename packages/sample/ dir too)
```

## Removing an unused app

```bash
node scripts/remove-app.mts tanstack-sample
node scripts/remove-app.mts next-sample
node scripts/remove-app.mts all
node scripts/remove-all.mts
pnpm install
pnpm check
```

## License

MIT

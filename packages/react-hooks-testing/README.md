# react-use-hook-kit-testing

Testing utilities for React hooks with client and SSR renderers.

## Why This Exists

Without this package, client-only hook tests can use `@testing-library/react`.
That works for simple cases:

```ts
import { renderHook } from '@testing-library/react'

const { result, unmount } = renderHook(() => useIsMounted())

expect(result.current()).toBe(true)

unmount()

expect(result.current()).toBe(false)
```

The problem starts when a hook needs SSR coverage. `@testing-library/react`
does not provide a hook API for this flow:

1. render the hook with `renderToString`
2. read the hook result produced during server render
3. hydrate that same hook with `hydrateRoot`
4. rerender only after hydration
5. keep client and server test result handling consistent

Without this package, each SSR hook test needs its own harness component,
result storage, optional error boundary, server markup container, hydration
root, and cleanup code. A minimal version looks like this:

```ts
import { createElement, useEffect, useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

let value: boolean | undefined

function TestComponent() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  value = hydrated

  return null
}

const markup = renderToString(createElement(TestComponent))

expect(value).toBe(false)

const container = document.createElement('div')
container.innerHTML = markup

hydrateRoot(container, createElement(TestComponent))
```

That setup is easy to get subtly wrong. It also does not capture thrown hook
errors as testable result values, does not keep a render history, and does not
give client and SSR tests the same result shape.

With this package, the same SSR lifecycle is explicit and reusable:

```ts
import { renderHookServer } from 'react-use-hook-kit-testing'

const { result, hydrate } = await renderHookServer(() => useHydrationState())

expect(result.value).toBe(false)

await hydrate()

expect(result.value).toBe(true)
```

For client tests, this package is not replacing `@testing-library/react`
because it cannot render hooks. It exists so client and SSR hook tests can use
the same model:

```ts
result.value
result.error
result.all
```

That means a hook library can test normal browser behavior, server render
behavior, hydration behavior, render errors, and result history with one API.

## Result Model

Both `renderHook` and `renderHookServer` return a `result` object with the same
shape:

```ts
result.value
result.error
result.all
```

`result.value` is the latest successful hook return value. It replaces the
`result.current` style used by `@testing-library/react`, but it is paired with
`result.error` so tests can distinguish successful renders from failed renders.

```ts
const { result } = await renderHook(() => useState('idle'))

expect(result.error).toBeUndefined()
expect(result.value[0]).toBe('idle')
```

When a hook throws during render, the error is stored on `result.error` instead
of forcing every test to create its own error boundary.

```ts
const expectedError = new Error('missing provider')

const { result } = await renderHook(() => {
  throw expectedError
})

expect(result.value).toBeUndefined()
expect(result.error).toBe(expectedError)
```

Without this package, testing a hook that throws during render usually requires
building an error boundary just for the test:

```tsx
import { Component, createElement, type PropsWithChildren, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

class TestErrorBoundary extends Component<
  PropsWithChildren<{
    onError(error: Error): void
  }>,
  {
    hasError: boolean
  }
> {
  state = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}

let actualError: Error | undefined

function TestComponent() {
  useRequiredContext()

  return null
}

const container = document.createElement('div')
const root = createRoot(container)

await act(async () => {
  root.render(
    createElement(
      TestErrorBoundary,
      {
        onError(error) {
          actualError = error
        },
      },
      createElement(TestComponent),
    ),
  )
})

expect(actualError).toEqual(new Error('RequiredContext provider is missing'))

await act(async () => {
  root.unmount()
})
```

That code is not testing the hook's business behavior directly. Most of it is
test infrastructure: error boundary state, error capture, root creation,
`act`, rendering, and cleanup. `renderHook` keeps that infrastructure inside
the testing utility:

```ts
const { result } = await renderHook(() => useRequiredContext())

expect(result.error).toEqual(new Error('RequiredContext provider is missing'))
```

This is useful for hooks that intentionally enforce usage constraints:

```ts
function useRequiredContext() {
  const value = useContext(RequiredContext)

  if (!value) {
    throw new Error('RequiredContext provider is missing')
  }

  return value
}

const { result } = await renderHook(() => useRequiredContext())

expect(result.error).toEqual(new Error('RequiredContext provider is missing'))
```

`result.all` contains every render result in order. Each entry is either a
successful value or an error:

```ts
type ResultValue<T> =
  | { value: T; error: undefined }
  | { value: undefined; error: Error }
```

This makes intermediate render behavior testable. For example, a rerender can
be asserted without losing the first value:

```ts
const { result, rerender } = await renderHook((value: string) => value, {
  initialProps: 'first',
})

await rerender('second')

expect(result.value).toBe('second')
expect(result.all).toEqual([
  { value: 'first', error: undefined },
  { value: 'second', error: undefined },
])
```

The same history is available for SSR tests. That matters because SSR tests can
have distinct phases: server render, hydration render, effect-driven updates,
and later client rerenders.

```ts
const { result, hydrate } = await renderHookServer(() => useHydrationState())

expect(result.value).toBe(false)

await hydrate()

expect(result.value).toBe(true)
expect(result.all).toEqual([
  { value: false, error: undefined }, // server render
  { value: false, error: undefined }, // hydration render
  { value: true, error: undefined }, // useEffect update after hydration
])
```

This example has three entries because `hydrate()` is followed by a `useEffect`
state update inside the hook. A hook without an effect-driven update may only
produce two entries: one for server render and one for hydration render.

The example does not call `act` directly because `hydrate()` wraps `hydrateRoot`
with this package's `act` helper internally. That means synchronous updates
scheduled by effects, such as `useEffect(() => setState(...), [])`, are reflected
after `await hydrate()`. It does not automatically finish asynchronous work that
an effect starts, such as `setTimeout`, network requests, or external promises.

The exact number of entries can vary with React behavior such as hydration and
effect-driven updates, so tests should assert the full history only when those
intermediate renders are part of the contract. For ordinary tests, prefer
asserting the latest `result.value` or `result.error`.

## Setup

```ts
import { hooksCleanup } from 'react-use-hook-kit-testing'
import { afterEach } from 'vitest'

afterEach(hooksCleanup)
```

## Client Hooks

```ts
import { act, renderHook } from 'react-use-hook-kit-testing'
import { useState } from 'react'

const { result } = await renderHook(() => useState('idle'))

await act(async () => {
  result.value[1]('ready')
})
```

## SSR Hooks

```ts
import { renderHookServer } from 'react-use-hook-kit-testing'

const { result, hydrate } = await renderHookServer(() => useIsMounted())

await hydrate()
```

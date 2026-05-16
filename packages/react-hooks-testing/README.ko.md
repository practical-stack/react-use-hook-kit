# react-use-hook-kit-testing

React hook을 client render와 SSR render 양쪽에서 테스트하기 위한 유틸리티입니다.

## 왜 필요한가

이 패키지가 없어도 client-only hook 테스트는 `@testing-library/react`로 할 수 있습니다.
간단한 경우에는 아래처럼 충분히 동작합니다.

```ts
import { renderHook } from '@testing-library/react'

const { result, unmount } = renderHook(() => useIsMounted())

expect(result.current()).toBe(true)

unmount()

expect(result.current()).toBe(false)
```

문제는 hook에 SSR 테스트가 필요해지는 순간부터입니다. `@testing-library/react`는
아래 흐름을 hook 단위 API로 제공하지 않습니다.

1. `renderToString`으로 hook을 server render 한다.
2. server render 중 만들어진 hook 결과를 읽는다.
3. 같은 hook을 `hydrateRoot`로 hydrate 한다.
4. hydration 이후에만 rerender 한다.
5. client 테스트와 server 테스트의 결과 처리 방식을 일관되게 유지한다.

이 패키지가 없다면 SSR hook 테스트마다 harness component, 결과 저장소,
필요하다면 error boundary, server markup container, hydration root, cleanup 코드를
직접 만들어야 합니다. 최소 형태만 적어도 아래 정도가 필요합니다.

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

이런 setup은 미묘하게 잘못 작성하기 쉽습니다. 또한 hook이 throw한 error를 테스트 가능한
result 값으로 저장하지 않고, render history도 남기지 않으며, client 테스트와 SSR
테스트가 같은 result shape을 쓰지도 못합니다.

이 패키지를 쓰면 같은 SSR lifecycle을 명시적이고 재사용 가능한 API로 테스트할 수 있습니다.

```ts
import { renderHookServer } from 'react-use-hook-kit-testing'

const { result, hydrate } = await renderHookServer(() => useHydrationState())

expect(result.value).toBe(false)

await hydrate()

expect(result.value).toBe(true)
```

client 테스트에서 이 패키지는 `@testing-library/react`가 hook을 render하지 못해서
대체하는 것이 아닙니다. 목적은 client hook 테스트와 SSR hook 테스트가 같은 모델을
쓰도록 만드는 것입니다.

```ts
result.value
result.error
result.all
```

즉 hook 라이브러리는 일반 browser 동작, server render 동작, hydration 동작,
render error, result history를 하나의 API로 테스트할 수 있습니다.

## Result 모델

`renderHook`과 `renderHookServer`는 모두 같은 shape의 `result` 객체를 반환합니다.

```ts
result.value
result.error
result.all
```

`result.value`는 가장 최근에 성공한 hook render의 반환값입니다. `@testing-library/react`의
`result.current`와 비슷한 역할을 하지만, `result.error`와 한 쌍으로 설계되어 성공한
render와 실패한 render를 구분할 수 있습니다.

```ts
const { result } = await renderHook(() => useState('idle'))

expect(result.error).toBeUndefined()
expect(result.value[0]).toBe('idle')
```

hook이 render 중 throw하면, 각 테스트에서 error boundary를 직접 만들 필요 없이
해당 error가 `result.error`에 저장됩니다.

```ts
const expectedError = new Error('missing provider')

const { result } = await renderHook(() => {
  throw expectedError
})

expect(result.value).toBeUndefined()
expect(result.error).toBe(expectedError)
```

이 패키지가 없다면 render 중 throw하는 hook을 테스트하기 위해 보통 테스트 전용
error boundary를 직접 작성해야 합니다.

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

이 코드는 hook의 비즈니스 동작 자체를 직접 테스트한다기보다, 대부분 테스트 인프라입니다.
error boundary state, error capture, root 생성, `act`, rendering, cleanup을 모두
테스트마다 구성해야 합니다. `renderHook`은 이 인프라를 테스트 유틸 내부에 숨깁니다.

```ts
const { result } = await renderHook(() => useRequiredContext())

expect(result.error).toEqual(new Error('RequiredContext provider is missing'))
```

이 방식은 사용 제약을 의도적으로 강제하는 hook을 테스트할 때 특히 유용합니다.

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

`result.all`은 모든 render 결과를 순서대로 담습니다. 각 항목은 성공한 값이거나 error입니다.

```ts
type ResultValue<T> =
  | { value: T; error: undefined }
  | { value: undefined; error: Error }
```

이 덕분에 중간 render 동작도 테스트할 수 있습니다. 예를 들어 rerender 후에도 첫 번째
값을 잃지 않고 검증할 수 있습니다.

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

같은 history는 SSR 테스트에서도 사용할 수 있습니다. SSR 테스트에는 server render,
hydration render, effect-driven update, 이후 client rerender처럼 서로 다른 phase가
있기 때문에 이 점이 중요합니다.

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

여기서 값이 3개인 이유는 `hydrate()`가 끝난 뒤에도 hook 내부 `useEffect`가 state를 한 번
더 변경하기 때문입니다. effect update가 없는 hook이라면 보통 server render 결과와
hydration render 결과만 남아 2개가 될 수 있습니다.

예시 코드에는 `act`가 직접 보이지 않지만, `hydrate()` 내부에서 `hydrateRoot`를 `act`로
감싸서 실행합니다. 그래서 `useEffect(() => setState(...), [])`처럼 effect 안에서 동기적으로
발생하는 update는 `await hydrate()` 이후에 반영됩니다. 단, `setTimeout`, network request,
외부 promise처럼 effect 안에서 시작한 비동기 작업까지 자동으로 끝내주지는 않습니다.

정확한 entry 개수는 hydration이나 effect-driven update 같은 React 동작에 따라 달라질 수
있습니다. 따라서 중간 render 자체가 테스트 대상의 계약일 때만 `result.all` 전체를 엄격히
검증하는 편이 좋습니다. 일반적인 테스트에서는 최신 `result.value`나 `result.error`를
검증하는 쪽을 권장합니다.

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

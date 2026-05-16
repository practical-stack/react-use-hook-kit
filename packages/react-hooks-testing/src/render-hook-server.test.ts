import { useEffect, useState } from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { hooksCleanup, renderHookServer } from './index.js'

describe(renderHookServer.name, () => {
  afterEach(async () => {
    await hooksCleanup()
  })

  test('renders a hook on the server before hydration', async () => {
    // given
    function useIsHydrated() {
      const [hydrated, setHydrated] = useState(false)

      useEffect(() => {
        setHydrated(true)
      }, [])

      return hydrated
    }

    // when
    const { result } = await renderHookServer(() => useIsHydrated())
    const actual = result.value

    // then
    expect(actual).toBe(false)
  })

  test('hydrates a server-rendered hook', async () => {
    // given
    function useIsHydrated() {
      const [hydrated, setHydrated] = useState(false)

      useEffect(() => {
        setHydrated(true)
      }, [])

      return hydrated
    }
    const { result, hydrate } = await renderHookServer(() => useIsHydrated())

    // when
    await hydrate()
    const actual = result.value

    // then
    expect(actual).toBe(true)
  })

  test('requires hydration before rerendering', async () => {
    // given
    const { rerender } = await renderHookServer((value: string) => value, {
      initialProps: 'first',
    })

    // when
    const actual = rerender('second')

    // then
    await expect(actual).rejects.toThrow('Cannot rerender before hydrating the hook.')
  })

  test('captures server render errors as hook results', async () => {
    // given
    const expectedError = new Error('server hook failed')

    // when
    const { result } = await renderHookServer(() => {
      throw expectedError
    })
    const actual = result.error

    // then
    expect(actual).toBe(expectedError)
    expect(result.value).toBeUndefined()
  })
})

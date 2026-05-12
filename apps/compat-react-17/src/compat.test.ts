import { act, renderHook } from '@testing-library/react-hooks'
import { describe, expect, it } from 'vitest'
import { useCounter } from 'react-hook-kit'
import { useBoolean } from 'react-hook-kit/use-boolean'

describe('React 17 compatibility', () => {
  it('runs root and subpath hook exports', () => {
    const counter = renderHook(() => useCounter())

    act(() => {
      counter.result.current.increment()
    })

    expect(counter.result.current.count).toBe(1)

    const boolean = renderHook(() => useBoolean())

    act(() => {
      boolean.result.current.setTrue()
    })

    expect(boolean.result.current.value).toBe(true)
  })
})

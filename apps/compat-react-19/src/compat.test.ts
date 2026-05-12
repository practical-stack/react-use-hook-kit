import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBoolean, useCounter } from 'react-hook-kit'
import { useToggle } from 'react-hook-kit/use-toggle'

describe('React 19 compatibility', () => {
  it('runs root and subpath hook exports', () => {
    const boolean = renderHook(() => useBoolean())

    act(() => {
      boolean.result.current.setTrue()
    })

    expect(boolean.result.current.value).toBe(true)

    const counter = renderHook(() => useCounter(2))

    act(() => {
      counter.result.current.decrement()
    })

    expect(counter.result.current.count).toBe(1)

    const toggle = renderHook(() => useToggle())
    expect(toggle.result.current.value).toBe(false)
  })
})

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBoolean, useCounter, useDebounce, useLocalStorage, useToggle } from './index.js'

describe('useBoolean', () => {
  it('sets boolean values with named helpers', () => {
    const { result } = renderHook(() => useBoolean())

    act(() => {
      result.current.setTrue()
    })
    expect(result.current.value).toBe(true)

    act(() => {
      result.current.toggle()
    })
    expect(result.current.value).toBe(false)

    act(() => {
      result.current.setValue(true)
    })
    expect(result.current.value).toBe(true)

    act(() => {
      result.current.setFalse()
    })
    expect(result.current.value).toBe(false)
  })
})

describe('useToggle', () => {
  it('toggles from the initial value', () => {
    const { result } = renderHook(() => useToggle(true))

    act(() => {
      result.current.toggle()
    })

    expect(result.current.value).toBe(false)
  })
})

describe('useCounter', () => {
  it('increments, decrements, resets, and clamps values', () => {
    const { result } = renderHook(() => useCounter(1, { max: 2, min: 0 }))

    act(() => {
      result.current.increment()
    })
    expect(result.current.count).toBe(2)

    act(() => {
      result.current.increment()
    })
    expect(result.current.count).toBe(2)

    act(() => {
      result.current.decrement(3)
    })
    expect(result.current.count).toBe(0)

    act(() => {
      result.current.reset()
    })
    expect(result.current.count).toBe(1)
  })
})

describe('useDebounce', () => {
  it('updates after the configured delay', () => {
    vi.useFakeTimers()

    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: {
        value: 'initial',
      },
    })

    rerender({ value: 'next' })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe('next')

    vi.useRealTimers()
  })
})

describe('useLocalStorage', () => {
  it('persists, reads, and removes values', () => {
    window.localStorage.clear()

    const { result } = renderHook(() => useLocalStorage('count', 1))
    expect(result.current.value).toBe(1)

    act(() => {
      result.current.setValue((current) => current + 1)
    })
    expect(result.current.value).toBe(2)
    expect(window.localStorage.getItem('count')).toBe('2')

    act(() => {
      result.current.removeValue()
    })
    expect(result.current.value).toBe(1)
    expect(window.localStorage.getItem('count')).toBeNull()
  })
})

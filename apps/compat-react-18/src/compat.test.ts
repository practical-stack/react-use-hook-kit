import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLocalStorage, useToggle } from 'react-use-hook-kit'
import { useDebounce } from 'react-use-hook-kit/use-debounce'

describe('React 18 compatibility', () => {
  it('runs root and subpath hook exports', () => {
    const toggle = renderHook(() => useToggle())

    act(() => {
      toggle.result.current.toggle()
    })

    expect(toggle.result.current.value).toBe(true)

    const debounce = renderHook(() => useDebounce('ready', 0))
    expect(debounce.result.current).toBe('ready')

    const storage = renderHook(() => useLocalStorage('compat-18', 'ok'))
    expect(storage.result.current.value).toBe('ok')
  })
})

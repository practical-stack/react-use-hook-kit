import { useCallback, useState } from 'react'

export interface UseCounterOptions {
  min?: number
  max?: number
}

export interface UseCounterReturn {
  count: number
  setCount: (value: number | ((previous: number) => number)) => void
  increment: (step?: number) => void
  decrement: (step?: number) => void
  reset: () => void
}

const clamp = (value: number, min?: number, max?: number): number => {
  if (typeof min === 'number' && value < min) {
    return min
  }

  if (typeof max === 'number' && value > max) {
    return max
  }

  return value
}

export function useCounter(initialValue = 0, options: UseCounterOptions = {}): UseCounterReturn {
  const { max, min } = options
  const [count, setCountState] = useState(() => clamp(initialValue, min, max))

  const setCount = useCallback(
    (value: number | ((previous: number) => number)) => {
      setCountState((current) => {
        const next = typeof value === 'function' ? value(current) : value
        return clamp(next, min, max)
      })
    },
    [max, min],
  )

  const increment = useCallback(
    (step = 1) => {
      setCount((current) => current + step)
    },
    [setCount],
  )

  const decrement = useCallback(
    (step = 1) => {
      setCount((current) => current - step)
    },
    [setCount],
  )

  const reset = useCallback(() => {
    setCount(initialValue)
  }, [initialValue, setCount])

  return {
    count,
    setCount,
    increment,
    decrement,
    reset,
  }
}

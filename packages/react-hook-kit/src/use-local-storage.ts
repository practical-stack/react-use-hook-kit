import { useCallback, useEffect, useState } from 'react'

export interface UseLocalStorageOptions<T> {
  deserialize?: (value: string) => T
  initializeWithValue?: boolean
  serialize?: (value: T) => string
}

export interface UseLocalStorageReturn<T> {
  value: T
  setValue: (value: T | ((previous: T) => T)) => void
  removeValue: () => void
}

const isBrowser = (): boolean => typeof window !== 'undefined'

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseLocalStorageOptions<T> = {},
): UseLocalStorageReturn<T> {
  const {
    deserialize = JSON.parse as (value: string) => T,
    initializeWithValue = true,
    serialize = JSON.stringify,
  } = options

  const getInitialValue = useCallback((): T => {
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue
  }, [initialValue])

  const readValue = useCallback((): T => {
    const fallbackValue = getInitialValue()

    if (!isBrowser()) {
      return fallbackValue
    }

    try {
      const storedValue = window.localStorage.getItem(key)
      return storedValue === null ? fallbackValue : deserialize(storedValue)
    } catch {
      return fallbackValue
    }
  }, [deserialize, getInitialValue, key])

  const [value, setStoredValue] = useState<T>(() => {
    return initializeWithValue ? readValue() : getInitialValue()
  })

  const setValue = useCallback(
    (nextValue: T | ((previous: T) => T)) => {
      setStoredValue((currentValue) => {
        const resolvedValue =
          typeof nextValue === 'function'
            ? (nextValue as (previous: T) => T)(currentValue)
            : nextValue

        if (isBrowser()) {
          try {
            window.localStorage.setItem(key, serialize(resolvedValue))
          } catch {
            // Ignore storage quota and privacy-mode failures.
          }
        }

        return resolvedValue
      })
    },
    [key, serialize],
  )

  const removeValue = useCallback(() => {
    const fallbackValue = getInitialValue()

    if (isBrowser()) {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // Ignore storage quota and privacy-mode failures.
      }
    }

    setStoredValue(fallbackValue)
  }, [getInitialValue, key])

  useEffect(() => {
    setStoredValue(readValue())
  }, [readValue])

  return {
    value,
    setValue,
    removeValue,
  }
}

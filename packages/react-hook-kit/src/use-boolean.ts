import { useCallback, useState } from 'react'

export interface UseBooleanReturn {
  value: boolean
  setValue: (value: boolean | ((previous: boolean) => boolean)) => void
  setTrue: () => void
  setFalse: () => void
  toggle: () => void
}

export function useBoolean(initialValue = false): UseBooleanReturn {
  const [value, setValue] = useState(initialValue)

  const setTrue = useCallback(() => {
    setValue(true)
  }, [])

  const setFalse = useCallback(() => {
    setValue(false)
  }, [])

  const toggle = useCallback(() => {
    setValue((current) => !current)
  }, [])

  return {
    value,
    setValue,
    setTrue,
    setFalse,
    toggle,
  }
}

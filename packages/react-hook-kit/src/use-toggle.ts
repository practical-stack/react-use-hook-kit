import { useCallback, useState } from 'react'

export interface UseToggleReturn {
  value: boolean
  setValue: (value: boolean | ((previous: boolean) => boolean)) => void
  toggle: () => void
}

export function useToggle(initialValue = false): UseToggleReturn {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => {
    setValue((current) => !current)
  }, [])

  return {
    value,
    setValue,
    toggle,
  }
}

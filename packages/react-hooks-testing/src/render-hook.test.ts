import { useEffect, useState } from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { act, hooksCleanup, renderHook } from './index.js'

describe(renderHook.name, () => {
  afterEach(async () => {
    await hooksCleanup()
  })

  test('renders a hook and stores its result history', async () => {
    // given
    type Props = {
      value: string
    }

    // when
    const { result, rerender } = await renderHook((props: Props) => props.value, {
      initialProps: {
        value: 'first',
      },
    })
    await rerender({
      value: 'second',
    })

    // then
    expect(result.value).toBe('second')
    expect(result.error).toBeUndefined()
    expect(result.all).toEqual([
      {
        value: 'first',
        error: undefined,
      },
      {
        value: 'second',
        error: undefined,
      },
    ])
  })

  test('updates state inside async act', async () => {
    // given
    const { result } = await renderHook(() => useState('idle'))
    expect(result.error).toBeUndefined()
    if (result.error) {
      throw result.error
    }
    const [, setStatus] = result.value

    // when
    await act(async () => {
      setStatus('ready')
    })
    const actual = result.value[0]

    // then
    expect(actual).toBe('ready')
  })

  test('captures render errors as hook results', async () => {
    // given
    const expectedError = new Error('broken hook')

    // when
    const { result } = await renderHook(() => {
      throw expectedError
    })
    const actual = result.error

    // then
    expect(actual).toBe(expectedError)
    expect(result.value).toBeUndefined()
  })

  test('unmounts registered hooks with hooksCleanup', async () => {
    // given
    let unmountCount = 0
    await renderHook(() => {
      useEffect(() => {
        return () => {
          unmountCount += 1
        }
      }, [])

      return null
    })
    await renderHook(() => {
      useEffect(() => {
        return () => {
          unmountCount += 1
        }
      }, [])

      return null
    })
    // when
    await hooksCleanup()
    const actual = unmountCount

    // then
    expect(actual).toBe(2)
  })
})

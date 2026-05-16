import type { JSXElementConstructor, ReactNode } from 'react'
import type { RootOptions } from 'react-dom/client'
import { cleanupAdd, cleanupRemove } from './cleanup.js'

/**
 * hook render 한 번의 결과를 나타냅니다.
 *
 * hook이 정상적으로 값을 반환하면 `value`에 결과가 들어가고 `error`는 `undefined`가
 * 됩니다. 반대로 render 중 error boundary가 잡은 오류나 server render에서 발생한
 * 오류는 `error`에 저장되고 `value`는 `undefined`가 됩니다.
 *
 * 이 union 형태 덕분에 테스트는 성공 결과와 실패 결과를 같은 history 안에서 순서대로
 * 다룰 수 있습니다.
 */
export type ResultValue<T> =
  | {
      readonly value: T
      readonly error: undefined
    }
  | {
      readonly value: undefined
      readonly error: Error
    }

/**
 * 현재 hook 결과와 전체 render history를 함께 노출하는 result 객체입니다.
 *
 * `value`와 `error`는 가장 최근 render 결과를 바로 읽기 위한 shortcut이고, `all`은
 * 초기 render부터 rerender, hydration 이후 update까지 누적된 모든 결과를 순서대로
 * 확인하기 위한 배열입니다. 중간 render가 테스트 계약에 포함되는 hook에서는 `all`을
 * 사용하고, 일반적인 테스트에서는 최신 `value` 또는 `error`만 검증하면 됩니다.
 */
export type ResultValues<T> = ResultValue<T> & {
  readonly all: Array<ResultValue<T>>
}

/**
 * hook renderer를 만들 때 전달하는 공통 옵션입니다.
 *
 * `initialProps`는 첫 render에 넘길 props이고, `wrapper`는 Context Provider처럼
 * 테스트 대상 hook을 감싸야 하는 React component입니다. `onCaughtError`와
 * `onRecoverableError`는 React root 생성 또는 hydration 과정에서 React가 제공하는
 * error callback을 그대로 전달하기 위한 옵션입니다.
 */
export type RendererOptions<Props> = {
  initialProps?: Props
  wrapper?: JSXElementConstructor<{ children: ReactNode }>
} & Pick<RootOptions, 'onCaughtError' | 'onRecoverableError'>

/**
 * 실제 renderer 구현이 hook harness에 전달하는 bridge 객체입니다.
 *
 * `callback`은 사용자가 `renderHook(() => ...)` 또는 `renderHookServer(() => ...)`에
 * 넘긴 테스트 대상 hook 실행 함수입니다. `setValue`와 `setError`는 harness가 hook
 * 실행 결과를 result store에 기록할 때 사용합니다.
 */
export type RendererProps<Props, Result> = {
  callback(props: Props): Result
  setValue(value: Result): void
  setError(error: Error): void
}

/**
 * DOM renderer와 server renderer가 공통으로 구현해야 하는 lifecycle입니다.
 *
 * `render`는 최초 render를 수행하고, `rerender`는 같은 hook instance에 새 props를
 * 반영하며, `unmount`는 React root를 정리합니다. 각 단계는 React `act` 또는 hydration
 * 같은 비동기 작업을 포함할 수 있으므로 모두 `Promise`를 반환합니다.
 */
export type Renderer<Props> = {
  render(props: Props | undefined): Promise<void>
  rerender(props: Props | undefined): Promise<void>
  unmount(): Promise<void>
}

/**
 * renderer별 lifecycle 구현을 생성하는 factory 타입입니다.
 *
 * client renderer는 `createRoot` 기반 lifecycle을, server renderer는
 * `renderToString`과 `hydrateRoot` 기반 lifecycle을 이 형태로 제공합니다.
 * `createHookRenderer`는 이 차이를 몰라도 result 저장, rerender props 관리, cleanup
 * 등록을 같은 방식으로 처리할 수 있습니다.
 */
export type RendererFactory<Props, Result, TRenderer extends Renderer<Props>> = (
  rendererProps: RendererProps<Props, Result>,
  options?: RendererOptions<NoInfer<Props>>,
) => TRenderer

/**
 * hook render 결과를 저장하고 조회하는 작은 store를 만듭니다.
 *
 * renderer는 hook을 실행할 때마다 `setValue` 또는 `setError`를 호출하고, 테스트 코드는
 * 반환된 `result` 객체를 통해 최신 결과와 전체 history를 읽습니다. `all` getter는
 * 내부 배열을 직접 노출하지 않도록 매번 복사본을 반환합니다.
 */
function createResultStore<T>() {
  const results: Array<ResultValue<T>> = []

  const result = {
    get all() {
      return [...results]
    },
    get value() {
      return results.at(-1)?.value
    },
    get error() {
      return results.at(-1)?.error
    },
  } as ResultValues<T>

  return {
    result,
    setValue(value: T) {
      results.push(Object.freeze({ value, error: undefined }))
    },
    setError(error: Error) {
      results.push(Object.freeze({ value: undefined, error }))
    },
  }
}

/**
 * renderer별 구현을 공통 `renderHook` API 형태로 감싸는 factory입니다.
 *
 * 이 함수는 DOM과 SSR renderer가 공유하는 흐름을 담당합니다. 사용자의 hook callback과
 * result store를 renderer에 연결하고, 최초 render를 수행한 뒤, `rerender`와 `unmount`
 * helper를 만들어 반환합니다. renderer가 `hydrate`처럼 추가 메서드를 제공하는 경우
 * 그 메서드도 결과 객체에 그대로 포함됩니다.
 *
 * 최초 render가 끝나면 `unmountHook`을 cleanup registry에 등록합니다. 사용자가 직접
 * `unmount`를 호출하면 먼저 registry에서 제거한 뒤 unmount하므로, 이후
 * `afterEach(hooksCleanup)`이 실행되어도 같은 hook instance가 중복 정리되지 않습니다.
 */
export function createHookRenderer<Props, Result, TRenderer extends Renderer<Props>>(
  createRenderer: RendererFactory<Props, Result, TRenderer>,
) {
  return async (callback: (props: Props) => Result, options?: RendererOptions<Props>) => {
    const { result, setValue, setError } = createResultStore<Result>()
    let currentProps = options?.initialProps
    const { render, rerender, unmount, ...rendererRest } = createRenderer(
      {
        callback,
        setValue,
        setError,
      },
      options,
    )

    await render(currentProps)

    /**
     * 다음 props로 같은 hook instance를 다시 render합니다.
     *
     * 인자를 생략하면 마지막으로 사용한 props를 유지합니다. 이 동작은 state update 후
     * wrapper나 renderer 상태는 유지하면서 hook callback만 다시 평가하고 싶을 때 쓰는
     * `renderHook` 계열 API의 rerender semantics입니다.
     */
    const rerenderHook = async (nextProps?: Props) => {
      currentProps = nextProps ?? currentProps
      await rerender(currentProps)
    }

    /**
     * 이 hook instance를 수동으로 unmount합니다.
     *
     * 먼저 cleanup registry에서 자기 자신을 제거한 다음 renderer별 unmount를 실행합니다.
     * 이렇게 해야 수동 unmount와 test-level `hooksCleanup`이 같은 React root를 두 번
     * 정리하지 않습니다.
     */
    const unmountHook = async () => {
      cleanupRemove(unmountHook)
      await unmount()
    }

    cleanupAdd(unmountHook)

    return {
      result,
      rerender: rerenderHook,
      unmount: unmountHook,
      ...rendererRest,
    }
  }
}

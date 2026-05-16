import { Component, createElement } from 'react'
import type { JSXElementConstructor, PropsWithChildren, ReactNode } from 'react'
import type { RendererProps } from './create-hook-renderer.js'

/**
 * hook 실행 중 발생한 render error를 result store에 전달하기 위한 error boundary
 * props입니다.
 *
 * `onError`는 잡힌 error와 boundary 상태를 되돌리는 `reset` 함수를 함께 받습니다.
 * harness는 이 `reset` 함수를 보관해 두었다가 다음 render 직전에 호출해서, 한 번
 * error가 난 hook도 이후 rerender에서 다시 평가될 수 있게 합니다.
 */
type ErrorBoundaryProps = PropsWithChildren<{
  onError(error: Error, reset: () => void): void
}>

/**
 * error boundary가 현재 fallback 상태인지 나타냅니다.
 *
 * React error boundary는 error를 잡은 뒤 state를 바꿔 children을 다시 render하지
 * 않으므로, 다음 hook render를 시도하려면 이 값을 다시 `false`로 reset해야 합니다.
 */
type ErrorBoundaryState = {
  hasError: boolean
}

/**
 * hook render 중 throw된 error를 잡아 테스트 result로 기록하는 boundary입니다.
 *
 * 이 패키지는 hook이 throw한 error를 테스트 자체의 예외로 바로 터뜨리지 않고
 * `result.error`에 저장합니다. 그래야 사용 제약을 의도적으로 검증하는 hook도
 * `expect(result.error)` 형태로 테스트할 수 있습니다.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
  }

  /**
   * React가 render phase error를 감지했을 때 fallback 상태로 전환합니다.
   *
   * 여기서는 별도 fallback UI를 보여 주지 않고 `render`에서 `null`을 반환하게 하여,
   * 테스트 대상 hook 실행을 중단한 상태로 유지합니다.
   */
  static getDerivedStateFromError(): ErrorBoundaryState {
    return {
      hasError: true,
    }
  }

  /**
   * 이전 render error 상태를 해제합니다.
   *
   * harness는 다음 render를 시작하기 전에 이 함수를 호출합니다. 이렇게 해야 error를
   * 낸 이전 render 때문에 boundary가 계속 `null`만 반환하는 상태에 머물지 않습니다.
   */
  reset = () => {
    this.setState({
      hasError: false,
    })
  }

  /**
   * 잡힌 error를 harness로 전달합니다.
   *
   * `reset` 함수도 함께 넘겨서 harness가 다음 render 직전에 boundary 상태를 복구할 수
   * 있게 합니다. 실제 error 기록은 result store를 알고 있는 harness가 담당합니다.
   */
  override componentDidCatch(error: Error): void {
    this.props.onError(error, this.reset)
  }

  /**
   * 정상 상태에서는 children을 render하고, error 상태에서는 아무것도 render하지 않습니다.
   *
   * 테스트 유틸은 DOM 출력이 아니라 hook callback의 반환값과 error history가 목적이므로
   * 별도 fallback UI가 필요하지 않습니다.
   */
  override render(): ReactNode {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}

/**
 * hook callback을 React component tree 안에서 실행하는 harness를 만듭니다.
 *
 * React hook은 component body 안에서만 호출할 수 있으므로, renderer는 이 harness가
 * 반환하는 element factory를 React root에 render합니다. 내부 `TestComponent`가
 * 사용자의 hook callback을 실행하고, 성공하면 `setValue`, throw하면 `ErrorBoundary`를
 * 통해 `setError`로 result store에 기록합니다.
 *
 * `wrapper`가 전달되면 Context Provider 같은 테스트용 상위 component로
 * `TestComponent`를 감쌉니다. client renderer와 server renderer 모두 같은 harness를
 * 사용하므로 result 저장과 error capture 방식이 동일하게 유지됩니다.
 */
export function createHookHarness<Props, Result>(
  { callback, setValue, setError }: RendererProps<Props, Result>,
  wrapper?: JSXElementConstructor<{ children: ReactNode }>,
) {
  /**
   * 실제로 테스트 대상 hook callback을 실행하는 component입니다.
   *
   * hook callback의 반환값은 DOM에 그리지 않고 즉시 result store에 저장합니다. 이
   * component가 `null`을 반환하는 이유는 테스트 대상이 화면 출력이 아니라 hook의
   * return value와 render error이기 때문입니다.
   */
  function TestComponent({ hookProps }: { hookProps: Props }) {
    setValue(callback(hookProps))
    return null
  }

  let resetErrorBeforeNextRender: (() => void) | undefined

  /**
   * error boundary가 잡은 render error를 result store에 기록합니다.
   *
   * React는 render 중 error가 발생하면 `getDerivedStateFromError`로 boundary state를
   * `hasError: true`로 바꾼 뒤, 해당 render pass를 fallback render로 마무리합니다.
   * 이 파일의 fallback은 UI를 보여 주지 않는 `null`입니다.
   *
   * 여기서 `reset()`을 바로 호출하지 않고 `resetErrorBeforeNextRender`에 저장하는 이유는,
   * 현재 render pass는 이미 "이번 hook render는 실패했고 boundary가 fallback을
   * 렌더링한다"는 흐름으로 진행 중이기 때문입니다. 같은 흐름 안에서 즉시 boundary를
   * 되돌리기보다, error는 `result.error`에 기록하고 이번 render는 실패 결과로 끝냅니다.
   *
   * 이후 사용자가 `rerender`를 호출하면 아래 element factory가 새 element를 만들기 전에
   * 저장된 `resetErrorBeforeNextRender`를 실행합니다. 그때 boundary state를
   * `hasError: false`로 되돌려야 이전 error 때문에 계속 `null`만 반환하지 않고
   * `TestComponent`를 다시 렌더링할 수 있습니다.
   */
  const handleError = (error: Error, reset: () => void) => {
    resetErrorBeforeNextRender = () => {
      /**
       * 저장된 reset closure는 한 번만 사용하고 바로 비웁니다.
       *
       * 비우지 않으면 이후 render마다 같은 reset이 반복 실행될 수 있고, 이미 처리한
       * 이전 ErrorBoundary instance의 `reset` 함수 참조도 계속 남게 됩니다.
       */
      resetErrorBeforeNextRender = undefined
      reset()
    }

    setError(error)
  }

  /**
   * renderer가 `render` 또는 `rerender` 때마다 호출하는 element factory입니다.
   *
   * 이전 render에서 error가 있었다면 `resetErrorBeforeNextRender?.()`가 먼저 boundary
   * state를 `hasError: false`로 되돌립니다. 이 reset이 없으면 React error boundary는 계속
   * fallback 상태이므로 children을 렌더링하지 않고, 결과적으로 새 props를 넘겨도
   * `TestComponent`와 hook callback이 다시 실행되지 않습니다.
   *
   * reset 후에는 새 props로 `TestComponent`를 구성합니다. wrapper가 있으면 hook이
   * 필요한 provider 환경 안에서 실행되도록 감싸고, 마지막으로 error boundary를 씌워
   * 다음 render에서 발생하는 error도 `result.error`로 수집합니다.
   */
  return (props: Props) => {
    resetErrorBeforeNextRender?.()

    const hookElement: ReactNode = <TestComponent hookProps={props} />
    const children = wrapper ? createElement(wrapper, null, hookElement) : hookElement

    return <ErrorBoundary onError={handleError}>{children}</ErrorBoundary>
  }
}

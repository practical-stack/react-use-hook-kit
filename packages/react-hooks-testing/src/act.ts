import { act as reactAct } from 'react'

type ActGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

/**
 * React는 act() 내부에서 발생한 업데이트를 검증할 때
 * `globalThis.IS_REACT_ACT_ENVIRONMENT` 값을 함께 확인한다. 이 값이 true가
 * 아니면 React는 현재 런타임이 act()를 올바르게 지원하도록 구성된 테스트
 * 환경인지 확신할 수 없어서, 테스트 중 상태 변경이나 effect flush가
 * act()로 감싸져 있더라도 "현재 테스트 환경이 act(...)를 지원하도록
 * 설정되지 않았다"는 경고를 낼 수 있다.
 *
 * 이 패키지는 hook 테스트 도구이기 때문에 render, hydrate, rerender,
 * unmount 같은 모든 React 작업을 내부에서 이미 act()로 감싼다. 따라서
 * 소비자가 Vitest, Jest, jsdom 등 각 테스트 러너 설정마다 이 전역 값을
 * 직접 맞추지 않아도 동일하게 동작하도록, 패키지의 act() 실행 범위 안에서만
 * 플래그를 true로 올린다.
 *
 * 플래그를 설정하지 않으면 테스트 결과가 통과하더라도 React 경고가 계속
 * 출력될 수 있고, 사용자는 실제로 act()가 빠진 문제인지 테스트 환경 설정이
 * 빠진 문제인지 구분하기 어렵다. 반대로 플래그를 영구적으로 바꾸면 같은
 * 프로세스에서 실행되는 다른 테스트의 React 환경 설정을 침범할 수 있으므로,
 * 작업이 끝난 뒤에는 반드시 이전 값으로 되돌린다.
 *
 * @see https://react.dev/reference/react/act#im-getting-an-error-the-current-testing-environment-is-not-configured-to-support-act
 */
function setReactActEnvironment() {
  const globalObject = globalThis as ActGlobal
  const previousValue = globalObject.IS_REACT_ACT_ENVIRONMENT

  globalObject.IS_REACT_ACT_ENVIRONMENT = true

  return () => {
    globalObject.IS_REACT_ACT_ENVIRONMENT = previousValue
  }
}

export async function act<T>(callback: () => Promise<T>): Promise<T> {
  const restoreEnvironment = setReactActEnvironment()

  try {
    return await reactAct(callback)
  } finally {
    restoreEnvironment()
  }
}

import { hydrateRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { act } from './act.js'
import { createHookRenderer } from './create-hook-renderer.js'
import type { RendererOptions, RendererProps } from './create-hook-renderer.js'
import { createHookHarness } from './harness.js'

/**
 * SSR hook 테스트용 renderer lifecycle을 만듭니다.
 *
 * 이 renderer는 최초 render에서 React DOM을 만들지 않고 `renderToString`으로 server
 * markup만 생성합니다. 이후 사용자가 반환 객체의 `hydrate()`를 호출하면 그 markup을
 * 실제 DOM container에 넣고 `hydrateRoot`로 client root를 연결합니다.
 *
 * `createHookRenderer`는 이 renderer가 제공하는 `render`, `rerender`, `unmount` 공통
 * lifecycle에 더해 `hydrate` 같은 추가 메서드도 결과 객체에 그대로 노출합니다. 그래서
 * `renderHookServer` 사용자는 server render 결과를 먼저 검증한 뒤, 필요한 시점에
 * hydration을 명시적으로 진행할 수 있습니다.
 */
function createServerRenderer<Props, Result>(
  rendererProps: RendererProps<Props, Result>,
  options?: RendererOptions<NoInfer<Props>>,
) {
  /**
   * hydration에 사용할 DOM container입니다.
   *
   * 값이 있으면 이미 hydration이 시작된 상태로 간주합니다. 같은 server markup을 같은
   * renderer instance에서 두 번 hydrate하면 React root와 container lifecycle이 꼬이므로
   * `hydrate()`에서 중복 호출을 막습니다.
   */
  let container: HTMLDivElement | undefined

  /**
   * hydration 이후 생성되는 React client root입니다.
   *
   * server render만 끝난 상태에서는 아직 client root가 없으므로 `rerender`를 허용하지
   * 않습니다. hydration이 끝난 뒤에만 같은 root에 `root.render(...)`로 rerender할 수
   * 있습니다.
   */
  let root: Root | undefined

  /**
   * `renderToString`으로 만든 server markup입니다.
   *
   * 최초 `render`에서 채워지고, `hydrate()`가 DOM container의 `innerHTML`로 사용합니다.
   * hook이 server render 중 throw하면 markup은 비어 있을 수 있지만, 그 error는
   * `rendererProps.setError`로 result store에 기록됩니다.
   */
  let markup = ''

  /**
   * server render와 hydration/rerender 사이에서 유지되는 최신 props입니다.
   *
   * hydration은 server render와 같은 props로 시작해야 markup과 client tree가 맞습니다.
   * 이후 `rerender`가 호출되면 이 값을 갱신하고 같은 hydrated root에 새 props를
   * 반영합니다.
   */
  let currentProps: Props | undefined

  /**
   * 사용자의 hook callback을 React element로 실행하는 공통 harness입니다.
   *
   * server render와 client hydration이 같은 harness를 사용해야 result 저장 방식,
   * wrapper 적용 방식, render error capture 방식이 client renderer와 일관됩니다.
   */
  const harness = createHookHarness(rendererProps, options?.wrapper)

  return {
    /**
     * hook을 server 환경에서 최초 render하고 markup을 저장합니다.
     *
     * `renderToString`은 server markup을 만들면서 hook callback을 실행합니다. 정상적으로
     * hook이 값을 반환하면 harness가 `setValue`로 result store에 기록합니다.
     *
     * server render 중 throw된 error는 client error boundary의 `componentDidCatch` 흐름을
     * 거치지 않을 수 있으므로 여기서 직접 잡아 `setError`에 기록합니다. throw된 값이
     * `Error`가 아니어도 테스트 result는 항상 `Error` 형태를 기대하므로 `String(error)`로
     * 감싼 새 `Error`로 변환합니다.
     */
    async render(props: Props | undefined) {
      currentProps = props

      try {
        markup = renderToString(harness(props as Props))
      } catch (error) {
        rendererProps.setError(error instanceof Error ? error : new Error(String(error)))
      }
    },

    /**
     * 저장된 server markup을 DOM에 넣고 React client root로 hydrate합니다.
     *
     * hydration은 server render 이후 client lifecycle을 시작하는 단계입니다. 이 메서드는
     * `act`로 `hydrateRoot`를 감싸므로 hydration 중 동기 effect update가 있으면
     * `await hydrate()` 이후 result store에 반영됩니다.
     *
     * 같은 renderer instance에서 hydration을 두 번 실행하면 같은 markup과 container에
     * 여러 root를 연결하려는 상태가 되므로 `container` 존재 여부로 중복 호출을 막습니다.
     */
    async hydrate() {
      if (container) {
        throw new Error('The hook has already been hydrated.')
      }

      container = document.createElement('div')
      container.innerHTML = markup

      await act(async () => {
        root = hydrateRoot(container as HTMLDivElement, harness(currentProps as Props), {
          onCaughtError(...args) {
            options?.onCaughtError?.(...args)
          },
          onRecoverableError: options?.onRecoverableError,
        })
      })
    },

    /**
     * hydration이 끝난 hook instance를 새 props로 다시 render합니다.
     *
     * SSR flow에서는 server markup만 있는 상태와 hydrated client root가 있는 상태를
     * 구분해야 합니다. hydration 전에는 `root`가 없고 React가 update를 적용할 대상도
     * 없으므로 rerender를 허용하지 않습니다.
     *
     * hydration 이후에는 최신 props를 저장한 뒤 같은 root에 harness element를 다시
     * render합니다. 이때도 `act`로 감싸 React update와 effect flush가 테스트에서
     * 관찰 가능한 시점까지 끝나도록 합니다.
     */
    async rerender(props: Props | undefined) {
      if (!root) {
        throw new Error('Cannot rerender before hydrating the hook.')
      }

      currentProps = props

      await act(async () => {
        root?.render(harness(currentProps as Props))
      })
    },

    /**
     * hydration으로 만들어진 client root를 정리합니다.
     *
     * server render만 수행하고 hydrate하지 않은 테스트에서는 client root가 없으므로 아무
     * 작업도 하지 않습니다. hydration이 끝난 경우에는 `act` 안에서 `root.unmount()`를
     * 호출해 effect cleanup까지 React 테스트 흐름 안에서 처리되게 합니다.
     */
    async unmount() {
      if (!root) {
        return
      }

      await act(async () => {
        root?.unmount()
      })

      root = undefined
    },
  }
}

/**
 * SSR hook 테스트에 사용하는 공개 API입니다.
 *
 * `createServerRenderer`를 공통 hook renderer factory에 연결해 `result`, `rerender`,
 * `unmount`와 SSR 전용 `hydrate`를 함께 제공하는 `renderHookServer` 함수를 만듭니다.
 */
export const renderHookServer = createHookRenderer(createServerRenderer)

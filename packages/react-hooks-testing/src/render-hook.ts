import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { act } from './act.js'
import { createHookRenderer } from './create-hook-renderer.js'
import type { RendererOptions, RendererProps } from './create-hook-renderer.js'
import { createHookHarness } from './harness.js'

/**
 * client hook 테스트용 renderer lifecycle을 만듭니다.
 *
 * 이 renderer는 `createRoot`로 React client root를 만들고, 공통 harness를 그 root에
 * 렌더링해서 사용자의 hook callback을 component body 안에서 실행합니다. SSR renderer와
 * 달리 server markup이나 hydration 단계가 없으므로 최초 `render` 직후 바로 rerender와
 * unmount가 가능합니다.
 */
function createDomRenderer<Props, Result>(
  rendererProps: RendererProps<Props, Result>,
  options?: RendererOptions<NoInfer<Props>>,
) {
  /**
   * 현재 hook instance를 렌더링하는 React client root입니다.
   *
   * 최초 `render`에서 생성되고 `unmount`에서 정리됩니다. `root`가 없다는 것은 아직
   * render되지 않았거나 이미 unmount된 상태이므로 `rerender`할 대상이 없다는 뜻입니다.
   */
  let root: Root | undefined

  /**
   * hook callback을 React element로 실행하는 공통 harness입니다.
   *
   * harness는 hook 반환값을 result store에 기록하고, render 중 throw된 error를
   * `result.error`로 수집하며, 필요하면 `wrapper`로 테스트용 provider 환경을 구성합니다.
   */
  const harness = createHookHarness(rendererProps, options?.wrapper)

  return {
    /**
     * hook을 client root에 최초 render합니다.
     *
     * 테스트 대상은 DOM 출력이 아니라 hook 결과이므로 root는 문서에 붙이지 않은 새
     * `div`에 생성합니다. React는 이 detached container 안에서도 hook lifecycle과 effect
     * 처리를 수행할 수 있습니다.
     *
     * `createRoot`와 `root.render`를 `act`로 감싸서 render 중 발생하는 동기 update와
     * effect flush가 테스트에서 관찰 가능한 시점까지 처리되도록 합니다. React root
     * option인 `onCaughtError`와 `onRecoverableError`는 사용자가 넘긴 callback으로
     * 전달합니다.
     */
    async render(props: Props | undefined) {
      await act(async () => {
        root = createRoot(document.createElement('div'), {
          onCaughtError(...args) {
            options?.onCaughtError?.(...args)
          },
          onRecoverableError: options?.onRecoverableError,
        })
        root.render(harness(props as Props))
      })
    },

    /**
     * 같은 hook instance를 새 props로 다시 render합니다.
     *
     * 최초 `render`가 root를 만든 뒤에만 rerender할 수 있습니다. root가 없으면 React가
     * update를 적용할 대상이 없고, result history도 어떤 hook instance에 이어지는지
     * 정의할 수 없으므로 명시적으로 error를 던집니다.
     *
     * rerender도 `act` 안에서 수행해 state update, render error capture, effect flush가
     * 테스트 흐름 안에서 안정적으로 반영되게 합니다.
     */
    async rerender(props: Props | undefined) {
      if (!root) {
        throw new Error('Cannot rerender before the hook is rendered.')
      }

      await act(async () => {
        root?.render(harness(props as Props))
      })
    },

    /**
     * 현재 hook instance를 unmount하고 React root 참조를 비웁니다.
     *
     * 이미 unmount되었거나 render가 시작되지 않았다면 정리할 root가 없으므로 바로
     * 반환합니다. root가 있는 경우에는 `act` 안에서 `root.unmount()`를 호출해 effect
     * cleanup이 React 테스트 흐름 안에서 실행되게 하고, 이후 중복 unmount나 rerender를
     * 막기 위해 `root`를 `undefined`로 되돌립니다.
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
 * client hook 테스트에 사용하는 공개 API입니다.
 *
 * `createDomRenderer`를 공통 hook renderer factory에 연결해 `result`, `rerender`,
 * `unmount`를 제공하는 `renderHook` 함수를 만듭니다. 테스트가 끝날 때는
 * `hooksCleanup`을 통해 등록된 unmount 작업이 자동으로 실행될 수 있습니다.
 */
export const renderHook = createHookRenderer(createDomRenderer)

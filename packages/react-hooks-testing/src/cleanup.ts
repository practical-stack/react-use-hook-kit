/**
 * hook renderer가 등록하는 정리 작업입니다.
 *
 * renderer는 `renderHook` 또는 `renderHookServer`가 만든 React root를 unmount하는
 * 것처럼 테스트가 끝난 뒤 반드시 실행해야 하는 teardown 작업을 이 callback 형태로
 * 등록합니다. unmount는 `act`로 감싸질 수 있고 React가 effect flush를 끝낼 때까지
 * 기다려야 할 수 있으므로 동기 함수와 비동기 함수 모두 허용합니다.
 */
export type CleanupCallback = () => Promise<void> | void

const callbacks = new Set<CleanupCallback>()

/**
 * `hooksCleanup`이 실행할 cleanup callback을 등록합니다.
 *
 * `createHookRenderer`는 hook render가 성공한 뒤 이 함수를 호출합니다. 일반적인
 * 테스트 설정에서는 `afterEach(hooksCleanup)`을 등록하므로, 테스트가 끝날 때마다
 * 등록된 hook instance가 자동으로 unmount됩니다.
 *
 * 내부 저장소는 `Set`이므로 같은 callback을 여러 번 추가해도 한 번만 예약됩니다.
 * `unmountHook`처럼 renderer가 소유한 callback이 중복 등록되어도 같은 React root를
 * 두 번 unmount하려고 시도하지 않게 해 줍니다.
 */
export function cleanupAdd(callback: CleanupCallback): void {
  callbacks.add(callback)
}

/**
 * 이전에 등록한 cleanup callback을 제거합니다.
 *
 * test-level cleanup이 실행되기 전에 hook을 수동으로 unmount할 때 renderer가 이
 * 함수를 호출합니다. 예를 들어 `unmountHook`은 먼저 자기 자신을 등록 해제한 뒤
 * renderer별 unmount 작업을 수행합니다. 이렇게 하면 이후 `hooksCleanup`이 호출되어도
 * 같은 React root를 다시 unmount하려고 시도하지 않습니다.
 *
 * 현재 등록되어 있지 않은 callback을 넘겨도 `Set.delete`와 동일하게 아무 일도
 * 일어나지 않습니다.
 */
export function cleanupRemove(callback: CleanupCallback): void {
  callbacks.delete(callback)
}

/**
 * 등록된 모든 hook cleanup callback을 실행하고 registry를 비웁니다.
 *
 * 테스트 프레임워크에서 사용하는 공개 cleanup 진입점입니다.
 *
 * ```ts
 * afterEach(hooksCleanup)
 * ```
 *
 * 현재 callback set을 snapshot으로 복사한 뒤, callback을 실행하기 전에 registry를 먼저
 * 비우고, 등록 순서대로 각 callback을 await합니다. 먼저 비우는 이유는 cleanup 도중
 * 오류가 나거나 cleanup이 다시 진입하더라도 이미 예약되어 있던 callback이 registry에
 * 남지 않게 하기 위해서입니다. 또한 cleanup callback이 새 cleanup 작업을 등록하더라도
 * 그 작업이 같은 cleanup pass에서 바로 소비되지 않게 합니다.
 */
export async function hooksCleanup(): Promise<void> {
  const pendingCallbacks = [...callbacks]

  callbacks.clear()

  for (const callback of pendingCallbacks) {
    await callback()
  }
}

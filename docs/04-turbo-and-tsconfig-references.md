# 04. Turborepo + tsconfig references

이 템플릿은 두 가지 의존 그래프를 명시적으로 관리한다.

- **TypeScript의 그래프** — `tsconfig.json#references`로 표현. `tsc -b`와 에디터의 incremental typecheck를 위한 것.
- **태스크의 그래프** — `turbo.json#tasks.*.dependsOn`으로 표현. `pnpm typecheck`, `pnpm build` 같은 태스크가 어느 패키지부터 어느 순서로 실행되어야 하는지를 결정한다.

두 그래프는 같은 워크스페이스 의존 관계를 다른 도구의 언어로 두 번 적은 것이다. 굳이 두 번 적는 이유가 이 문서의 주제다.

## tsconfig references — `tsc`의 의존 그래프

### 각 워크스페이스의 references

```jsonc
// apps/tanstack-sample/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx" },
  "references": [{ "path": "../../packages/sample" }]
}
```

```jsonc
// apps/next-sample/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "preserve" },
  "references": [{ "path": "../../packages/sample" }]
}
```

`references`는 "이 프로젝트는 `packages/sample`에 의존한다"고 TypeScript에 알리는 선언이다.

1. **Incremental typecheck** — `tsc -b`가 각 프로젝트의 `.tsbuildinfo`를 캐시한다.
2. **순서 보장** — `tsc -b apps/tanstack-sample`을 실행하면 `packages/sample`의 typecheck가 먼저 끝난 뒤 앱이 검사된다.

### `composite: true`가 references의 전제

`references`로 가리켜지는 쪽 프로젝트는 반드시 `composite: true`여야 한다.

```jsonc
// packages/sample/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": false
  }
}
```

`composite`가 켜지면 TypeScript는 그 프로젝트의 선언 파일을 emit해야 한다. 다른 프로젝트가 이 패키지를 typecheck할 때 소스를 다시 파싱하지 않고 `.d.ts`를 읽도록 하기 위한 최적화다.

> 주의: 여기서 만들어지는 `dist/`는 런타임에 쓰이지 않는다. 런타임/타입 import는 `package.json#exports`로 따로 결정되며 ([03 문서](./03-live-types.md) 참조), 현재는 `src/index.ts`를 가리킨다.

### 루트 `tsconfig.json` — 그래프 전체의 진입점

```jsonc
// tsconfig.json (root)
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {},
  "files": [],
  "references": [
    { "path": "apps/tanstack-sample" },
    { "path": "apps/next-sample" },
    { "path": "packages/sample" }
  ]
}
```

`files: []`로 자기 자신은 아무 소스도 가지지 않고, `references`로 모든 워크스페이스를 가리킨다.

- `tsc -b`만 실행해도 모든 프로젝트가 의존 순서대로 빌드된다.
- 에디터가 그래프 전체를 알게 되어 cross-package "Go to Definition", "Find All References"가 정확해진다.

## Turborepo — 태스크의 의존 그래프

### `turbo.json`의 핵심

```jsonc
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", ".output/**", "dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^test"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

세 가지를 보장한다.

1. **`^` prefix = 의존 패키지의 같은 타깃 먼저** — `build` 또는 `typecheck`를 앱에 대해 실행하면 Turbo가 먼저 `packages/sample`의 같은 타깃을 실행한다.
2. **캐시** — 입력이 같으면 결과를 다시 계산하지 않는다. 이 템플릿의 `typecheck`/`test`는 워크스페이스별 출력물이 일정하지 않아 `outputs: []`로 둔다.
3. **`dev`는 캐시 안 함** — 장시간 실행되는 워치 모드는 캐시 대상이 아니다.

Turbo는 패키지 그래프를 각 워크스페이스의 `package.json#dependencies`에서 읽는다. 그래서 `apps/*/package.json`의 `"@repo/sample": "workspace:*"`가 태스크 순서에도 영향을 준다.

### Turbo가 references 위에 더하는 것

Turbo와 `tsconfig#references`는 둘 다 "의존 패키지를 먼저 처리한다"는 같은 아이디어를 표현한다. 차이는 적용 범위다.

| 도구 | 무엇을 순서 짓는가 | 캐시 |
|------|-------------------|------|
| `tsc -b` (references 기반) | TypeScript 컴파일/typecheck만 | `.tsbuildinfo` 파일 단위, TypeScript 한정 |
| Turbo | 임의의 npm 스크립트 (`build`, `typecheck`, `test`, …) | content-hash 기반, 도구 무관 |

같은 그래프지만 Turbo는 `pnpm build`에도, `pnpm test`에도, 향후 추가될 어떤 태스크에도 적용된다. `tsc`만 알았다면 `test` 같은 태스크에 대해서는 따로 의존 순서를 관리해야 했을 것이다.

### 루트 `package.json`의 진입점

```jsonc
// package.json (root)
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "lint": "oxlint -c .oxlintrc.json",
    "check": "pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm sheriff && pnpm knip"
  }
}
```

`pnpm typecheck` 한 줄이 다음을 보장한다.

```text
turbo run typecheck
  ↓ tasks.typecheck.dependsOn: ["^typecheck"] 적용
  ↓ package.json dependencies로 의존 그래프 추출
  ↓ packages/sample 먼저, apps/* 나중에
  ↓ 각 패키지의 package.json#scripts.typecheck 실행
  ↓ 입력/출력 해시가 같으면 캐시 hit
```

각 워크스페이스의 `typecheck` 스크립트는 자기 도구를 자유롭게 고른다.

| 워크스페이스 | `typecheck` 스크립트 | 사용하는 도구 |
|-------------|----------------------|---------------|
| `packages/sample` | `tsc -b` | composite + project references |
| `apps/tanstack-sample` | `tsc --noEmit` | references는 자체적으로 따라감 |
| `apps/next-sample` | `tsc --noEmit` | 동일 |

## 두 그래프를 동기화하는 책임

같은 의존 관계가 세 군데에 적힌다.

1. `package.json#dependencies`의 `"@repo/sample": "workspace:*"`
2. 그 패키지를 쓰는 워크스페이스의 `tsconfig.json#references`
3. 루트 `tsconfig.json#references` (전체 목록)

세 곳이 일치해야 한다.

- (1) 누락 → pnpm이 심볼릭 링크를 만들지 않음 → import 자체가 깨짐
- (2) 누락 → typecheck는 통과하지만 `tsc -b`의 incremental 캐시가 부정확해짐
- (3) 누락 → 에디터가 cross-package 기능에서 그 패키지를 못 찾음

## 정리

| 도구 | 무엇을 책임지는가 |
|------|-------------------|
| `pnpm` (`workspace:*`) | 패키지가 서로 import 가능한 상태를 만든다 |
| `package.json#exports` | import가 어느 파일로 해석되는지 결정 (런타임 + TypeScript 모두) |
| `tsconfig#references` + `composite` | TypeScript 한정의 incremental typecheck와 빌드 순서 |
| 루트 `tsconfig.json` | 그래프 전체의 진입점. 에디터가 cross-package 기능을 정확히 제공하도록 |
| `turbo.json#tasks.*.dependsOn` | 임의의 npm 스크립트에 같은 의존 순서를 적용. 캐시 |
| `pnpm <script>` (root) | 사용자가 입력하는 단일 진입점. Turbo에 위임 |

Live Types ([03 문서](./03-live-types.md))는 런타임에서의 즉시 반영을 만들고, 이 문서의 references + Turbo는 빌드/typecheck 시점의 정확한 의존 순서와 캐시를 만든다. 두 메커니즘은 다른 평면에서 동작하며 서로 간섭하지 않는다.

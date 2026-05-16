import { noDependencies, sameTag, SheriffConfig } from '@softarc/sheriff-core'

export const config: SheriffConfig = {
  enableBarrelLess: true,

  entryPoints: {
    docs: './apps/docs/src/pages/index.astro',
    'react-hooks-testing': './packages/react-hooks-testing/src/index.ts',
  },

  modules: {
    'apps/docs/src': 'app:docs',
    'packages/react-hook-kit/src': 'lib:react-hook-kit',
    'packages/react-hooks-testing/src': 'lib:react-hooks-testing',
  },

  depRules: {
    'app:*': [sameTag, 'lib:react-hook-kit'],
    'lib:react-hook-kit': noDependencies,
    'lib:react-hooks-testing': noDependencies,
    root: ['app:*', 'lib:react-hook-kit', 'lib:react-hooks-testing', 'noTag'],
    noTag: ['noTag', 'lib:react-hook-kit', 'lib:react-hooks-testing'],
  },
}

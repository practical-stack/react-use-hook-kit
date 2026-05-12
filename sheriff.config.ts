import { noDependencies, sameTag, SheriffConfig } from '@softarc/sheriff-core'

export const config: SheriffConfig = {
  enableBarrelLess: true,

  entryPoints: {
    docs: './apps/docs/src/pages/index.astro',
    'compat-react-17': './apps/compat-react-17/src/compat.test.ts',
    'compat-react-18': './apps/compat-react-18/src/compat.test.ts',
    'compat-react-19': './apps/compat-react-19/src/compat.test.ts',
  },

  modules: {
    'apps/docs/src': 'app:docs',
    'apps/compat-react-17/src': 'app:compat',
    'apps/compat-react-18/src': 'app:compat',
    'apps/compat-react-19/src': 'app:compat',
    'packages/react-hook-kit/src': 'lib:react-hook-kit',
  },

  depRules: {
    'app:*': [sameTag, 'lib:react-hook-kit'],
    'lib:react-hook-kit': noDependencies,
    root: ['app:*', 'lib:react-hook-kit', 'noTag'],
    noTag: ['noTag', 'lib:react-hook-kit'],
  },
}

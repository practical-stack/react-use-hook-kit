import { noDependencies, sameTag, SheriffConfig } from '@softarc/sheriff-core'

export const config: SheriffConfig = {
  enableBarrelLess: true,

  entryPoints: {
    docs: './apps/docs/src/pages/index.astro',
  },

  modules: {
    'apps/docs/src': 'app:docs',
    'packages/react-hook-kit/src': 'lib:react-hook-kit',
  },

  depRules: {
    'app:*': [sameTag, 'lib:react-hook-kit'],
    'lib:react-hook-kit': noDependencies,
    root: ['app:*', 'lib:react-hook-kit', 'noTag'],
    noTag: ['noTag', 'lib:react-hook-kit'],
  },
}

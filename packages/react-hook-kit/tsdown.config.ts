import { defineConfig } from 'tsdown'

const entry = {
  index: 'src/index.ts',
  'use-boolean': 'src/use-boolean.ts',
  'use-counter': 'src/use-counter.ts',
  'use-debounce': 'src/use-debounce.ts',
  'use-local-storage': 'src/use-local-storage.ts',
  'use-toggle': 'src/use-toggle.ts',
}

const deps = {
  neverBundle: ['react', 'react-dom'],
}

export default defineConfig([
  {
    entry,
    format: 'esm',
    outDir: 'dist',
    clean: true,
    sourcemap: false,
    dts: {
      sourcemap: true,
    },
    deps,
    outExtensions() {
      return {
        js: '.js',
        dts: '.d.ts',
      }
    },
  },
  {
    entry,
    format: 'cjs',
    outDir: 'dist',
    clean: false,
    sourcemap: false,
    dts: true,
    deps,
    outExtensions() {
      return {
        js: '.cjs',
      }
    },
  },
])

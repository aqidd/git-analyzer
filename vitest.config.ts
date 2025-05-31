import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'c8',
        reporter: ['text', 'lcov', 'json-summary'],
        all: true,
        include: ['src/**/*.{js,jsx,ts,tsx,vue}'],
        exclude: [
          'src/main.ts',
          'src/router/index.ts',
          'src/App.vue',
          'src/**/__tests__/**',
          'src/assets/**',
          'src/types/**',
          'src/stores/**',
          'src/vite-env.d.ts',
          'public/**',
        ],
      },
    },
  }),
)

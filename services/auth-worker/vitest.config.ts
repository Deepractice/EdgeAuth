import { defineConfig } from 'vitest/config';
import { vitestCucumber } from '@deepracticex/vitest-cucumber-plugin';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vitestCucumber()],
  test: {
    include: ['features/**/*.feature'],
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      'edge-auth-domain': resolve(__dirname, '../../src/domain/index.ts'),
      'edge-auth-core': resolve(__dirname, '../../src/core/index.ts'),
    },
  },
});

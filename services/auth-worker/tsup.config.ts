import { defineConfig } from 'tsup';
import { resolve } from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'esnext',
  outDir: 'dist',
  bundle: true,
  minify: false,
  sourcemap: true,
  external: [],
  noExternal: ['edge-auth-domain', 'edge-auth-core', 'hono'],
  clean: true,
  esbuildOptions(options) {
    options.alias = {
      'edge-auth-domain': resolve(__dirname, '../../src/domain/index.ts'),
      'edge-auth-core': resolve(__dirname, '../../src/core/index.ts'),
    };
  },
});

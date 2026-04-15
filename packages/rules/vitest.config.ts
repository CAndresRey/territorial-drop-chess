import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@tdc/engine': path.resolve(__dirname, '../engine/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
  },
});

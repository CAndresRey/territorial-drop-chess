import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
  resolve: {
    alias: {
      '@tdc/engine': path.resolve(__dirname, '../../packages/engine/src/index.ts'),
      '@tdc/entities': path.resolve(__dirname, '../../packages/entities/src/index.ts'),
      '@tdc/ai-core': path.resolve(__dirname, '../../packages/ai-core/src/index.ts'),
      '@tdc/ai-manager': path.resolve(__dirname, '../../packages/ai-manager/src/index.ts'),
      '@tdc/ai-strategies': path.resolve(__dirname, '../../packages/ai-strategies/src/index.ts'),
      '@tdc/difficulty': path.resolve(__dirname, '../../packages/difficulty/src/index.ts'),
      '@tdc/rules': path.resolve(__dirname, '../../packages/rules/src/index.ts'),
      '@tdc/turn-system': path.resolve(__dirname, '../../packages/turn-system/src/index.ts'),
      '@tdc/sim': path.resolve(__dirname, '../../packages/sim/src/index.ts'),
      '@tdc/setup-config': path.resolve(__dirname, '../../packages/setup-config/src/index.ts'),
      '@tdc/board': path.resolve(__dirname, '../../packages/board/src/index.ts'),
      '@tdc/utils': path.resolve(__dirname, '../../packages/utils/src/index.ts'),
      '@tdc/scoring': path.resolve(__dirname, '../../packages/scoring/src/index.ts'),
    },
  },
  server: {
    port: 3000
  }
});

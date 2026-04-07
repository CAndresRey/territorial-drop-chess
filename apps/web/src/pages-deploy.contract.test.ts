import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const thisDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(thisDir, '../../..');

const readText = (relativePath: string): string => {
  const absolutePath = resolve(repoRoot, relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, 'utf8');
};

describe('github pages deployment contract', () => {
  it('defines a dedicated GitHub Pages workflow for the web app', () => {
    const workflow = readText('.github/workflows/pages.yml');
    expect(workflow).toContain('name: Deploy Web to GitHub Pages');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('actions/deploy-pages@v4');
    expect(workflow).toContain('npm run build --workspace @tdc/web');
  });

  it('supports configurable Vite base path for Pages subpath deployments', () => {
    const viteConfig = readText('apps/web/vite.config.ts');
    expect(viteConfig).toContain('VITE_BASE_PATH');
  });

  it('reads socket backend URL from environment for hosted frontend', () => {
    const appSource = readText('apps/web/src/App.tsx');
    expect(appSource).toContain('VITE_SOCKET_URL');
  });
});

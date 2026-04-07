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

describe('temporary public backend tooling contract', () => {
  it('documents the github-pages + tunnel operational flow', () => {
    const doc = readText('docs/TEMP_GITHUB_PAGES_BACKEND.md');
    expect(doc).toContain('start-temp-backend.ps1');
    expect(doc).toContain('stop-temp-backend.ps1');
    expect(doc).toContain('redeploy-pages.ps1');
    expect(doc).toContain('VITE_SOCKET_URL');
  });

  it('provides start script with cloudflared + server startup', () => {
    const script = readText('scripts/temp-deploy/start-temp-backend.ps1');
    expect(script).toContain('@tdc/server');
    expect(script).toContain('cloudflared');
    expect(script).toContain('.temp-deploy');
  });

  it('provides stop script that terminates background processes', () => {
    const script = readText('scripts/temp-deploy/stop-temp-backend.ps1');
    expect(script).toContain('Stop-Process');
    expect(script).toContain('server.pid');
    expect(script).toContain('tunnel.pid');
  });
});

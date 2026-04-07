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

describe('deployment packaging contract', () => {
  it('defines server Dockerfile with build and runtime stages', () => {
    const dockerfile = readText('apps/server/Dockerfile');
    expect(dockerfile).toContain('FROM node:20-alpine AS builder');
    expect(dockerfile).toContain('npm ci');
    expect(dockerfile).toContain('npm run build --workspace @tdc/server');
    expect(dockerfile).toContain('CMD ["node", "dist/index.js"]');
  });

  it('defines web Dockerfile as static nginx deployment', () => {
    const dockerfile = readText('apps/web/Dockerfile');
    expect(dockerfile).toContain('FROM node:20-alpine AS builder');
    expect(dockerfile).toContain('npm run build --workspace @tdc/web');
    expect(dockerfile).toContain('FROM nginx:alpine');
    expect(dockerfile).toContain('/usr/share/nginx/html');
  });

  it('defines docker compose with server healthcheck and web dependency', () => {
    const compose = readText('docker-compose.yml');
    expect(compose).toContain('services:');
    expect(compose).toContain('server:');
    expect(compose).toContain('web:');
    expect(compose).toContain('healthcheck:');
    expect(compose).toContain('/health');
    expect(compose).toContain('depends_on:');
    expect(compose).toContain('condition: service_healthy');
  });
});

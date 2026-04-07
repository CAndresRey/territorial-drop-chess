# M8 Hardening Report

Date: 2026-04-07

## Scope

- Matrix validation for 2..8 players
- Simulation smoke performance checks
- Full package regression suite
- Coverage report on critical logic packages
- Web and server build verification

## Commands Executed

```powershell
npx vitest --run apps/server/src apps/web/src/setup.contract.test.ts packages/engine/src packages/rules/src packages/turn-system/src packages/ai-core/src packages/ai-strategies/src packages/ai-manager/src packages/difficulty/src packages/sim/src
npx vitest --run --coverage packages/engine/src packages/rules/src packages/turn-system/src packages/ai-core/src packages/ai-strategies/src packages/ai-manager/src packages/difficulty/src packages/sim/src
npm run build --workspace @tdc/server
npm run build --workspace @tdc/web
```

## Test Status

- Total test files: 22
- Total tests: 96
- Result: PASS

## Coverage Summary (critical packages)

- Global statements: 96.35%
- Global branches: 89.58%
- Global functions: 100%
- Global lines: 96.76%

Per package highlights:

- `engine/src`: 96.20% statements
- `rules/src`: 97.80% statements
- `turn-system/src`: 95.45% statements
- `ai-core/src`: 100.00% statements
- `ai-strategies/src`: 100.00% statements
- `ai-manager/src`: 95.00% statements
- `difficulty/src`: 100.00% statements
- `sim/src`: 92.15% statements

## Matrix Smoke Results (2..8 players)

Configuration: 3 simulation iterations per player count, fixed seed, simultaneous turn mode.

```json
[
  { "players": 2, "ms": 43, "avgGameLength": 6, "totalCaptures": 0, "avgFocusViolations": 0 },
  { "players": 3, "ms": 253, "avgGameLength": 6, "totalCaptures": 0, "avgFocusViolations": 0 },
  { "players": 4, "ms": 371, "avgGameLength": 6, "totalCaptures": 0, "avgFocusViolations": 0 },
  { "players": 5, "ms": 558, "avgGameLength": 6, "totalCaptures": 0, "avgFocusViolations": 0 },
  { "players": 6, "ms": 595, "avgGameLength": 6, "totalCaptures": 0, "avgFocusViolations": 0 },
  { "players": 7, "ms": 646, "avgGameLength": 6, "totalCaptures": 0, "avgFocusViolations": 0 },
  { "players": 8, "ms": 843, "avgGameLength": 6, "totalCaptures": 0, "avgFocusViolations": 0 }
]
```

## Build Status

- `@tdc/server` build: PASS
- `@tdc/web` build: PASS


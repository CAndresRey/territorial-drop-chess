# Architecture Refactor Plan

## Current Findings
- `apps/web/src/App.tsx` centralizes too much UI state and flow logic.
- Setup defaults/normalization were duplicated between `App.tsx` and setup persistence.
- Cross-package boundaries are mostly good, but there is still domain overlap between `engine` and `entities` around formations.
- Generated/runtime artifacts exist locally (`dist`, coverage outputs) and should stay out of source workflows.

## Refactors Applied
- Extracted shared setup defaults into `apps/web/src/setup-defaults.ts`.
- Reused the same setup default strategy in:
  - `apps/web/src/App.tsx`
  - `apps/web/src/setup-storage.ts`
- Added/used pure helper modules to keep UI logic testable and decoupled:
  - `apps/web/src/gameplay.ts`
  - `apps/web/src/ui-state.ts`
  - `apps/web/src/setup-storage.ts`

## UI/UX Improvements Applied
- Setup screen now guides users with numbered steps.
- Added contextual gameplay hint panel (selection/move/drop guidance).
- Added finish-state ranking and explicit "New Game" restart path.
- Updated visual tokens for clearer contrast and less default/purple-heavy look.

## Next Ordered Cleanup
1. Consolidate formation domain into one package (prefer `engine` as source of truth, `entities` as facade or removal).
2. Split `App.tsx` into dedicated screens/components:
   - `SetupScreen`
   - `GameScreen`
   - `FinishedPanel`
3. Add thin app-level state machine (`setup -> playing -> finished`) to reduce UI branching.
4. Introduce package-level API boundaries (no deep relative imports across packages).
5. Add lint rules/checks to block runtime artifact commits and deep import leaks.


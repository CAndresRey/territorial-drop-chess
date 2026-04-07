import { describe, expect, it } from 'vitest';
import {
  QUICK_START_CHECKLIST,
  TUTORIAL_STEPS,
  TutorialStep,
} from './tutorial-content';

const flatLines = (steps: TutorialStep[]): string[] =>
  steps.flatMap((step) => [step.title, ...step.bullets]).map((line) => line.toLowerCase());

describe('tutorial content contract', () => {
  it('provides a clear progressive tutorial with enough steps', () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(6);
    const lines = flatLines(TUTORIAL_STEPS);
    expect(lines.some((line) => line.includes('turno'))).toBe(true);
    expect(lines.some((line) => line.includes('reserva') || line.includes('drop'))).toBe(
      true,
    );
    expect(lines.some((line) => line.includes('ganar') || line.includes('victoria'))).toBe(
      true,
    );
  });

  it('includes a quick-start checklist that explains first actions', () => {
    expect(QUICK_START_CHECKLIST.length).toBeGreaterThanOrEqual(4);
    const lines = QUICK_START_CHECKLIST.map((line) => line.toLowerCase());
    expect(lines.some((line) => line.includes('pieza'))).toBe(true);
    expect(lines.some((line) => line.includes('casilla') || line.includes('mueve'))).toBe(
      true,
    );
    expect(lines.some((line) => line.includes('pass') || line.includes('pasar'))).toBe(true);
  });
});

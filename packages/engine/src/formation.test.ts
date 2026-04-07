import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FORMATION_TEMPLATES,
  FORMATION_COST_RANGE,
  FORMATION_PIECE_COUNT,
  calculateFormationCost,
  validateFormationTemplate,
} from './formation';
import { FormationTemplate, PieceType } from './types';

describe('Formation templates', () => {
  it('ships default templates that satisfy hard constraints and balance range', () => {
    expect(DEFAULT_FORMATION_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of DEFAULT_FORMATION_TEMPLATES) {
      expect(template.pieces).toHaveLength(FORMATION_PIECE_COUNT);
      expect(template.cost).toBeGreaterThanOrEqual(FORMATION_COST_RANGE.min);
      expect(template.cost).toBeLessThanOrEqual(FORMATION_COST_RANGE.max);
      expect(validateFormationTemplate(template)).toStrictEqual({ isValid: true });
    }
  });

  it('rejects template without exactly one king', () => {
    const invalid: FormationTemplate = {
      id: 'no-king',
      name: 'No King',
      pieces: [
        PieceType.Guard,
        PieceType.Rook,
        PieceType.Knight,
        PieceType.Bishop,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
      ],
      cost: 999,
    };

    const result = validateFormationTemplate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/king/i);
  });

  it('rejects template that contains Veteran pieces in starting formation', () => {
    const invalid: FormationTemplate = {
      id: 'with-veteran',
      name: 'With Veteran',
      pieces: [
        PieceType.King,
        PieceType.Guard,
        PieceType.Rook,
        PieceType.Knight,
        PieceType.Bishop,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Veteran,
      ],
      cost: 999,
    };

    const result = validateFormationTemplate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/veteran/i);
  });

  it('rejects template with piece count different from required formation size', () => {
    const invalid: FormationTemplate = {
      id: 'short',
      name: 'Short',
      pieces: [PieceType.King, PieceType.Guard, PieceType.Rook],
      cost: 999,
    };

    const result = validateFormationTemplate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/10/i);
  });

  it('rejects template when declared cost does not match piece composition', () => {
    const template: FormationTemplate = {
      id: 'bad-cost',
      name: 'Bad Cost',
      pieces: [
        PieceType.King,
        PieceType.Guard,
        PieceType.Rook,
        PieceType.Knight,
        PieceType.Bishop,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
      ],
      cost: calculateFormationCost([
        PieceType.King,
        PieceType.Guard,
        PieceType.Rook,
        PieceType.Knight,
        PieceType.Bishop,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
        PieceType.Pawn,
      ]) + 1,
    };

    const result = validateFormationTemplate(template);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/cost/i);
  });
});


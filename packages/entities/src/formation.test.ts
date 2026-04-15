import { describe, expect, it } from 'vitest';
import { PieceType } from '../../engine/src/types';
import {
  assignFormationsToPlayers,
  DEFAULT_FORMATION_CONSTRAINTS,
  getDefaultFormationCatalog,
  selectFormation,
  validateFormationTemplate,
} from './formation';

describe('Formation System', () => {
  it('default catalog templates satisfy hard constraints', () => {
    const catalog = getDefaultFormationCatalog();
    expect(catalog.length).toBeGreaterThan(0);

    for (const template of catalog) {
      const result = validateFormationTemplate(
        template,
        DEFAULT_FORMATION_CONSTRAINTS,
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it('rejects templates without exactly one king', () => {
    const result = validateFormationTemplate(
      {
        id: 'invalid-no-king',
        name: 'No King',
        pieces: [PieceType.Rook, PieceType.Bishop, PieceType.Pawn],
        cost: 8,
      },
      DEFAULT_FORMATION_CONSTRAINTS,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/king/i);
  });

  it('rejects templates with veteran as starting piece', () => {
    const result = validateFormationTemplate(
      {
        id: 'invalid-veteran',
        name: 'Veteran Start',
        pieces: [PieceType.King, PieceType.Veteran, PieceType.Pawn],
        cost: 10,
      },
      DEFAULT_FORMATION_CONSTRAINTS,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/veteran/i);
  });

  it('selects template by id and throws when missing', () => {
    const catalog = getDefaultFormationCatalog();
    const selected = selectFormation(catalog, catalog[0].id);
    expect(selected.id).toBe(catalog[0].id);
    expect(() => selectFormation(catalog, 'missing-id')).toThrowError(/formation/i);
  });

  it('assigns one pre-game selection per player', () => {
    const players = ['p1', 'p2', 'p3'];
    const catalog = getDefaultFormationCatalog();
    const selections = {
      p1: catalog[0].id,
      p2: catalog[1].id,
      p3: catalog[0].id,
    };

    const assignment = assignFormationsToPlayers(players, selections, catalog);

    expect(Object.keys(assignment).sort()).toStrictEqual(players);
    expect(assignment.p2.id).toBe(catalog[1].id);
  });
});

import {
  DEFAULT_FORMATION_TEMPLATES,
  FormationTemplate,
  PieceType,
  PlayerId,
  calculateFormationCost,
  validateFormationTemplate as validateEngineFormationTemplate,
} from '@tdc/engine';

export type FormationConstraints = {
  minPieces: number;
  maxPieces: number;
  maxCost: number;
  requireExactlyOneKing: boolean;
  allowVeteranAtStart: boolean;
};

export const DEFAULT_FORMATION_CONSTRAINTS: FormationConstraints = {
  minPieces: 10,
  maxPieces: 10,
  maxCost: 21,
  requireExactlyOneKing: true,
  allowVeteranAtStart: false,
};

export const validateFormationTemplate = (
  template: FormationTemplate,
  constraints: FormationConstraints,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!template.id.trim()) errors.push('Formation id is required');
  if (!template.name.trim()) errors.push('Formation name is required');
  if (template.pieces.length < constraints.minPieces) {
    errors.push(
      `Formation must include at least ${constraints.minPieces} pieces`,
    );
  }
  if (template.pieces.length > constraints.maxPieces) {
    errors.push(
      `Formation must include at most ${constraints.maxPieces} pieces`,
    );
  }

  const kings = template.pieces.filter(
    (piece) => piece === PieceType.King,
  ).length;
  if (constraints.requireExactlyOneKing && kings !== 1) {
    errors.push('Formation must include exactly one king');
  }
  if (
    !constraints.allowVeteranAtStart &&
    template.pieces.includes(PieceType.Veteran)
  ) {
    errors.push('Formation cannot include veteran at start');
  }

  const computedCost = calculateFormationCost(template.pieces);
  if (template.cost !== computedCost) {
    errors.push(`Formation cost mismatch: expected ${computedCost}`);
  }
  if (template.cost > constraints.maxCost) {
    errors.push(`Formation cost cannot exceed ${constraints.maxCost}`);
  }

  const engineValidation = validateEngineFormationTemplate(template);
  if (!engineValidation.isValid && engineValidation.error) {
    errors.push(engineValidation.error);
  }

  return { isValid: errors.length === 0, errors };
};

export const getDefaultFormationCatalog = (): FormationTemplate[] =>
  DEFAULT_FORMATION_TEMPLATES.map((template) => ({
    ...template,
    pieces: [...template.pieces],
  }));

export const selectFormation = (
  catalog: FormationTemplate[],
  formationId: string,
): FormationTemplate => {
  const selected = catalog.find((template) => template.id === formationId);
  if (!selected) throw new Error(`Formation not found: ${formationId}`);
  return { ...selected, pieces: [...selected.pieces] };
};

export const assignFormationsToPlayers = (
  playerIds: PlayerId[],
  selections: Record<PlayerId, string>,
  catalog: FormationTemplate[],
): Record<PlayerId, FormationTemplate> => {
  const assignment: Partial<Record<PlayerId, FormationTemplate>> = {};
  for (const playerId of playerIds) {
    const selectedId = selections[playerId];
    if (!selectedId) {
      throw new Error(`Missing formation selection for player ${playerId}`);
    }
    assignment[playerId] = selectFormation(catalog, selectedId);
  }
  return assignment as Record<PlayerId, FormationTemplate>;
};

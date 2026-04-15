import { FormationTemplate, PieceType, PlayerId, ValidationResult } from './types.js';
export declare const FORMATION_PIECE_COUNT = 10;
export declare const FORMATION_COST_RANGE: {
    readonly min: 18;
    readonly max: 21;
};
export declare const FORMATION_PIECE_COST: Record<PieceType, number>;
export declare const calculateFormationCost: (pieces: PieceType[]) => number;
export declare const DEFAULT_FORMATION_TEMPLATES: FormationTemplate[];
export declare const validateFormationTemplate: (template: FormationTemplate) => ValidationResult;
export declare const validateFormationSelection: (playerIds: PlayerId[], templates: FormationTemplate[], selections: Partial<Record<PlayerId, string>> | undefined, required: boolean) => Record<PlayerId, FormationTemplate>;
//# sourceMappingURL=formation.d.ts.map
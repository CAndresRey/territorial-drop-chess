import { PieceType, } from './types.js';
export const FORMATION_PIECE_COUNT = 10;
export const FORMATION_COST_RANGE = { min: 18, max: 21 };
export const FORMATION_PIECE_COST = {
    [PieceType.King]: 7,
    [PieceType.Guard]: 3,
    [PieceType.Rook]: 2,
    [PieceType.Knight]: 1,
    [PieceType.Bishop]: 1,
    [PieceType.Pawn]: 1,
    [PieceType.Veteran]: 2,
};
const BASE_FORMATIONS = [
    {
        id: 'balanced-core',
        name: 'Balanced Core',
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
    },
    {
        id: 'aggressive-front',
        name: 'Aggressive Front',
        pieces: [
            PieceType.King,
            PieceType.Guard,
            PieceType.Rook,
            PieceType.Rook,
            PieceType.Knight,
            PieceType.Bishop,
            PieceType.Pawn,
            PieceType.Pawn,
            PieceType.Pawn,
            PieceType.Pawn,
        ],
    },
    {
        id: 'fortress-guard',
        name: 'Fortress Guard',
        pieces: [
            PieceType.King,
            PieceType.Guard,
            PieceType.Guard,
            PieceType.Rook,
            PieceType.Knight,
            PieceType.Bishop,
            PieceType.Pawn,
            PieceType.Pawn,
            PieceType.Pawn,
            PieceType.Pawn,
        ],
    },
];
export const calculateFormationCost = (pieces) => pieces.reduce((acc, pieceType) => acc + FORMATION_PIECE_COST[pieceType], 0);
export const DEFAULT_FORMATION_TEMPLATES = BASE_FORMATIONS.map((template) => ({
    ...template,
    cost: calculateFormationCost(template.pieces),
}));
export const validateFormationTemplate = (template) => {
    if (!template.id.trim() || !template.name.trim()) {
        return {
            isValid: false,
            error: 'Formation template must include id and name',
        };
    }
    if (template.pieces.length !== FORMATION_PIECE_COUNT) {
        return {
            isValid: false,
            error: `Formation template must contain exactly ${FORMATION_PIECE_COUNT} pieces`,
        };
    }
    const counts = template.pieces.reduce((acc, piece) => {
        acc[piece] = (acc[piece] ?? 0) + 1;
        return acc;
    }, {});
    if ((counts[PieceType.King] ?? 0) !== 1) {
        return {
            isValid: false,
            error: 'Formation template must contain exactly one king',
        };
    }
    if ((counts[PieceType.Veteran] ?? 0) > 0) {
        return {
            isValid: false,
            error: 'Formation template cannot include Veteran in starting setup',
        };
    }
    if ((counts[PieceType.Pawn] ?? 0) < 3) {
        return {
            isValid: false,
            error: 'Formation template must include at least 3 pawns',
        };
    }
    if ((counts[PieceType.Rook] ?? 0) > 2) {
        return {
            isValid: false,
            error: 'Formation template cannot include more than 2 rooks',
        };
    }
    if ((counts[PieceType.Guard] ?? 0) > 2) {
        return {
            isValid: false,
            error: 'Formation template cannot include more than 2 guards',
        };
    }
    if ((counts[PieceType.Bishop] ?? 0) > 2) {
        return {
            isValid: false,
            error: 'Formation template cannot include more than 2 bishops',
        };
    }
    if ((counts[PieceType.Knight] ?? 0) > 2) {
        return {
            isValid: false,
            error: 'Formation template cannot include more than 2 knights',
        };
    }
    const computedCost = calculateFormationCost(template.pieces);
    if (template.cost !== computedCost) {
        return {
            isValid: false,
            error: 'Formation template cost does not match piece composition',
        };
    }
    if (template.cost < FORMATION_COST_RANGE.min ||
        template.cost > FORMATION_COST_RANGE.max) {
        return {
            isValid: false,
            error: `Formation template cost must be between ${FORMATION_COST_RANGE.min} and ${FORMATION_COST_RANGE.max}`,
        };
    }
    return { isValid: true };
};
export const validateFormationSelection = (playerIds, templates, selections, required) => {
    const byId = new Map();
    for (const template of templates) {
        const validation = validateFormationTemplate(template);
        if (!validation.isValid) {
            throw new Error(`Invalid formation template "${template.id}": ${validation.error}`);
        }
        byId.set(template.id, template);
    }
    const resolved = {};
    for (const playerId of playerIds) {
        const selectedId = selections?.[playerId];
        if (!selectedId) {
            if (required) {
                throw new Error(`Missing formation selection for player "${playerId}"`);
            }
            resolved[playerId] = templates[0];
            continue;
        }
        const selected = byId.get(selectedId);
        if (!selected) {
            throw new Error(`Unknown formation selected: "${selectedId}"`);
        }
        resolved[playerId] = selected;
    }
    return resolved;
};
//# sourceMappingURL=formation.js.map
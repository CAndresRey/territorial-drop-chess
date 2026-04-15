import { PieceType } from './types.js';
/** Is a coordinate on the board? */
export const inBounds = (c, boardSize) => c.x >= 0 && c.x < boardSize && c.y >= 0 && c.y < boardSize;
/** Get the piece on a given square, or undefined */
export const pieceAt = (pieces, coord) => pieces.find((p) => p.position.x === coord.x && p.position.y === coord.y);
/** Cast a sliding ray and collect valid squares until blocked */
const slideRay = (from, dx, dy, pieces, owner, boardSize) => {
    const moves = [];
    let cur = { x: from.x + dx, y: from.y + dy };
    while (inBounds(cur, boardSize)) {
        const occupant = pieceAt(pieces, cur);
        if (occupant) {
            if (occupant.owner !== owner)
                moves.push({ ...cur }); // enemy — can capture
            break; // blocked either way
        }
        moves.push({ ...cur });
        cur = { x: cur.x + dx, y: cur.y + dy };
    }
    return moves;
};
// ── King ────────────────────────────────────────────────────────────────────
const getKingMoves = (state, piece) => {
    const { pieces, config } = state;
    const { boardSize } = config;
    const moves = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0)
                continue;
            const target = { x: piece.position.x + dx, y: piece.position.y + dy };
            if (!inBounds(target, boardSize))
                continue;
            const occ = pieceAt(pieces, target);
            if (!occ || occ.owner !== piece.owner)
                moves.push(target);
        }
    }
    return moves;
};
// ── Guard (1-2 squares any direction, no jump) ──────────────────────────────
const getGuardMoves = (state, piece) => {
    const { pieces, config } = state;
    const { boardSize } = config;
    const moves = [];
    const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
    ];
    for (const [dx, dy] of dirs) {
        // Step 1
        const step1 = { x: piece.position.x + dx, y: piece.position.y + dy };
        if (!inBounds(step1, boardSize))
            continue;
        const occ1 = pieceAt(pieces, step1);
        if (occ1) {
            if (occ1.owner !== piece.owner)
                moves.push(step1); // capture step 1
            continue; // blocked at step 1; cannot reach step 2
        }
        moves.push(step1);
        // Step 2
        const step2 = { x: step1.x + dx, y: step1.y + dy };
        if (!inBounds(step2, boardSize))
            continue;
        const occ2 = pieceAt(pieces, step2);
        if (!occ2 || occ2.owner !== piece.owner)
            moves.push(step2);
    }
    return moves;
};
// ── Rook (orthogonal slide) ──────────────────────────────────────────────────
const getRookMoves = (state, piece) => {
    const { pieces, config } = state;
    const { boardSize } = config;
    const rays = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ];
    return rays.flatMap(([dx, dy]) => slideRay(piece.position, dx, dy, pieces, piece.owner, boardSize));
};
// ── Bishop (diagonal slide) ──────────────────────────────────────────────────
const getBishopMoves = (state, piece) => {
    const { pieces, config } = state;
    const { boardSize } = config;
    const rays = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
    ];
    return rays.flatMap(([dx, dy]) => slideRay(piece.position, dx, dy, pieces, piece.owner, boardSize));
};
// ── Knight (L-shape, can jump) ───────────────────────────────────────────────
const getKnightMoves = (state, piece) => {
    const { pieces, config } = state;
    const { boardSize } = config;
    const offsets = [
        [2, 1],
        [2, -1],
        [-2, 1],
        [-2, -1],
        [1, 2],
        [1, -2],
        [-1, 2],
        [-1, -2],
    ];
    return offsets
        .map(([dx, dy]) => ({ x: piece.position.x + dx, y: piece.position.y + dy }))
        .filter((t) => inBounds(t, boardSize))
        .filter((t) => {
        const occ = pieceAt(pieces, t);
        return !occ || occ.owner !== piece.owner;
    });
};
// ── Center and Pawn Logic ───────────────────────────────────────────────────
export const getCenterBounds = (boardSize, playerCount) => {
    const centerSize = playerCount === 2 ? 3 : 5;
    const start = Math.floor((boardSize - centerSize) / 2);
    const end = start + centerSize - 1;
    return { min: start, max: end };
};
export const isInCenter = (c, boardSize, playerCount) => {
    const { min, max } = getCenterBounds(boardSize, playerCount);
    return c.x >= min && c.x <= max && c.y >= min && c.y <= max;
};
/**
 * Compute the primary direction vector for a Pawn based on its target center.
 */
export const getPawnDirection = (pos, boardSize) => {
    const center = (boardSize - 1) / 2;
    const rawDx = center - pos.x;
    const rawDy = center - pos.y;
    if (rawDx === 0 && rawDy === 0)
        return { dx: 0, dy: 0 };
    const adx = Math.abs(rawDx);
    const ady = Math.abs(rawDy);
    if (adx >= ady) {
        return { dx: Math.sign(rawDx), dy: adx === ady ? Math.sign(rawDy) : 0 };
    }
    else {
        return { dx: 0, dy: Math.sign(rawDy) };
    }
};
const getPawnMoves = (state, piece) => {
    const { pieces, config } = state;
    const { boardSize } = config;
    const moves = [];
    const { dx, dy } = getPawnDirection(piece.position, boardSize);
    if (dx === 0 && dy === 0)
        return [];
    // Forward move (no capture)
    const fwd = { x: piece.position.x + dx, y: piece.position.y + dy };
    if (inBounds(fwd, boardSize) && !pieceAt(pieces, fwd)) {
        moves.push(fwd);
    }
    // Diagonal captures
    const captureOffsets = [];
    if (dx !== 0 && dy === 0) {
        captureOffsets.push({ cx: dx, cy: 1 }, { cx: dx, cy: -1 });
    }
    else if (dx === 0 && dy !== 0) {
        captureOffsets.push({ cx: 1, cy: dy }, { cx: -1, cy: dy });
    }
    else {
        captureOffsets.push({ cx: dx, cy: 0 }, { cx: 0, cy: dy });
    }
    for (const { cx: ox, cy: oy } of captureOffsets) {
        const cap = { x: piece.position.x + ox, y: piece.position.y + oy };
        if (!inBounds(cap, boardSize))
            continue;
        const occ = pieceAt(pieces, cap);
        if (occ && occ.owner !== piece.owner)
            moves.push(cap);
    }
    return moves;
};
// ── Veteran (like King — 1 any direction) ───────────────────────────────────
const getVeteranMoves = (state, piece) => getKingMoves(state, piece);
export const PIECE_DEFINITIONS = {
    [PieceType.King]: {
        type: PieceType.King,
        movement: getKingMoves,
    },
    [PieceType.Guard]: {
        type: PieceType.Guard,
        movement: getGuardMoves,
    },
    [PieceType.Rook]: {
        type: PieceType.Rook,
        movement: getRookMoves,
    },
    [PieceType.Knight]: {
        type: PieceType.Knight,
        movement: getKnightMoves,
    },
    [PieceType.Bishop]: {
        type: PieceType.Bishop,
        movement: getBishopMoves,
    },
    [PieceType.Pawn]: {
        type: PieceType.Pawn,
        movement: getPawnMoves,
    },
    [PieceType.Veteran]: {
        type: PieceType.Veteran,
        movement: getVeteranMoves,
    },
};
export const getPieceDefinition = (pieceType) => PIECE_DEFINITIONS[pieceType];
// ── Public API ───────────────────────────────────────────────────────────────
export const getMovesForPiece = (piece, state) => getPieceDefinition(piece.type).movement(state, piece);
//# sourceMappingURL=movement.js.map
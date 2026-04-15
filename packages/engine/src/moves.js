import { getMovesForPiece, inBounds, isInCenter, pieceAt } from './movement.js';
import { PieceType, } from './types.js';
// ── Helpers ──────────────────────────────────────────────────────────────────
/** Deep-clone a GameState (simple JSON clone — fine for engine internals) */
export const cloneState = (state) => JSON.parse(JSON.stringify(state));
/** Piece point values used for conflict resolution */
export const PIECE_VALUE = {
    [PieceType.King]: 7,
    [PieceType.Guard]: 3,
    [PieceType.Rook]: 2,
    [PieceType.Knight]: 1,
    [PieceType.Bishop]: 1,
    [PieceType.Pawn]: 1,
    [PieceType.Veteran]: 2,
};
export const validateAction = (action, state) => {
    if (action.type === 'move') {
        return validateMove(action, state);
    }
    else {
        return validateDrop(action, state);
    }
};
const validateMove = (action, state) => {
    const piece = state.pieces.find((p) => p.id === action.pieceId);
    const { boardSize, playerCount } = state.config;
    if (!piece)
        return { isValid: false, error: 'Piece not found' };
    if (piece.position.x !== action.from.x ||
        piece.position.y !== action.from.y) {
        return { isValid: false, error: 'Origin does not match piece position' };
    }
    // Find player ID for this piece
    if (!inBounds(action.to, boardSize))
        return { isValid: false, error: 'Out of bounds' };
    const legalMoves = getMovesForPiece(piece, state);
    const isLegal = legalMoves.some((c) => c.x === action.to.x && c.y === action.to.y);
    if (!isLegal)
        return { isValid: false, error: 'Illegal move for piece type' };
    return { isValid: true };
};
const validateDrop = (action, state) => {
    const { playerCount, boardSize } = state.config;
    // 2 players: drop disabled
    if (playerCount === 2)
        return { isValid: false, error: 'Drops disabled in 2-player mode' };
    const player = state.players[action.playerId];
    if (!player)
        return { isValid: false, error: 'Player not found' };
    if (!player.dropReserve.includes(action.pieceType))
        return { isValid: false, error: 'Piece not in reserve' };
    if (action.pieceType === PieceType.King)
        return { isValid: false, error: 'Cannot drop a King' };
    if (!inBounds(action.to, boardSize))
        return { isValid: false, error: 'Out of bounds' };
    if (pieceAt(state.pieces, action.to))
        return { isValid: false, error: 'Target square is occupied' };
    // 5-8 players drop rules
    if (playerCount >= 5) {
        // Cooldown check (if we had a history of last drop per player)
        let lastRoundWithDrop;
        for (let i = state.history.length - 1; i >= 0; i--) {
            const round = state.history[i];
            if (round.actions.some((histAction) => histAction.type === 'drop' &&
                histAction.playerId === action.playerId)) {
                lastRoundWithDrop = round;
                break;
            }
        }
        if (lastRoundWithDrop && state.round - lastRoundWithDrop.round < 2) {
            return { isValid: false, error: 'Drop cooldown active (1 turn)' };
        }
        // Territory check: own or neutral
        const isOwnTerritory = player.territory?.squares.some((s) => s.x === action.to.x && s.y === action.to.y);
        const isOtherTerritory = Object.values(state.players).some((p) => p.id !== action.playerId &&
            p.territory?.squares.some((s) => s.x === action.to.x && s.y === action.to.y));
        if (isOtherTerritory && !isOwnTerritory) {
            return { isValid: false, error: 'Cannot drop in enemy territory' };
        }
    }
    // Pawns cannot be dropped on the board edges
    if (action.pieceType === PieceType.Pawn) {
        const { x, y } = action.to;
        if (x === 0 || x === boardSize - 1 || y === 0 || y === boardSize - 1) {
            return { isValid: false, error: 'Pawn cannot be dropped on board edge' };
        }
    }
    return { isValid: true };
};
// ── Apply Action ───────────────────────────────────────────────────────────────
export const applyAction = (action, state) => {
    if (action.type === 'move') {
        return applyMove(action, state);
    }
    else {
        return applyDrop(action, state);
    }
};
const applyMove = (action, state) => {
    const next = cloneState(state);
    const movingPiece = next.pieces.find((p) => p.id === action.pieceId);
    const playerId = movingPiece.owner;
    // Check if there's an enemy piece at the target
    const capturedIdx = next.pieces.findIndex((p) => p.position.x === action.to.x &&
        p.position.y === action.to.y &&
        p.owner !== playerId);
    if (capturedIdx !== -1) {
        const captured = next.pieces[capturedIdx];
        if (captured.type === PieceType.King) {
            next.players[captured.owner].isEliminated = true;
            next.players[playerId].score += PIECE_VALUE[PieceType.King];
        }
        else {
            const reserveType = captured.type === PieceType.Veteran ? PieceType.Pawn : captured.type;
            next.players[playerId].dropReserve.push(reserveType);
            next.players[playerId].score += PIECE_VALUE[captured.type];
        }
        next.pieces.splice(capturedIdx, 1);
    }
    // Move piece to target
    movingPiece.position = action.to;
    // Promotion: Pawn entering center → Veteran
    if (movingPiece.type === PieceType.Pawn &&
        isInCenter(action.to, next.config.boardSize, next.config.playerCount)) {
        movingPiece.type = PieceType.Veteran;
    }
    return next;
};
const applyDrop = (action, state) => {
    const next = cloneState(state);
    const player = next.players[action.playerId];
    // Remove one instance from reserve
    const idx = player.dropReserve.indexOf(action.pieceType);
    player.dropReserve.splice(idx, 1);
    // Place piece on board
    const newPiece = {
        id: `drop_${action.playerId}_r${next.round}_h${next.history.length}_x${action.to.x}_y${action.to.y}`,
        owner: action.playerId,
        type: action.pieceType,
        position: action.to,
    };
    next.pieces.push(newPiece);
    return next;
};
//# sourceMappingURL=moves.js.map
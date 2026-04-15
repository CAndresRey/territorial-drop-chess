import { getMovesForPiece } from './movement.js';
import { validateAction } from './moves.js';
import { resolveRound } from './resolver.js';
const compareActions = (a, b) => {
    if (a.type !== b.type)
        return a.type === 'move' ? -1 : 1;
    if (a.type === 'move' && b.type === 'move') {
        if (a.pieceId !== b.pieceId)
            return a.pieceId.localeCompare(b.pieceId);
        if (a.to.x !== b.to.x)
            return a.to.x - b.to.x;
        return a.to.y - b.to.y;
    }
    if (a.type === 'drop' && b.type === 'drop') {
        if (a.pieceType !== b.pieceType)
            return a.pieceType.localeCompare(b.pieceType);
        if (a.to.x !== b.to.x)
            return a.to.x - b.to.x;
        return a.to.y - b.to.y;
    }
    return 0;
};
export const getLegalActions = (state, playerId) => {
    const player = state.players[playerId];
    if (!player || player.isEliminated)
        return [];
    const legalMoves = [];
    const ownedPieces = state.pieces.filter((piece) => piece.owner === playerId);
    for (const piece of ownedPieces) {
        const moves = getMovesForPiece(piece, state);
        for (const to of moves) {
            const candidate = {
                type: 'move',
                pieceId: piece.id,
                from: piece.position,
                to,
            };
            if (validateAction(candidate, state).isValid) {
                legalMoves.push(candidate);
            }
        }
    }
    const legalDrops = [];
    for (const pieceType of player.dropReserve) {
        for (let x = 0; x < state.config.boardSize; x++) {
            for (let y = 0; y < state.config.boardSize; y++) {
                const candidate = {
                    type: 'drop',
                    playerId,
                    pieceType,
                    to: { x, y },
                };
                if (validateAction(candidate, state).isValid) {
                    legalDrops.push(candidate);
                }
            }
        }
    }
    return [...legalMoves, ...legalDrops].sort(compareActions);
};
export const applyActions = (state, actions) => resolveRound(state, actions).state;
export const evaluateState = (state) => {
    const scores = Object.fromEntries(Object.entries(state.players).map(([playerId, player]) => [
        playerId,
        player.score,
    ]));
    const topScore = Math.max(...Object.values(scores));
    const leaderIds = Object.entries(scores)
        .filter(([, score]) => score === topScore)
        .map(([playerId]) => playerId)
        .sort();
    return {
        scores,
        leaderIds,
        round: state.round,
        status: state.status,
    };
};
//# sourceMappingURL=engine.js.map
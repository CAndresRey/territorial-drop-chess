import { getMovesForPiece } from './movement';
import { validateAction } from './moves';
import { GameState, PlayerAction, PlayerId } from './types';
import { resolveRound } from './resolver';

const compareActions = (a: PlayerAction, b: PlayerAction): number => {
  if (a.type !== b.type) return a.type === 'move' ? -1 : 1;
  if (a.type === 'move' && b.type === 'move') {
    if (a.pieceId !== b.pieceId) return a.pieceId.localeCompare(b.pieceId);
    if (a.to.x !== b.to.x) return a.to.x - b.to.x;
    return a.to.y - b.to.y;
  }
  if (a.type === 'drop' && b.type === 'drop') {
    if (a.pieceType !== b.pieceType) return a.pieceType.localeCompare(b.pieceType);
    if (a.to.x !== b.to.x) return a.to.x - b.to.x;
    return a.to.y - b.to.y;
  }
  return 0;
};

export const getLegalActions = (
  state: GameState,
  playerId: PlayerId,
): PlayerAction[] => {
  const player = state.players[playerId];
  if (!player || player.isEliminated) return [];

  const legalMoves: PlayerAction[] = [];
  const ownedPieces = state.pieces.filter((piece) => piece.owner === playerId);
  for (const piece of ownedPieces) {
    const moves = getMovesForPiece(piece, state);
    for (const to of moves) {
      const candidate: PlayerAction = {
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

  const legalDrops: PlayerAction[] = [];
  for (const pieceType of player.dropReserve) {
    for (let x = 0; x < state.config.boardSize; x++) {
      for (let y = 0; y < state.config.boardSize; y++) {
        const candidate: PlayerAction = {
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

export const applyActions = (
  state: GameState,
  actions: Record<PlayerId, PlayerAction | null>,
): GameState => resolveRound(state, actions).state;

export interface StateEvaluation {
  scores: Record<PlayerId, number>;
  leaderIds: PlayerId[];
  round: number;
  status: GameState['status'];
}

export const evaluateState = (state: GameState): StateEvaluation => {
  const scores = Object.fromEntries(
    Object.entries(state.players).map(([playerId, player]) => [playerId, player.score]),
  ) as Record<PlayerId, number>;

  const topScore = Math.max(...Object.values(scores));
  const leaderIds = Object.entries(scores)
    .filter(([, score]) => score === topScore)
    .map(([playerId]) => playerId as PlayerId)
    .sort();

  return {
    scores,
    leaderIds,
    round: state.round,
    status: state.status,
  };
};

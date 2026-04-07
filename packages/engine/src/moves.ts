import { GameState, Piece, PieceType, PlayerAction, PlayerId, Coordinate, ValidationResult } from './types';
import { getMovesForPiece, inBounds, pieceAt, isInCenter } from './movement';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Deep-clone a GameState (simple JSON clone — fine for engine internals) */
export const cloneState = (state: GameState): GameState =>
  JSON.parse(JSON.stringify(state));

/** Piece point values used for conflict resolution */
export const PIECE_VALUE: Record<PieceType, number> = {
  [PieceType.King]:    7,
  [PieceType.Guard]:   3,
  [PieceType.Rook]:    2,
  [PieceType.Knight]:  1,
  [PieceType.Bishop]:  1,
  [PieceType.Pawn]:    1,
  [PieceType.Veteran]: 2,
};

// ── Anti-Focus-Fire check ────────────────────────────────────────────────────

/**
 * Returns the set of distinct opponent playerIds whose pieces can reach `coord`
 * in one move (given the board state AFTER the proposed move is applied).
 */
const threatenersAt = (coord: Coordinate, ownerOf: PlayerId, pieces: Piece[], state: GameState): Set<PlayerId> => {
  const set = new Set<PlayerId>();
  for (const p of pieces) {
    if (p.owner === ownerOf) continue;
    const hypothetical: GameState = { ...state, pieces };
    const reachable = getMovesForPiece(p, hypothetical);
    if (reachable.some(c => c.x === coord.x && c.y === coord.y)) {
      set.add(p.owner);
    }
  }
  return set;
};

// ── Validation ───────────────────────────────────────────────────────────────

export const validateAction = (action: PlayerAction, state: GameState): ValidationResult => {
  if (action.type === 'move') {
    return validateMove(action, state);
  } else {
    return validateDrop(action, state);
  }
};

const validateMove = (action: Extract<PlayerAction, { type: 'move' }>, state: GameState): ValidationResult => {
  const piece = state.pieces.find(p => p.id === action.pieceId);
  const { boardSize, playerCount } = state.config;
  
  if (!piece) return { isValid: false, error: 'Piece not found' };
  if (piece.position.x !== action.from.x || piece.position.y !== action.from.y) {
    return { isValid: false, error: 'Origin does not match piece position' };
  }
  
  // Find player ID for this piece
  if (!inBounds(action.to, boardSize)) return { isValid: false, error: 'Out of bounds' };

  const legalMoves = getMovesForPiece(piece, state);
  const isLegal = legalMoves.some(c => c.x === action.to.x && c.y === action.to.y);
  if (!isLegal) return { isValid: false, error: 'Illegal move for piece type' };

  // Anti-Focus-Fire: ≥3 players only
  if (playerCount >= 3) {
    const simulatedPieces = state.pieces
      .filter(p => p.id !== action.pieceId)
      .map(p => p);
    const movedPiece: Piece = { ...piece, position: action.to };
    const afterPieces = [...simulatedPieces, movedPiece];

    const threateners = threatenersAt(action.to, piece.owner, afterPieces, { ...state, pieces: afterPieces });
    if (threateners.size >= 2 && piece.type !== PieceType.King) {
      return { isValid: false, error: 'Multi-threat: move exposes piece to ≥2 opponents' };
    }
  }

  return { isValid: true };
};

const validateDrop = (action: Extract<PlayerAction, { type: 'drop' }>, state: GameState): ValidationResult => {
  const { playerCount, boardSize } = state.config;
  
  // 2 players: drop disabled
  if (playerCount === 2) return { isValid: false, error: 'Drops disabled in 2-player mode' };

  const player = state.players[action.playerId];
  if (!player) return { isValid: false, error: 'Player not found' };
  if (!player.dropReserve.includes(action.pieceType)) return { isValid: false, error: 'Piece not in reserve' };
  if (action.pieceType === PieceType.King) return { isValid: false, error: 'Cannot drop a King' };
  if (!inBounds(action.to, boardSize)) return { isValid: false, error: 'Out of bounds' };
  if (pieceAt(state.pieces, action.to)) return { isValid: false, error: 'Target square is occupied' };

  // 5-8 players drop rules
  if (playerCount >= 5) {
    // Cooldown check (if we had a history of last drop per player)
    let lastRoundWithDrop: { round: number; actions: PlayerAction[] } | undefined;
    for (let i = state.history.length - 1; i >= 0; i--) {
      const round = state.history[i];
      if (
        round.actions.some(
          (histAction: PlayerAction) =>
            histAction.type === 'drop' && histAction.playerId === action.playerId,
        )
      ) {
        lastRoundWithDrop = round;
        break;
      }
    }
    if (lastRoundWithDrop && state.round - lastRoundWithDrop.round < 2) {
      return { isValid: false, error: 'Drop cooldown active (1 turn)' };
    }

    // Territory check: own or neutral
    const isOwnTerritory = player.territory?.squares.some(s => s.x === action.to.x && s.y === action.to.y);
    const isOtherTerritory = Object.values(state.players).some(p => 
      p.id !== action.playerId && p.territory?.squares.some(s => s.x === action.to.x && s.y === action.to.y)
    );
    
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

export const applyAction = (action: PlayerAction, state: GameState): GameState => {
  if (action.type === 'move') {
    return applyMove(action, state);
  } else {
    return applyDrop(action, state);
  }
};

const applyMove = (action: Extract<PlayerAction, { type: 'move' }>, state: GameState): GameState => {
  const next = cloneState(state);
  const movingPiece = next.pieces.find(p => p.id === action.pieceId)!;
  const playerId = movingPiece.owner;

  // Check if there's an enemy piece at the target
  const capturedIdx = next.pieces.findIndex(
    p => p.position.x === action.to.x && p.position.y === action.to.y && p.owner !== playerId
  );

  if (capturedIdx !== -1) {
    const captured = next.pieces[capturedIdx];
    if (captured.type === PieceType.King) {
      next.players[captured.owner].isEliminated = true;
      next.players[playerId].score += PIECE_VALUE[PieceType.King];
    } else {
      const reserveType = captured.type === PieceType.Veteran ? PieceType.Pawn : captured.type;
      next.players[playerId].dropReserve.push(reserveType);
      next.players[playerId].score += PIECE_VALUE[captured.type];
    }
    next.pieces.splice(capturedIdx, 1);
  }

  // Move piece to target
  movingPiece.position = action.to;

  // Promotion: Pawn entering center → Veteran
  if (movingPiece.type === PieceType.Pawn && isInCenter(action.to, next.config.boardSize, next.config.playerCount)) {
    movingPiece.type = PieceType.Veteran;
  }

  return next;
};

const applyDrop = (action: Extract<PlayerAction, { type: 'drop' }>, state: GameState): GameState => {
  const next = cloneState(state);
  const player = next.players[action.playerId];

  // Remove one instance from reserve
  const idx = player.dropReserve.indexOf(action.pieceType);
  player.dropReserve.splice(idx, 1);

  // Place piece on board
  const newPiece: Piece = {
    id: `drop_${action.playerId}_r${next.round}_h${next.history.length}_x${action.to.x}_y${action.to.y}`,
    owner: action.playerId,
    type: action.pieceType,
    position: action.to,
  };
  next.pieces.push(newPiece);

  return next;
};

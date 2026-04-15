import {
  Coordinate,
  GameState,
  PieceType,
  PlayerAction,
  PlayerId,
  RuleModule,
  ScoreDelta,
  ValidationResult,
  getMovesForPiece,
  pieceAt,
} from '@tdc/engine';

export class RuleManager {
  private rules: RuleModule[] = [];

  constructor(rules: RuleModule[]) {
    this.rules = rules;
  }

  validateMove(state: GameState, action: PlayerAction): ValidationResult {
    for (const rule of this.rules) {
      if (rule.onValidateMove) {
        const result = rule.onValidateMove({ state, action });
        if (!result.isValid) return result;
      }
    }
    return { isValid: true };
  }

  resolveTurn(state: GameState, actions: PlayerAction[]): void {
    for (const rule of this.rules) {
      if (rule.onResolveTurn) {
        rule.onResolveTurn({ state, actions });
      }
    }
  }

  calculateScores(state: GameState): ScoreDelta[] {
    const allDeltas: ScoreDelta[] = [];
    for (const rule of this.rules) {
      if (rule.onScore) {
        const deltas = rule.onScore({ state });
        allDeltas.push(...deltas);
      }
    }
    return allDeltas;
  }
}

// ── Multi-Threat Rule ────────────────────────────────────────────────────────

export const MultiThreatRule: RuleModule = {
  name: 'multi-threat',
  onValidateMove({ state, action }) {
    if (action.type !== 'move') return { isValid: true };
    if (state.config.playerCount < 3) return { isValid: true };
    const movingPiece = state.pieces.find(
      (piece) => piece.id === action.pieceId,
    );
    if (!movingPiece || movingPiece.type === PieceType.King)
      return { isValid: true };

    const simulatedState: GameState = {
      ...state,
      pieces: state.pieces.map((piece) =>
        piece.id === action.pieceId
          ? { ...piece, position: { ...action.to } }
          : piece,
      ),
    };

    const threatOwners = new Set<PlayerId>();
    const opponentOwners = Array.from(
      new Set(
        simulatedState.pieces
          .filter((piece) => piece.owner !== movingPiece.owner)
          .map((piece) => piece.owner),
      ),
    );

    for (const owner of opponentOwners) {
      const ownerPieces = simulatedState.pieces.filter(
        (piece) => piece.owner === owner,
      );
      const canAttackTarget = ownerPieces.some((piece) =>
        getMovesForPiece(piece, simulatedState).some(
          (move) => move.x === action.to.x && move.y === action.to.y,
        ),
      );
      if (canAttackTarget) threatOwners.add(owner);
    }

    if (threatOwners.size >= 2) {
      return {
        isValid: false,
        error: 'Multi-threat: move exposes piece to >=2 opponents',
      };
    }
    return { isValid: true };
  },
};

// ── Territory Control Rule ───────────────────────────────────────────────────

export const TerritoryControlRule: RuleModule = {
  name: 'territory-control',
  onScore({ state }) {
    const deltas: ScoreDelta[] = [];
    if (state.config.playerCount <= 2) return deltas;

    // Pre-calculate reachable squares for all pieces
    const reachability = new Map<string, Set<PlayerId>>(); // "x,y" -> Set of players who can reach it

    for (const piece of state.pieces) {
      const moves = getMovesForPiece(piece, state);
      for (const m of moves) {
        const key = `${m.x},${m.y}`;
        if (!reachability.has(key)) reachability.set(key, new Set());
        reachability.get(key)!.add(piece.owner);
      }
    }

    // Evaluate each square in territories
    for (const player of Object.values(state.players)) {
      if (player.isEliminated || !player.territory) continue;

      let playerControlPoints = 0;
      for (const square of player.territory.squares) {
        const key = `${square.x},${square.y}`;
        const piece = pieceAt(state.pieces, square);

        if (piece) {
          if (piece.owner === player.id) {
            playerControlPoints += 1;
          }
        } else {
          const reachers = reachability.get(key);
          if (reachers && reachers.size === 1 && reachers.has(player.id)) {
            playerControlPoints += 1;
          }
        }
      }

      if (playerControlPoints > 0) {
        const delta = Math.floor(playerControlPoints / 5); // 1 point per 5 squares controlled
        if (delta <= 0) continue;
        deltas.push({
          playerId: player.id,
          delta,
          reason: 'Territory control',
        });
      }
    }

    return deltas;
  },
};

// ── Center Bonus Rule ────────────────────────────────────────────────────────

export const CenterBonusRule: RuleModule = {
  name: 'center-bonus',
  onScore({ state }) {
    const deltas: ScoreDelta[] = [];
    const { boardSize, playerCount } = state.config;
    const threshold = playerCount === 2 ? 2 : 3;
    const bonus = state.config.scoring.centerControl;

    for (const player of Object.values(state.players)) {
      if (player.isEliminated) continue;

      const count = state.pieces.filter(
        (p) =>
          p.owner === player.id &&
          isSquareInCenter(p.position, boardSize, playerCount),
      ).length;

      if (count >= threshold) {
        deltas.push({
          playerId: player.id,
          delta: bonus,
          reason: 'Center control',
        });
      }
    }
    return deltas;
  },
};

function isSquareInCenter(
  pos: Coordinate,
  boardSize: number,
  playerCount: number,
): boolean {
  const centerSize = playerCount === 2 ? 3 : 5;
  const start = Math.floor((boardSize - centerSize) / 2);
  const end = start + centerSize - 1;
  return pos.x >= start && pos.x <= end && pos.y >= start && pos.y <= end;
}

import { AIEvaluator } from '@tdc/ai-core';
import { DifficultyLevel, getDifficultyProfile } from '@tdc/difficulty';
import {
  Bot,
  DecisionContext,
  GameState,
  PIECE_VALUE,
  PersonalityProfile,
  Piece,
  PieceType,
  PlayerAction,
  PlayerId,
  applyAction,
  getMovesForPiece,
  isInCenter,
} from '@tdc/engine';

const actionSeedPart = (action: PlayerAction): string =>
  action.type === 'move'
    ? `m:${action.pieceId}:${action.from.x},${action.from.y}->${action.to.x},${action.to.y}`
    : `d:${action.playerId}:${action.pieceType}:${action.to.x},${action.to.y}`;

export class BaseBot implements Bot {
  constructor(
    public id: PlayerId,
    public personality: PersonalityProfile,
  ) {}

  protected selectBestAction(
    context: DecisionContext,
    personality: PersonalityProfile = this.personality,
  ): PlayerAction {
    const { legalActions } = context;
    if (legalActions.length === 0) return null as any; // Should not happen

    // Default strategy: pick action with highest evaluation
    let bestAction = legalActions[0];
    let bestScore = -Infinity;

    for (const action of legalActions) {
      // Simulate action
      const nextState = applyAction(action, context.state);
      const evalResult = AIEvaluator.evaluate(nextState, this.id, personality, {
        seed:
          context.seed === undefined
            ? undefined
            : `${context.seed}|${this.id}|${actionSeedPart(action)}`,
      });

      if (evalResult.score > bestScore) {
        bestScore = evalResult.score;
        bestAction = action;
      }
    }

    return bestAction;
  }

  decide(context: DecisionContext): PlayerAction {
    return this.selectBestAction(context, this.personality);
  }
}

export class RandomBot extends BaseBot {
  decide(context: DecisionContext): PlayerAction {
    const { legalActions } = context;
    if (context.seed === undefined) {
      return legalActions[Math.floor(Math.random() * legalActions.length)];
    }
    const hash = `${context.seed}|${this.id}|random`;
    let total = 0;
    for (let i = 0; i < hash.length; i++) total += hash.charCodeAt(i);
    return legalActions[total % legalActions.length];
  }
}

export class HeuristicBot extends BaseBot {
  private currentPhase: HeuristicPhase = 'opening';

  getCurrentPhase(): HeuristicPhase {
    return this.currentPhase;
  }

  private toPhasePersonality(phase: HeuristicPhase): PersonalityProfile {
    const clamp = (value: number): number => Math.max(0, Math.min(1, value));

    if (phase === 'opening') {
      return {
        aggression: clamp(this.personality.aggression - 0.15),
        greed: clamp(this.personality.greed - 0.1),
        riskTolerance: clamp(this.personality.riskTolerance - 0.15),
        focusBias: clamp(this.personality.focusBias + 0.1),
        randomness: clamp(this.personality.randomness),
      };
    }

    if (phase === 'expansion') {
      return {
        aggression: clamp(this.personality.aggression + 0.05),
        greed: clamp(this.personality.greed + 0.15),
        riskTolerance: clamp(this.personality.riskTolerance - 0.05),
        focusBias: clamp(this.personality.focusBias + 0.1),
        randomness: clamp(this.personality.randomness - 0.05),
      };
    }

    if (phase === 'combat') {
      return {
        aggression: clamp(this.personality.aggression + 0.2),
        greed: clamp(this.personality.greed + 0.1),
        riskTolerance: clamp(this.personality.riskTolerance + 0.05),
        focusBias: clamp(this.personality.focusBias + 0.2),
        randomness: clamp(this.personality.randomness - 0.1),
      };
    }

    return {
      aggression: clamp(this.personality.aggression + 0.15),
      greed: clamp(this.personality.greed + 0.25),
      riskTolerance: clamp(this.personality.riskTolerance),
      focusBias: clamp(this.personality.focusBias + 0.15),
      randomness: clamp(this.personality.randomness - 0.2),
    };
  }

  decide(context: DecisionContext): PlayerAction {
    this.currentPhase = inferHeuristicPhase(context.state, this.id);

    if (context.legalActions.length === 0) return null as any;

    // evaluate captures properly through the personality weights, not by bypassing it!

    const objectiveCandidate = selectObjectiveAction(
      context.legalActions,
      context.state,
      this.id,
      this.currentPhase,
    );
    if (objectiveCandidate) {
      return objectiveCandidate;
    }

    return this.selectBestAction(
      context,
      this.toPhasePersonality(this.currentPhase),
    );
  }
}

export class LookaheadBot extends BaseBot {
  // (Simplified lookahead - 1 turn)
  decide(context: DecisionContext): PlayerAction {
    // Current implementation of BaseBot is already 1-turn lookahead
    return super.decide(context);
  }
}

export const createBotForDifficulty = (
  playerId: PlayerId,
  difficulty: DifficultyLevel,
): HeuristicBot => new HeuristicBot(playerId, getDifficultyProfile(difficulty));

export type HeuristicPhase = 'opening' | 'expansion' | 'combat' | 'endgame';

const activePlayerCount = (state: GameState): number =>
  Object.values(state.players).filter((player) => !player.isEliminated).length;

export const inferHeuristicPhase = (
  state: GameState,
  playerId: PlayerId,
): HeuristicPhase => {
  if (state.players[playerId]?.isEliminated) return 'endgame';

  const alive = activePlayerCount(state);
  const maxRounds = Math.max(1, state.config.turnSystem.maxRounds);

  if (alive <= 2 || state.round >= Math.ceil(maxRounds * 0.75)) {
    return 'endgame';
  }
  if (state.round <= 3) {
    return 'opening';
  }
  if (alive >= 4 && state.round <= Math.ceil(maxRounds * 0.3)) {
    return 'expansion';
  }
  return 'combat';
};

export const isImmediateCaptureAction = (
  action: PlayerAction,
  state: GameState,
  playerId: PlayerId,
): boolean => {
  if (action.type !== 'move') return false;

  const targetPiece = state.pieces.find(
    (piece) =>
      piece.position.x === action.to.x && piece.position.y === action.to.y,
  );
  return !!targetPiece && targetPiece.owner !== playerId;
};

const countOwnPiecesInCenter = (state: GameState, playerId: PlayerId): number =>
  state.pieces.filter(
    (piece) =>
      piece.owner === playerId &&
      isInCenter(
        piece.position,
        state.config.boardSize,
        state.config.playerCount,
      ),
  ).length;

const findPlayerKing = (
  state: GameState,
  playerId: PlayerId,
): Piece | undefined =>
  state.pieces.find(
    (piece) => piece.owner === playerId && piece.type === PieceType.King,
  );

const countKingThreats = (state: GameState, playerId: PlayerId): number => {
  const king = findPlayerKing(state, playerId);
  if (!king) return 0;

  let threats = 0;
  for (const piece of state.pieces) {
    if (piece.owner === playerId) continue;
    const moves = getMovesForPiece(piece, state);
    if (
      moves.some(
        (target) =>
          target.x === king.position.x && target.y === king.position.y,
      )
    ) {
      threats += 1;
    }
  }
  return threats;
};

const countEnemyKingsThreatenedBy = (
  state: GameState,
  playerId: PlayerId,
): number => {
  const enemyKings = state.pieces.filter(
    (piece) => piece.owner !== playerId && piece.type === PieceType.King,
  );
  if (enemyKings.length === 0) return 0;

  let threatened = 0;
  for (const king of enemyKings) {
    const threatenedBy = state.pieces
      .filter((piece) => piece.owner === playerId)
      .some((piece) => {
        const moves = getMovesForPiece(piece, state);
        return moves.some(
          (target) =>
            target.x === king.position.x && target.y === king.position.y,
        );
      });

    if (threatenedBy) threatened += 1;
  }

  return threatened;
};

const totalMobility = (state: GameState, playerId: PlayerId): number => {
  let mobility = 0;
  for (const piece of state.pieces) {
    if (piece.owner !== playerId) continue;
    mobility += getMovesForPiece(piece, state).length;
  }
  return mobility;
};

const captureValueFromAction = (
  action: PlayerAction,
  state: GameState,
  playerId: PlayerId,
): number => {
  if (action.type !== 'move') return 0;

  const target = state.pieces.find(
    (piece) =>
      piece.position.x === action.to.x && piece.position.y === action.to.y,
  );
  if (!target || target.owner === playerId) return 0;
  return PIECE_VALUE[target.type];
};

const dropTimingScore = (
  action: PlayerAction,
  state: GameState,
  phase: HeuristicPhase,
): number => {
  if (action.type !== 'drop') return 0;

  const phaseWeight: Record<HeuristicPhase, number> = {
    opening: 1.2,
    expansion: 2.2,
    combat: 1.0,
    endgame: 0.7,
  };

  const centerBonus = isInCenter(
    action.to,
    state.config.boardSize,
    state.config.playerCount,
  )
    ? 2.5
    : 0.5;
  return PIECE_VALUE[action.pieceType] * phaseWeight[phase] + centerBonus;
};

const objectiveWeightsByPhase: Record<
  HeuristicPhase,
  {
    centerDelta: number;
    kingSafetyDelta: number;
    enemyKingPressureDelta: number;
    mobilityDelta: number;
    captureValue: number;
    dropTiming: number;
  }
> = {
  opening: {
    centerDelta: 2.5,
    kingSafetyDelta: 1.8,
    enemyKingPressureDelta: 1.2,
    mobilityDelta: 0.6,
    captureValue: 2.5, // Aggressive: take material when available
    dropTiming: 1.0,
  },
  expansion: {
    centerDelta: 2.0,
    kingSafetyDelta: 2.0,
    enemyKingPressureDelta: 1.5,
    mobilityDelta: 0.5,
    captureValue: 3.0, // Very aggressive: expand through captures
    dropTiming: 1.5,
  },
  combat: {
    centerDelta: 0.8,
    kingSafetyDelta: 2.8,
    enemyKingPressureDelta: 2.0,
    mobilityDelta: 0.4,
    captureValue: 4.0, // Maximum aggression
    dropTiming: 0.9,
  },
  endgame: {
    centerDelta: 0.5,
    kingSafetyDelta: 3.2,
    enemyKingPressureDelta: 2.5,
    mobilityDelta: 0.3,
    captureValue: 5.0, // All-in on captures for finishing
    dropTiming: 0.5,
  },
};

export const scoreObjectiveAction = (
  action: PlayerAction,
  state: GameState,
  playerId: PlayerId,
  phase: HeuristicPhase,
): number => {
  const nextState = applyAction(action, state);

  const centerDelta =
    countOwnPiecesInCenter(nextState, playerId) -
    countOwnPiecesInCenter(state, playerId);
  const kingSafetyDelta =
    countKingThreats(state, playerId) - countKingThreats(nextState, playerId);
  const enemyKingPressureDelta =
    countEnemyKingsThreatenedBy(nextState, playerId) -
    countEnemyKingsThreatenedBy(state, playerId);
  const mobilityDelta =
    totalMobility(nextState, playerId) - totalMobility(state, playerId);
  const captureValue = captureValueFromAction(action, state, playerId);
  const dropTiming = dropTimingScore(action, state, phase);

  const weights = objectiveWeightsByPhase[phase];
  let baseScore =
    centerDelta * weights.centerDelta +
    kingSafetyDelta * weights.kingSafetyDelta +
    enemyKingPressureDelta * weights.enemyKingPressureDelta +
    mobilityDelta * weights.mobilityDelta +
    captureValue * weights.captureValue +
    dropTiming * weights.dropTiming;

  // Anti-flip-flop penalty: if this move returns to where the piece was recently, penalize it heavily.
  if (action.type === 'move') {
    for (
      let i = state.history.length - 1;
      i >= Math.max(0, state.history.length - 4);
      i--
    ) {
      const histActions = state.history[i].actions;
      const prevAction = histActions.find(
        (a) => a.type === 'move' && a.pieceId === action.pieceId,
      ) as Extract<PlayerAction, { type: 'move' }>;
      if (
        prevAction &&
        prevAction.from.x === action.to.x &&
        prevAction.from.y === action.to.y
      ) {
        baseScore -= 10.0; // Huge penalty for repeating states
        break;
      }
    }
  }

  return baseScore;
};

export const selectObjectiveAction = (
  legalActions: PlayerAction[],
  state: GameState,
  playerId: PlayerId,
  phase: HeuristicPhase,
): PlayerAction | null => {
  if (legalActions.length === 0) return null;

  let bestAction: PlayerAction | null = null;
  let bestScore = -Infinity;
  let bestSeed = '';

  for (const action of legalActions) {
    const score = scoreObjectiveAction(action, state, playerId, phase);
    const seed = actionSeedPart(action);

    if (
      score > bestScore ||
      (score === bestScore && (bestAction === null || seed < bestSeed))
    ) {
      bestScore = score;
      bestAction = action;
      bestSeed = seed;
    }
  }

  return bestAction;
};

const captureActionValue = (
  action: PlayerAction,
  state: GameState,
  playerId: PlayerId,
): number => {
  if (
    !isImmediateCaptureAction(action, state, playerId) ||
    action.type !== 'move'
  ) {
    return -1;
  }
  const targetPiece = state.pieces.find(
    (piece) =>
      piece.position.x === action.to.x && piece.position.y === action.to.y,
  );
  if (!targetPiece) return -1;
  return PIECE_VALUE[targetPiece.type];
};

const selectBestImmediateCapture = (
  legalActions: PlayerAction[],
  state: GameState,
  playerId: PlayerId,
): PlayerAction | null => {
  let bestAction: PlayerAction | null = null;
  let bestValue = -1;

  for (const action of legalActions) {
    let isFlipFlop = false;
    if (action.type === 'move') {
      for (
        let i = state.history.length - 1;
        i >= Math.max(0, state.history.length - 4);
        i--
      ) {
        const prevAction = state.history[i].actions.find(
          (a) => a.type === 'move' && a.pieceId === action.pieceId,
        ) as Extract<PlayerAction, { type: 'move' }>;
        if (
          prevAction &&
          prevAction.from.x === action.to.x &&
          prevAction.from.y === action.to.y
        ) {
          isFlipFlop = true;
          break;
        }
      }
    }
    if (isFlipFlop) continue;
    const value = captureActionValue(action, state, playerId);
    if (value > bestValue) {
      bestValue = value;
      bestAction = action;
    }
  }

  return bestValue >= 0 ? bestAction : null;
};

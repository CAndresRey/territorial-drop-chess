import {
  GameState,
  PlayerAction,
  PlayerId,
  Bot,
  PersonalityProfile,
  DecisionContext,
} from '../../engine/src/types';
import { applyAction } from '../../engine/src/moves';
import { PIECE_VALUE } from '../../engine/src/moves';
import { AIEvaluator } from '../../ai-core/src/index';
import { DifficultyLevel, getDifficultyProfile } from '../../difficulty/src/index';

const actionSeedPart = (action: PlayerAction): string =>
  action.type === 'move'
    ? `m:${action.pieceId}:${action.from.x},${action.from.y}->${action.to.x},${action.to.y}`
    : `d:${action.playerId}:${action.pieceType}:${action.to.x},${action.to.y}`;

export class BaseBot implements Bot {
  constructor(
    public id: PlayerId,
    public personality: PersonalityProfile
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

    if (this.currentPhase === 'combat' || this.currentPhase === 'endgame') {
      const captureCandidate = selectBestImmediateCapture(
        context.legalActions,
        context.state,
        this.id,
      );
      if (captureCandidate) {
        return captureCandidate;
      }
    }

    return this.selectBestAction(context, this.toPhasePersonality(this.currentPhase));
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
    (piece) => piece.position.x === action.to.x && piece.position.y === action.to.y,
  );
  return !!targetPiece && targetPiece.owner !== playerId;
};

const captureActionValue = (
  action: PlayerAction,
  state: GameState,
  playerId: PlayerId,
): number => {
  if (!isImmediateCaptureAction(action, state, playerId) || action.type !== 'move') {
    return -1;
  }
  const targetPiece = state.pieces.find(
    (piece) => piece.position.x === action.to.x && piece.position.y === action.to.y,
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
    const value = captureActionValue(action, state, playerId);
    if (value > bestValue) {
      bestValue = value;
      bestAction = action;
    }
  }

  return bestValue >= 0 ? bestAction : null;
};

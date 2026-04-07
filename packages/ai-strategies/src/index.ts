import { GameState, PlayerAction, PlayerId, Bot, PersonalityProfile, DecisionContext } from '../../engine/src/types';
import { applyAction } from '../../engine/src/moves';
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

  decide(context: DecisionContext): PlayerAction {
    const { legalActions } = context;
    if (legalActions.length === 0) return null as any; // Should not happen

    // Default strategy: pick action with highest evaluation
    let bestAction = legalActions[0];
    let bestScore = -Infinity;

    for (const action of legalActions) {
      // Simulate action
      const nextState = applyAction(action, context.state);
      const evalResult = AIEvaluator.evaluate(nextState, this.id, this.personality, {
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
  // Uses the BaseBot evaluation-based strategy
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

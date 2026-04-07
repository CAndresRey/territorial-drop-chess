import {
  GameConfig,
  PersonalityProfile,
  PlayerAction,
  PlayerId,
} from '../../engine/src/types';
import { createGame } from '../../engine/src/board';
import { resolveRound } from '../../engine/src/resolver';
import { evaluateState, getLegalActions } from '../../engine/src/engine';
import { HeuristicBot } from '../../ai-strategies/src/index';
import { DifficultyLevel, getDifficultyProfile } from '../../difficulty/src/index';
import { getActionTargetOwner, MultiAgentAIManager } from '../../ai-manager/src/index';

export interface SimulationResult {
  winRates: Record<PlayerId, number>;
  avgGameLength: number;
  totalCaptures: number;
  avgFocusViolations: number;
}

export interface SimulationOptions {
  seed?: number | string;
  maxFocusPerTarget?: number;
  difficultyByPlayer?: Partial<Record<PlayerId, DifficultyLevel>>;
}

const stablePlayerIds = (input: Record<PlayerId, unknown>): PlayerId[] =>
  Object.keys(input).sort();

export class SimulationRunner {
  static run(
    config: GameConfig,
    botPersonalities: Record<PlayerId, PersonalityProfile>,
    iterations: number = 100,
    options?: SimulationOptions,
  ): SimulationResult {
    const playerIds = stablePlayerIds(botPersonalities);
    const winCounts: Record<PlayerId, number> = {};
    let totalRounds = 0;
    let totalCaptures = 0;
    let totalFocusViolations = 0;

    for (const pid of playerIds) {
      winCounts[pid] = 0;
    }

    for (let i = 0; i < iterations; i++) {
      let state = createGame(config, playerIds);
      const iterationSeed =
        options?.seed === undefined ? undefined : `${options.seed}|iter:${i}`;
      const bots = playerIds.map((playerId) => {
        const difficulty = options?.difficultyByPlayer?.[playerId];
        const personality = difficulty
          ? getDifficultyProfile(difficulty)
          : botPersonalities[playerId];
        return new HeuristicBot(playerId, personality);
      });
      const manager = new MultiAgentAIManager(bots, {
        maxFocusPerTarget: options?.maxFocusPerTarget ?? 1,
      });

      while (state.status === 'playing') {
        const legalActionsByPlayer: Partial<Record<PlayerId, PlayerAction[]>> = {};
        for (const bot of bots) {
          legalActionsByPlayer[bot.id] = getLegalActions(state, bot.id);
        }
        const actions = manager.decideRound(state, legalActionsByPlayer, {
          seed: iterationSeed,
        });

        const maxFocus = options?.maxFocusPerTarget ?? 1;
        const focused = new Map<PlayerId, number>();
        for (const action of Object.values(actions)) {
          const targetOwner = getActionTargetOwner(action, state);
          if (!targetOwner) continue;
          focused.set(targetOwner, (focused.get(targetOwner) ?? 0) + 1);
        }
        totalFocusViolations += Array.from(focused.values()).reduce(
          (acc, count) => acc + Math.max(0, count - maxFocus),
          0,
        );

        const roundResult = resolveRound(state, actions);
        state = roundResult.state;
        totalCaptures += roundResult.events.filter((e) => e.type === 'capture').length;
      }

      totalRounds += state.round;
      if (state.winner) {
        if (Array.isArray(state.winner)) {
          const share = 1 / state.winner.length;
          state.winner.forEach((winnerId) => {
            winCounts[winnerId] += share;
          });
        } else {
          winCounts[state.winner]++;
        }
      } else {
        // No explicit winner: assign split credit to current leaders.
        const leaders = evaluateState(state).leaderIds;
        const share = leaders.length > 0 ? 1 / leaders.length : 0;
        for (const leader of leaders) {
          winCounts[leader] += share;
        }
      }
    }

    const winRates: Record<PlayerId, number> = {};
    for (const pid of playerIds) {
      winRates[pid] = winCounts[pid] / iterations;
    }

    return {
      winRates,
      avgGameLength: totalRounds / iterations,
      totalCaptures: totalCaptures / iterations,
      avgFocusViolations: totalFocusViolations / iterations,
    };
  }
}

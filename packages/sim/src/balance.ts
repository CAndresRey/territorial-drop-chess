import { DifficultyLevel, getDifficultyProfile } from '@tdc/difficulty';
import {
  GameConfig,
  PersonalityProfile,
  PlayerCount,
  PlayerId,
} from '@tdc/engine';
import {
  SimulationOptions,
  SimulationResult,
  SimulationRunner,
} from './index.js';

export interface FairnessMetrics {
  expectedWinRate: number;
  maxDeviation: number;
  standardDeviation: number;
  isBalanced: boolean;
}

export interface BalanceScenario {
  id: string;
  config: GameConfig;
  botPersonalities: Record<PlayerId, PersonalityProfile>;
  iterations?: number;
  options?: SimulationOptions;
}

export interface BalanceScenarioResult {
  scenarioId: string;
  playerCount: PlayerCount;
  simulation: SimulationResult;
  fairness: FairnessMetrics;
  passed: boolean;
}

export interface BalanceSummary {
  totalScenarios: number;
  passingScenarios: number;
  failingScenarios: number;
  averageMaxDeviation: number;
  averageFocusViolations: number;
  worstScenarioId?: string;
}

export interface BalanceReport {
  results: BalanceScenarioResult[];
  summary: BalanceSummary;
}

export type SimulationExecutor = (
  config: GameConfig,
  botPersonalities: Record<PlayerId, PersonalityProfile>,
  iterations: number,
  options?: SimulationOptions,
) => SimulationResult;

export interface BalanceRunOptions {
  defaultIterations?: number;
  fairnessTolerance?: number;
  focusViolationTolerance?: number;
  executor?: SimulationExecutor;
}

export interface StandardMatrixOptions {
  playerCounts?: PlayerCount[];
  difficulty?: DifficultyLevel;
  iterations?: number;
  seed?: number | string;
  maxFocusPerTarget?: number;
}

const DEFAULT_PLAYER_COUNTS: PlayerCount[] = [2, 3, 4, 5, 6, 7, 8];

const boardSizeForPlayerCount = (playerCount: PlayerCount): number => {
  if (playerCount === 2) return 11;
  if (playerCount <= 4) return 13;
  return 15;
};

const stableIds = (input: Record<PlayerId, number>): PlayerId[] =>
  Object.keys(input).sort();

export const computeFairnessMetrics = (
  winRates: Record<PlayerId, number>,
  tolerance: number = 0.15,
): FairnessMetrics => {
  const playerIds = stableIds(winRates);
  if (playerIds.length === 0) {
    return {
      expectedWinRate: 0,
      maxDeviation: 0,
      standardDeviation: 0,
      isBalanced: true,
    };
  }

  const expectedWinRate = 1 / playerIds.length;
  const deviations = playerIds.map((id) =>
    Math.abs(winRates[id] - expectedWinRate),
  );
  const maxDeviation = Math.max(...deviations);
  const variance =
    playerIds.reduce(
      (sum, id) => sum + Math.pow(winRates[id] - expectedWinRate, 2),
      0,
    ) / playerIds.length;

  return {
    expectedWinRate,
    maxDeviation,
    standardDeviation: Math.sqrt(variance),
    isBalanced: maxDeviation <= tolerance,
  };
};

const getScenarioPenalty = (
  result: BalanceScenarioResult,
  focusViolationTolerance: number,
): number =>
  result.fairness.maxDeviation +
  Math.max(0, result.simulation.avgFocusViolations - focusViolationTolerance);

export class BalanceAnalyzer {
  static runScenarios(
    scenarios: BalanceScenario[],
    options?: BalanceRunOptions,
  ): BalanceReport {
    const executor = options?.executor ?? SimulationRunner.run;
    const defaultIterations = options?.defaultIterations ?? 100;
    const fairnessTolerance = options?.fairnessTolerance ?? 0.15;
    const focusViolationTolerance = options?.focusViolationTolerance ?? 0.5;

    const results: BalanceScenarioResult[] = scenarios.map((scenario) => {
      const simulation = executor(
        scenario.config,
        scenario.botPersonalities,
        scenario.iterations ?? defaultIterations,
        scenario.options,
      );
      const fairness = computeFairnessMetrics(
        simulation.winRates,
        fairnessTolerance,
      );
      const passed =
        fairness.isBalanced &&
        simulation.avgFocusViolations <= focusViolationTolerance;

      return {
        scenarioId: scenario.id,
        playerCount: scenario.config.playerCount,
        simulation,
        fairness,
        passed,
      };
    });

    if (results.length === 0) {
      return {
        results,
        summary: {
          totalScenarios: 0,
          passingScenarios: 0,
          failingScenarios: 0,
          averageMaxDeviation: 0,
          averageFocusViolations: 0,
        },
      };
    }

    const passingScenarios = results.filter((result) => result.passed).length;
    const averageMaxDeviation =
      results.reduce((sum, result) => sum + result.fairness.maxDeviation, 0) /
      results.length;
    const averageFocusViolations =
      results.reduce(
        (sum, result) => sum + result.simulation.avgFocusViolations,
        0,
      ) / results.length;

    const worst = results.reduce(
      (acc, current) => {
        if (!acc) return current;
        return getScenarioPenalty(current, focusViolationTolerance) >
          getScenarioPenalty(acc, focusViolationTolerance)
          ? current
          : acc;
      },
      undefined as BalanceScenarioResult | undefined,
    );

    return {
      results,
      summary: {
        totalScenarios: results.length,
        passingScenarios,
        failingScenarios: results.length - passingScenarios,
        averageMaxDeviation,
        averageFocusViolations,
        worstScenarioId: worst?.scenarioId,
      },
    };
  }
}

const createPlayerIds = (playerCount: PlayerCount): PlayerId[] =>
  Array.from({ length: playerCount }, (_, index) => `p${index + 1}`);

export const buildStandardScenarioMatrix = (
  baseConfig: Omit<GameConfig, 'playerCount' | 'boardSize'>,
  options?: StandardMatrixOptions,
): BalanceScenario[] => {
  const playerCounts = options?.playerCounts ?? DEFAULT_PLAYER_COUNTS;
  const difficulty = options?.difficulty ?? 'normal';
  const profile = getDifficultyProfile(difficulty);

  return playerCounts.map((playerCount) => {
    const playerIds = createPlayerIds(playerCount);
    const botPersonalities = Object.fromEntries(
      playerIds.map((playerId) => [playerId, { ...profile }]),
    ) as Record<PlayerId, PersonalityProfile>;
    const difficultyByPlayer = Object.fromEntries(
      playerIds.map((playerId) => [playerId, difficulty]),
    ) as Record<PlayerId, DifficultyLevel>;

    return {
      id: `players-${playerCount}`,
      config: {
        ...baseConfig,
        playerCount,
        boardSize: boardSizeForPlayerCount(playerCount),
      },
      botPersonalities,
      iterations: options?.iterations,
      options: {
        seed:
          options?.seed === undefined
            ? undefined
            : `${options.seed}|players:${playerCount}`,
        maxFocusPerTarget: options?.maxFocusPerTarget,
        difficultyByPlayer,
      },
    };
  });
};

import { Bot, GameState, PlayerAction, PlayerId } from '../../engine/src/types';

export interface AIManagerOptions {
  maxFocusPerTarget?: number;
}

export interface AIDecideRoundOptions {
  seed?: number | string;
}

const actionKey = (action: PlayerAction): string => JSON.stringify(action);

export const getActionTargetOwner = (
  action: PlayerAction | null | undefined,
  state: GameState,
): PlayerId | null => {
  if (!action || action.type !== 'move') return null;
  const occupant = state.pieces.find(
    (piece) =>
      piece.position.x === action.to.x &&
      piece.position.y === action.to.y &&
      piece.owner !== state.pieces.find((p) => p.id === action.pieceId)?.owner,
  );
  return occupant?.owner ?? null;
};

export class MultiAgentAIManager {
  constructor(
    private readonly bots: Bot[],
    private readonly options: AIManagerOptions = {},
  ) {}

  decideRound(
    state: GameState,
    legalActionsByPlayer: Partial<Record<PlayerId, PlayerAction[]>>,
    options?: AIDecideRoundOptions,
  ): Record<PlayerId, PlayerAction | null> {
    const decisions: Record<PlayerId, PlayerAction | null> = {} as Record<
      PlayerId,
      PlayerAction | null
    >;
    const focusCount = new Map<PlayerId, number>();
    const maxFocus = this.options.maxFocusPerTarget ?? Number.POSITIVE_INFINITY;
    const orderedBots = [...this.bots].sort((a, b) => a.id.localeCompare(b.id));

    for (const bot of orderedBots) {
      const player = state.players[bot.id];
      if (!player || player.isEliminated) {
        decisions[bot.id] = null;
        continue;
      }

      const legal = legalActionsByPlayer[bot.id] ?? [];
      if (legal.length === 0) {
        decisions[bot.id] = null;
        continue;
      }

      const filtered = legal.filter((action) => {
        const targetOwner = getActionTargetOwner(action, state);
        if (!targetOwner) return true;
        return (focusCount.get(targetOwner) ?? 0) < maxFocus;
      });
      const candidatePool = filtered.length > 0 ? filtered : legal;
      const decided = bot.decide({
        state,
        playerId: bot.id,
        legalActions: candidatePool,
        seed:
          options?.seed === undefined
            ? undefined
            : `${options.seed}|r${state.round}|${bot.id}`,
      });

      const poolByKey = new Map(candidatePool.map((action) => [actionKey(action), action]));
      const safeDecision = poolByKey.get(actionKey(decided)) ?? candidatePool[0];
      decisions[bot.id] = safeDecision;

      const targetOwner = getActionTargetOwner(safeDecision, state);
      if (targetOwner) {
        focusCount.set(targetOwner, (focusCount.get(targetOwner) ?? 0) + 1);
      }
    }

    return decisions;
  }
}

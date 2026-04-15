import {
  GameState,
  getLegalActions,
  PlayerAction,
  PlayerId,
  resolveRound,
  RoundResult,
} from '@tdc/engine';

export interface ResolveOptions {
  reason?: 'submitted' | 'timeout';
}

export class TurnOrchestrator {
  static getActivePlayers(state: GameState): PlayerId[] {
    return this.getPriority(state).filter(
      (playerId) => !state.players[playerId].isEliminated,
    );
  }

  static getNextPlayer(
    state: GameState,
    currentPlayerId?: PlayerId,
  ): PlayerId | undefined {
    const activePlayers = this.getActivePlayers(state);
    if (activePlayers.length === 0) {
      return undefined;
    }
    if (!currentPlayerId) {
      return activePlayers[0];
    }

    const currentIndex = activePlayers.indexOf(currentPlayerId);
    if (currentIndex === -1) {
      return activePlayers[0];
    }

    return activePlayers[(currentIndex + 1) % activePlayers.length];
  }

  static shouldSkipTurn(state: GameState, playerId: PlayerId): boolean {
    const player = state.players[playerId];
    if (!player || player.isEliminated) {
      return true;
    }

    return getLegalActions(state, playerId).length === 0;
  }

  private static normalizeActions(
    state: GameState,
    actions: Record<PlayerId, PlayerAction | null>,
    options?: ResolveOptions,
  ): Record<PlayerId, PlayerAction | null> {
    const normalized: Record<PlayerId, PlayerAction | null> = {} as Record<
      PlayerId,
      PlayerAction | null
    >;
    const activeByPriority = this.getActivePlayers(state);

    for (const playerId of activeByPriority) {
      const submitted = actions[playerId];
      if (submitted === undefined) {
        if (options?.reason === 'timeout') {
          normalized[playerId] = null;
        }
        continue;
      }
      normalized[playerId] = submitted;
    }

    return normalized;
  }

  static resolve(
    state: GameState,
    actions: Record<PlayerId, PlayerAction | null>,
    options?: ResolveOptions,
  ): RoundResult {
    const { turnSystem } = state.config;
    const normalizedActions = this.normalizeActions(state, actions, options);

    if (turnSystem.type === 'sequential') {
      // For sequential, we resolve one action at a time.
      // In this demo, we can just treat it as a simultaneous round with only one player acting.
      return resolveRound(state, normalizedActions);
    } else {
      // Simultaneous turns (default for TDC)
      return resolveRound(state, normalizedActions);
    }
  }

  /**
   * Dynamic Priority: Determines who goes first in case of dependencies
   * (e.g., player A moves to X, player B moves from X to Y).
   * In a truly simultaneous system, we'd need to handle this carefully.
   */
  static getPriority(state: GameState): PlayerId[] {
    const players = Object.keys(state.players) as PlayerId[];
    // Simplified: priority based on current score (lower score gets higher priority)
    return players.sort((a, b) => {
      const scoreDiff = state.players[a].score - state.players[b].score;
      if (scoreDiff !== 0) return scoreDiff;
      return a.localeCompare(b);
    });
  }
}

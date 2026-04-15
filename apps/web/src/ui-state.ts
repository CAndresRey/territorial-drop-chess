import { GameState } from '@tdc/engine';

export type ViewState = 'setup' | 'playing' | 'finished';
export type BannerTone = 'info' | 'warning' | 'muted';

export const deriveViewState = (gameState: GameState | null): ViewState => {
  if (!gameState) return 'setup';
  return gameState.status === 'playing' ? 'playing' : 'finished';
};

export const getWinnerLabel = (gameState: GameState | null): string | null => {
  if (!gameState || gameState.status !== 'finished' || !gameState.winner) return null;
  if (Array.isArray(gameState.winner)) {
    if (gameState.winner.length <= 1) return `Winner: ${gameState.winner[0] ?? 'Unknown'}`;
    return `Tie: ${gameState.winner.join(', ')}`;
  }
  return `Winner: ${gameState.winner}`;
};

export const canSubmitInteraction = ({
  gameState,
  actionSubmitted,
}: {
  gameState: GameState | null;
  actionSubmitted: boolean;
}): boolean => !!gameState && gameState.status === 'playing' && !actionSubmitted;

export const buildFinalRanking = (
  gameState: GameState | null,
): Array<{ playerId: string; score: number; isEliminated: boolean }> => {
  if (!gameState) return [];
  return Object.values(gameState.players)
    .map((player) => ({
      playerId: player.id,
      score: player.score,
      isEliminated: player.isEliminated,
    }))
    .sort((a, b) => b.score - a.score || a.playerId.localeCompare(b.playerId));
};

export const deriveTurnBanner = (
  gameState: GameState | null,
  playerId: string,
  actionSubmitted: boolean,
): { tone: BannerTone; message: string } => {
  const player = gameState?.players[playerId];
  if (!gameState || !player || gameState.status !== 'playing') {
    return { tone: 'muted', message: 'Match finished. Review scores and start a new game.' };
  }
  if (player.isEliminated) {
    return { tone: 'warning', message: 'You are eliminated. Observing the match.' };
  }
  if (actionSubmitted) {
    return { tone: 'muted', message: 'Action submitted. Waiting for other players...' };
  }
  return { tone: 'info', message: 'Your turn: choose a move, drop, or pass.' };
};

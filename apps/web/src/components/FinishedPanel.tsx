import { GameState } from '@tdc/engine';
import { buildFinalRanking, getWinnerLabel } from '../ui-state';

interface FinishedPanelProps {
  gameState: GameState | null;
  onRestart: () => void;
}

export const FinishedPanel = ({ gameState, onRestart }: FinishedPanelProps) => (
  <div
    className="glass-panel panel"
    style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', textAlign: 'center' }}
  >
    {getWinnerLabel(gameState) ?? 'Game finished'}
    <div style={{ marginTop: '0.75rem', textAlign: 'left' }}>
      {buildFinalRanking(gameState).map((entry, idx) => (
        <div
          key={entry.playerId}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            opacity: entry.isEliminated ? 0.7 : 1,
          }}
        >
          <span>
            #{idx + 1} {entry.playerId}
          </span>
          <span>{entry.score}</span>
        </div>
      ))}
    </div>
    <button className="btn" style={{ marginTop: '0.75rem' }} onClick={onRestart}>
      New Game
    </button>
  </div>
);


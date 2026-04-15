import { Coordinate, GameState, PieceType } from '@tdc/engine';
import { Crown, Swords } from 'lucide-react';
import { Board } from '../Board';
import { deriveTurnBanner, ViewState } from '../ui-state';
import { FinishedPanel } from './FinishedPanel';

interface GameScreenProps {
  view: ViewState;
  gameState: GameState;
  playerId: string;
  timeLeft: number;
  selectedCoord: Coordinate | null;
  selectedDrop: PieceType | null;
  validMoves: Coordinate[];
  actionSubmitted: boolean;
  onSelectCoord: (coord: Coordinate) => void;
  onSelectDrop: (type: PieceType) => void;
  onPassTurn: () => void;
  onRestart: () => void;
}

export const GameScreen = ({
  view,
  gameState,
  playerId,
  timeLeft,
  selectedCoord,
  selectedDrop,
  validMoves,
  actionSubmitted,
  onSelectCoord,
  onSelectDrop,
  onPassTurn,
  onRestart,
}: GameScreenProps) => {
  const turnBanner = deriveTurnBanner(gameState, playerId, actionSubmitted);

  return (
    <div className="app-container">
    <div className="sidebar left-sidebar">
      <div className="glass-panel panel">
        <h3 className="panel-title">
          <Crown size={18} style={{ marginRight: '8px' }} /> Players
        </h3>
        {Object.values(gameState.players).map((player) => (
          <div
            key={player.id}
            className={`player-card ${player.id === playerId ? 'active' : ''}`}
            style={{
              opacity: player.isEliminated ? 0.4 : 1,
              borderLeftColor: player.color,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: player.color }}>{player.id.toUpperCase()}</div>
              {player.isEliminated && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Eliminated</div>
              )}
            </div>
            <div className="player-score">{player.score}</div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className={`turn-banner tone-${turnBanner.tone}`}>
        {turnBanner.message}
      </div>

      <div className="top-bar">
        <div className="round-info">
          Round {gameState.round} / {gameState.config.turnSystem.maxRounds}
        </div>
        <div className="timer">{view === 'playing' ? `00:${`${timeLeft}`.padStart(2, '0')}` : 'GAME OVER'}</div>
      </div>

      {view === 'finished' && <FinishedPanel gameState={gameState} onRestart={onRestart} />}

      <Board
        state={gameState}
        playerId={playerId}
        selectedCoord={selectedCoord}
        onSelectCoord={onSelectCoord}
        validMoves={validMoves}
      />

      {view === 'playing' && (
        <div
          className="glass-panel panel"
          style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', width: 'min(80vh, 100%)' }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {selectedDrop
              ? `Drop mode: ${selectedDrop}. Click a board cell to deploy it.`
              : selectedCoord
                ? 'Piece selected. Click a highlighted cell to move.'
                : 'Click one of your pieces to see legal moves, or choose a reserve piece.'}
          </div>
        </div>
      )}

      {view === 'playing' && (
        <button className="btn" style={{ marginTop: '1rem' }} disabled={actionSubmitted} onClick={onPassTurn}>
          {actionSubmitted ? 'WAITING FOR OTHERS...' : 'PASS TURN'}
        </button>
      )}
    </div>

    <div className="sidebar right-sidebar">
      <div className="glass-panel panel" style={{ flex: 1 }}>
        <h3 className="panel-title">
          <Swords size={18} style={{ marginRight: '8px' }} /> Reserve
        </h3>
        <div className="drop-reserve" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {gameState.players[playerId]?.dropReserve.length === 0 && (
            <span style={{ color: 'var(--text-muted)' }}>Empty reserve</span>
          )}
          {gameState.players[playerId]?.dropReserve.map((type, idx) => (
            <div
              key={idx}
              className={`piece ${selectedDrop === type ? 'selected' : ''}`}
              style={{
                backgroundColor: gameState.players[playerId].color,
                cursor: 'pointer',
                width: '40px',
                height: '40px',
              }}
              onClick={() => onSelectDrop(type)}
            >
              {type}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
};

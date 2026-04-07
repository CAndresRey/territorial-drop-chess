import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Coordinate,
  DEFAULT_FORMATION_TEMPLATES,
  GameState,
  getMovesForPiece,
  PieceType,
  PlayerAction,
} from '@tdc/engine';
import { Crown, Play, Settings, Swords, Users } from 'lucide-react';
import { Board } from './Board';
import { HelpButton, Tutorial } from './Tutorial';
import {
  BotDifficulty,
  buildCreateGameRequest,
  deriveBoardSize,
  SetupState,
} from './setup';
import { QUICK_START_CHECKLIST } from './tutorial-content';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');
const TUTORIAL_STORAGE_KEY = 'tdc.tutorialSeen';
type ViewState = 'setup' | 'playing' | 'finished';

const difficultyOptions: BotDifficulty[] = ['easy', 'normal', 'hard'];

const defaultBotDifficultyList = (playerCount: number): BotDifficulty[] =>
  Array.from({ length: playerCount - 1 }, () => 'normal');

const defaultBotFormationList = (playerCount: number): string[] =>
  Array.from(
    { length: playerCount - 1 },
    (_, idx) =>
      DEFAULT_FORMATION_TEMPLATES[(idx + 1) % DEFAULT_FORMATION_TEMPLATES.length].id,
  );

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [view, setView] = useState<ViewState>('setup');
  const [gameState, setGameState] = useState<GameState | null>(null);

  const [playerId] = useState('human');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4 | 5 | 6 | 7 | 8>(4);
  const [boardSize, setBoardSize] = useState(13);
  const [humanFormationId, setHumanFormationId] = useState(
    DEFAULT_FORMATION_TEMPLATES[0].id,
  );
  const [botDifficulties, setBotDifficulties] = useState<BotDifficulty[]>(
    defaultBotDifficultyList(4),
  );
  const [botFormationIds, setBotFormationIds] = useState<string[]>(
    defaultBotFormationList(4),
  );
  const [maxFocusPerTarget, setMaxFocusPerTarget] = useState(1);

  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedCoord, setSelectedCoord] = useState<Coordinate | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<PieceType | null>(null);
  const [validMoves, setValidMoves] = useState<Coordinate[]>([]);
  const [actionSubmitted, setActionSubmitted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1';
    if (!seen) {
      setShowTutorial(true);
    }
  }, []);

  useEffect(() => {
    if (!SOCKET_URL) {
      setConnectionError(
        'Backend URL not configured. Set VITE_SOCKET_URL for hosted environments.',
      );
      return;
    }

    const s = io(SOCKET_URL, { autoConnect: false });
    setSocket(s);

    s.on('gameState', (state: GameState) => {
      setGameState(state);
      setView(state.status === 'playing' ? 'playing' : 'finished');
      setActionSubmitted(false);
      setSelectedCoord(null);
      setSelectedDrop(null);
      setValidMoves([]);
    });

    s.on('turnStarted', (payload: { duration: number }) => {
      setTimeLeft(Math.ceil(payload.duration / 1000));
      setActionSubmitted(false);
      setSelectedCoord(null);
      setSelectedDrop(null);
      setValidMoves([]);
    });

    s.on('roundResolved', (data: { state: GameState; gameOver: { isOver: boolean } }) => {
      setGameState(data.state);
      if (data.gameOver.isOver) setView('finished');
    });

    s.on('error', (msg: string) => {
      alert(msg);
    });
    s.on('connect_error', (error) => {
      setConnectionError(error.message);
    });
    s.on('connect', () => {
      setConnectionError(null);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (view === 'playing' && timeLeft > 0 && !actionSubmitted) {
      const timerId = setTimeout(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
      return () => clearTimeout(timerId);
    }
    return;
  }, [timeLeft, view, actionSubmitted]);

  const setupState = useMemo<SetupState>(
    () => ({
      playerId,
      playerCount,
      humanFormationId,
      botFormationIds,
      botDifficulties,
      maxFocusPerTarget,
    }),
    [
      playerId,
      playerCount,
      humanFormationId,
      botFormationIds,
      botDifficulties,
      maxFocusPerTarget,
    ],
  );

  const onPlayerCountChange = (next: number) => {
    const normalized = Math.min(8, Math.max(2, next)) as SetupState['playerCount'];
    setPlayerCount(normalized);
    setBoardSize(deriveBoardSize(normalized));
    setBotDifficulties((prev) => {
      const target = normalized - 1;
      return [...prev, ...defaultBotDifficultyList(normalized)].slice(0, target);
    });
    setBotFormationIds((prev) => {
      const target = normalized - 1;
      return [...prev, ...defaultBotFormationList(normalized)].slice(0, target);
    });
  };

  const startNewGame = () => {
    if (!socket) {
      alert(
        'Server is not configured or unavailable. Set VITE_SOCKET_URL to a reachable backend.',
      );
      return;
    }
    const request = buildCreateGameRequest(setupState);
    socket.connect();
    socket.emit('createGame', request);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    }
  };

  const submitAction = (action: PlayerAction | null) => {
    socket?.emit('submitAction', action);
    setActionSubmitted(true);
    setSelectedCoord(null);
    setSelectedDrop(null);
    setValidMoves([]);
  };

  const handleSelectDrop = (type: PieceType) => {
    if (!gameState || actionSubmitted) return;
    setSelectedDrop(type);
    setSelectedCoord(null);
    setValidMoves([]);
  };

  const handleSelectCoord = (coord: Coordinate) => {
    if (!gameState || actionSubmitted) return;
    const me = gameState.players[playerId];
    if (!me || me.isEliminated) return;

    if (selectedDrop) {
      submitAction({ type: 'drop', playerId, pieceType: selectedDrop, to: coord });
      return;
    }

    const clickedPiece = gameState.pieces.find(
      (piece) => piece.position.x === coord.x && piece.position.y === coord.y,
    );
    if (clickedPiece && clickedPiece.owner === playerId) {
      setSelectedCoord(coord);
      setValidMoves(getMovesForPiece(clickedPiece, gameState));
      return;
    }

    if (!selectedCoord) return;
    const isLegal = validMoves.some((move) => move.x === coord.x && move.y === coord.y);
    if (!isLegal) {
      setSelectedCoord(null);
      setValidMoves([]);
      return;
    }

    const pieceId = gameState.pieces.find(
      (piece) =>
        piece.position.x === selectedCoord.x && piece.position.y === selectedCoord.y,
    )?.id;
    if (!pieceId) return;

    submitAction({
      type: 'move',
      pieceId,
      from: selectedCoord,
      to: coord,
    });
  };

  if (view === 'setup') {
    return (
      <>
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel panel" style={{ width: 520 }}>
          <h1 className="panel-title" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Territorial Drop Chess
          </h1>

          <div className="quick-guide">
            <h2>How to play in 30 seconds</h2>
            <ol>
              {QUICK_START_CHECKLIST.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
            <button className="btn" onClick={() => setShowTutorial(true)}>
              Open full tutorial
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="setup-item">
              <label>
                <Users size={18} /> Players: {playerCount}
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={playerCount}
                onChange={(event) => onPlayerCountChange(parseInt(event.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>

            <div className="setup-item">
              <label>
                <Settings size={18} /> Board Size: {boardSize}x{boardSize}
              </label>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {boardSize === 11
                  ? 'Small (2 players)'
                  : boardSize === 13
                    ? 'Medium (3-4 players)'
                    : 'Large (5-8 players)'}
              </div>
            </div>

            <div className="setup-item">
              <label>Human Formation</label>
              <select
                value={humanFormationId}
                onChange={(event) => setHumanFormationId(event.target.value)}
              >
                {DEFAULT_FORMATION_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {botDifficulties.map((difficulty, idx) => (
              <div key={`bot-${idx}`} className="setup-item">
                <label>Bot {idx + 1}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={difficulty}
                    onChange={(event) =>
                      setBotDifficulties((prev) =>
                        prev.map((item, j) =>
                          j === idx ? (event.target.value as BotDifficulty) : item,
                        ),
                      )
                    }
                  >
                    {difficultyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={botFormationIds[idx]}
                    onChange={(event) =>
                      setBotFormationIds((prev) =>
                        prev.map((item, j) => (j === idx ? event.target.value : item)),
                      )
                    }
                  >
                    {DEFAULT_FORMATION_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <div className="setup-item">
              <label>Anti-collusion cap (focus per target): {maxFocusPerTarget}</label>
              <input
                type="range"
                min="1"
                max="2"
                value={maxFocusPerTarget}
                onChange={(event) => setMaxFocusPerTarget(parseInt(event.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>

            <button
              className="btn"
              style={{
                padding: '1rem',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              disabled={!socket}
              onClick={startNewGame}
            >
              <Play size={20} /> Start Game
            </button>
            {connectionError && (
              <div style={{ color: '#ff7a7a', fontSize: '0.85rem' }}>
                Backend: {connectionError}
              </div>
            )}
          </div>
        </div>
      </div>
      <HelpButton onClick={() => setShowTutorial(true)} />
      {showTutorial && <Tutorial onClose={closeTutorial} />}
      </>
    );
  }

  return (
    <>
    <div className="app-container">
      <div className="sidebar left-sidebar">
        <div className="glass-panel panel">
          <h3 className="panel-title">
            <Crown size={18} style={{ marginRight: '8px' }} /> Players
          </h3>
          {gameState?.players &&
            Object.values(gameState.players).map((player) => (
              <div
                key={player.id}
                className={`player-card ${player.id === playerId ? 'active' : ''}`}
                style={{
                  opacity: player.isEliminated ? 0.4 : 1,
                  borderLeftColor: player.color,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: player.color }}>
                    {player.id.toUpperCase()}
                  </div>
                  {player.isEliminated && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Eliminated
                    </div>
                  )}
                </div>
                <div className="player-score">{player.score}</div>
              </div>
            ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="top-bar">
          <div className="round-info">
            Round {gameState?.round} / {gameState?.config.turnSystem.maxRounds}
          </div>
          <div className="timer">{view === 'playing' ? `00:${`${timeLeft}`.padStart(2, '0')}` : 'GAME OVER'}</div>
        </div>

        {gameState && (
          <Board
            state={gameState}
            playerId={playerId}
            selectedCoord={selectedCoord}
            onSelectCoord={handleSelectCoord}
            validMoves={validMoves}
          />
        )}

        {view === 'playing' && (
          <button
            className="btn"
            style={{ marginTop: '1rem' }}
            disabled={actionSubmitted}
            onClick={() => submitAction(null)}
          >
            {actionSubmitted ? 'WAITING FOR OTHERS...' : 'PASS TURN'}
          </button>
        )}
      </div>

      <div className="sidebar right-sidebar">
        <div className="glass-panel panel" style={{ flex: 1 }}>
          <h3 className="panel-title">
            <Swords size={18} style={{ marginRight: '8px' }} /> Reserve
          </h3>
          <div
            className="drop-reserve"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}
          >
            {gameState?.players[playerId]?.dropReserve.length === 0 && (
              <span style={{ color: 'var(--text-muted)' }}>Empty reserve</span>
            )}
            {gameState?.players[playerId]?.dropReserve.map((type, idx) => (
              <div
                key={idx}
                className={`piece ${selectedDrop === type ? 'selected' : ''}`}
                style={{
                  backgroundColor: gameState.players[playerId].color,
                  cursor: 'pointer',
                  width: '40px',
                  height: '40px',
                }}
                onClick={() => handleSelectDrop(type)}
              >
                {type}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <HelpButton onClick={() => setShowTutorial(true)} />
    {showTutorial && <Tutorial onClose={closeTutorial} />}
    </>
  );
}

export default App;

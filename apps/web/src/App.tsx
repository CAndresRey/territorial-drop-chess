import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Coordinate,
  GameState,
  PieceType,
  PlayerAction,
} from '@tdc/engine';
import { HelpButton, Tutorial } from './Tutorial';
import {
  buildCreateGameRequest,
  deriveBoardSize,
} from './setup';
import type { BotDifficulty, SetupState } from './setup';
import {
  clampPlayerCount,
  defaultBotDifficultyList,
  defaultBotFormationList,
} from './setup-defaults';
import { loadSetupState, normalizePersistedSetup, saveSetupState } from './setup-storage';
import {
  computeActionFromBoardClick,
  resetSelectionAfterSubmit,
  toggleDropSelection,
} from './gameplay';
import {
  canSubmitInteraction,
  deriveViewState,
  ViewState,
} from './ui-state';
import { SetupScreen } from './components/SetupScreen';
import { GameScreen } from './components/GameScreen';
import { DEFAULT_FORMATION_TEMPLATES } from '@tdc/engine';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');
const TUTORIAL_STORAGE_KEY = 'tdc.tutorialSeen';
const difficultyOptions: BotDifficulty[] = ['easy', 'normal', 'hard'];

function App() {
  const persistedSetup =
    typeof window !== 'undefined' ? loadSetupState(window.localStorage) : null;
  const initialSetup = persistedSetup
    ? normalizePersistedSetup(persistedSetup)
    : null;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [view, setView] = useState<ViewState>('setup');
  const [gameState, setGameState] = useState<GameState | null>(null);

  const [playerId] = useState(initialSetup?.playerId ?? 'human');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4 | 5 | 6 | 7 | 8>(
    initialSetup?.playerCount ?? 4,
  );
  const [boardSize, setBoardSize] = useState(
    deriveBoardSize(initialSetup?.playerCount ?? 4),
  );
  const [humanFormationId, setHumanFormationId] = useState(
    initialSetup?.humanFormationId ?? DEFAULT_FORMATION_TEMPLATES[0].id,
  );
  const [botDifficulties, setBotDifficulties] = useState<BotDifficulty[]>(
    initialSetup?.botDifficulties ?? defaultBotDifficultyList(4),
  );
  const [botFormationIds, setBotFormationIds] = useState<string[]>(
    initialSetup?.botFormationIds ?? defaultBotFormationList(4),
  );
  const [maxFocusPerTarget, setMaxFocusPerTarget] = useState(
    initialSetup?.maxFocusPerTarget ?? 1,
  );

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
      setView(deriveViewState(state));
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    saveSetupState(setupState, window.localStorage);
  }, [setupState]);

  const onPlayerCountChange = (next: number) => {
    const normalized = clampPlayerCount(next) as SetupState['playerCount'];
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
    const next = resetSelectionAfterSubmit({ selectedCoord, selectedDrop, validMoves });
    setSelectedCoord(next.selectedCoord);
    setSelectedDrop(next.selectedDrop);
    setValidMoves(next.validMoves);
  };

  const restartToSetup = () => {
    setView('setup');
    setGameState(null);
    setActionSubmitted(false);
    setSelectedCoord(null);
    setSelectedDrop(null);
    setValidMoves([]);
    setTimeLeft(30);
  };

  const handleSelectDrop = (type: PieceType) => {
    if (!canSubmitInteraction({ gameState, actionSubmitted })) return;
    const next = toggleDropSelection({ selectedCoord, selectedDrop, validMoves }, type);
    setSelectedCoord(next.selectedCoord);
    setSelectedDrop(next.selectedDrop);
    setValidMoves(next.validMoves);
  };

  const handleSelectCoord = (coord: Coordinate) => {
    if (!canSubmitInteraction({ gameState, actionSubmitted })) return;
    const me = gameState.players[playerId];
    if (!me || me.isEliminated) return;
    const result = computeActionFromBoardClick(
      gameState,
      playerId,
      { selectedCoord, selectedDrop, validMoves },
      coord,
    );
    if (result.action) {
      submitAction(result.action);
      return;
    }
    setSelectedCoord(result.nextSelection.selectedCoord);
    setSelectedDrop(result.nextSelection.selectedDrop);
    setValidMoves(result.nextSelection.validMoves);
  };

  if (view === 'setup') {
    return (
      <>
      <SetupScreen
        playerCount={playerCount}
        boardSize={boardSize}
        humanFormationId={humanFormationId}
        botDifficulties={botDifficulties}
        botFormationIds={botFormationIds}
        maxFocusPerTarget={maxFocusPerTarget}
        difficultyOptions={difficultyOptions}
        socketReady={!!socket}
        connectionError={connectionError}
        onPlayerCountChange={onPlayerCountChange}
        onHumanFormationChange={setHumanFormationId}
        onBotDifficultyChange={(idx, value) =>
          setBotDifficulties((prev) =>
            prev.map((item, j) => (j === idx ? value : item)),
          )
        }
        onBotFormationChange={(idx, value) =>
          setBotFormationIds((prev) =>
            prev.map((item, j) => (j === idx ? value : item)),
          )
        }
        onMaxFocusChange={setMaxFocusPerTarget}
        onStart={startNewGame}
        onOpenTutorial={() => setShowTutorial(true)}
      />
      <HelpButton onClick={() => setShowTutorial(true)} />
      {showTutorial && <Tutorial onClose={closeTutorial} />}
      </>
    );
  }

  if (!gameState) return null;

  return (
    <>
    <GameScreen
      view={view}
      gameState={gameState}
      playerId={playerId}
      timeLeft={timeLeft}
      selectedCoord={selectedCoord}
      selectedDrop={selectedDrop}
      validMoves={validMoves}
      actionSubmitted={actionSubmitted}
      onSelectCoord={handleSelectCoord}
      onSelectDrop={handleSelectDrop}
      onPassTurn={() => submitAction(null)}
      onRestart={restartToSetup}
    />
    <HelpButton onClick={() => setShowTutorial(true)} />
    {showTutorial && <Tutorial onClose={closeTutorial} />}
    </>
  );
}

export default App;

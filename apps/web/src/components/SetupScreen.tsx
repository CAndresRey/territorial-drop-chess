import { DEFAULT_FORMATION_TEMPLATES } from '@tdc/engine';
import { Play, Settings, Users } from 'lucide-react';
import { BotDifficulty } from '../setup';
import { QUICK_START_CHECKLIST } from '../tutorial-content';

interface SetupScreenProps {
  playerCount: number;
  boardSize: number;
  humanFormationId: string;
  botDifficulties: BotDifficulty[];
  botFormationIds: string[];
  maxFocusPerTarget: number;
  difficultyOptions: BotDifficulty[];
  socketReady: boolean;
  connectionError: string | null;
  onPlayerCountChange: (next: number) => void;
  onHumanFormationChange: (id: string) => void;
  onBotDifficultyChange: (idx: number, value: BotDifficulty) => void;
  onBotFormationChange: (idx: number, value: string) => void;
  onMaxFocusChange: (value: number) => void;
  onStart: () => void;
  onOpenTutorial: () => void;
}

export const SetupScreen = ({
  playerCount,
  boardSize,
  humanFormationId,
  botDifficulties,
  botFormationIds,
  maxFocusPerTarget,
  difficultyOptions,
  socketReady,
  connectionError,
  onPlayerCountChange,
  onHumanFormationChange,
  onBotDifficultyChange,
  onBotFormationChange,
  onMaxFocusChange,
  onStart,
  onOpenTutorial,
}: SetupScreenProps) => (
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
        <button className="btn" onClick={onOpenTutorial}>
          Open full tutorial
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="setup-item">
          <label>
            Step 1.
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
            Step 2.
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
          <label>Step 3. Human Formation</label>
          <select value={humanFormationId} onChange={(event) => onHumanFormationChange(event.target.value)}>
            {DEFAULT_FORMATION_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {botDifficulties.map((difficulty, idx) => (
          <div key={`bot-${idx}`} className="setup-item">
            <label>Step 4. Bot {idx + 1}</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={difficulty}
                onChange={(event) => onBotDifficultyChange(idx, event.target.value as BotDifficulty)}
              >
                {difficultyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select value={botFormationIds[idx]} onChange={(event) => onBotFormationChange(idx, event.target.value)}>
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
          <label>Step 5. Anti-collusion cap (focus per target): {maxFocusPerTarget}</label>
          <input
            type="range"
            min="1"
            max="2"
            value={maxFocusPerTarget}
            onChange={(event) => onMaxFocusChange(parseInt(event.target.value, 10))}
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
          disabled={!socketReady}
          onClick={onStart}
        >
          <Play size={20} /> Start Game
        </button>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Tip: start with 2-4 players and normal bots to learn core mechanics.
        </div>
        {connectionError && (
          <div style={{ color: '#ff7a7a', fontSize: '0.85rem' }}>
            Backend: {connectionError}
          </div>
        )}
      </div>
    </div>
  </div>
);


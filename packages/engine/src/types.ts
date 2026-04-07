export type PlayerId = string;
export type PlayerCount = 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Coordinate {
  x: number;
  y: number;
}

export enum PieceType {
  King = 'K',
  Guard = 'G',
  Rook = 'R',
  Knight = 'N',
  Bishop = 'B',
  Pawn = 'P',
  Veteran = 'V' // Promoted Pawn
}

export interface Piece {
  id: string;
  owner: PlayerId;
  type: PieceType;
  position: Coordinate;
}

export interface Territory {
  id: PlayerId;
  squares: Coordinate[];
  palace: {
    origin: Coordinate;
    size: number; // e.g., 3 for 3x3
  };
}

export interface PlayerState {
  id: PlayerId;
  score: number;
  isEliminated: boolean;
  dropReserve: PieceType[];
  territory?: Territory;
  color: string;
}

export interface ScoringConfig {
  centerControl: number;
  captureValue: Record<PieceType, number>;
  survivalBonus: number;
}

export interface TurnConfig {
  type: 'simultaneous' | 'sequential';
  maxRounds: number;
  timerSeconds: number;
}

export type FormationTemplate = {
  id: string;
  name: string;
  pieces: PieceType[];
  cost: number;
};

export interface FormationConfig {
  enabled: boolean;
  required: boolean;
  templates: FormationTemplate[];
}

export interface GameConfig {
  playerCount: PlayerCount;
  boardSize: number;
  enabledRules: string[];
  scoring: ScoringConfig;
  turnSystem: TurnConfig;
  formation?: FormationConfig;
}

export interface GameState {
  config: GameConfig;
  round: number;
  players: Record<PlayerId, PlayerState>;
  pieces: Piece[];
  status: 'waiting' | 'playing' | 'finished';
  winner?: PlayerId | PlayerId[]; // Can be multiple winners for scoring games
  history: Array<{
    round: number;
    actions: PlayerAction[];
  }>;
}

export type PlayerAction =
  | { type: 'move'; pieceId: string; from: Coordinate; to: Coordinate }
  | { type: 'drop'; pieceType: PieceType; to: Coordinate; playerId: PlayerId };

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ScoreDelta {
  playerId: PlayerId;
  delta: number;
  reason: string;
}

export interface RuleModule {
  name: string;
  onValidateMove?(ctx: { state: GameState; action: PlayerAction }): ValidationResult;
  onResolveTurn?(ctx: { state: GameState; actions: PlayerAction[] }): void;
  onScore?(ctx: { state: GameState }): ScoreDelta[];
}

// AI Related Types
export type PersonalityProfile = {
  aggression: number;
  greed: number;
  riskTolerance: number;
  focusBias: number;
  randomness: number;
};

export interface DecisionContext {
  state: GameState;
  playerId: PlayerId;
  legalActions: PlayerAction[];
  seed?: number | string;
}

export interface Bot {
  id: PlayerId;
  personality: PersonalityProfile;
  decide(context: DecisionContext): PlayerAction;
}

export interface Evaluation {
  score: number;
  details: {
    material: number;
    centerControl: number;
    risk: number;
    mobility: number;
  };
}

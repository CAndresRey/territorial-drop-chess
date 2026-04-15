import { GameState, PieceType, PlayerAction, ValidationResult } from './types.js';
/** Deep-clone a GameState (simple JSON clone — fine for engine internals) */
export declare const cloneState: (state: GameState) => GameState;
/** Piece point values used for conflict resolution */
export declare const PIECE_VALUE: Record<PieceType, number>;
export declare const validateAction: (action: PlayerAction, state: GameState) => ValidationResult;
export declare const applyAction: (action: PlayerAction, state: GameState) => GameState;
//# sourceMappingURL=moves.d.ts.map
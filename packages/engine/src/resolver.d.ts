import { Coordinate, GameState, PieceType, PlayerAction, PlayerId } from './types.js';
export interface GameOverResult {
    isOver: boolean;
    reason?: 'max_rounds' | 'last_king';
    winner?: PlayerId | PlayerId[];
}
export declare const checkGameOver: (state: GameState) => GameOverResult;
export interface RoundResult {
    state: GameState;
    events: RoundEvent[];
    gameOver: GameOverResult;
}
export type RoundEvent = {
    type: 'move';
    playerId: PlayerId;
    pieceId: string;
    from: Coordinate;
    to: Coordinate;
} | {
    type: 'capture';
    attackerId: PlayerId;
    victimId: PlayerId;
    pieceId: string;
    at: Coordinate;
} | {
    type: 'bounce';
    playerId: PlayerId;
    pieceId: string;
    at: Coordinate;
} | {
    type: 'drop';
    playerId: PlayerId;
    pieceType: PieceType;
    at: Coordinate;
} | {
    type: 'promotion';
    playerId: PlayerId;
    pieceId: string;
    at: Coordinate;
} | {
    type: 'elimination';
    playerId: PlayerId;
} | {
    type: 'score_delta';
    playerId: PlayerId;
    delta: number;
    reason: string;
} | {
    type: 'skip_penalty';
    playerId: PlayerId;
};
export declare const resolveRound: (state: GameState, actions: Record<PlayerId, PlayerAction | null>) => RoundResult;
//# sourceMappingURL=resolver.d.ts.map
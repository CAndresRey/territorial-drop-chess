import { GameState, PlayerAction, PlayerId } from './types.js';
export declare const getLegalActions: (state: GameState, playerId: PlayerId) => PlayerAction[];
export declare const applyActions: (state: GameState, actions: Record<PlayerId, PlayerAction | null>) => GameState;
export interface StateEvaluation {
    scores: Record<PlayerId, number>;
    leaderIds: PlayerId[];
    round: number;
    status: GameState['status'];
}
export declare const evaluateState: (state: GameState) => StateEvaluation;
//# sourceMappingURL=engine.d.ts.map
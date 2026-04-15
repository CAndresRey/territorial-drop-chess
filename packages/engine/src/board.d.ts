import { GameConfig, GameState, PlayerId } from './types.js';
export interface CreateGameOptions {
    formationSelections?: Partial<Record<PlayerId, string>>;
}
export declare const createGame: (config: GameConfig, playerIds: PlayerId[], options?: CreateGameOptions) => GameState;
//# sourceMappingURL=board.d.ts.map
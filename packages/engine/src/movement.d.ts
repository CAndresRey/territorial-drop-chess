import { Coordinate, GameState, Piece, PieceType } from './types.js';
/** Is a coordinate on the board? */
export declare const inBounds: (c: Coordinate, boardSize: number) => boolean;
/** Get the piece on a given square, or undefined */
export declare const pieceAt: (pieces: Piece[], coord: Coordinate) => Piece | undefined;
export type MovementRule = (state: GameState, piece: Piece) => Coordinate[];
export type PieceDefinition = {
    type: PieceType;
    movement: MovementRule;
};
export declare const getCenterBounds: (boardSize: number, playerCount: number) => {
    min: number;
    max: number;
};
export declare const isInCenter: (c: Coordinate, boardSize: number, playerCount: number) => boolean;
/**
 * Compute the primary direction vector for a Pawn based on its target center.
 */
export declare const getPawnDirection: (pos: Coordinate, boardSize: number) => {
    dx: number;
    dy: number;
};
export declare const PIECE_DEFINITIONS: Record<PieceType, PieceDefinition>;
export declare const getPieceDefinition: (pieceType: PieceType) => PieceDefinition;
export declare const getMovesForPiece: (piece: Piece, state: GameState) => Coordinate[];
//# sourceMappingURL=movement.d.ts.map
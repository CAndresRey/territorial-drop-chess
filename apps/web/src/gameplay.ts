import {
  Coordinate,
  GameState,
  getMovesForPiece,
  PieceType,
  PlayerAction,
} from '@tdc/engine';

export interface GameplaySelection {
  selectedCoord: Coordinate | null;
  selectedDrop: PieceType | null;
  validMoves: Coordinate[];
}

export interface GameplayClickResult {
  action: PlayerAction | null;
  nextSelection: GameplaySelection;
}

const emptySelection = (): GameplaySelection => ({
  selectedCoord: null,
  selectedDrop: null,
  validMoves: [],
});

export const resetSelectionAfterSubmit = (_selection: GameplaySelection): GameplaySelection =>
  emptySelection();

export const toggleDropSelection = (
  selection: GameplaySelection,
  type: PieceType,
): GameplaySelection => {
  if (selection.selectedDrop === type) {
    return { ...selection, selectedDrop: null };
  }
  return {
    selectedCoord: null,
    selectedDrop: type,
    validMoves: [],
  };
};

export const computeSelectableMoves = (
  state: GameState,
  playerId: string,
  coord: Coordinate,
): Coordinate[] => {
  const piece = state.pieces.find(
    (candidate) =>
      candidate.owner === playerId &&
      candidate.position.x === coord.x &&
      candidate.position.y === coord.y,
  );
  if (!piece) return [];
  return getMovesForPiece(piece, state);
};

export const computeActionFromBoardClick = (
  state: GameState,
  playerId: string,
  selection: GameplaySelection,
  clicked: Coordinate,
): GameplayClickResult => {
  if (selection.selectedDrop) {
    return {
      action: {
        type: 'drop',
        playerId,
        pieceType: selection.selectedDrop,
        to: clicked,
      },
      nextSelection: emptySelection(),
    };
  }

  const clickedPiece = state.pieces.find(
    (piece) => piece.position.x === clicked.x && piece.position.y === clicked.y,
  );

  if (clickedPiece?.owner === playerId) {
    return {
      action: null,
      nextSelection: {
        selectedCoord: clicked,
        selectedDrop: null,
        validMoves: getMovesForPiece(clickedPiece, state),
      },
    };
  }

  if (!selection.selectedCoord) {
    return { action: null, nextSelection: emptySelection() };
  }

  const isLegal = selection.validMoves.some(
    (move) => move.x === clicked.x && move.y === clicked.y,
  );
  if (!isLegal) {
    return { action: null, nextSelection: emptySelection() };
  }

  const selectedPiece = state.pieces.find(
    (piece) =>
      piece.owner === playerId &&
      piece.position.x === selection.selectedCoord!.x &&
      piece.position.y === selection.selectedCoord!.y,
  );
  if (!selectedPiece) {
    return { action: null, nextSelection: emptySelection() };
  }

  return {
    action: {
      type: 'move',
      pieceId: selectedPiece.id,
      from: selection.selectedCoord,
      to: clicked,
    },
    nextSelection: emptySelection(),
  };
};

import React from 'react';
import {
  Coordinate,
  GameState,
  isInCenter,
  Piece,
  PieceType,
} from '@tdc/engine';

interface BoardProps {
  state: GameState;
  playerId: string;
  selectedCoord: Coordinate | null;
  onSelectCoord: (c: Coordinate) => void;
  validMoves: Coordinate[];
}

export const Board: React.FC<BoardProps> = ({
  state,
  playerId,
  selectedCoord,
  onSelectCoord,
  validMoves,
}) => {
  const { config, pieces, players } = state;
  const { boardSize, playerCount } = config;
  const axisLabels = Array.from({ length: boardSize }, (_, index) =>
    String.fromCharCode(65 + index),
  );
  const pieceNames: Record<PieceType, string> = {
    [PieceType.King]: 'Rey',
    [PieceType.Guard]: 'Guardia',
    [PieceType.Rook]: 'Torre',
    [PieceType.Knight]: 'Caballo',
    [PieceType.Bishop]: 'Alfil',
    [PieceType.Pawn]: 'Peon',
    [PieceType.Veteran]: 'Veterano',
  };

  const handleCellClick = (x: number, y: number) => {
    onSelectCoord({ x, y });
  };

  const getPieceAt = (x: number, y: number): Piece | undefined =>
    pieces.find((piece) => piece.position.x === x && piece.position.y === y);

  const isHighlighted = (x: number, y: number) =>
    validMoves.some((coordinate) => coordinate.x === x && coordinate.y === y);

  const isSelected = (x: number, y: number) =>
    selectedCoord?.x === x && selectedCoord?.y === y;

  const getTerritoryOwner = (x: number, y: number): string | null => {
    for (const player of Object.values(players)) {
      if (player.territory?.squares.some(s => s.x === x && s.y === y)) {
        return player.id;
      }
    }
    return null;
  };

  // Generate grid
  const cells = [];
  for (let y = boardSize - 1; y >= 0; y--) {
    for (let x = 0; x < boardSize; x++) {
      const piece = getPieceAt(x, y);
      const isCen = isInCenter({ x, y }, boardSize, playerCount);
      const isHi = isHighlighted(x, y);
      const isSel = isSelected(x, y);
      const terrOwner = getTerritoryOwner(x, y);
      const coordinateLabel = `${axisLabels[x]}${y + 1}`;

      cells.push(
        <div
          key={`${x},${y}`}
          className={`cell ${isCen ? 'is-center' : ''} ${isHi ? 'highlighted' : ''} ${isSel ? 'selected' : ''} ${piece ? 'has-piece' : 'is-empty'}`}
          style={{
            backgroundColor: terrOwner ? `${players[terrOwner].color}22` : undefined,
            boxShadow: terrOwner
              ? `inset 0 0 0 1px ${players[terrOwner].color}44`
              : undefined,
          }}
          onClick={() => handleCellClick(x, y)}
          title={`${coordinateLabel}${terrOwner ? ` · territorio ${terrOwner}` : ''}${isCen ? ' · centro' : ''}`}
        >
          <span className="cell-coordinate">{coordinateLabel}</span>
          {piece && (
            <div
              className={`piece ${piece.owner === playerId ? 'piece-own' : 'piece-enemy'}`}
              style={{
                backgroundColor: players[piece.owner].color,
                boxShadow: `0 0 10px ${players[piece.owner].color}88`,
              }}
              title={`${pieceNames[piece.type]} · ${piece.owner}`}
              aria-label={`${pieceNames[piece.type]} de ${piece.owner} en ${coordinateLabel}`}
            >
              {piece.type}
            </div>
          )}
          {isHi && !piece && <span className="move-dot" aria-hidden="true" />}
        </div>
      );
    }
  }

  return (
    <div className="board-container">
      <div className="board-meta-row">
        <div className="board-chip">
          <span className="board-chip-swatch board-chip-center" />
          Centro
        </div>
        <div className="board-chip">
          <span className="board-chip-swatch board-chip-move" />
          Movimiento legal
        </div>
        <div className="board-chip">
          <span className="board-chip-swatch board-chip-territory" />
          Territorio
        </div>
      </div>
      <div className="board-shell">
        <div className="board-corner-label">y/x</div>
        <div
          className="board-axis board-axis-x"
          style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}
        >
          {axisLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div
          className="board-axis board-axis-y"
          style={{ gridTemplateRows: `repeat(${boardSize}, 1fr)` }}
        >
          {Array.from({ length: boardSize }, (_, index) => boardSize - index).map(
            (label) => (
              <span key={label}>{label}</span>
            ),
          )}
        </div>
        <div
          className="board-grid"
          style={{
            gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
            gridTemplateRows: `repeat(${boardSize}, 1fr)`,
          }}
        >
          <div className="board-center-badge">CENTRO</div>
          {cells}
        </div>
      </div>
    </div>
  );
};

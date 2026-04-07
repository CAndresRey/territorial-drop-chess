import React from 'react';
import { Coordinate, GameState, isInCenter, Piece } from '@tdc/engine';

interface BoardProps {
  state: GameState;
  playerId: string;
  selectedCoord: Coordinate | null;
  onSelectCoord: (c: Coordinate) => void;
  validMoves: Coordinate[];
}

export const Board: React.FC<BoardProps> = ({ state, playerId: _playerId, selectedCoord, onSelectCoord, validMoves }) => {
  const { config, pieces, players } = state;
  const { boardSize, playerCount } = config;

  const handleCellClick = (x: number, y: number) => {
    onSelectCoord({ x, y });
  };

  const getPieceAt = (x: number, y: number): Piece | undefined => {
    return pieces.find(p => p.position.x === x && p.position.y === y);
  };

  const isHighlighted = (x: number, y: number) => {
    return validMoves.some(c => c.x === x && c.y === y);
  };

  const isSelected = (x: number, y: number) => {
    return selectedCoord?.x === x && selectedCoord?.y === y;
  };

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

      cells.push(
        <div 
          key={`${x},${y}`} 
          className={`cell ${isCen ? 'is-center' : ''} ${isHi ? 'highlighted' : ''} ${isSel ? 'selected' : ''}`}
          style={{
            backgroundColor: terrOwner ? `${players[terrOwner].color}22` : undefined,
            border: terrOwner ? `1px solid ${players[terrOwner].color}44` : undefined
          }}
          onClick={() => handleCellClick(x, y)}
        >
          {piece && (
            <div 
              className={`piece`}
              style={{
                backgroundColor: players[piece.owner].color,
                boxShadow: `0 0 10px ${players[piece.owner].color}88`
              }}
            >
              {piece.type}
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="board-container">
      <div 
        className="board-grid"
        style={{
          gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
          gridTemplateRows: `repeat(${boardSize}, 1fr)`,
        }}
      >
        {cells}
      </div>
    </div>
  );
};

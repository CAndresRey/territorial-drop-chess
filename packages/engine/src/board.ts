import {
  Coordinate,
  FormationTemplate,
  GameConfig,
  GameState,
  Piece,
  PieceType,
  PlayerId,
  Territory,
} from './types';
import {
  DEFAULT_FORMATION_TEMPLATES,
  FORMATION_PIECE_COUNT,
  validateFormationSelection,
} from './formation';

const createPiece = (
  nextId: () => string,
  owner: PlayerId,
  type: PieceType,
  x: number,
  y: number,
): Piece => ({
  id: nextId(),
  owner,
  type,
  position: { x, y },
});

const getBoardSizeForPlayerCount = (playerCount: number): number => {
  if (playerCount === 2) return 11;
  if (playerCount <= 4) return 13;
  return 15;
};

export interface CreateGameOptions {
  formationSelections?: Partial<Record<PlayerId, string>>;
}

const validateCreateGameInput = (
  config: GameConfig,
  playerIds: PlayerId[],
): void => {
  if (config.playerCount < 2 || config.playerCount > 8) {
    throw new Error('Invalid playerCount: must be between 2 and 8');
  }
  if (playerIds.length !== config.playerCount) {
    throw new Error('Configured player count must match provided player ids');
  }
};

// ── Territory Generation ─────────────────────────────────────────────────────

const getTerritory = (
  playerId: PlayerId,
  index: number,
  playerCount: number,
  boardSize: number,
): Territory => {
  const squares: Coordinate[] = [];
  let palaceOrigin: Coordinate = { x: 0, y: 0 };
  const palaceSize = 3;

  if (playerCount === 2) {
    // 2 players: No territories
    return {
      id: playerId,
      squares: [],
      palace: { origin: { x: 0, y: 0 }, size: 0 },
    };
  }

  if (playerCount <= 4) {
    // 3-4 players: Corner territories (4x4)
    // P1: NW (A12-D15), P2: NE (L12-O15), P3: SE (L1-O4), P4: SW (A1-D4)
    const size = 4;
    let startX = 0,
      startY = 0;

    if (index === 0) {
      startX = 0;
      startY = boardSize - size;
    } // NW
    else if (index === 1) {
      startX = boardSize - size;
      startY = boardSize - size;
    } // NE
    else if (index === 2) {
      startX = boardSize - size;
      startY = 0;
    } // SE
    else if (index === 3) {
      startX = 0;
      startY = 0;
    } // SW

    for (let x = startX; x < startX + size; x++) {
      for (let y = startY; y < startY + size; y++) {
        squares.push({ x, y });
      }
    }
    // Palace is 3x3 inside the 4x4 territory, closer to the corner
    palaceOrigin = {
      x: index === 0 || index === 3 ? startX : startX + 1,
      y: index === 0 || index === 1 ? startY + 1 : startY,
    };
  } else {
    // 5-8 players: Radial territories (Angular division)
    const center = (boardSize - 1) / 2;
    const angleStep = (2 * Math.PI) / playerCount;
    const startAngle = index * angleStep;
    const endAngle = (index + 1) * angleStep;

    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        // Skip center 5x5
        const isCenter =
          x >= center - 2 &&
          x <= center + 2 &&
          y >= center - 2 &&
          y <= center + 2;
        if (isCenter) continue;

        const dx = x - center;
        const dy = y - center;
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += 2 * Math.PI;

        if (angle >= startAngle && angle < endAngle) {
          squares.push({ x, y });
        }
      }
    }
    // Palace: 3x3 at the edge of their slice
    const dist = center - 2;
    const midAngle = (startAngle + endAngle) / 2;
    palaceOrigin = {
      x: Math.round(center + dist * Math.cos(midAngle)) - 1,
      y: Math.round(center + dist * Math.sin(midAngle)) - 1,
    };
  }

  return {
    id: playerId,
    squares,
    palace: { origin: palaceOrigin, size: palaceSize },
  };
};

const getStartingArmy = (
  nextId: () => string,
  playerId: PlayerId,
  index: number,
  playerCount: number,
  boardSize: number,
): Piece[] => {
  const army: Piece[] = [];

  if (playerCount === 2) {
    // 2 players: 11x11, K, R, N, B, Px4
    // Player 1 (Bottom), Player 2 (Top)
    const yBase = index === 0 ? 0 : boardSize - 1;
    const yPawn = index === 0 ? 1 : boardSize - 2;
    const kingX = Math.floor(boardSize / 2);

    army.push(createPiece(nextId, playerId, PieceType.King, kingX, yBase));
    army.push(createPiece(nextId, playerId, PieceType.Rook, 0, yBase));
    army.push(createPiece(nextId, playerId, PieceType.Knight, 1, yBase));
    army.push(createPiece(nextId, playerId, PieceType.Bishop, 2, yBase));
    for (let i = 0; i < 4; i++) {
      army.push(createPiece(nextId, playerId, PieceType.Pawn, 3 + i, yPawn));
    }
    return army;
  }

  if (playerCount <= 4) {
    const max = boardSize - 1;
    const pawnYTop = max;
    const royalYTop = max - 2;
    const backYTop = max - 3;
    const royalYBottom = 2;
    const backYBottom = 3;

    // 3-4 players: Exact positions from GDD
    if (index === 0) {
      // NW (P1)
      [0, 1, 2, 3].forEach((x) =>
        army.push(createPiece(nextId, playerId, PieceType.Pawn, x, pawnYTop)),
      );
      army.push(createPiece(nextId, playerId, PieceType.Pawn, 3, pawnYTop - 1));
      army.push(createPiece(nextId, playerId, PieceType.King, 1, royalYTop));
      army.push(createPiece(nextId, playerId, PieceType.Guard, 2, royalYTop));
      army.push(createPiece(nextId, playerId, PieceType.Rook, 0, backYTop));
      army.push(createPiece(nextId, playerId, PieceType.Knight, 1, backYTop));
      army.push(createPiece(nextId, playerId, PieceType.Bishop, 2, backYTop));
    } else if (index === 1) {
      // NE (P2)
      [max - 3, max - 2, max - 1, max].forEach((x) =>
        army.push(createPiece(nextId, playerId, PieceType.Pawn, x, pawnYTop)),
      );
      army.push(
        createPiece(nextId, playerId, PieceType.Pawn, max - 3, pawnYTop - 1),
      );
      army.push(
        createPiece(nextId, playerId, PieceType.Guard, max - 2, royalYTop),
      );
      army.push(
        createPiece(nextId, playerId, PieceType.King, max - 1, royalYTop),
      );
      army.push(
        createPiece(nextId, playerId, PieceType.Bishop, max - 2, backYTop),
      );
      army.push(
        createPiece(nextId, playerId, PieceType.Knight, max - 1, backYTop),
      );
      army.push(createPiece(nextId, playerId, PieceType.Rook, max, backYTop));
    } else if (index === 2) {
      // SE (P3)
      army.push(createPiece(nextId, playerId, PieceType.Bishop, max - 2, backYBottom));
      army.push(createPiece(nextId, playerId, PieceType.Knight, max - 1, backYBottom));
      army.push(createPiece(nextId, playerId, PieceType.Rook, max, backYBottom));
      army.push(createPiece(nextId, playerId, PieceType.Guard, max - 2, royalYBottom));
      army.push(createPiece(nextId, playerId, PieceType.King, max - 1, royalYBottom));
      army.push(createPiece(nextId, playerId, PieceType.Pawn, max - 3, 1));
      [max - 3, max - 2, max - 1, max].forEach((x) =>
        army.push(createPiece(nextId, playerId, PieceType.Pawn, x, 0)),
      );
    } else if (index === 3) {
      // SW (P4)
      army.push(createPiece(nextId, playerId, PieceType.Rook, 0, backYBottom));
      army.push(createPiece(nextId, playerId, PieceType.Knight, 1, backYBottom));
      army.push(createPiece(nextId, playerId, PieceType.Bishop, 2, backYBottom));
      army.push(createPiece(nextId, playerId, PieceType.King, 1, royalYBottom));
      army.push(createPiece(nextId, playerId, PieceType.Guard, 2, royalYBottom));
      army.push(createPiece(nextId, playerId, PieceType.Pawn, 3, 1));
      [0, 1, 2, 3].forEach((x) =>
        army.push(createPiece(nextId, playerId, PieceType.Pawn, x, 0)),
      );
    }
    return army;
  }

  // 5-8 players: Edge zones (N, E, S, W) + Corners
  // P1-P4 use corners (same as 4p), P5-P8 use edges
  if (index < 4) return getStartingArmy(nextId, playerId, index, 4, boardSize);

  // Edge setups (simplified but matching zones)
  if (index === 4) {
    // N (F13-J15)
    [5, 6, 7, 8, 9].forEach((x) =>
      army.push(createPiece(nextId, playerId, PieceType.Pawn, x, 13)),
    );
    army.push(createPiece(nextId, playerId, PieceType.King, 7, 14));
    army.push(createPiece(nextId, playerId, PieceType.Guard, 8, 14));
    army.push(createPiece(nextId, playerId, PieceType.Rook, 6, 14));
    army.push(createPiece(nextId, playerId, PieceType.Knight, 5, 14));
    army.push(createPiece(nextId, playerId, PieceType.Bishop, 9, 14));
  } else if (index === 5) {
    // E (L6-O10)
    [11, 11, 11, 11, 11].forEach((x, i) =>
      army.push(createPiece(nextId, playerId, PieceType.Pawn, x, 5 + i)),
    );
    army.push(createPiece(nextId, playerId, PieceType.King, 14, 7));
    army.push(createPiece(nextId, playerId, PieceType.Guard, 14, 8));
    army.push(createPiece(nextId, playerId, PieceType.Rook, 14, 6));
    army.push(createPiece(nextId, playerId, PieceType.Knight, 14, 5));
    army.push(createPiece(nextId, playerId, PieceType.Bishop, 14, 9));
  } else if (index === 6) {
    // S (F1-J3)
    [5, 6, 7, 8, 9].forEach((x) =>
      army.push(createPiece(nextId, playerId, PieceType.Pawn, x, 1)),
    );
    army.push(createPiece(nextId, playerId, PieceType.King, 7, 0));
    army.push(createPiece(nextId, playerId, PieceType.Guard, 6, 0));
    army.push(createPiece(nextId, playerId, PieceType.Rook, 8, 0));
    army.push(createPiece(nextId, playerId, PieceType.Knight, 9, 0));
    army.push(createPiece(nextId, playerId, PieceType.Bishop, 5, 0));
  } else if (index === 7) {
    // W (A6-D10)
    [3, 3, 3, 3, 3].forEach((x, i) =>
      army.push(createPiece(nextId, playerId, PieceType.Pawn, x, 5 + i)),
    );
    army.push(createPiece(nextId, playerId, PieceType.King, 0, 7));
    army.push(createPiece(nextId, playerId, PieceType.Guard, 0, 6));
    army.push(createPiece(nextId, playerId, PieceType.Rook, 0, 8));
    army.push(createPiece(nextId, playerId, PieceType.Knight, 0, 9));
    army.push(createPiece(nextId, playerId, PieceType.Bishop, 0, 5));
  }

  return army;
};

const getSlotCoordinates = (
  playerId: PlayerId,
  index: number,
  playerCount: number,
  boardSize: number,
): Coordinate[] =>
  getStartingArmy(() => 'slot', playerId, index, playerCount, boardSize).map(
    (piece) => piece.position,
  );

const buildArmyFromFormation = (
  nextId: () => string,
  playerId: PlayerId,
  slots: Coordinate[],
  template: FormationTemplate,
): Piece[] => {
  if (slots.length !== FORMATION_PIECE_COUNT) {
    throw new Error(
      `Formation mode requires ${FORMATION_PIECE_COUNT} slots, got ${slots.length}`,
    );
  }
  return template.pieces.map((pieceType, idx) =>
    createPiece(nextId, playerId, pieceType, slots[idx].x, slots[idx].y),
  );
};

// ── Public API ───────────────────────────────────────────────────────────────

export const createGame = (
  config: GameConfig,
  playerIds: PlayerId[],
  options?: CreateGameOptions,
): GameState => {
  validateCreateGameInput(config, playerIds);
  let pieceCounter = 0;
  const nextId = () => `p_${pieceCounter++}`;
  const normalizedConfig: GameConfig = {
    ...config,
    boardSize: getBoardSizeForPlayerCount(config.playerCount),
  };
  const pieces: Piece[] = [];
  const players: GameState['players'] = {};
  const formationEnabled = normalizedConfig.formation?.enabled ?? false;
  const formationTemplates =
    normalizedConfig.formation?.templates?.length
      ? normalizedConfig.formation.templates
      : DEFAULT_FORMATION_TEMPLATES;
  const selectedFormations = formationEnabled
    ? validateFormationSelection(
        playerIds,
        formationTemplates,
        options?.formationSelections,
        normalizedConfig.formation?.required ?? true,
      )
    : null;
  const colors = [
    '#FF0000',
    '#0000FF',
    '#00FF00',
    '#FFFF00',
    '#FF00FF',
    '#00FFFF',
    '#FFA500',
    '#800080',
  ];

  playerIds.forEach((id, index) => {
    const territory = getTerritory(
      id,
      index,
      normalizedConfig.playerCount,
      normalizedConfig.boardSize,
    );
    players[id] = {
      id,
      score: 0,
      isEliminated: false,
      dropReserve: [],
      territory: normalizedConfig.playerCount > 2 ? territory : undefined,
      color: colors[index % colors.length],
    };

    if (formationEnabled) {
      const slots = getSlotCoordinates(
        id,
        index,
        normalizedConfig.playerCount,
        normalizedConfig.boardSize,
      );
      const selected = selectedFormations![id];
      pieces.push(...buildArmyFromFormation(nextId, id, slots, selected));
    } else {
      const army = getStartingArmy(
        nextId,
        id,
        index,
        normalizedConfig.playerCount,
        normalizedConfig.boardSize,
      );
      pieces.push(...army);
    }
  });

  return {
    config: normalizedConfig,
    round: 1,
    players,
    pieces,
    status: 'playing',
    history: [],
  };
};

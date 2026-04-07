import { GameState, PlayerId, Evaluation, PieceType, PersonalityProfile } from '../../engine/src/types';
import { PIECE_VALUE } from '../../engine/src/moves';
import { isInCenter, getMovesForPiece } from '../../engine/src/movement';

export interface EvaluationOptions {
  seed?: number | string;
}

const hashSeed = (seed: number | string): number => {
  const text = `${seed}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededNoise = (seed: number | string): number => {
  // Mulberry32
  let t = hashSeed(seed) + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return value - 0.5;
};

export class AIEvaluator {
  static evaluate(
    state: GameState,
    playerId: PlayerId,
    personality: PersonalityProfile,
    options?: EvaluationOptions,
  ): Evaluation {
    const { boardSize, playerCount } = state.config;
    const player = state.players[playerId];

    if (player.isEliminated) return { score: -1000, details: { material: 0, centerControl: 0, risk: 0, mobility: 0 } };

    // 1. Material score
    let material = 0;
    for (const piece of state.pieces) {
      if (piece.owner === playerId) {
        material += PIECE_VALUE[piece.type];
      } else {
        material -= PIECE_VALUE[piece.type] * 0.1; // Slight bonus for capturing
      }
    }
    // Add reserve value
    for (const type of player.dropReserve) {
      material += PIECE_VALUE[type] * 0.8; // Drops are slightly less valuable than board pieces
    }

    // 2. Center Control
    const centerCount = state.pieces.filter(p => p.owner === playerId && isInCenter(p.position, boardSize, playerCount)).length;
    const centerControl = centerCount * 2;

    // 3. Risk (Simplified: number of pieces threatened)
    let risk = 0;
    // (This would be expensive to calculate fully, so we use a simplified version)

    // 4. Mobility
    let mobility = 0;
    for (const piece of state.pieces) {
      if (piece.owner === playerId) {
        mobility += getMovesForPiece(piece, state).length * 0.1;
      }
    }

    const noiseBase =
      options?.seed !== undefined ? seededNoise(options.seed) : Math.random() - 0.5;

    // Weighted score based on personality
    const totalScore = 
      material * (1 + personality.greed) +
      centerControl * (1 + personality.aggression) +
      mobility * (1 - personality.riskTolerance) +
      noiseBase * personality.randomness * 10;

    return {
      score: totalScore,
      details: { material, centerControl, risk, mobility }
    };
  }
}

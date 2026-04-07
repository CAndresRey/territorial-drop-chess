import {
  CenterBonusRule,
  MultiThreatRule,
  RuleManager,
  TerritoryControlRule,
} from '../../rules/src/index';
import { applyAction, cloneState, PIECE_VALUE, validateAction } from './moves';
import {
  Coordinate,
  GameState,
  Piece,
  PieceType,
  PlayerAction,
  PlayerId,
} from './types';

// ── End-game detection ────────────────────────────────────────────────────────

export interface GameOverResult {
  isOver: boolean;
  reason?: 'max_rounds' | 'last_king';
  winner?: PlayerId | PlayerId[];
}

export const checkGameOver = (state: GameState): GameOverResult => {
  const { maxRounds } = state.config.turnSystem;

  // Condition 1: max rounds reached
  if (state.round > maxRounds) {
    // Add survival bonus before determining winners
    const finalState = cloneState(state);
    for (const player of Object.values(finalState.players)) {
      if (!player.isEliminated) {
        player.score += state.config.scoring.survivalBonus;
      }
    }
    const winners = determineWinners(finalState);
    return { isOver: true, reason: 'max_rounds', winner: winners };
  }

  // Condition 2: only 1 King left
  const activePlayers = Object.values(state.players).filter(
    (p) => !p.isEliminated,
  );
  if (activePlayers.length <= 1) {
    const winner = activePlayers.length === 1 ? activePlayers[0].id : undefined;
    return { isOver: true, reason: 'last_king', winner };
  }

  return { isOver: false };
};

const determineWinners = (state: GameState): PlayerId[] => {
  let topScore = -Infinity;
  let winners: PlayerId[] = [];
  for (const [id, player] of Object.entries(state.players)) {
    if (player.score > topScore) {
      topScore = player.score;
      winners = [id];
    } else if (player.score === topScore) {
      winners.push(id);
    }
  }
  return winners;
};

// ── Conflict resolution ───────────────────────────────────────────────────────

interface MovingPiece {
  playerId: PlayerId;
  pieceId: string;
  target: Coordinate;
}

const resolveConflict = (
  candidates: MovingPiece[],
  pieces: Piece[],
): {
  winner: MovingPiece | null;
  bounced: MovingPiece[];
} => {
  const values = candidates.map((c) => {
    const p = pieces.find((pp) => pp.id === c.pieceId)!;
    return { c, v: PIECE_VALUE[p.type] };
  });
  const maxVal = Math.max(...values.map((v) => v.v));
  const winners = values.filter((v) => v.v === maxVal);
  if (winners.length > 1) {
    return { winner: null, bounced: candidates };
  }
  const winner = winners[0].c;
  const bounced = candidates.filter((c) => c !== winner);
  return { winner, bounced };
};

// ── Main resolution entry point ───────────────────────────────────────────────

export interface RoundResult {
  state: GameState;
  events: RoundEvent[];
  gameOver: GameOverResult;
}

export type RoundEvent =
  | {
      type: 'move';
      playerId: PlayerId;
      pieceId: string;
      from: Coordinate;
      to: Coordinate;
    }
  | {
      type: 'capture';
      attackerId: PlayerId;
      victimId: PlayerId;
      pieceId: string;
      at: Coordinate;
    }
  | { type: 'bounce'; playerId: PlayerId; pieceId: string; at: Coordinate }
  | { type: 'drop'; playerId: PlayerId; pieceType: PieceType; at: Coordinate }
  | { type: 'promotion'; playerId: PlayerId; pieceId: string; at: Coordinate }
  | { type: 'elimination'; playerId: PlayerId }
  | { type: 'score_delta'; playerId: PlayerId; delta: number; reason: string }
  | { type: 'skip_penalty'; playerId: PlayerId };

export const resolveRound = (
  state: GameState,
  actions: Record<PlayerId, PlayerAction | null>,
): RoundResult => {
  let current = cloneState(state);
  const events: RoundEvent[] = [];

  // Initialize Rule Manager with enabled rules
  const rules: any[] = [];
  if (state.config.enabledRules.includes('multi-threat'))
    rules.push(MultiThreatRule);
  if (state.config.enabledRules.includes('territory-control'))
    rules.push(TerritoryControlRule);
  if (state.config.enabledRules.includes('center-bonus'))
    rules.push(CenterBonusRule);
  const ruleManager = new RuleManager(rules);

  // Step 1: validate
  const validActions: PlayerAction[] = [];
  for (const [playerId, action] of Object.entries(actions)) {
    if (current.players[playerId]?.isEliminated) continue;
    if (!action) {
      current.players[playerId].score -= 0.5;
      events.push({ type: 'skip_penalty', playerId });
      continue;
    }

    // Engine validation
    const result = validateAction(action, current);
    if (!result.isValid) continue;

    // Rule-based validation
    const ruleResult = ruleManager.validateMove(current, action);
    if (ruleResult.isValid) {
      validActions.push(action);
    }
  }

  // Step 2: separate moves and drops
  const moveActions = validActions.filter((a) => a.type === 'move') as Extract<
    PlayerAction,
    { type: 'move' }
  >[];
  const dropActions = validActions.filter((a) => a.type === 'drop') as Extract<
    PlayerAction,
    { type: 'drop' }
  >[];

  // Step 3: resolve move conflicts
  const byDest = new Map<string, MovingPiece[]>();
  for (const move of moveActions) {
    const key = `${move.to.x},${move.to.y}`;
    if (!byDest.has(key)) byDest.set(key, []);
    const piece = current.pieces.find((p) => p.id === move.pieceId)!;
    byDest
      .get(key)!
      .push({ playerId: piece.owner, pieceId: move.pieceId, target: move.to });
  }

  const winningMoves: Extract<PlayerAction, { type: 'move' }>[] = [];
  for (const [, candidates] of byDest) {
    if (candidates.length === 1) {
      winningMoves.push(
        moveActions.find((m) => m.pieceId === candidates[0].pieceId)!,
      );
    } else {
      const { winner, bounced } = resolveConflict(candidates, current.pieces);
      for (const b of bounced) {
        const piece = current.pieces.find((p) => p.id === b.pieceId)!;
        events.push({
          type: 'bounce',
          playerId: b.playerId,
          pieceId: b.pieceId,
          at: piece.position,
        });
      }
      if (winner) {
        winningMoves.push(
          moveActions.find((m) => m.pieceId === winner.pieceId)!,
        );
      }
    }
  }

  // Step 4: apply winning moves
  for (const move of winningMoves) {
    const piece = current.pieces.find((p) => p.id === move.pieceId);
    if (!piece) continue;
    const wasAt = { ...piece.position };
    const wasPawn = piece.type === PieceType.Pawn;

    current = applyAction(move, current);

    const movedPiece = current.pieces.find((p) => p.id === move.pieceId);
    events.push({
      type: 'move',
      playerId: piece.owner,
      pieceId: move.pieceId,
      from: wasAt,
      to: move.to,
    });

    if (wasPawn && movedPiece?.type === PieceType.Veteran) {
      events.push({
        type: 'promotion',
        playerId: piece.owner,
        pieceId: move.pieceId,
        at: move.to,
      });
    }

    // Check for king capture/elimination
    for (const pid of Object.keys(current.players)) {
      if (pid !== piece.owner && !current.players[pid].isEliminated) {
        const hasKing = current.pieces.some(
          (p) => p.owner === pid && p.type === PieceType.King,
        );
        if (!hasKing) {
          current.players[pid].isEliminated = true;
          events.push({ type: 'elimination', playerId: pid });
        }
      }
    }
  }

  // Step 5: apply drops
  for (const drop of dropActions) {
    current = applyAction(drop, current);
    events.push({
      type: 'drop',
      playerId: drop.playerId,
      pieceType: drop.pieceType,
      at: drop.to,
    });
  }

  // Step 6: Rule-based scoring
  const deltas = ruleManager.calculateScores(current);
  for (const d of deltas) {
    current.players[d.playerId].score += d.delta;
    events.push({
      type: 'score_delta',
      playerId: d.playerId,
      delta: d.delta,
      reason: d.reason,
    });
  }

  // Step 7: Update history and round
  current.history.push({
    round: current.round,
    actions: validActions,
  });
  current.round += 1;

  // Step 8: Check end conditions
  const gameOver = checkGameOver(current);
  if (gameOver.isOver) {
    current.status = 'finished';
    current.winner = gameOver.winner;
  }

  return { state: current, events, gameOver };
};

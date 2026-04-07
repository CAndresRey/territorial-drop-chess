import { Server, Socket } from 'socket.io';
import {
  createGame,
  GameState,
  getLegalActions,
  PlayerAction,
  PlayerId,
  resolveRound,
} from '@tdc/engine';
import { HeuristicBot } from '../../../packages/ai-strategies/src/index';
import { getDifficultyProfile } from '../../../packages/difficulty/src/index';
import { MultiAgentAIManager } from '../../../packages/ai-manager/src/index';
import {
  CreateGameRequestPayload,
  normalizeCreateGameRequest,
} from './setup';

export const TURN_DURATION_MS = 30000;

export class Room {
  public id: string;
  public state: GameState | null = null;
  public playerSockets: Map<PlayerId, string> = new Map();
  public bots: HeuristicBot[] = [];
  private manager: MultiAgentAIManager | null = null;

  private actions: Partial<Record<PlayerId, PlayerAction | null>> = {};
  private timer: NodeJS.Timeout | null = null;
  private io: Server;
  
  public get isPlaying(): boolean {
    return this.state !== null && this.state.status === 'playing';
  }

  constructor(id: string, io: Server) {
    this.id = id;
    this.io = io;
  }

  public join(socket: Socket, requestedPlayerId: PlayerId): boolean {
    if (this.isPlaying) return false;
    this.playerSockets.set(requestedPlayerId, socket.id);
    socket.join(this.id);
    return true;
  }

  public leave(socketId: string) {
    for (const [pId, sId] of this.playerSockets.entries()) {
      if (sId === socketId) {
        this.playerSockets.delete(pId);
        break;
      }
    }
  }

  public start(payload: CreateGameRequestPayload) {
    const normalized = normalizeCreateGameRequest(payload);
    this.bots = [];
    for (const botSetting of normalized.botSettings) {
      this.bots.push(
        new HeuristicBot(botSetting.id, getDifficultyProfile(botSetting.difficulty)),
      );
    }
    this.manager = new MultiAgentAIManager(this.bots, {
      maxFocusPerTarget: normalized.maxFocusPerTarget,
    });

    this.state = createGame(normalized.config, normalized.playerIds, {
      formationSelections: normalized.formationSelections,
    });
    this.broadcastState();
    this.startTurnTimer();
  }

  public submitAction(playerId: PlayerId, action: PlayerAction | null) {
    if (!this.isPlaying) return;
    this.actions[playerId] = action;

    const activeHumans = Array.from(this.playerSockets.keys()).filter(id => !this.state!.players[id].isEliminated);
    const submittedCount = activeHumans.filter(id => this.actions[id] !== undefined).length;

    if (submittedCount === activeHumans.length) {
      this.resolveCurrentRound();
    }
  }

  private startTurnTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.actions = {};
    
    const activePlayers = Object.keys(this.state!.players).filter(
      (id) => !this.state!.players[id].isEliminated,
    );
    activePlayers.forEach((id) => {
      this.actions[id] = undefined;
    });

    this.io.to(this.id).emit('turnStarted', { duration: TURN_DURATION_MS, round: this.state!.round });

    this.timer = setTimeout(() => {
      this.resolveCurrentRound();
    }, TURN_DURATION_MS);
  }

  private resolveCurrentRound() {
    if (this.timer) clearTimeout(this.timer);
    if (!this.state || this.state.status !== 'playing') return;

    // Bot decisions
    const legalActionsByPlayer: Partial<Record<PlayerId, PlayerAction[]>> = {};
    for (const bot of this.bots) {
      legalActionsByPlayer[bot.id] = getLegalActions(this.state, bot.id);
    }
    const botDecisions = this.manager?.decideRound(this.state, legalActionsByPlayer, {
      seed: `${this.id}|round:${this.state.round}`,
    }) ?? {};
    for (const bot of this.bots) {
      this.actions[bot.id] = botDecisions[bot.id] ?? null;
    }

    // Resolve
    const activePlayers = Object.keys(this.state.players).filter(
      (id) => !this.state!.players[id].isEliminated,
    );
    const resolvedActions: Record<PlayerId, PlayerAction | null> = {} as Record<
      PlayerId,
      PlayerAction | null
    >;
    for (const playerId of activePlayers) {
      resolvedActions[playerId] = this.actions[playerId] ?? null;
    }

    const { state: nextState, events, gameOver } = resolveRound(
      this.state,
      resolvedActions,
    );
    this.state = nextState;

    this.io.to(this.id).emit('roundResolved', {
      state: this.state,
      events,
      gameOver
    });

    if (gameOver.isOver) {
      this.state.status = 'finished';
      return;
    }

    setTimeout(() => {
      if (this.state && this.state.status === 'playing') {
        this.startTurnTimer();
      }
    }, 1500);
  }

  private broadcastState() {
    this.io.to(this.id).emit('gameState', this.state);
  }
}

import { HeuristicBot } from '@tdc/ai-strategies';
import { getDifficultyProfile } from '@tdc/difficulty';
import {
  GameConfig,
  createGame,
  getLegalActions,
  resolveRound
} from '@tdc/engine';

const config: GameConfig = {
  playerCount: 2,
  boardSize: 11,
  enabledRules: [],
  scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
  turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
};

const bots = [
  new HeuristicBot('p1', getDifficultyProfile('normal')),
  new HeuristicBot('p2', getDifficultyProfile('normal')),
];

console.log('P1 profile:', bots[0].personality.aggression);
console.log('P2 profile:', bots[1].personality.aggression);

let state = createGame(config, ['p1', 'p2']);
while (state.status === 'playing') {
  const actions = {
    p1: bots[0].decide({
      playerId: 'p1',
      state,
      legalActions: getLegalActions(state, 'p1'),
    }),
    p2: bots[1].decide({
      playerId: 'p2',
      state,
      legalActions: getLegalActions(state, 'p2'),
    }),
  };

  if (state.round <= 7) {
    console.log(`Round ${state.round} actions:`);
    console.log(
      `p1:`,
      actions.p1?.type === 'move'
        ? `${actions.p1.from.x},${actions.p1.from.y} -> ${actions.p1.to.x},${actions.p1.to.y}`
        : actions.p1,
    );
    console.log(
      `p2:`,
      actions.p2?.type === 'move'
        ? `${actions.p2.from.x},${actions.p2.from.y} -> ${actions.p2.to.x},${actions.p2.to.y}`
        : actions.p2,
    );
  }

  state = resolveRound(state, actions).state;
}

console.log('GAME OVER.');
console.log('Winner:', state.winner);
console.log(
  'Scores:',
  Object.entries(state.players)
    .map(([id, p]) => `${id}: ${p.score}`)
    .join(', '),
);
console.log(
  'Remaining pieces p1:',
  state.pieces.filter((p) => p.owner === 'p1').length,
);
console.log(
  'Remaining pieces p2:',
  state.pieces.filter((p) => p.owner === 'p2').length,
);

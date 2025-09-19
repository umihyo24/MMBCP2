import { createEnemyDeck, createEnemyMonsters, createPlayerMonsters, createStarterDeck } from './cards';
import { installInputHandlers } from './input';
import { renderGame } from './render';
import {
  Card,
  GameState,
  Monster,
  PlayerState,
  Rect,
} from './types';
import {
  addLog,
  canPlayCard,
  checkVictory,
  drawCard,
  getValidTargets,
  monsterAttackMonster,
  monsterAttackPlayer,
  pickDefaultTargets,
  playCard,
  shuffle,
} from './rules';
import { createContext, startTurn } from './guts';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('ゲーム用のキャンバスが見つかりません。');
}
canvas.width = 1024;
canvas.height = 720;

const context = canvas.getContext('2d');
if (!context) {
  throw new Error('CanvasRenderingContext2D がサポートされていません。');
}
const renderContext: CanvasRenderingContext2D = context;

const rng = () => Math.random();

function createPlayer(id: 'player' | 'enemy', index: 0 | 1, name: string, deck: Card[], monsters: Monster[]): PlayerState {
  return {
    id,
    index,
    name,
    hp: 20,
    deck,
    hand: [],
    discard: [],
    monsters,
    guts: createContext(),
  };
}

const playerState = createPlayer('player', 0, 'プレイヤー', createStarterDeck(), createPlayerMonsters());
const enemyState = createPlayer('enemy', 1, 'エネミー', createEnemyDeck(), createEnemyMonsters());

shuffle(playerState.deck, rng);
shuffle(enemyState.deck, rng);

function createEmptyLayout(): GameState['layout'] {
  return {
    handRects: {} as Record<string, Rect>,
    playerMonsterRects: {} as Record<string, Rect>,
    enemyMonsterRects: {} as Record<string, Rect>,
    playerStatusRect: { x: 0, y: 0, width: 0, height: 0 },
    enemyStatusRect: { x: 0, y: 0, width: 0, height: 0 },
    energyRect: { x: 0, y: 0, width: 0, height: 0 },
    endTurnRect: { x: 0, y: 0, width: 0, height: 0 },
    logRect: { x: 0, y: 0, width: 0, height: 0 },
  };
}

const state: GameState = {
  players: [playerState, enemyState],
  activePlayer: 0,
  turn: 1,
  phase: 'player',
  log: [],
  rng,
  layout: createEmptyLayout(),
  lastUpdate: performance.now(),
};

function resetSelection(): void {
  state.pendingSelection = undefined;
  state.selectedCardId = undefined;
}

function finalizeVictory(): void {
  const winner = checkVictory(state);
  if (winner && !state.winner) {
    state.winner = winner;
    state.phase = 'victory';
    addLog(state, winner === 'player' ? 'プレイヤーの勝利！' : 'エネミーの勝利…');
  }
}

function startPlayerTurn(): void {
  state.phase = 'player';
  state.activePlayer = 0;
  resetSelection();
  addLog(state, `--- ターン${state.turn} プレイヤー ---`);
  startTurn(playerState.guts);
  addLog(state, `ガッツ残量: ${playerState.guts.guts}`);
  drawCard(state, playerState);
}

function startEnemyTurn(): void {
  if (state.winner) {
    return;
  }
  state.phase = 'enemy';
  state.activePlayer = 1;
  resetSelection();
  addLog(state, `--- ターン${state.turn} エネミー ---`);
  startTurn(enemyState.guts);
  addLog(state, `エネミーのガッツ: ${enemyState.guts.guts}`);
  drawCard(state, enemyState);
  executeEnemyActions();
}

function executeEnemyActions(): void {
  if (state.winner) {
    return;
  }

  const playableCard = enemyState.hand.find((card) => canPlayCard(state, enemyState, card));
  if (playableCard) {
    const targets = pickDefaultTargets(state, enemyState, playableCard);
    playCard(state, enemyState, playableCard, targets);
  }

  const attacker = enemyState.monsters[0];
  if (attacker) {
    const defender = playerState.monsters[0];
    if (defender) {
      monsterAttackMonster(state, attacker, defender, enemyState);
    } else {
      monsterAttackPlayer(state, attacker, playerState, enemyState);
    }
  }

  finalizeVictory();
  if (state.winner) {
    return;
  }

  state.turn += 1;
  startPlayerTurn();
}

function handleCardSelected(card: Card): void {
  if (state.phase !== 'player' || state.winner) {
    return;
  }

  const player = playerState;
  if (!canPlayCard(state, player, card)) {
    state.selectedCardId = card.instanceId;
    state.pendingSelection = undefined;
    addLog(state, `${card.name}の条件が満たされていません。`);
    return;
  }

  state.selectedCardId = card.instanceId;
  const targets = getValidTargets(state, player, card);
  if (card.target === 'none' || targets.length === 0) {
    playCard(state, player, card, []);
    finalizeVictory();
    resetSelection();
    return;
  }

  state.pendingSelection = { card, targets, targetType: card.target };
}

function resolveCardWithTargets(targets: (Monster | PlayerState)[]): void {
  const selection = state.pendingSelection;
  if (!selection) {
    return;
  }
  const { card } = selection;
  playCard(state, playerState, card, targets);
  finalizeVictory();
  resetSelection();
}

function handleMonsterTarget(owner: 0 | 1, monster: Monster): void {
  if (state.phase !== 'player' || state.winner || !state.pendingSelection) {
    return;
  }
  if (!state.pendingSelection.targets.includes(monster)) {
    return;
  }
  resolveCardWithTargets([monster]);
}

function handlePlayerTarget(owner: 0 | 1): void {
  if (state.phase !== 'player' || state.winner || !state.pendingSelection) {
    return;
  }
  const targetPlayer = state.players[owner];
  if (!state.pendingSelection.targets.includes(targetPlayer)) {
    return;
  }
  resolveCardWithTargets([targetPlayer]);
}

function handleBackground(): void {
  if (state.phase !== 'player') {
    return;
  }
  resetSelection();
}

function endPlayerTurn(): void {
  if (state.phase !== 'player' || state.winner) {
    return;
  }
  addLog(state, 'プレイヤーはターンを終了した。');
  startEnemyTurn();
}

installInputHandlers(canvas, state, {
  onCardSelected: handleCardSelected,
  onMonsterTarget: handleMonsterTarget,
  onPlayerTarget: handlePlayerTarget,
  onBackground: handleBackground,
  onEndTurn: endPlayerTurn,
});

addLog(state, 'ゲーム開始。');
drawCard(state, playerState, 3);
drawCard(state, enemyState, 3);
startPlayerTurn();

function loop(timestamp: number) {
  state.lastUpdate = timestamp;
  renderGame(renderContext, state);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

import { Card, GameState, Monster, PlayerIndex, PlayerState, TargetableEntity } from './types';
import { canPay, pay } from './guts';

const LOG_LIMIT = 18;

export function addLog(state: GameState, message: string): void {
  state.log.push(message);
  if (state.log.length > LOG_LIMIT) {
    state.log.splice(0, state.log.length - LOG_LIMIT);
  }
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function getPlayerIndex(player: PlayerState): PlayerIndex {
  return player.index;
}

export function getOpponent(state: GameState, player: PlayerState): PlayerState {
  return player.id === 'player' ? state.players[1] : state.players[0];
}

function hasAttributeRequirement(card: Card, player: PlayerState): boolean {
  if (!card.requirement.requiresAttribute) {
    return true;
  }
  return player.monsters.some((monster) => monster.attribute === card.requirement.requiresAttribute);
}

function hasTribeRequirement(card: Card, player: PlayerState): boolean {
  if (!card.requirement.requiresTribe) {
    return true;
  }
  return player.monsters.some((monster) => monster.tribe === card.requirement.requiresTribe);
}

function hasUniqueRequirement(card: Card, player: PlayerState): boolean {
  if (!card.requirement.requiresMonsterId) {
    return true;
  }
  return player.monsters.some((monster) => monster.id === card.requirement.requiresMonsterId);
}

export function meetsCardRequirements(card: Card, player: PlayerState): boolean {
  return hasAttributeRequirement(card, player) && hasTribeRequirement(card, player) && hasUniqueRequirement(card, player);
}

export function getValidTargets(state: GameState, player: PlayerState, card: Card): TargetableEntity[] {
  const opponent = getOpponent(state, player);
  switch (card.target) {
    case 'ally-monster':
      return [...player.monsters];
    case 'enemy-monster':
      return [...opponent.monsters];
    case 'any-monster':
      return [...player.monsters, ...opponent.monsters];
    case 'ally-player':
      return [player];
    case 'enemy-player':
      return [opponent];
    case 'ally-any':
      return [player, ...player.monsters];
    case 'enemy-any':
      return [opponent, ...opponent.monsters];
    case 'none':
    default:
      return [];
  }
}

export function canPlayCard(state: GameState, player: PlayerState, card: Card): boolean {
  if (!meetsCardRequirements(card, player)) {
    return false;
  }

  if (!canPay(player.guts, card.requirement.cost)) {
    return false;
  }

  if (card.target !== 'none' && getValidTargets(state, player, card).length === 0) {
    return false;
  }

  return true;
}

function removeCardFromHand(player: PlayerState, card: Card): Card | null {
  const index = player.hand.findIndex((candidate) => candidate.instanceId === card.instanceId);
  if (index === -1) {
    return null;
  }
  const [removed] = player.hand.splice(index, 1);
  return removed;
}

export function playCard(state: GameState, player: PlayerState, card: Card, targets: TargetableEntity[]): void {
  const opponent = getOpponent(state, player);
  const cardInHand = removeCardFromHand(player, card);
  if (!cardInHand) {
    return;
  }

  if (!pay(player.guts, card.requirement.cost)) {
    player.hand.push(cardInHand);
    return;
  }

  addLog(state, `${player.name}は「${card.name}」を使用した。`);

  card.effect({
    state,
    sourcePlayer: player,
    targetPlayer: opponent,
    targets,
    log: (message: string) => addLog(state, message),
  });

  player.discard.push(cardInHand);
}

export function drawCard(state: GameState, player: PlayerState, amount = 1): void {
  for (let i = 0; i < amount; i += 1) {
    const card = player.deck.shift();
    if (!card) {
      addLog(state, `${player.name}はドローできるカードがない。`);
      return;
    }
    player.hand.push(card);
    addLog(state, `${player.name}は「${card.name}」をドローした。`);
  }
}

export function findMonsterOwner(state: GameState, instanceId: string): [PlayerIndex, Monster | undefined] {
  for (const player of state.players) {
    const monster = player.monsters.find((candidate) => candidate.instanceId === instanceId);
    if (monster) {
      return [player.index, monster];
    }
  }
  return [0, undefined];
}

export function applyMonsterDamage(state: GameState, target: Monster, amount: number, source?: string): void {
  const [ownerIndex, monster] = findMonsterOwner(state, target.instanceId);
  if (!monster) {
    return;
  }

  const actualAmount = Math.max(0, Math.floor(amount));
  if (actualAmount <= 0) {
    return;
  }

  monster.hp = Math.max(0, monster.hp - actualAmount);
  addLog(state, `${source ?? '効果'}が${monster.name}に${actualAmount}ダメージ。`);

  if (monster.hp <= 0) {
    addLog(state, `${monster.name}は倒れた。`);
    state.players[ownerIndex].monsters = state.players[ownerIndex].monsters.filter((candidate) => candidate.instanceId !== monster.instanceId);
  }
}

export function healMonster(state: GameState, target: Monster, amount: number, source?: string): void {
  const [, monster] = findMonsterOwner(state, target.instanceId);
  if (!monster) {
    return;
  }

  const actualAmount = Math.max(0, Math.floor(amount));
  if (actualAmount <= 0) {
    return;
  }

  const previous = monster.hp;
  monster.hp = Math.min(monster.maxHp, monster.hp + actualAmount);
  const healed = monster.hp - previous;
  if (healed > 0) {
    addLog(state, `${source ?? '効果'}が${monster.name}を${healed}回復した。`);
  }
}

export function damagePlayer(state: GameState, player: PlayerState, amount: number, source?: string): void {
  const actualAmount = Math.max(0, Math.floor(amount));
  if (actualAmount <= 0) {
    return;
  }

  player.hp = Math.max(0, player.hp - actualAmount);
  addLog(state, `${source ?? '攻撃'}が${player.name}に${actualAmount}ダメージ。`);
}

export function monsterAttackMonster(
  state: GameState,
  attacker: Monster,
  defender: Monster,
  attackerOwner: PlayerState,
): void {
  const attackPower = Math.max(1, attacker.attack - defender.defense);
  addLog(state, `${attackerOwner.name}の${attacker.name}が${defender.name}を攻撃(${attackPower}ダメージ)。`);
  applyMonsterDamage(state, defender, attackPower, attacker.name);
}

export function monsterAttackPlayer(
  state: GameState,
  attacker: Monster,
  defender: PlayerState,
  attackerOwner: PlayerState,
): void {
  const damage = Math.max(1, attacker.attack);
  addLog(state, `${attackerOwner.name}の${attacker.name}が直接攻撃(${damage}ダメージ)。`);
  damagePlayer(state, defender, damage, attacker.name);
}

export function pickDefaultTargets(state: GameState, player: PlayerState, card: Card): TargetableEntity[] {
  const targets = getValidTargets(state, player, card);
  if (targets.length <= 1) {
    return targets.slice();
  }

  if (card.target === 'enemy-monster' || card.target === 'any-monster') {
    const monsters = targets.filter((target): target is Monster => 'hp' in target);
    monsters.sort((a, b) => a.hp - b.hp);
    return monsters.length > 0 ? [monsters[0]] : [];
  }

  return [targets[0]];
}

export function checkVictory(state: GameState): 'player' | 'enemy' | null {
  const player = state.players[0];
  const enemy = state.players[1];

  if (player.hp <= 0 && enemy.hp <= 0) {
    return 'player';
  }
  if (enemy.hp <= 0) {
    return 'player';
  }
  if (player.hp <= 0) {
    return 'enemy';
  }
  return null;
}

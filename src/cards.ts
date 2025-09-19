import { gain } from './guts';
import {
  Attribute,
  Card,
  CardRequirement,
  CardEffectContext,
  Monster,
  PlayerState,
  Tribe,
} from './types';
import { applyMonsterDamage, damagePlayer, healMonster } from './rules';

interface CardTemplate {
  id: string;
  name: string;
  description: string;
  attribute: Attribute;
  requirement: CardRequirement;
  target: Card['target'];
  effect: Card['effect'];
}

interface MonsterTemplate {
  id: string;
  name: string;
  attribute: Attribute;
  tribe: Tribe;
  maxHp: number;
  attack: number;
  defense: number;
}

let cardSequence = 0;
let monsterSequence = 0;

function cloneRequirement(requirement: CardRequirement): CardRequirement {
  return {
    cost: requirement.cost
      ? {
          guts: requirement.cost.guts,
          attributes: requirement.cost.attributes ? { ...requirement.cost.attributes } : undefined,
        }
      : undefined,
    requiresAttribute: requirement.requiresAttribute,
    requiresTribe: requirement.requiresTribe,
    requiresMonsterId: requirement.requiresMonsterId,
  };
}

function instantiateCard(template: CardTemplate): Card {
  cardSequence += 1;
  return {
    id: template.id,
    instanceId: `${template.id}-${cardSequence}`,
    name: template.name,
    description: template.description,
    attribute: template.attribute,
    requirement: cloneRequirement(template.requirement),
    target: template.target,
    effect: template.effect,
  };
}

function instantiateMonster(template: MonsterTemplate): Monster {
  monsterSequence += 1;
  return {
    id: template.id,
    instanceId: `${template.id}-${monsterSequence}`,
    name: template.name,
    attribute: template.attribute,
    tribe: template.tribe,
    maxHp: template.maxHp,
    hp: template.maxHp,
    attack: template.attack,
    defense: template.defense,
  };
}

function isMonster(entity: Monster | PlayerState): entity is Monster {
  return 'maxHp' in entity;
}

const flameBolt: CardTemplate = {
  id: 'flame-bolt',
  name: 'フレイムボルト',
  description: '火属性の仲間が必要。敵モンスターに4ダメージ。',
  attribute: 'fire',
  requirement: {
    cost: { guts: 1, attributes: { fire: 1 } },
    requiresAttribute: 'fire',
  },
  target: 'enemy-monster',
  effect: ({ state, sourcePlayer, targets, log }) => {
    const target = targets.find(isMonster);
    if (!target) {
      log('対象が選択されていません。');
      return;
    }
    applyMonsterDamage(state, target, 4, `${sourcePlayer.name}のフレイムボルト`);
  },
};

const packHowl: CardTemplate = {
  id: 'pack-howl',
  name: '群れの遠吠え',
  description: '獣人・獣が必要。敵モンスターに3ダメージ。',
  attribute: 'wind',
  requirement: {
    cost: { guts: 1 },
    requiresTribe: 'beast',
  },
  target: 'enemy-monster',
  effect: ({ state, sourcePlayer, targets, log }) => {
    const target = targets.find(isMonster);
    if (!target) {
      log('攻撃対象がいません。');
      return;
    }
    applyMonsterDamage(state, target, 3, `${sourcePlayer.name}の群れの遠吠え`);
  },
};

const luminaPrayer: CardTemplate = {
  id: 'lumina-prayer',
  name: 'ルミナの祈り',
  description: 'ルミナ賢者専用。味方モンスターを4回復。',
  attribute: 'light',
  requirement: {
    cost: { guts: 2, attributes: { light: 1 } },
    requiresMonsterId: 'lumina-sage',
  },
  target: 'ally-monster',
  effect: ({ state, sourcePlayer, targets, log }) => {
    const target = targets.find(isMonster);
    if (!target) {
      log('回復対象がいません。');
      return;
    }
    healMonster(state, target, 4, `${sourcePlayer.name}の祈り`);
  },
};

const gutsCharge: CardTemplate = {
  id: 'guts-charge',
  name: 'ガッツチャージ',
  description: 'ガッツ+2、無属性エネルギー+1を得る。',
  attribute: 'neutral',
  requirement: {},
  target: 'none',
  effect: ({ sourcePlayer, log }) => {
    gain(sourcePlayer.guts, { guts: 2, attributes: { neutral: 1 } });
    log(`${sourcePlayer.name}はガッツ2と無属性エネルギー1を得た。`);
  },
};

const guardianShield: CardTemplate = {
  id: 'guardian-shield',
  name: '守護者の盾',
  description: '味方モンスターの防御を高め、2回復する。',
  attribute: 'light',
  requirement: {
    cost: { guts: 1 },
  },
  target: 'ally-monster',
  effect: ({ state, sourcePlayer, targets, log }) => {
    const target = targets.find(isMonster);
    if (!target) {
      log('守る対象がいません。');
      return;
    }
    target.defense += 1;
    healMonster(state, target, 2, `${sourcePlayer.name}の守護者の盾`);
    log(`${target.name}の防御が1上昇した。`);
  },
};

const stoneHurl: CardTemplate = {
  id: 'stone-hurl',
  name: 'ストーンハール',
  description: '土属性の仲間が必要。敵モンスターに3ダメージ。',
  attribute: 'earth',
  requirement: {
    cost: { guts: 1, attributes: { earth: 1 } },
    requiresAttribute: 'earth',
  },
  target: 'enemy-monster',
  effect: ({ state, sourcePlayer, targets, log }) => {
    const target = targets.find(isMonster);
    if (!target) {
      log('攻撃対象がいません。');
      return;
    }
    applyMonsterDamage(state, target, 3, `${sourcePlayer.name}のストーンハール`);
  },
};

const shadowCurse: CardTemplate = {
  id: 'shadow-curse',
  name: 'シャドウカース',
  description: '闇属性の仲間が必要。敵プレイヤーに2ダメージ。',
  attribute: 'dark',
  requirement: {
    cost: { guts: 2, attributes: { dark: 1 } },
    requiresAttribute: 'dark',
  },
  target: 'enemy-player',
  effect: ({ state, sourcePlayer, targets, log }) => {
    const target = targets.find((entity): entity is PlayerState => !isMonster(entity));
    if (!target) {
      log('ターゲットがいません。');
      return;
    }
    damagePlayer(state, target, 2, `${sourcePlayer.name}のシャドウカース`);
  },
};

const darkRecovery: CardTemplate = {
  id: 'dark-recovery',
  name: 'ダークリカバリー',
  description: '味方モンスター1体を3回復する。',
  attribute: 'dark',
  requirement: {
    cost: { guts: 1 },
  },
  target: 'ally-monster',
  effect: ({ state, sourcePlayer, targets, log }) => {
    const target = targets.find(isMonster);
    if (!target) {
      log('回復対象がいません。');
      return;
    }
    healMonster(state, target, 3, `${sourcePlayer.name}の闇の癒し`);
  },
};

function buildDeck(entries: Array<[CardTemplate, number]>): Card[] {
  const deck: Card[] = [];
  for (const [template, count] of entries) {
    for (let i = 0; i < count; i += 1) {
      deck.push(instantiateCard(template));
    }
  }
  return deck;
}

export function createStarterDeck(): Card[] {
  return buildDeck([
    [flameBolt, 2],
    [packHowl, 2],
    [luminaPrayer, 1],
    [gutsCharge, 2],
    [guardianShield, 1],
  ]);
}

export function createEnemyDeck(): Card[] {
  return buildDeck([
    [stoneHurl, 2],
    [shadowCurse, 2],
    [darkRecovery, 2],
  ]);
}

const guardianWolf: MonsterTemplate = {
  id: 'guardian-wolf',
  name: '守護狼ガルム',
  attribute: 'wind',
  tribe: 'beast',
  maxHp: 14,
  attack: 3,
  defense: 1,
};

const flameMage: MonsterTemplate = {
  id: 'flame-mage',
  name: '炎術士ライラ',
  attribute: 'fire',
  tribe: 'human',
  maxHp: 10,
  attack: 2,
  defense: 0,
};

const luminaSage: MonsterTemplate = {
  id: 'lumina-sage',
  name: '賢者ルミナ',
  attribute: 'light',
  tribe: 'human',
  maxHp: 8,
  attack: 1,
  defense: 0,
};

const stoneGoblin: MonsterTemplate = {
  id: 'stone-goblin',
  name: '岩肌のゴブリン',
  attribute: 'earth',
  tribe: 'beast',
  maxHp: 9,
  attack: 3,
  defense: 0,
};

const shadowImp: MonsterTemplate = {
  id: 'shadow-imp',
  name: '影のインプ',
  attribute: 'dark',
  tribe: 'spirit',
  maxHp: 7,
  attack: 2,
  defense: 0,
};

export function createPlayerMonsters(): Monster[] {
  return [guardianWolf, flameMage, luminaSage].map(instantiateMonster);
}

export function createEnemyMonsters(): Monster[] {
  return [stoneGoblin, shadowImp].map(instantiateMonster);
}

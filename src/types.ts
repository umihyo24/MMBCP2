export type Attribute =
  | 'neutral'
  | 'fire'
  | 'water'
  | 'earth'
  | 'wind'
  | 'light'
  | 'dark';

export type Tribe = 'human' | 'beast' | 'dragon' | 'spirit' | 'undead';

export interface Monster {
  id: string;
  instanceId: string;
  name: string;
  attribute: Attribute;
  tribe: Tribe;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
}

export type PlayerIndex = 0 | 1;

export type EnergyMap = Record<Attribute, number>;

export interface EnergyCost {
  guts?: number;
  attributes?: Partial<Record<Attribute, number>>;
}

export interface CardRequirement {
  cost?: EnergyCost;
  requiresAttribute?: Attribute;
  requiresTribe?: Tribe;
  requiresMonsterId?: string;
}

export type TargetType =
  | 'none'
  | 'ally-monster'
  | 'enemy-monster'
  | 'any-monster'
  | 'ally-player'
  | 'enemy-player'
  | 'ally-any'
  | 'enemy-any';

export interface PlayerState {
  id: 'player' | 'enemy';
  index: PlayerIndex;
  name: string;
  hp: number;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  monsters: Monster[];
  guts: GutsContext;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  activePlayer: PlayerIndex;
  turn: number;
  phase: 'player' | 'enemy' | 'victory';
  log: string[];
  rng: () => number;
  layout: LayoutInfo;
  selectedCardId?: string;
  pendingSelection?: PendingSelection;
  winner?: 'player' | 'enemy';
  lastUpdate: number;
}

export interface CardEffectContext {
  state: GameState;
  sourcePlayer: PlayerState;
  targetPlayer: PlayerState;
  targets: (Monster | PlayerState)[];
  log: (message: string) => void;
}

export interface Card {
  id: string;
  instanceId: string;
  name: string;
  description: string;
  attribute: Attribute;
  requirement: CardRequirement;
  target: TargetType;
  effect: (context: CardEffectContext) => void;
}

export interface GutsContext {
  guts: number;
  maxGuts: number;
  perTurnGain: number;
  attributes: EnergyMap;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutInfo {
  handRects: Record<string, Rect>;
  playerMonsterRects: Record<string, Rect>;
  enemyMonsterRects: Record<string, Rect>;
  playerStatusRect: Rect;
  enemyStatusRect: Rect;
  energyRect: Rect;
  endTurnRect: Rect;
  logRect: Rect;
}

export interface PendingSelection {
  card: Card;
  targets: (Monster | PlayerState)[];
  targetType: TargetType;
}

export type TargetableEntity = Monster | PlayerState;

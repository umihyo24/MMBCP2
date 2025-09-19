import { Attribute, EnergyCost, EnergyMap, GutsContext } from './types';

export const ATTRIBUTE_ORDER: Attribute[] = [
  'neutral',
  'fire',
  'water',
  'earth',
  'wind',
  'light',
  'dark',
];

const DEFAULT_MAX_GUTS = 10;
const DEFAULT_PER_TURN_GAIN = 3;

function createEnergyMap(initial = 0): EnergyMap {
  return ATTRIBUTE_ORDER.reduce<EnergyMap>((map, attribute) => {
    map[attribute] = initial;
    return map;
  }, {} as EnergyMap);
}

interface ContextOptions {
  guts?: number;
  maxGuts?: number;
  perTurnGain?: number;
  attributes?: Partial<Record<Attribute, number>>;
}

export function createContext(options: ContextOptions = {}): GutsContext {
  const context: GutsContext = {
    guts: options.guts ?? 0,
    maxGuts: options.maxGuts ?? DEFAULT_MAX_GUTS,
    perTurnGain: options.perTurnGain ?? DEFAULT_PER_TURN_GAIN,
    attributes: createEnergyMap(),
  };

  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      const attribute = key as Attribute;
      context.attributes[attribute] = value ?? context.attributes[attribute];
    }
  }

  return context;
}

export function startTurn(context: GutsContext): GutsContext {
  context.guts = Math.min(context.maxGuts, context.guts + context.perTurnGain);
  return context;
}

export function gain(context: GutsContext, reward: EnergyCost): void {
  if (reward.guts) {
    context.guts = Math.min(context.maxGuts, context.guts + reward.guts);
  }

  if (reward.attributes) {
    for (const [key, amount] of Object.entries(reward.attributes)) {
      const attribute = key as Attribute;
      const value = amount ?? 0;
      context.attributes[attribute] = (context.attributes[attribute] ?? 0) + value;
    }
  }
}

export function canPay(context: GutsContext, cost?: EnergyCost): boolean {
  if (!cost) {
    return true;
  }

  if (cost.guts && context.guts < cost.guts) {
    return false;
  }

  if (cost.attributes) {
    for (const [key, amount] of Object.entries(cost.attributes)) {
      const attribute = key as Attribute;
      const requirement = amount ?? 0;
      if ((context.attributes[attribute] ?? 0) < requirement) {
        return false;
      }
    }
  }

  return true;
}

export function pay(context: GutsContext, cost?: EnergyCost): boolean {
  if (!cost) {
    return true;
  }

  if (!canPay(context, cost)) {
    return false;
  }

  if (cost.guts) {
    context.guts -= cost.guts;
  }

  if (cost.attributes) {
    for (const [key, amount] of Object.entries(cost.attributes)) {
      const attribute = key as Attribute;
      const value = amount ?? 0;
      context.attributes[attribute] = Math.max(0, (context.attributes[attribute] ?? 0) - value);
    }
  }

  return true;
}

export function resetAttributes(context: GutsContext): void {
  for (const attribute of ATTRIBUTE_ORDER) {
    context.attributes[attribute] = 0;
  }
}

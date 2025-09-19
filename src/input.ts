import { GameState, Card, Monster, PlayerIndex, PlayerState } from './types';

export interface InputCallbacks {
  onCardSelected(card: Card): void;
  onMonsterTarget(owner: PlayerIndex, monster: Monster): void;
  onPlayerTarget(owner: PlayerIndex): void;
  onBackground(): void;
  onEndTurn(): void;
}

function pointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function findCardByInstance(player: PlayerState, instanceId: string): Card | undefined {
  return player.hand.find((card) => card.instanceId === instanceId);
}

function findMonsterByInstance(player: PlayerState, instanceId: string): Monster | undefined {
  return player.monsters.find((monster) => monster.instanceId === instanceId);
}

export function installInputHandlers(
  canvas: HTMLCanvasElement,
  state: GameState,
  callbacks: InputCallbacks,
): void {
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (pointInRect(x, y, state.layout.endTurnRect)) {
      callbacks.onEndTurn();
      return;
    }

    for (const [instanceId, cardRect] of Object.entries(state.layout.handRects)) {
      if (pointInRect(x, y, cardRect)) {
        const card = findCardByInstance(state.players[0], instanceId);
        if (card) {
          callbacks.onCardSelected(card);
        }
        return;
      }
    }

    for (const [instanceId, monsterRect] of Object.entries(state.layout.enemyMonsterRects)) {
      if (pointInRect(x, y, monsterRect)) {
        const monster = findMonsterByInstance(state.players[1], instanceId);
        if (monster) {
          callbacks.onMonsterTarget(1, monster);
        }
        return;
      }
    }

    for (const [instanceId, monsterRect] of Object.entries(state.layout.playerMonsterRects)) {
      if (pointInRect(x, y, monsterRect)) {
        const monster = findMonsterByInstance(state.players[0], instanceId);
        if (monster) {
          callbacks.onMonsterTarget(0, monster);
        }
        return;
      }
    }

    if (pointInRect(x, y, state.layout.enemyStatusRect)) {
      callbacks.onPlayerTarget(1);
      return;
    }

    if (pointInRect(x, y, state.layout.playerStatusRect)) {
      callbacks.onPlayerTarget(0);
      return;
    }

    callbacks.onBackground();
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      callbacks.onEndTurn();
    }
  });
}

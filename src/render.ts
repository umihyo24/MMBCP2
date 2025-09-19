import { ATTRIBUTE_ORDER } from './guts';
import { canPlayCard } from './rules';
import {
  Card,
  GameState,
  Monster,
  PlayerState,
  Rect,
  TargetableEntity,
} from './types';

const BACKGROUND_COLOR = '#0b0d12';
const PANEL_COLOR = 'rgba(20, 28, 42, 0.82)';
const PANEL_BORDER = 'rgba(90, 118, 168, 0.6)';
const HIGHLIGHT_COLOR = '#f5c542';
const CARD_WIDTH = 130;
const CARD_HEIGHT = 180;
const CARD_GAP = 14;
const MONSTER_WIDTH = 150;
const MONSTER_HEIGHT = 120;

const ATTRIBUTE_LABEL: Record<string, string> = {
  neutral: '無',
  fire: '火',
  water: '水',
  earth: '土',
  wind: '風',
  light: '光',
  dark: '闇',
};

function drawPanel(ctx: CanvasRenderingContext2D, rect: Rect, title?: string): void {
  ctx.fillStyle = PANEL_COLOR;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  if (title) {
    ctx.fillStyle = '#f0f6ff';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText(title, rect.x + 12, rect.y + 24);
  }
}

function isTargetHighlighted(state: GameState, entity: TargetableEntity): boolean {
  if (!state.pendingSelection) {
    return false;
  }
  return state.pendingSelection.targets.includes(entity);
}

function drawStatusPanel(ctx: CanvasRenderingContext2D, rect: Rect, player: PlayerState, state: GameState): void {
  drawPanel(ctx, rect);
  const highlighted = isTargetHighlighted(state, player);
  if (highlighted) {
    ctx.strokeStyle = HIGHLIGHT_COLOR;
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  ctx.fillStyle = '#f0f6ff';
  ctx.font = '18px "Segoe UI", sans-serif';
  ctx.fillText(player.name, rect.x + 12, rect.y + 26);

  ctx.font = '14px "Segoe UI", sans-serif';
  ctx.fillText(`HP: ${player.hp}`, rect.x + 12, rect.y + 52);
  ctx.fillText(`デッキ: ${player.deck.length}`, rect.x + 12, rect.y + 74);
  ctx.fillText(`手札: ${player.hand.length}`, rect.x + 12, rect.y + 96);
  ctx.fillText(`捨札: ${player.discard.length}`, rect.x + 110, rect.y + 96);
}

function drawEnergyPanel(ctx: CanvasRenderingContext2D, rect: Rect, player: PlayerState): void {
  drawPanel(ctx, rect, 'エネルギー');
  ctx.fillStyle = '#f0f6ff';
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillText(`ガッツ: ${player.guts.guts}/${player.guts.maxGuts}`, rect.x + 12, rect.y + 48);

  ctx.font = '13px "Segoe UI", sans-serif';
  let line = 0;
  for (const attribute of ATTRIBUTE_ORDER) {
    const label = ATTRIBUTE_LABEL[attribute];
    const amount = player.guts.attributes[attribute] ?? 0;
    const text = `${label}: ${amount}`;
    const offsetX = rect.x + 12 + (line % 2) * 110;
    const offsetY = rect.y + 76 + Math.floor(line / 2) * 20;
    ctx.fillText(text, offsetX, offsetY);
    line += 1;
  }
}

function drawMonster(ctx: CanvasRenderingContext2D, rect: Rect, monster: Monster, state: GameState): void {
  drawPanel(ctx, rect, monster.name);
  const highlighted = isTargetHighlighted(state, monster);
  if (highlighted) {
    ctx.strokeStyle = HIGHLIGHT_COLOR;
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  ctx.fillStyle = '#dbe8ff';
  ctx.font = '13px "Segoe UI", sans-serif';
  ctx.fillText(`HP ${monster.hp}/${monster.maxHp}`, rect.x + 12, rect.y + 52);
  ctx.fillText(`攻 ${monster.attack}`, rect.x + 12, rect.y + 74);
  ctx.fillText(`守 ${monster.defense}`, rect.x + 12, rect.y + 96);
  ctx.fillText(`属性 ${ATTRIBUTE_LABEL[monster.attribute]}`, rect.x + 12, rect.y + 118);
  ctx.fillText(`種族 ${monster.tribe}`, rect.x + 80, rect.y + 96);
}

function drawCard(ctx: CanvasRenderingContext2D, rect: Rect, card: Card, state: GameState, player: PlayerState): void {
  const selected = state.selectedCardId === card.instanceId;
  const playable = state.phase === 'player' && canPlayCard(state, player, card);

  ctx.fillStyle = playable ? 'rgba(53, 70, 104, 0.9)' : 'rgba(34, 42, 56, 0.8)';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = selected ? HIGHLIGHT_COLOR : PANEL_BORDER;
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

  ctx.fillStyle = '#f0f6ff';
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillText(card.name, rect.x + 10, rect.y + 28);

  ctx.font = '12px "Segoe UI", sans-serif';
  const descriptionLines = wrapText(ctx, card.description, rect.width - 20);
  descriptionLines.forEach((line, index) => {
    ctx.fillText(line, rect.x + 10, rect.y + 54 + index * 16);
  });

  ctx.font = '11px "Segoe UI", sans-serif';
  let costText = '';
  if (card.requirement.cost?.guts) {
    costText += `G${card.requirement.cost.guts} `;
  }
  if (card.requirement.cost?.attributes) {
    const entries = Object.entries(card.requirement.cost.attributes)
      .filter(([, value]) => (value ?? 0) > 0)
      .map(([key, value]) => `${ATTRIBUTE_LABEL[key]}${value}`);
    costText += entries.join(' ');
  }
  ctx.fillText(costText.trim(), rect.x + 10, rect.y + rect.height - 20);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of Array.from(text)) {
    const testLine = current + char;
    if (ctx.measureText(testLine).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = testLine;
    }
    if (lines.length >= 5) {
      break;
    }
  }
  if (current && lines.length < 5) {
    lines.push(current);
  }
  return lines;
}

function drawLog(ctx: CanvasRenderingContext2D, rect: Rect, state: GameState): void {
  drawPanel(ctx, rect, 'ログ');
  ctx.fillStyle = '#d0ddf5';
  ctx.font = '12px "Segoe UI", sans-serif';
  const lines = state.log.slice(-12);
  lines.forEach((line, index) => {
    ctx.fillText(line, rect.x + 12, rect.y + 30 + index * 16);
  });
}

function drawEndTurnButton(ctx: CanvasRenderingContext2D, rect: Rect, state: GameState): void {
  const enabled = state.phase === 'player' && !state.winner;
  ctx.fillStyle = enabled ? 'rgba(64, 128, 192, 0.85)' : 'rgba(54, 70, 90, 0.7)';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

  ctx.fillStyle = '#f0f6ff';
  ctx.font = '18px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ターン終了', rect.x + rect.width / 2, rect.y + rect.height / 2 + 6);
  ctx.textAlign = 'left';
}

function drawVictoryOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.winner) {
    return;
  }
  const { width, height } = ctx.canvas;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f8fbff';
  ctx.font = '48px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const message = state.winner === 'player' ? '勝利！' : '敗北...';
  ctx.fillText(message, width / 2, height / 2);
  ctx.font = '20px "Segoe UI", sans-serif';
  ctx.fillText('リロードで再戦できます。', width / 2, height / 2 + 48);
  ctx.textAlign = 'left';
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { canvas } = ctx;
  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);

  const enemyStatusRect: Rect = { x: 24, y: 24, width: 260, height: 110 };
  const playerStatusRect: Rect = { x: 24, y: 146, width: 260, height: 110 };
  const energyRect: Rect = { x: width - 280, y: 24, width: 256, height: 160 };
  const logRect: Rect = { x: width - 280, y: 200, width: 256, height: height - 240 };
  const endTurnRect: Rect = { x: width - 220, y: height - 80, width: 180, height: 54 };

  state.layout.enemyStatusRect = enemyStatusRect;
  state.layout.playerStatusRect = playerStatusRect;
  state.layout.energyRect = energyRect;
  state.layout.logRect = logRect;
  state.layout.endTurnRect = endTurnRect;

  drawStatusPanel(ctx, enemyStatusRect, state.players[1], state);
  drawStatusPanel(ctx, playerStatusRect, state.players[0], state);
  drawEnergyPanel(ctx, energyRect, state.players[0]);
  drawLog(ctx, logRect, state);
  drawEndTurnButton(ctx, endTurnRect, state);

  drawMonsters(ctx, state);
  drawHandArea(ctx, state);
  drawVictoryOverlay(ctx, state);
}

function drawMonsters(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width } = ctx.canvas;
  const enemyArea: Rect = { x: width / 2 - 250, y: 220, width: 500, height: MONSTER_HEIGHT };
  const playerArea: Rect = { x: width / 2 - 250, y: 420, width: 500, height: MONSTER_HEIGHT };

  state.layout.enemyMonsterRects = {};
  state.layout.playerMonsterRects = {};

  drawMonsterRow(ctx, enemyArea, state.players[1], state, state.layout.enemyMonsterRects);
  drawMonsterRow(ctx, playerArea, state.players[0], state, state.layout.playerMonsterRects);
}

function drawMonsterRow(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  player: PlayerState,
  state: GameState,
  collection: Record<string, Rect>,
): void {
  const monsters = player.monsters;
  if (monsters.length === 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeRect(area.x, area.y, area.width, area.height);
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#c5d4f3';
    ctx.fillText('モンスターなし', area.x + area.width / 2 - 48, area.y + area.height / 2 + 6);
    return;
  }

  const totalWidth = monsters.length * (MONSTER_WIDTH + CARD_GAP) - CARD_GAP;
  const startX = Math.max(area.x, area.x + (area.width - totalWidth) / 2);

  monsters.forEach((monster, index) => {
    const rect: Rect = {
      x: startX + index * (MONSTER_WIDTH + CARD_GAP),
      y: area.y,
      width: MONSTER_WIDTH,
      height: MONSTER_HEIGHT,
    };
    collection[monster.instanceId] = rect;
    drawMonster(ctx, rect, monster, state);
  });
}

function drawHandArea(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = ctx.canvas;
  const player = state.players[0];
  const hand = player.hand;
  state.layout.handRects = {};

  const areaY = height - CARD_HEIGHT - 40;
  const totalWidth = hand.length * (CARD_WIDTH + CARD_GAP) - CARD_GAP;
  const startX = totalWidth > 0 ? Math.max(32, (width - totalWidth) / 2) : width / 2;

  hand.forEach((card, index) => {
    const rect: Rect = {
      x: startX + index * (CARD_WIDTH + CARD_GAP),
      y: areaY,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    };
    state.layout.handRects[card.instanceId] = rect;
    drawCard(ctx, rect, card, state, player);
  });

  ctx.fillStyle = '#8fa9d6';
  ctx.font = '14px "Segoe UI", sans-serif';
  ctx.fillText('スペースキーまたはボタンでターン終了', width / 2 - 140, height - 12);
}

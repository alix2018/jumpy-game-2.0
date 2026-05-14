import type { Sprite } from 'pixi.js';
import type { GameState } from './state';
import type { CoinManager } from './CoinManager';
import {
  BASE_WIDTH,
  PLATFORM_MIN_Y,
  PLATFORM_MAX_Y,
  PLATFORM_GAP_MIN,
  PLATFORM_GAP_SPREAD,
  PLATFORM_RANDOM_Y_RANGE,
  PLATFORM_RANDOM_Y_MIN,
} from './constants';

export class PlatformManager {
  constructor(
    private readonly state: GameState,
    private readonly coins: CoinManager,
  ) {}

  move(speed: number): void {
    const { stackOnScreen, stackOffScreen } = this.state;
    const last = stackOnScreen[stackOnScreen.length - 1];

    for (const p of stackOnScreen) {
      p.position.x -= speed;
    }

    if (last && last.x + last.width < BASE_WIDTH) {
      this.generate(last);
    }

    if (stackOnScreen.length > 0 && stackOnScreen[0].x + stackOnScreen[0].width < -1) {
      stackOffScreen.push(stackOnScreen.shift()!);
    }
  }

  private generate(last: Sprite): void {
    const { stackOnScreen, stackOffScreen } = this.state;
    if (stackOffScreen.length === 0) return;

    const idx = Math.floor(Math.random() * stackOffScreen.length);
    const next = stackOffScreen.splice(idx, 1)[0];

    const gap = Math.floor(Math.random() * PLATFORM_GAP_SPREAD + PLATFORM_GAP_MIN);
    const posX = last.x + last.width + gap;
    let posY = last.y + (last.height - next.height) / 2 + this.randomY();

    if (posY < PLATFORM_MIN_Y) posY = Math.floor(Math.random() * 50) + PLATFORM_MIN_Y;
    if (posY > PLATFORM_MAX_Y) posY = Math.floor(Math.random() * 50) + 410;

    next.position.set(posX, posY);
    stackOnScreen.push(next);
    this.coins.generate(last, next);
  }

  private randomY(): number {
    const mag = Math.floor(Math.random() * PLATFORM_RANDOM_Y_RANGE + PLATFORM_RANDOM_Y_MIN);
    return Math.random() < 0.5 ? mag : -mag;
  }
}

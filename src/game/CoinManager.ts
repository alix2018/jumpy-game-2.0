import type { AnimatedSprite, Sprite } from 'pixi.js';
import type { GameState } from './state';
import { hitCoin } from './Collisions';
import { COIN_SCORE } from './constants';

export class CoinManager {
  constructor(private readonly state: GameState) {}

  move(speed: number): void {
    const { coinsOnScreen, coinsOffScreen } = this.state;

    for (const coin of coinsOnScreen) {
      coin.position.x -= speed;
    }

    if (coinsOnScreen.length > 0 && coinsOnScreen[0].x + coinsOnScreen[0].width < -20) {
      coinsOffScreen.push(coinsOnScreen.shift()!);
    }
  }

  pickCoins(player: Sprite): number {
    const { coinsOnScreen, coinsOffScreen } = this.state;
    let earned = 0;

    for (let i = coinsOnScreen.length - 1; i >= 0; i--) {
      if (hitCoin(player, coinsOnScreen[i])) {
        const coin = coinsOnScreen.splice(i, 1)[0];
        coin.position.set(0, 2000);
        coinsOffScreen.push(coin);
        earned += COIN_SCORE;
      }
    }

    return earned;
  }

  generate(lastPlatform: Sprite, newPlatform: Sprite): void {
    const place = (x: number, y: number) => {
      const { coinsOnScreen, coinsOffScreen } = this.state;
      if (coinsOffScreen.length === 0) return;
      const coin = coinsOffScreen.shift()!;
      coin.position.set(x, y);
      coinsOnScreen.push(coin);
    };

    if (Math.random() < 0.35) {
      const midX = lastPlatform.x + lastPlatform.width + (newPlatform.x - lastPlatform.x - lastPlatform.width) / 2;
      const midY = newPlatform.y < lastPlatform.y
        ? lastPlatform.y + (lastPlatform.y - newPlatform.y) / 2 - 110
        : lastPlatform.y + (newPlatform.y - lastPlatform.y) / 2 - 80;
      place(midX, midY);
    }

    const centerX = newPlatform.x + newPlatform.width / 2;
    const topY = newPlatform.y - 45;

    if (newPlatform.width > 300 && Math.random() < 0.5) {
      place(centerX - 130, topY);
    }

    if (Math.random() < 0.8) {
      place(centerX, topY);
    }

    if (newPlatform.width > 300 && Math.random() < 0.5) {
      place(centerX + 130, topY);
    }
  }
}

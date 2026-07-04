import type { AnimatedSprite, Sprite } from 'pixi.js';

export function hitPlatform(player: Sprite, platform: Sprite): boolean {
  const playerCX = player.x + player.width / 2;
  const platCX = platform.x + platform.width / 2;
  const playerHW = player.width / 2 - 8;
  const platHW = platform.width / 2;

  if (Math.abs(playerCX - platCX) >= playerHW + platHW) return false;

  const playerBottom = player.y + player.height;
  return (
    playerBottom >= platform.y &&
    playerBottom < platform.y + platform.height / 2
  );
}

export function hitCoin(player: Sprite, coin: AnimatedSprite): boolean {
  const vx = (player.x + player.width / 2) - (coin.x + coin.width / 2);
  const vy = (player.y + player.height / 2) - (coin.y + coin.height / 2);

  return (
    Math.abs(vx) < player.width / 2 + 26 &&
    Math.abs(vy) < player.height / 2 + 26
  );
}

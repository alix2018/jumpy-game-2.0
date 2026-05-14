import type { AnimatedSprite, Sprite } from 'pixi.js';

export function hitPlatform(player: Sprite, platform: Sprite): boolean {
  const playerCX = player.x + player.width / 2;
  const playerCY = player.y + player.height / 2;
  const platCX = platform.x + platform.width / 2;
  const platCY = platform.y + platform.height / 2;

  const playerHW = player.width / 2 - 8;
  const playerHH = player.height / 2;
  const platHW = platform.width / 2;
  const platHH = platform.height / 2;

  const vx = playerCX - platCX;
  const vy = playerCY - platCY;

  if (Math.abs(vx) >= playerHW + platHW) return false;
  if (Math.abs(vy) >= playerHH + platHH - 15) return false;

  return (
    player.y + player.height >= platform.y + 15 &&
    player.y + player.height < platform.y + 30
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

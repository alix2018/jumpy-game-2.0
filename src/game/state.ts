import type { AnimatedSprite, Sprite } from 'pixi.js';
import { INITIAL_SPEED, FIRST_MILESTONE, GRAVITY } from './constants';

export interface GameState {
  stackOnScreen: Sprite[];
  stackOffScreen: Sprite[];
  coinsOnScreen: AnimatedSprite[];
  coinsOffScreen: AnimatedSprite[];
  coins: AnimatedSprite[];

  score: number;
  highScore: number;
  currentSpeed: number;
  readonly baseSpeed: number;
  newMilestone: number;
  readonly firstMilestone: number;
  readonly gravity: number;

  vy: number;
  air: boolean;
  canBePressed: boolean;
  isPress: boolean;
  keyCount: number;
  currentPlatform: Sprite | null;
}

export function createState(): GameState {
  return {
    stackOnScreen: [],
    stackOffScreen: [],
    coinsOnScreen: [],
    coinsOffScreen: [],
    coins: [],
    score: 0,
    highScore: 0,
    currentSpeed: INITIAL_SPEED,
    baseSpeed: INITIAL_SPEED,
    newMilestone: FIRST_MILESTONE,
    firstMilestone: FIRST_MILESTONE,
    gravity: GRAVITY,
    vy: 5,
    air: false,
    canBePressed: false,
    isPress: false,
    keyCount: 0,
    currentPlatform: null,
  };
}

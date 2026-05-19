import {
  Application,
  Assets,
  AnimatedSprite,
  Sprite,
  Text,
  TextStyle,
  Texture,
  TilingSprite,
} from 'pixi.js';
import { createState, type GameState } from './state';
import { CoinManager } from './CoinManager';
import { PlatformManager } from './PlatformManager';
import { hitPlatform } from './Collisions';
import {
  BASE_WIDTH,
  BASE_HEIGHT,
  COIN_POOL_SIZE,
  JUMP_VELOCITY,
  MAX_JUMP_VELOCITY,
  JUMP_HOLD_ACCEL,
  BG_SCROLL_SPEED,
  WATER_SCROLL_SPEED,
  SCORE_PER_FRAME,
  SPEED_INCREMENT,
  FALL_DEATH_Y,
} from './constants';

export class Game {
  private app!: Application;
  private state!: GameState;
  private coins!: CoinManager;
  private platforms!: PlatformManager;

  private gameWidth!: number;
  private gameHeight!: number;
  private scaleX!: number;
  private scaleY!: number;
  private isPortrait!: boolean;

  private background!: TilingSprite;
  private water!: TilingSprite;
  private jumpSprite!: Sprite;
  private fallSprite!: Sprite;
  private jumpInitiated = false;
  private runAnim!: AnimatedSprite;
  private textScore!: Text;
  private textHighScore!: Text;
  private platformPool!: Sprite[];

  private jumpSound!: HTMLAudioElement;
  private fallSound!: HTMLAudioElement;
  private fallSoundPlayed = false;

  private soundEnabled!: boolean;
  private soundToggleSprite!: Sprite;
  private soundOffTexture!: Texture;
  private soundOnTexture!: Texture;
  private soundIconY!: number;

  private isPaused = false;

  private pauseToggleSprite!: Sprite;
  private pauseTexture!: Texture;
  private playTexture!: Texture;
  private readonly pauseIconY = 20;

  async init(container: HTMLElement): Promise<void> {
    this.isPortrait = window.innerHeight > window.innerWidth;
    this.gameWidth = this.isPortrait ? window.innerWidth : BASE_WIDTH;
    this.gameHeight = this.isPortrait ? window.innerHeight : BASE_HEIGHT;
    this.scaleX = this.gameWidth / BASE_WIDTH;
    this.scaleY = this.gameHeight / BASE_HEIGHT;

    this.app = new Application();
    await this.app.init({
      width: this.gameWidth,
      height: this.gameHeight,
      antialias: true,
      backgroundColor: 0x000000,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);
    this.app.canvas.style.cssText = `touch-action: none; cursor: inherit; width: min(100%, calc(100vh * ${this.gameWidth} / ${this.gameHeight})); height: auto;`;

    await this.loadAssets();
    this.buildScene();
    this.bindInput();
    this.startGame();
    this.watchResize();

    this.app.ticker.add(() => this.tick());
    this.watchFocus();
  }

  private async loadAssets(): Promise<void> {
    await Assets.load([
      '/assets/background.png',
      '/assets/water.png',
      '/assets/tilex1.png',
      '/assets/tilesx2.png',
      '/assets/tilesx3.png',
      '/assets/tilesx4.png',
      '/assets/tilesx5.png',
      '/assets/luc-jump.png',
      '/assets/luc-fall.png',
      '/assets/luc_run.json',
      '/assets/coins_anim.json',
      '/assets/sound_off.png',
      '/assets/sound_on.png',
      '/assets/pause.png',
      '/assets/play.png',
    ]);
    this.jumpSound = new Audio('/assets/jump_sound.mp3');
    this.jumpSound.volume = 0.02;
    this.fallSound = new Audio('/assets/fall_sound.mp3');
    this.fallSound.volume = 0.02;
  }

  private buildScene(): void {
    this.state = createState();
    const { stage } = this.app;

    const bgTexture = Texture.from('/assets/background.png');
    if (this.isPortrait) {
      const bgSpriteSize = { width: this.gameWidth / 0.95, height: this.gameHeight / 0.95 };
      this.background = new TilingSprite({ texture: bgTexture, ...bgSpriteSize });
      // Scale the tile to fill the full canvas height — no vertical repeat
      const tileScale = bgSpriteSize.height / bgTexture.height;
      this.background.tileScale.set(tileScale, tileScale);
    } else {
      this.background = new TilingSprite({ texture: bgTexture, width: bgTexture.width, height: bgTexture.height });
    }
    stage.addChild(this.background);

    const waterTexture = Texture.from('/assets/water.png');
    const waterWidth = this.isPortrait ? this.gameWidth : waterTexture.width;
    this.water = new TilingSprite({ texture: waterTexture, width: waterWidth, height: waterTexture.height });
    stage.addChild(this.water);

    const platformDefs: [string, number][] = [
      ['/assets/tilex1.png', 2],
      ['/assets/tilesx2.png', 2],
      ['/assets/tilesx3.png', 2],
      ['/assets/tilesx4.png', 2],
      ['/assets/tilesx5.png', 2],
    ];
    this.platformPool = [];
    for (const [url, count] of platformDefs) {
      for (let i = 0; i < count; i++) {
        const sprite = new Sprite(Texture.from(url));
        stage.addChild(sprite);
        this.platformPool.push(sprite);
      }
    }

    // Coin pool
    const coinSheet = Assets.get('/assets/coins_anim.json');
    const coinFrames = coinSheet.animations['coins_anim'];
    for (let i = 0; i < COIN_POOL_SIZE; i++) {
      const coin = new AnimatedSprite(coinFrames);
      coin.position.set(0, 2000);
      coin.animationSpeed = 0.3;
      coin.anchor.set(0.5);
      coin.play();
      stage.addChild(coin);
      this.state.coins.push(coin);
    }

    this.jumpSprite = new Sprite(Texture.from('/assets/luc-jump.png'));
    this.jumpSprite.scale.set(0.11);
    stage.addChild(this.jumpSprite);

    this.fallSprite = new Sprite(Texture.from('/assets/luc-fall.png'));
    this.fallSprite.scale.set(0.105);
    stage.addChild(this.fallSprite);

    const runSheet = Assets.get('/assets/luc_run.json');
    this.runAnim = new AnimatedSprite(runSheet.animations['luc_run']);
    stage.addChild(this.runAnim);

    const fontSize = Math.max(14, Math.round(28 * this.scaleX));
    const style = new TextStyle({
      dropShadow: { angle: 0.5, blur: 1, color: '#424242', distance: 1 },
      fill: '#1d1d1d',
      fontFamily: 'Courier New',
      fontSize,
    });
    this.textScore = new Text({ text: 'Score: 0', style });
    this.textScore.anchor.set(1, 0);
    this.textScore.position.set(this.gameWidth - 20, 20);
    stage.addChild(this.textScore);

    this.textHighScore = new Text({ text: 'High score: 0', style });
    this.textHighScore.anchor.set(1, 0);
    this.textHighScore.position.set(this.gameWidth - 20, 20 + fontSize + 10);
    stage.addChild(this.textHighScore);

    this.pauseTexture = Texture.from('/assets/pause.png');
    this.playTexture = Texture.from('/assets/play.png');
    const pauseIconSize = 34;
    this.pauseToggleSprite = new Sprite(this.pauseTexture);
    this.pauseToggleSprite.width = pauseIconSize;
    this.pauseToggleSprite.height = pauseIconSize;
    this.pauseToggleSprite.position.set(68, this.pauseIconY);
    this.pauseToggleSprite.eventMode = 'static';
    this.pauseToggleSprite.cursor = 'pointer';
    stage.addChild(this.pauseToggleSprite);

    this.soundEnabled = localStorage.getItem('soundEnabled') === 'true';
    this.soundOffTexture = Texture.from('/assets/sound_off.png');
    this.soundOnTexture = Texture.from('/assets/sound_on.png');
    this.soundIconY = 20;

    const soundIconSize = 34;
    this.soundToggleSprite = new Sprite(this.soundEnabled ? this.soundOnTexture : this.soundOffTexture);
    this.soundToggleSprite.width = soundIconSize;
    this.soundToggleSprite.height = soundIconSize;
    this.soundToggleSprite.position.set(20, this.soundIconY);
    this.soundToggleSprite.eventMode = 'static';
    this.soundToggleSprite.cursor = 'pointer';
    stage.addChild(this.soundToggleSprite);

    this.coins = new CoinManager(this.state);
    this.platforms = new PlatformManager(
      this.state,
      this.coins,
      this.gameWidth,
      Math.round(180 * this.scaleY),
      Math.round(490 * this.scaleY),
      Math.round(410 * this.scaleY),
    );
  }

  private startGame(): void {
    const s = this.state;
    s.stackOnScreen.length = 0;
    s.stackOffScreen.length = 0;
    s.coinsOnScreen.length = 0;
    s.coinsOffScreen.length = 0;

    const sx = this.scaleX, sy = this.scaleY;

    this.background.scale.set(0.95, 0.95);
    this.background.position.set(0, 0);
    this.background.tilePosition.set(0, 0);

    this.water.position.set(0, Math.round(545 * sy));
    this.water.tilePosition.set(0, 0);

    // Destructure pool in definition order:
    // [tilex1×2, tilesx2×2, tilesx3×2, tilesx4×2, tilesx5×2]
    const [t1a, t1b, t2a, t2b, t3a, t3b, t4a, t4b, t5a, t5b] = this.platformPool;

    [t1b, t2a, t2b, t3a, t3b, t4b, t5b].forEach(p => p.position.set(0, this.gameHeight + 200));
    s.stackOffScreen.push(t1b, t2a, t2b, t3a, t3b, t4b, t5b);

    const platformY = Math.round(490 * sy);

    if (this.isPortrait) {
      // In portrait, platform widths are unscaled so scaled x-positions cause overlap.
      // Instead place platforms sequentially using their actual widths.
      t5a.position.set(0, platformY);
      t1a.position.set(t5a.width + 80, platformY);
      t4a.position.set(t5a.width + t1a.width + 130, platformY);
    } else {
      t1a.position.set(685, platformY);
      t4a.position.set(900, platformY);
      t5a.position.set(60, platformY);
    }
    s.stackOnScreen.push(t5a, t1a, t4a);

    s.vy = 5;
    s.air = false;
    s.canBePressed = false;
    s.isPress = false;
    s.currentPlatform = null;
    this.fallSoundPlayed = false;

    // Keep the same 190px vertical gap as landscape so landing vy stays below the 15px
    // collision window — scaling the gap by sy would cause the player to fall too fast.
    const playerX = this.isPortrait ? 30 : Math.round(80 * sx);
    const playerY = platformY - 250;

    this.jumpSprite.position.set(playerX, playerY);
    this.jumpSprite.visible = false;

    this.fallSprite.position.set(playerX, playerY);
    this.fallSprite.visible = true;
    this.jumpInitiated = false;

    this.runAnim.scale.set(0.48, 0.48);
    this.runAnim.position.set(playerX, playerY);
    this.runAnim.animationSpeed = 0.14;
    this.runAnim.visible = true;
    this.runAnim.play();

    for (const coin of s.coins) {
      coin.position.set(0, this.gameHeight + 200);
      s.coinsOffScreen.push(coin);
    }
    const first = s.coinsOffScreen.shift()!;
    first.position.set(Math.round(735 * sx), Math.round(435 * sy));
    s.coinsOnScreen.push(first);
  }

  private tick(): void {
    if (this.isPaused) return;
    const s = this.state;
    const player = this.runAnim;
    const onGround = this.checkGround();

    if (onGround) {
      if (s.isPress) {
        this.jumpInitiated = true;
        s.vy = JUMP_VELOCITY;
        this.jumpSprite.position.set(player.x, player.y + player.height - this.jumpSprite.height);
        this.fallSprite.position.set(this.jumpSprite.x, this.jumpSprite.y);
        player.visible = false;
        this.jumpSprite.visible = true;
        this.fallSprite.visible = false;
        s.air = true;
        if (this.soundEnabled) {
          this.jumpSound.currentTime = 0;
          this.jumpSound.play();
        }
      } else {
        this.jumpInitiated = false;
        s.vy = 0;
        player.position.set(this.jumpSprite.x, this.jumpSprite.y + this.jumpSprite.height - player.height);
        this.jumpSprite.visible = false;
        this.fallSprite.visible = false;
        player.visible = true;
        player.y = s.currentPlatform!.y + 15 - player.height;
        s.air = false;
        s.canBePressed = true;
      }
    } else if (s.isPress && s.canBePressed && s.vy >= MAX_JUMP_VELOCITY) {
      s.vy += JUMP_HOLD_ACCEL;
    } else {
      s.isPress = false;
      player.visible = false;
      if (this.jumpInitiated) {
        this.jumpSprite.visible = true;
        this.fallSprite.visible = false;
      } else {
        this.fallSprite.position.set(this.jumpSprite.x, this.jumpSprite.y);
        this.fallSprite.visible = true;
        this.jumpSprite.visible = false;
      }
      s.vy += s.gravity;
      s.canBePressed = false;
    }

    this.background.tilePosition.x -= BG_SCROLL_SPEED;
    this.water.tilePosition.x -= WATER_SCROLL_SPEED;

    this.jumpSprite.y += s.vy;
    player.y += s.vy;

    if (s.score > s.newMilestone) {
      s.currentSpeed += SPEED_INCREMENT;
      s.newMilestone *= 2;
    }

    this.platforms.move(s.currentSpeed);
    this.coins.move(s.currentSpeed);

    const coinScore = this.coins.pickCoins(player);
    s.score += coinScore + SCORE_PER_FRAME;

    this.textScore.text = `Score: ${Math.round(s.score)}`;
    this.textHighScore.text = `High score: ${Math.round(s.highScore)}`;

    if (!this.fallSoundPlayed && this.jumpSprite.y + this.jumpSprite.height > this.gameHeight) {
      this.fallSoundPlayed = true;
      if (this.soundEnabled) {
        this.fallSound.currentTime = 0;
        this.fallSound.play();
      }
    }

    if (player.y + player.height > this.gameHeight + FALL_DEATH_Y) {
      if (s.score > s.highScore) {
        s.highScore = Math.round(s.score);
        localStorage.setItem('highScore', String(s.highScore));
      }
      s.score = 0;
      s.currentSpeed = s.baseSpeed;
      s.newMilestone = s.firstMilestone;
      this.startGame();
    }
  }

  private checkGround(): boolean {
    const { stackOnScreen } = this.state;
    for (let i = 0; i < Math.min(stackOnScreen.length, 2); i++) {
      if (hitPlatform(this.jumpSprite, stackOnScreen[i])) {
        this.state.currentPlatform = stackOnScreen[i];
        return true;
      }
    }
    return false;
  }

  private toGameCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.gameWidth / rect.width),
      y: (clientY - rect.top) * (this.gameHeight / rect.height),
    };
  }

  private hitsSound(clientX: number, clientY: number): boolean {
    const { x, y } = this.toGameCoords(clientX, clientY);
    return x >= 20 && x <= 54 && y >= this.soundIconY && y <= this.soundIconY + 34;
  }

  private hitsPause(clientX: number, clientY: number): boolean {
    const { x, y } = this.toGameCoords(clientX, clientY);
    return x >= 68 && x <= 104 && y >= this.pauseIconY && y <= this.pauseIconY + 34;
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.pauseToggleSprite.texture = this.isPaused ? this.playTexture : this.pauseTexture;
    if (this.isPaused) {
      this.runAnim.stop();
      for (const coin of this.state.coins) coin.stop();
    } else {
      this.runAnim.play();
      for (const coin of this.state.coins) coin.play();
    }
  }

  private toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    this.soundToggleSprite.texture = this.soundEnabled ? this.soundOnTexture : this.soundOffTexture;
    localStorage.setItem('soundEnabled', String(this.soundEnabled));
  }

  private bindInput(): void {
    const canvas = this.app.canvas;
    canvas.addEventListener('mousedown', (e) => {
      if (this.hitsPause(e.clientX, e.clientY)) { this.togglePause(); return; }
      if (this.hitsSound(e.clientX, e.clientY)) { this.toggleSound(); return; }
      if (!this.isPaused) this.pressDown();
    });
    canvas.addEventListener('mouseup', () => this.pressUp());
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t && this.hitsPause(t.clientX, t.clientY)) { this.togglePause(); return; }
      if (t && this.hitsSound(t.clientX, t.clientY)) { this.toggleSound(); return; }
      if (!this.isPaused) this.pressDown();
    }, { passive: false });
    canvas.addEventListener('touchend', () => this.pressUp());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state.keyCount === 0) this.pressDown();
        this.state.keyCount++;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.state.keyCount = 0;
        this.pressUp();
      }
    });
  }

  private pressDown(): void { this.state.isPress = true; }
  private pressUp(): void { this.state.isPress = false; }

  private watchFocus(): void {
    const pause = () => { if (!this.isPaused) this.togglePause(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    window.addEventListener('blur', pause);
  }

  private watchResize(): void {
    let timer: ReturnType<typeof setTimeout>;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if ((window.innerHeight > window.innerWidth) !== this.isPortrait) {
          window.location.reload();
        }
      }, 150);
    });
  }
}

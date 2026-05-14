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

  private background!: TilingSprite;
  private water!: TilingSprite;
  private jumpSprite!: Sprite;
  private runAnim!: AnimatedSprite;
  private textScore!: Text;
  private textHighScore!: Text;
  private platformPool!: Sprite[];

  async init(container: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      antialias: true,
      backgroundColor: 0x000000,
    });

    container.appendChild(this.app.canvas);
    this.resize();
    window.addEventListener('resize', () => this.resize());

    await this.loadAssets();
    this.buildScene();
    this.bindInput();
    this.startGame();

    this.app.ticker.add(() => this.tick());
  }

  private resize(): void {
    const scale = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT);
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.app.stage.scale.set(scale);
    this.app.stage.position.set(
      (window.innerWidth - BASE_WIDTH * scale) / 2,
      (window.innerHeight - BASE_HEIGHT * scale) / 2,
    );
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
      '/assets/jumpy_jump.png',
      '/assets/jumpy_run.json',
      '/assets/coins_anim.json',
    ]);
  }

  private buildScene(): void {
    this.state = createState();
    const { stage } = this.app;

    const bgTexture = Texture.from('/assets/background.png');
    this.background = new TilingSprite({ texture: bgTexture, width: bgTexture.width, height: bgTexture.height });
    stage.addChild(this.background);

    const waterTexture = Texture.from('/assets/water.png');
    this.water = new TilingSprite({ texture: waterTexture, width: waterTexture.width, height: waterTexture.height });
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
    const coinFrames = this.buildFrames('coins_anim', 16);
    for (let i = 0; i < COIN_POOL_SIZE; i++) {
      const coin = new AnimatedSprite(coinFrames);
      coin.position.set(0, 2000);
      coin.animationSpeed = 0.3;
      coin.anchor.set(0.5);
      coin.play();
      stage.addChild(coin);
      this.state.coins.push(coin);
    }

    this.jumpSprite = new Sprite(Texture.from('/assets/jumpy_jump.png'));
    stage.addChild(this.jumpSprite);

    this.runAnim = new AnimatedSprite(this.buildFrames('jumpy_run', 18));
    stage.addChild(this.runAnim);

    const style = new TextStyle({
      dropShadow: { angle: 0.5, blur: 1, color: '#424242', distance: 1 },
      fill: '#1d1d1d',
      fontFamily: 'Courier New',
      fontSize: 28,
    });
    this.textScore = new Text({ text: 'Score: 0', style });
    this.textScore.position.set(670, 40);
    stage.addChild(this.textScore);

    this.textHighScore = new Text({ text: 'High score: 0', style });
    this.textHighScore.position.set(670, 78);
    stage.addChild(this.textHighScore);

    this.coins = new CoinManager(this.state);
    this.platforms = new PlatformManager(this.state, this.coins);
  }

  private buildFrames(name: string, count: number): Texture[] {
    return Array.from({ length: count }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return Texture.from(`${name}_${n}.png`);
    });
  }

  private startGame(): void {
    const s = this.state;
    s.stackOnScreen.length = 0;
    s.stackOffScreen.length = 0;
    s.coinsOnScreen.length = 0;
    s.coinsOffScreen.length = 0;

    this.background.scale.set(0.95, 0.95);
    this.background.position.set(0, 0);
    this.background.tilePosition.set(0, 0);

    this.water.position.set(0, 545);
    this.water.tilePosition.set(0, 0);

    // Destructure pool in definition order:
    // [tilex1×2, tilesx2×2, tilesx3×2, tilesx4×2, tilesx5×2]
    const [t1a, t1b, t2a, t2b, t3a, t3b, t4a, t4b, t5a, t5b] = this.platformPool;

    [t1b, t2a, t2b, t3a, t3b, t4b, t5b].forEach(p => p.position.set(0, 800));
    s.stackOffScreen.push(t1b, t2a, t2b, t3a, t3b, t4b, t5b);

    t1a.position.set(685, 490);
    t4a.position.set(900, 490);
    t5a.position.set(60, 490);
    s.stackOnScreen.push(t5a, t1a, t4a);

    s.vy = 5;
    s.air = false;
    s.canBePressed = false;
    s.isPress = false;
    s.currentPlatform = null;

    this.jumpSprite.position.set(80, 300);
    this.jumpSprite.visible = true;

    this.runAnim.scale.set(0.8, 0.8);
    this.runAnim.position.set(80, 300);
    this.runAnim.animationSpeed = 0.35;
    this.runAnim.visible = true;
    this.runAnim.play();

    for (const coin of s.coins) {
      coin.position.set(0, 2000);
      s.coinsOffScreen.push(coin);
    }
    const first = s.coinsOffScreen.shift()!;
    first.position.set(735, 435);
    s.coinsOnScreen.push(first);
  }

  private tick(): void {
    const s = this.state;
    const player = this.runAnim;
    const onGround = this.checkGround();

    if (onGround) {
      if (s.isPress) {
        s.vy = JUMP_VELOCITY;
        this.jumpSprite.position.set(player.x, player.y);
        player.visible = false;
        this.jumpSprite.visible = true;
        s.air = true;
      } else {
        s.vy = 0;
        player.position.set(this.jumpSprite.x, this.jumpSprite.y);
        this.jumpSprite.visible = false;
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
      this.jumpSprite.visible = true;
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

    if (player.y + player.height > BASE_HEIGHT + FALL_DEATH_Y) {
      if (s.score > s.highScore) s.highScore = Math.round(s.score);
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

  private bindInput(): void {
    const canvas = this.app.canvas;
    canvas.addEventListener('mousedown', () => this.pressDown());
    canvas.addEventListener('mouseup', () => this.pressUp());
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.pressDown(); }, { passive: false });
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
}

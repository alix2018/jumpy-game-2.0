import confetti from 'canvas-confetti';
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
import { SettingsScreen } from './SettingsScreen';
import type { Character, Language } from './SettingsScreen';
import { SaveTheDateScreen } from './SaveTheDateScreen';
import frTranslations from '../locales/fr.json';
import enTranslations from '../locales/en.json';
import {
  BASE_WIDTH,
  BASE_HEIGHT,
  COIN_POOL_SIZE,
  JUMP_VELOCITY,
  MAX_JUMP_VELOCITY,
  JUMP_HOLD_ACCEL,
  BG_SCROLL_SPEED,
  // WATER_SCROLL_SPEED,
  SCORE_PER_FRAME,
  SPEED_INCREMENT,
  FALL_DEATH_Y,
  SAVE_THE_DATE_SCORE_THRESHOLD,
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
  // private water!: TilingSprite;
  private jumpSprite!: Sprite;
  private fallSprite!: Sprite;
  private jumpInitiated = false;
  private runAnim!: AnimatedSprite;
  private textScore!: Text;
  private textHighScore!: Text;
  private platformPool!: Sprite[];

  private jumpSounds!: Record<Character, HTMLAudioElement>;
  private fallSounds!: Record<Character, HTMLAudioElement>;
  private fallSoundPlayed = false;
  private lastDisplayedScore = -1;
  private lastDisplayedHighScore = -1;

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

  private settingsIconSprite!: Sprite;
  private inputBound = false;
  private focusBound = false;

  private selectedCharacter: Character = 'shannon';
  private selectedLanguage: Language = 'fr';
  private gameStarted = false;
  private saveTheDateShown = localStorage.getItem('saveTheDateShown') === 'true';
  private confettiTriggered = false;
  private settingsScreen: SettingsScreen | null = null;
  private saveTheDateScreen: SaveTheDateScreen | null = null;

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
      backgroundColor: 0x000000,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);
    this.app.canvas.style.cssText = `touch-action: none; cursor: inherit; width: min(100%, calc(100vh * ${this.gameWidth} / ${this.gameHeight})); height: auto;`;

    await this.loadAssets();
    this.showSettings();
    this.watchResize();

    this.app.ticker.add((ticker) => this.tick(ticker.deltaTime));
  }

  private async loadAssets(): Promise<void> {
    await Assets.load([
      '/assets/background-settings.png',
      '/assets/background-settings-mobile.png',
      '/assets/background-save-the-date-overlay.png',
      '/assets/background-save-the-date-mobile-overlay.png',
      '/assets/background-game.png',
      // '/assets/water.png',
      '/assets/tilex1.png',
      '/assets/tilesx2.png',
      '/assets/tilesx3.png',
      '/assets/tilesx4.png',
      '/assets/tilesx5.png',
      '/assets/shannon-jump-resize.png',
      '/assets/shannon-fall.png',
      '/assets/shannon_run.json',
      '/assets/shannon-idle-resize.png',
      '/assets/luc-jump-resize.png',
      '/assets/luc-fall.png',
      '/assets/luc_run.json',
      '/assets/luc-idle-resize.png',
      '/assets/luc-jump.png',
      '/assets/coins_anim.json',
      '/assets/sound_off.png',
      '/assets/sound_on.png',
      '/assets/pause.png',
      '/assets/play.png',
      '/assets/settings-icon.png',
      '/assets/calendar-icon.png',
      '/assets/location-icon.png',
    ]);
    // Load fonts via Assets so HTMLText can embed them in its SVG context
    await Assets.load([
      { src: '/fonts/TypoWriter-Regular.otf', data: { family: 'TypoWriter', weights: ['normal'] } },
      { src: '/fonts/TypoWriter-Bold.otf', data: { family: 'TypoWriter', weights: ['bold'] } },
    ]);
    const makeAudio = (src: string, rate = 1) => { const a = new Audio(src); a.volume = 0.07; a.playbackRate = rate; return a; };
    this.jumpSounds = { luc: makeAudio('/assets/luc-jump.m4a'), shannon: makeAudio('/assets/shannon-jump.m4a') };
    this.fallSounds = { luc: makeAudio('/assets/luc-fall.m4a', 1), shannon: makeAudio('/assets/shannon-fall.m4a', 1.4) };
  }

  private buildScene(): void {
    this.state = createState();
    this.lastDisplayedScore = -1;
    this.lastDisplayedHighScore = -1;
    const { stage } = this.app;

    const bgTexture = Texture.from('/assets/background-game.png');
    if (this.isPortrait) {
      const bgSpriteSize = { width: this.gameWidth / 0.95, height: this.gameHeight / 0.95 };
      this.background = new TilingSprite({ texture: bgTexture, ...bgSpriteSize });
      // Scale the tile to fill the full canvas height — no vertical repeat
      const tileScale = bgSpriteSize.height / bgTexture.height;
      this.background.tileScale.set(tileScale, tileScale);
    } else {
      const bgSpriteSize = { width: this.gameWidth / 0.95, height: this.gameHeight / 0.95 };
      this.background = new TilingSprite({ texture: bgTexture, ...bgSpriteSize });
      const tileScale = bgSpriteSize.height / bgTexture.height;
      this.background.tileScale.set(tileScale, tileScale);
    }
    stage.addChild(this.background);

    // const waterTexture = Texture.from('/assets/water.png');
    // const waterWidth = this.isPortrait ? this.gameWidth : waterTexture.width;
    // this.water = new TilingSprite({ texture: waterTexture, width: waterWidth, height: waterTexture.height });
    // stage.addChild(this.water);

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

    const ch = this.selectedCharacter;
    this.jumpSprite = new Sprite(Texture.from(`/assets/${ch}-jump-resize.png`));
    this.jumpSprite.scale.set(0.13);
    stage.addChild(this.jumpSprite);

    this.fallSprite = new Sprite(Texture.from(`/assets/${ch}-fall.png`));
    this.fallSprite.scale.set(0.11);
    stage.addChild(this.fallSprite);

    const runSheet = Assets.get(`/assets/${ch}_run.json`);
    this.runAnim = new AnimatedSprite(runSheet.animations[`${ch}_run`]);
    stage.addChild(this.runAnim);

    const fontSize = Math.max(14, Math.round(28 * this.scaleX));
    const style = new TextStyle({
      dropShadow: { angle: 0.5, blur: 1, color: '#424242', distance: 1 },
      fill: '#1d1d1d',
      fontFamily: 'TypoWriter',
      fontSize,
    });
    this.textScore = new Text({ text: `${this.t('score')}: 0`, style });
    this.textScore.anchor.set(1, 0);
    this.textScore.position.set(this.gameWidth - 20, 20);
    stage.addChild(this.textScore);

    this.textHighScore = new Text({ text: `${this.t('high_score')}: 0`, style });
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

    this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
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

    const settingsIconSize = 34;
    this.settingsIconSprite = new Sprite(Texture.from('/assets/settings-icon.png'));
    this.settingsIconSprite.width = settingsIconSize;
    this.settingsIconSprite.height = settingsIconSize;
    this.settingsIconSprite.position.set(116, this.pauseIconY);
    this.settingsIconSprite.eventMode = 'static';
    this.settingsIconSprite.cursor = 'pointer';
    stage.addChild(this.settingsIconSprite);

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
    this.background.tilePosition.set(this.isPortrait ? -400 : 0, 0);

    // this.water.position.set(0, Math.round(545 * sy));
    // this.water.tilePosition.set(0, 0);

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
      t1a.position.set(t5a.width + 140, platformY);
      t4a.position.set(t5a.width + 140 + t1a.width + 140, platformY);
    } else {
      t5a.position.set(60, platformY);
      t1a.position.set(60 + t5a.width + 140, platformY);
      t4a.position.set(60 + t5a.width + 140 + t1a.width + 140, platformY);
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

    this.fallSprite.position.set(playerX, playerY + this.jumpSprite.height - this.fallSprite.height);
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

  private tick(delta: number): void {
    if (!this.gameStarted || this.isPaused) return;
    const s = this.state;
    const player = this.runAnim;
    const onGround = this.checkGround();

    if (onGround) {
      if (s.isPress) {
        this.jumpInitiated = true;
        s.vy = JUMP_VELOCITY;
        this.jumpSprite.position.set(player.x, player.y + player.height - this.jumpSprite.height);
        this.fallSprite.position.set(this.jumpSprite.x, this.jumpSprite.y + this.jumpSprite.height - this.fallSprite.height);
        player.visible = false;
        this.jumpSprite.visible = true;
        this.fallSprite.visible = false;
        s.air = true;
        if (this.soundEnabled) {
          this.jumpSounds[this.selectedCharacter].currentTime = 0;
          this.jumpSounds[this.selectedCharacter].play();
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
      s.vy += JUMP_HOLD_ACCEL * delta;
    } else {
      s.isPress = false;
      player.visible = false;
      if (this.jumpInitiated) {
        this.jumpSprite.visible = true;
        this.fallSprite.visible = false;
      } else {
        this.fallSprite.position.set(this.jumpSprite.x, this.jumpSprite.y + this.jumpSprite.height - this.fallSprite.height);
        this.fallSprite.visible = true;
        this.jumpSprite.visible = false;
      }
      s.vy += s.gravity * delta;
      s.canBePressed = false;
    }

    this.background.tilePosition.x -= BG_SCROLL_SPEED * delta;
    // this.water.tilePosition.x -= WATER_SCROLL_SPEED;

    this.jumpSprite.y += s.vy * delta;
    player.y += s.vy * delta;

    if (s.score > s.newMilestone) {
      s.currentSpeed += SPEED_INCREMENT;
      s.newMilestone += 20 + Math.round(s.currentSpeed * 8);
    }

    this.platforms.move(s.currentSpeed * delta);
    this.coins.move(s.currentSpeed * delta);

    const coinScore = this.coins.pickCoins(player);
    s.score += coinScore + SCORE_PER_FRAME * delta;

    const roundedScore = Math.round(s.score);
    if (roundedScore !== this.lastDisplayedScore) {
      this.lastDisplayedScore = roundedScore;
      this.textScore.text = `${this.t('score')}: ${roundedScore}`;
    }
    const roundedHighScore = Math.round(s.highScore);
    if (roundedHighScore !== this.lastDisplayedHighScore) {
      this.lastDisplayedHighScore = roundedHighScore;
      this.textHighScore.text = `${this.t('high_score')}: ${roundedHighScore}`;
    }

    if (!this.fallSoundPlayed && this.jumpSprite.y + this.jumpSprite.height > this.gameHeight) {
      this.fallSoundPlayed = true;
      if (this.soundEnabled) {
        this.fallSounds[this.selectedCharacter].currentTime = 0;
        this.fallSounds[this.selectedCharacter].play();
      }
    }

    if (!this.saveTheDateShown && !this.confettiTriggered && Math.round(s.score) >= SAVE_THE_DATE_SCORE_THRESHOLD) {
      this.triggerConfettiAndSaveTheDate();
    }

    if (player.y + player.height > this.gameHeight + FALL_DEATH_Y) {
      if (s.score > s.highScore) {
        s.highScore = Math.round(s.score);
        localStorage.setItem('highScore', String(s.highScore));
      }
      if (this.saveTheDateShown && Math.round(s.score) > 0) {
        this.saveToLeaderboard(Math.round(s.score));
      }
      s.score = 0;
      s.currentSpeed = s.baseSpeed;
      s.newMilestone = s.firstMilestone;
      this.startGame();
    }
  }

  private triggerConfettiAndSaveTheDate(): void {
    this.confettiTriggered = true;
    this.isPaused = true;
    this.pauseToggleSprite.texture = this.playTexture;
    this.runAnim.stop();
    for (const coin of this.state.coins) coin.stop();

    const rect = this.app.canvas.getBoundingClientRect();
    const confettiCanvas = document.createElement('canvas');
    confettiCanvas.width = rect.width;
    confettiCanvas.height = rect.height;
    confettiCanvas.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:9999;`;
    document.body.appendChild(confettiCanvas);

    const myConfetti = confetti.create(confettiCanvas, { resize: false });

    const count = 200;
    const defaults = { origin: { y: 0.7 } };
    const fire = (particleRatio: number, opts: object) => {
      myConfetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    setTimeout(() => {
      myConfetti.reset();
      confettiCanvas.remove();
      // COMMENT FOR TESTING PURPOSES
      this.saveTheDateShown = true;
      localStorage.setItem('saveTheDateShown', 'true');
      this.gameStarted = false;
      this.showSaveTheDate();
    }, 2000);
  }

  private saveToLeaderboard(score: number): void {
    const entries: Array<{ name: string; score: number }> = JSON.parse(localStorage.getItem('topScores') ?? '[]');
    entries.push({ name: this.selectedCharacter, score });
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem('topScores', JSON.stringify(entries.slice(0, 6)));
  }

  private checkGround(): boolean {
    if (this.state.vy < 0) return false;
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

  private hitsSettings(clientX: number, clientY: number): boolean {
    const { x, y } = this.toGameCoords(clientX, clientY);
    return x >= 116 && x <= 150 && y >= this.pauseIconY && y <= this.pauseIconY + 34;
  }

  private togglePause(): void {
    if (!this.gameStarted) return;
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
    if (this.inputBound) return;
    this.inputBound = true;
    const canvas = this.app.canvas;
    canvas.addEventListener('mousedown', (e) => {
      if (this.hitsSettings(e.clientX, e.clientY)) { this.goToSettings(); return; }
      if (this.hitsPause(e.clientX, e.clientY)) { this.togglePause(); return; }
      if (this.hitsSound(e.clientX, e.clientY)) { this.toggleSound(); return; }
      if (!this.isPaused) this.pressDown();
    });
    canvas.addEventListener('mouseup', () => this.pressUp());
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t && this.hitsSettings(t.clientX, t.clientY)) { this.goToSettings(); return; }
      if (t && this.hitsPause(t.clientX, t.clientY)) { this.togglePause(); return; }
      if (t && this.hitsSound(t.clientX, t.clientY)) { this.toggleSound(); return; }
      if (!this.isPaused) this.pressDown();
    }, { passive: false });
    canvas.addEventListener('touchend', () => this.pressUp());
    canvas.addEventListener('touchcancel', () => this.pressUp());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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

  private showSettings(defaultChar: Character | null = null): void {
    this.settingsScreen = new SettingsScreen(
      this.app,
      {
        fr: frTranslations as Record<string, string>,
        en: enTranslations as Record<string, string>,
      },
      this.gameWidth,
      this.gameHeight,
      (char, lang) => this.launchGame(char, lang),
      this.saveTheDateShown,
      defaultChar,
    );
  }

  private launchGame(char: Character, lang: Language): void {
    this.settingsScreen?.destroy();
    this.settingsScreen = null;
    this.saveTheDateScreen?.destroy();
    this.saveTheDateScreen = null;
    this.isPaused = false;
    this.selectedCharacter = char;
    this.selectedLanguage = lang;
    localStorage.setItem('selectedCharacter', char);
    this.app.stage.removeChildren();
    this.buildScene();
    this.startGame();
    this.bindInput();
    this.watchFocus();
    this.gameStarted = true;
  }

  private showSaveTheDate(): void {
    const lang = (localStorage.getItem('language') as Language) ?? this.selectedLanguage;
    const tr = (lang === 'fr' ? frTranslations : enTranslations) as Record<string, string>;
    const bodyLines = [
      { text: tr['save_the_date_body_1'] ?? '', extraSpacingAfter: true },
      {
        cards: [
          { icon: '/assets/calendar-icon.png', label: tr['date'] ?? 'Date', value: tr['save_the_date_body_2'] ?? '' },
          { icon: '/assets/location-icon.png', label: tr['location'] ?? 'Location', value: tr['save_the_date_body_3'] ?? '' },
        ],
        extraSpacingAfter: true,
      },
      { text: tr['save_the_date_body_4'] ?? '' },
    ].filter(item => Boolean(item.text) || Boolean(item.cards));
    this.saveTheDateScreen = new SaveTheDateScreen(
      this.app,
      this.gameWidth,
      this.gameHeight,
      tr['save_the_date'] ?? 'Save the date',
      tr['play_again'] ?? 'Play again',
      bodyLines,
      () => this.launchFromSaveTheDate(),
    );
  }

  private launchFromSaveTheDate(): void {
    const char = localStorage.getItem('selectedCharacter') as Character | null;
    const lang = (localStorage.getItem('language') as Language) ?? 'fr';
    if (char) {
      this.launchGame(char, lang);
    } else {
      this.saveTheDateScreen?.destroy();
      this.saveTheDateScreen = null;
      this.showSettings();
    }
  }

  private goToSettings(): void {
    this.gameStarted = false;
    this.isPaused = false;
    this.runAnim.stop();
    for (const coin of this.state.coins) coin.stop();
    this.app.stage.removeChildren();
    this.showSettings(this.selectedCharacter);
  }

  private t(key: string): string {
    const dict = (this.selectedLanguage === 'fr' ? frTranslations : enTranslations) as Record<string, string>;
    return dict[key] ?? key;
  }

  private watchFocus(): void {
    if (this.focusBound) return;
    this.focusBound = true;
    const pause = () => { if (!this.isPaused) this.togglePause(); };
    const resume = () => { if (this.isPaused) this.togglePause(); };
    document.addEventListener('visibilitychange', () => { document.hidden ? pause() : resume(); });
    window.addEventListener('blur', pause);
    window.addEventListener('focus', resume);
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

import {
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from 'pixi.js';
import type { Application } from 'pixi.js';

export class SaveTheDateScreen {
  readonly container: Container;

  constructor(
    app: Application,
    W: number,
    H: number,
    titleText: string,
    playAgainText: string,
    onPlayAgain: () => void,
  ) {
    this.container = new Container();
    app.stage.addChild(this.container);
    this.buildUI(W, H, titleText, playAgainText, onPlayAgain);
  }

  private buildUI(
    W: number,
    H: number,
    titleText: string,
    playAgainText: string,
    onPlayAgain: () => void,
  ): void {
    const c = this.container;
    const isMobile = W < H;
    const isTablet = isMobile && W >= 600;
    const sc = Math.max(Math.min(W / 960, H / 600), 0.45);
    const xs = (v: number) => Math.round(v * sc);

    // Dark overlay between game and save-the-date image
    const darkOverlay = new Graphics();
    darkOverlay.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.45 });
    c.addChild(darkOverlay);

    // Background
    const bgImg = isMobile
      ? '/assets/background-save-the-date-mobile-overlay.png'
      : '/assets/background-save-the-date-overlay.png';
    const bgSpr = new Sprite(Texture.from(bgImg));
    bgSpr.width = W;
    bgSpr.height = H;
    c.addChild(bgSpr);

    let y = isMobile ? Math.round(H * 0.04) : Math.round(H * 0.09);

    // Title sign — same style as SettingsScreen
    const signH = xs(76);
    const signR = xs(10);
    const signBorderW = xs(4);
    const signPadX = xs(36);

    const titleTxt = new Text({
      text: titleText,
      style: new TextStyle({
        fill: '#5C3A1E',
        fontFamily: 'Courier New',
        fontSize: Math.max(isTablet ? 32 : isMobile ? 28 : 0, xs(36)),
        fontWeight: 'bold',
        letterSpacing: xs(1),
      }),
    });
    titleTxt.anchor.set(0.5);

    const signW = Math.min(titleTxt.width + signPadX * 2, W - signBorderW * 2);
    const signX = Math.round((W - signW) / 2);
    const sign = new Graphics();
    sign.roundRect(signBorderW, signBorderW, signW, signH, signR).fill({ color: 0xBCA882, alpha: 0.5 });
    sign.roundRect(0, 0, signW, signH, signR).fill({ color: 0xF5E6C0 });
    sign.roundRect(0, 0, signW, signH, signR).stroke({ color: 0xBCA882, width: signBorderW });
    sign.position.set(signX, y);
    titleTxt.position.set(W / 2, y + Math.round(signH / 2));
    c.addChild(sign);
    c.addChild(titleTxt);

    y += signH + (isMobile ? (isTablet ? 60 : 28) : xs(40));

    // 3 bullet points centered
    const bulletStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'Courier New',
      fontSize: Math.max(isTablet ? 26 : isMobile ? 17 : 0, xs(22)),
      fontWeight: 'bold',
      letterSpacing: xs(1),
      dropShadow: { color: '#ffffff', blur: 4, distance: 0, alpha: 0.7 },
    });

    const bulletGap = isMobile ? xs(28) : xs(22);
    const bullets = ['• ...', '• ...', '• ...'];
    for (const bullet of bullets) {
      const txt = new Text({ text: bullet, style: bulletStyle });
      txt.anchor.set(0.5);
      txt.position.set(W / 2, y + txt.height / 2);
      c.addChild(txt);
      y += txt.height + bulletGap;
    }

    // Play again button — same style as SettingsScreen play button (always enabled)
    const playH = Math.max(isTablet ? 84 : 54, xs(54));
    const playW = Math.min(Math.max(isTablet ? 300 : 200, xs(200)), W - xs(60));
    const shadow = Math.max(xs(5), 3);
    const playY = isMobile
      ? H - 22 - shadow - playH
      : H - 40 - shadow - playH;
    const playX = Math.round(W / 2 - playW / 2);
    const btnR = Math.round(playH * 0.22);

    const btnGfx = new Graphics();
    btnGfx.position.set(playX, playY);
    btnGfx.roundRect(0, shadow, playW, playH, btnR).fill({ color: 0x2D5224 });
    btnGfx.roundRect(0, 0, playW, playH, btnR).fill({ color: 0x4A7C3F });
    btnGfx.eventMode = 'static';
    btnGfx.cursor = 'pointer';
    c.addChild(btnGfx);

    const playTxt = new Text({
      text: playAgainText,
      style: new TextStyle({
        fill: '#ffffff',
        fontFamily: 'Courier New',
        fontSize: Math.max(isTablet ? 32 : 20, xs(22)),
        fontWeight: 'bold',
        letterSpacing: xs(3),
      }),
    });
    playTxt.anchor.set(0.5);
    playTxt.position.set(W / 2, playY + Math.round(playH / 2));
    c.addChild(playTxt);

    btnGfx.on('pointerdown', () => onPlayAgain());
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

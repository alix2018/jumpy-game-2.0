import {
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
  type Ticker,
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
    bodyLines: Array<{ text: string; icon?: string; extraSpacingAfter?: boolean; fixedSpacingAfter?: number }>,
    onPlayAgain: () => void,
  ) {
    this.container = new Container();
    app.stage.addChild(this.container);
    this.buildUI(W, H, titleText, playAgainText, bodyLines, onPlayAgain);
    this.animateIn(app, W, H);
  }

  private animateIn(app: Application, W: number, H: number): void {
    // Scale from center using pivot at canvas midpoint
    this.container.pivot.set(W / 2, H / 2);
    this.container.position.set(W / 2, H / 2);
    this.container.scale.set(0);

    const DURATION = 550; // ms
    let elapsed = 0;

    const onTick = (ticker: Ticker) => {
      elapsed += ticker.deltaMS;
      const t = Math.min(elapsed / DURATION, 1);
      // Cubic ease-in-out — gaussian-shaped speed profile (slow → fast → slow)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.container.scale.set(eased);
      if (t >= 1) app.ticker.remove(onTick);
    };

    app.ticker.add(onTick);
  }

  private buildUI(
    W: number,
    H: number,
    titleText: string,
    playAgainText: string,
    bodyLines: Array<{ text: string; icon?: string; extraSpacingAfter?: boolean; fixedSpacingAfter?: number }>,
    onPlayAgain: () => void,
  ): void {
    const c = this.container;
    const isMobile = W < H;
    const isTablet = isMobile && W >= 600;
    const isSmallScreen = isMobile && H < 665;
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

    // Title
    let y = isMobile ? Math.round(H * 0.08) : Math.round(H * 0.14);

    // Title sign — same style as SettingsScreen
    const signR = xs(10);
    const signBorderW = xs(4);
    const signPadX = isMobile ? xs(36) : xs(24);
    const signH = isMobile ? xs(76) : xs(58);

    const titleTxt = new Text({
      text: titleText,
      style: new TextStyle({
        fill: '#5C3A1E',
        fontFamily: 'Courier New',
        fontSize: Math.max(isTablet ? 36 : isMobile ? 22 : 0, xs(30)),
        fontWeight: 'bold',
        letterSpacing: xs(0),
      }),
    });
    titleTxt.anchor.set(0.5);

    const bodyW = Math.min(isMobile ? W * 0.70 : W, W * 0.80, W - xs(40));

    const signW = Math.min(titleTxt.width + signPadX * 2, bodyW);
    const signX = Math.round((W - signW) / 2);
    const sign = new Graphics();
    sign.roundRect(signBorderW, signBorderW, signW, signH, signR).fill({ color: 0xBCA882, alpha: 0.5 });
    sign.roundRect(0, 0, signW, signH, signR).fill({ color: 0xF5E6C0 });
    sign.roundRect(0, 0, signW, signH, signR).stroke({ color: 0xBCA882, width: signBorderW });
    sign.position.set(signX, y);
    titleTxt.position.set(W / 2, y + Math.round(signH / 2));
    c.addChild(sign);
    c.addChild(titleTxt);

    y += signH + (isMobile ? (isSmallScreen ? 12 : isTablet ? 50 : 24) : xs(36));

    // Body text
    const paraFontSize = Math.max(isTablet ? 28 : isMobile ? 15 : 0, xs(14));
    const bulletFontSize = paraFontSize;
    const paraGap = isMobile ? (isSmallScreen ? xs(14) : xs(26)) : xs(20);
    const bulletGap = isMobile ? (isSmallScreen ? xs(7) : xs(14)) : xs(10);

    const paraStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'Courier New',
      fontSize: paraFontSize,
      fontWeight: 'bold',
      letterSpacing: 0,
      wordWrap: true,
      wordWrapWidth: bodyW,
      align: 'center',
      lineHeight: Math.round(paraFontSize * (isSmallScreen ? 1.3 : 1.5)),
    });

    const bulletStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'Courier New',
      fontSize: bulletFontSize,
      fontWeight: '900',
      letterSpacing: xs(1),
      wordWrap: true,
      wordWrapWidth: bodyW,
      align: 'center',
    });

    for (const line of bodyLines) {
      const hasIcon = Boolean(line.icon);
      const txt = new Text({ text: line.text, style: hasIcon ? bulletStyle : paraStyle });

      if (hasIcon) {
        const iconSize = bulletFontSize + 4;
        const gap = xs(16);
        const groupW = iconSize + gap + txt.width;
        const groupX = Math.round(W / 2 - groupW / 2);
        txt.anchor.set(0, 0);
        const iconSpr = new Sprite(Texture.from(line.icon!));
        iconSpr.width = iconSize;
        iconSpr.height = iconSize;
        iconSpr.position.set(groupX, y + Math.round((txt.height - iconSize) / 2));
        txt.position.set(groupX + iconSize + gap, y);
        c.addChild(iconSpr);
        c.addChild(txt);
        y += txt.height + bulletGap;
        if (isMobile && line.extraSpacingAfter) y += Math.round(H * (isSmallScreen ? 0.02 : 0.04));
        if (isMobile && line.fixedSpacingAfter) y += line.fixedSpacingAfter;
      } else {
        txt.anchor.set(0.5, 0);
        txt.position.set(W / 2, y);
        c.addChild(txt);
        y += txt.height + paraGap;
        if (isMobile && line.extraSpacingAfter) y += Math.round(H * (isSmallScreen ? 0.02 : 0.04));
        if (isMobile && line.fixedSpacingAfter) y += line.fixedSpacingAfter;
      }
    }

    // Play again button
    const playH = Math.max(isTablet ? 84 : 54, xs(54));
    const playW = Math.min(Math.max(isTablet ? 300 : 200, xs(200)), W - xs(60));
    const shadow = Math.max(xs(5), 3);
    const playY = isMobile
      ? H - 70 - shadow - playH
      : H - 85 - shadow - playH;
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

import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { Application } from 'pixi.js';

export class ErrorScreen {
  readonly container: Container;

  constructor(app: Application, W: number, H: number, frMessage: string, enMessage: string) {
    this.container = new Container();

    const bgImg = W < H ? '/assets/background-settings-mobile.png' : '/assets/background-settings.png';
    const bg = new Sprite(Texture.from(bgImg));
    bg.width = W;
    bg.height = H;
    this.container.addChild(bg);

    const sc = Math.max(Math.min(W / 960, H / 600), 0.45);
    const xs = (v: number) => Math.round(v * sc);
    const isMobile = W < H;
    const isTablet = isMobile && W >= 600;

    const fontSize = Math.max(isTablet ? 20 : isMobile ? 13 : 16, xs(14));
    const labelFontSize = Math.max(isTablet ? 22 : isMobile ? 14 : 17, xs(15));
    const wrapW = W * 0.72;
    const padX = xs(32);
    const padY = xs(24);
    const labelBodyGap = xs(6);
    const sectionGap = xs(18);
    const cornerR = xs(10);
    const borderW = xs(3);

    const baseStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter, serif',
      fontSize,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: wrapW,
    });
    const labelStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter, serif',
      fontSize: labelFontSize,
      fontWeight: 'bold',
    });

    const frLabel = new Text({ text: 'FR', style: labelStyle });
    const frTxt   = new Text({ text: frMessage, style: baseStyle });
    const enLabel = new Text({ text: 'EN', style: labelStyle });
    const enTxt   = new Text({ text: enMessage, style: baseStyle });

    const totalH = frLabel.height + labelBodyGap + frTxt.height
                 + sectionGap
                 + enLabel.height + labelBodyGap + enTxt.height;

    const cardW = Math.min(Math.max(frTxt.width, enTxt.width) + padX * 2, W - xs(24));
    const cardH = totalH + padY * 2;
    const cardX = Math.round((W - cardW) / 2);
    const cardY = Math.round((H - cardH) / 2);

    const card = new Graphics();
    card.roundRect(borderW, borderW, cardW, cardH, cornerR).fill({ color: 0xBCA882, alpha: 0.5 });
    card.roundRect(0, 0, cardW, cardH, cornerR).fill({ color: 0xF5E6C0 });
    card.roundRect(0, 0, cardW, cardH, cornerR).stroke({ color: 0xBCA882, width: borderW });
    card.position.set(cardX, cardY);
    this.container.addChild(card);

    const cx = W / 2;
    let y = cardY + padY;

    for (const [label, body] of [[frLabel, frTxt], [enLabel, enTxt]] as [Text, Text][]) {
      label.anchor.set(0.5, 0);
      label.position.set(cx, y);
      y += label.height + labelBodyGap;

      body.anchor.set(0.5, 0);
      body.position.set(cx, y);
      y += body.height + sectionGap;

      this.container.addChild(label, body);
    }

    app.stage.addChild(this.container);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

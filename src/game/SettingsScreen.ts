import {
  Container,
  Graphics,
  HTMLText,
  HTMLTextStyle,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from 'pixi.js';
import type { Application } from 'pixi.js';

export type Language = 'fr' | 'en';
export type Character = 'luc' | 'shannon';

type TrMap = { fr: Record<string, string>; en: Record<string, string> };

// Cream/parchment button with border that changes colour on selection
class OptionBtn {
  readonly gfx: Graphics;
  private _sel = false;

  constructor(
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number,
  ) {
    this.gfx = new Graphics();
    this.gfx.position.set(x, y);
    this.gfx.eventMode = 'static';
    this.gfx.cursor = 'pointer';
    this.redraw();
  }

  set selected(v: boolean) {
    if (this._sel === v) return;
    this._sel = v;
    this.redraw();
  }

  get selected() {
    return this._sel;
  }

  private redraw() {
    const r = Math.round(this.h * 0.22);
    this.gfx.clear();
    this.gfx.roundRect(0, 0, this.w, this.h, r).fill({ color: 0xF5E6C0 });
    this.gfx.roundRect(0, 0, this.w, this.h, r).stroke({
      color: this._sel ? 0x4A7C3F : 0xBCA882,
      width: this._sel ? 3 : 2,
    });
  }
}

// Green play button with a drop-shadow effect
class PlayBtn {
  readonly gfx: Graphics;
  private _enabled = false;

  constructor(
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number,
    private readonly shadow: number,
  ) {
    this.gfx = new Graphics();
    this.gfx.position.set(x, y);
    this.gfx.eventMode = 'static';
    this.gfx.cursor = 'not-allowed';
    this.redraw();
  }

  set enabled(v: boolean) {
    if (this._enabled === v) return;
    this._enabled = v;
    this.gfx.cursor = v ? 'pointer' : 'not-allowed';
    this.redraw();
  }

  get enabled() {
    return this._enabled;
  }

  private redraw() {
    const r = Math.round(this.h * 0.22);
    const fill = this._enabled ? 0x4A7C3F : 0xBECA7A;
    const shade = this._enabled ? 0x2D5224 : 0xAAB462;
    // const alpha = this._enabled ? 1 : 0.7;
    this.gfx.clear();
    this.gfx.roundRect(0, this.shadow, this.w, this.h, r).fill({ color: shade });
    this.gfx.roundRect(0, 0, this.w, this.h, r).fill({ color: fill });
  }
}

export class SettingsScreen {
  readonly container: Container;

  private lang: Language = 'fr';
  private char: Character | null = null;

  private sign!: Graphics;
  private titleTxt!: Text;
  private _signParams!: { padX: number; h: number; r: number; y: number; borderW: number; W: number };

  private langLbl!: Text;
  private rulesTxt!: HTMLText;
  private charLbl!: Text;
  private howToPlayTxt!: HTMLText;
  private frBtn!: OptionBtn;
  private enBtn!: OptionBtn;
  private frTxt!: Text;
  private enTxt!: Text;
  private lucCard!: OptionBtn;
  private shanCard!: OptionBtn;
  private playBtn!: PlayBtn;
  private playTxt!: Text;
  private tooltip!: { container: Container; bg: Graphics; txt: Text };
  private _W = 0;
  private _tipParams = { padX: 0, padY: 0, r: 0 };
  private _hintY = 0;

  constructor(
    app: Application,
    private readonly tr: TrMap,
    W: number,
    H: number,
    onPlay: (char: Character, lang: Language) => void,
    defaultChar: Character | null = null,
  ) {
    this.container = new Container();
    const stored = localStorage.getItem('language');
    if (stored === 'en' || stored === 'fr') this.lang = stored;
    if (defaultChar) this.char = defaultChar;
    app.stage.addChild(this.container);
    this.buildUI(W, H, onPlay);
    this.refresh();
    this.syncPlay();
  }

  private t(key: string): string {
    return (this.tr[this.lang] as Record<string, string>)[key] ?? key;
  }

  private buildUI(W: number, H: number, onPlay: (char: Character, lang: Language) => void): void {
    const c = this.container;

    // Uniform scale so the base design (960 wide) shrinks to fit smaller screens.
    // We clamp to 0.45 so portrait mobile never becomes unreadably tiny.
    const sc = Math.max(Math.min(W / 960, H / 600), 0.45);
    const xs = (v: number) => Math.round(v * sc);
    const isMobile = W < H;
    const isTablet = isMobile && W >= 600;
    const isSmallScreen = isMobile && W < 665;

    // ─── Background: cover-scale the settings image ───
    const bgImg = W < H ? '/assets/background-settings-mobile.png' : '/assets/background-settings.png';
    const bgSpr = new Sprite(Texture.from(bgImg));
    bgSpr.width = W;
    bgSpr.height = H;
    c.addChild(bgSpr);

    // ─── Flow layout — each element pushed below the previous ───
    // Top padding scales with H so portrait screens use proportional space.
    let y = isMobile ? Math.round(H * 0.08) : Math.round(H * 0.05);

    // ── Title sign — width fits the text ──
    const signH = isMobile ? xs(76) : xs(58);
    const signR = xs(10);
    const signBorderW = xs(4);
    const signPadX = isMobile ? xs(36) : xs(24);

    // Create text first so we can measure its width
    this.titleTxt = new Text({
      text: '',
      style: new TextStyle({
        fill: '#5C3A1E',
        fontFamily: 'Courier New',
        fontSize: Math.max(isTablet ? 32 : isMobile ? 18 : 0, xs(26)),
        fontWeight: 'bold',
        letterSpacing: xs(0),
      }),
    });
    this.titleTxt.anchor.set(0.5);

    this._signParams = { padX: signPadX, h: signH, r: signR, y, borderW: signBorderW, W };
    this.sign = new Graphics();
    c.addChild(this.sign);       // sign drawn behind text
    c.addChild(this.titleTxt);   // text in front

    y += signH + (isMobile ? (isTablet ? 60 : 28) : xs(30));

    // ── Language label ──
    const secStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'Courier New',
      fontSize: Math.max(isTablet ? 28 : 15, xs(13)),
      fontWeight: 'bold',
      letterSpacing: xs(1),
    });

    this.langLbl = new Text({ text: '', style: secStyle });
    this.langLbl.anchor.set(0.5);
    this.langLbl.position.set(W / 2, y + xs(5));
    c.addChild(this.langLbl);

    y += Math.max(isTablet ? 32 : 16, xs(13)) + (isMobile ? (isTablet ? 10 : 6) : xs(4));

    // ── Language buttons ──
    const lbH = Math.max(isTablet ? 50 : 38, xs(30));
    const lbW = Math.max(isTablet ? 130 : 95, xs(85));
    const lbGap = xs(16);
    const lbY = y;

    this.frBtn = new OptionBtn(W / 2 - lbGap / 2 - lbW, lbY, lbW, lbH);
    this.enBtn = new OptionBtn(W / 2 + lbGap / 2, lbY, lbW, lbH);
    c.addChild(this.frBtn.gfx, this.enBtn.gfx);

    const btnTxtStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'Courier New',
      fontSize: Math.max(isTablet ? 18 : 12, xs(11)),
    });

    this.frTxt = new Text({ text: '', style: btnTxtStyle });
    this.frTxt.anchor.set(0.5);
    this.frTxt.position.set(W / 2 - lbGap / 2 - lbW / 2, lbY + lbH / 2);
    c.addChild(this.frTxt);

    this.enTxt = new Text({ text: '', style: btnTxtStyle });
    this.enTxt.anchor.set(0.5);
    this.enTxt.position.set(W / 2 + lbGap / 2 + lbW / 2, lbY + lbH / 2);
    c.addChild(this.enTxt);

    this.frBtn.gfx.on('pointerdown', () => { this.lang = 'fr'; localStorage.setItem('language', 'fr'); this.refresh(); });
    this.enBtn.gfx.on('pointerdown', () => { this.lang = 'en'; localStorage.setItem('language', 'en'); this.refresh(); });

    y += lbH + (isMobile ? (isSmallScreen ? 14 : isTablet ? 50 : 28) : xs(16));

    // ── Rules text ──
    const rulesWrapW = isMobile ? W * 0.82 : W * 0.90;
    const rulesFontSize = Math.max(isTablet ? 16 : 13, xs(13));
    this.rulesTxt = new HTMLText({
      text: this.t('rules'),
      style: new HTMLTextStyle({
        fill: '#5C3A1E',
        fontFamily: 'Courier New',
        fontSize: rulesFontSize,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: rulesWrapW,
        tagStyles: {
          b: { fontWeight: 'bold', fontSize: Math.max(isTablet ? 17 : 12, xs(13)) },
        },
      }),
    });
    this.rulesTxt.anchor.set(0.5, 0);
    this.rulesTxt.position.set(W / 2, y);
    c.addChild(this.rulesTxt);

    y += this.rulesTxt.height + (isMobile ? (isSmallScreen ? 14 : isTablet ? 50 : 28) : xs(16));

    // ── Character label ──
    this.charLbl = new Text({ text: '', style: secStyle });
    this.charLbl.anchor.set(0.5);
    this.charLbl.position.set(W / 2, y + xs(4));
    c.addChild(this.charLbl);

    y += Math.max(isTablet ? 32 : 16, xs(13)) + (isMobile ? (isTablet ? 10 : 6) : xs(4));

    // ── Character cards ──
    // Square-ish cards; cap size so two fit side-by-side with a gap
    const maxCardW = Math.floor((W - xs(60)) / 2);  // half width minus gap
    const cardW = isMobile
      ? Math.min(Math.floor((W - (isSmallScreen ? xs(280) : isTablet ? xs(360) : xs(200))) / 2), maxCardW)
      : Math.min(Math.max(xs(130), 80), maxCardW);
    const cardH = Math.round(cardW * 1.08);
    const cardGap = xs(36);
    const cardTop = y;
    const lucLeft = Math.round(W / 2 - cardGap / 2 - cardW);
    const shanLeft = Math.round(W / 2 + cardGap / 2);

    this.lucCard = new OptionBtn(lucLeft, cardTop, cardW, cardH);
    this.shanCard = new OptionBtn(shanLeft, cardTop, cardW, cardH);
    c.addChild(this.lucCard.gfx, this.shanCard.gfx);

    // Luc sprite (luc-idle.png not in assets; using luc-idle.png as preview)
    const lucSpr = new Sprite(Texture.from('/assets/luc-idle-resize.png'));
    lucSpr.anchor.set(0.5, 1);
    const lucFit = Math.min((cardW * 0.80) / lucSpr.texture.width, (cardH * 0.72) / lucSpr.texture.height);
    lucSpr.scale.set(lucFit);
    lucSpr.position.set(lucLeft + Math.round(cardW / 2), cardTop + Math.round(cardH * 0.80));
    c.addChild(lucSpr);

    const charNameStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'Courier New',
      fontSize: Math.max(isTablet ? 24 : 14, xs(14)),
    });

    const lucName = new Text({ text: 'Luc', style: charNameStyle });
    lucName.anchor.set(0.5);
    lucName.position.set(lucLeft + Math.round(cardW / 2), cardTop + cardH - Math.max(xs(18), 12));
    c.addChild(lucName);

    // Shannon sprite
    const shanTex = Texture.from('/assets/shannon-idle-resize.png');
    shanTex.source.scaleMode = 'linear';
    const shanSpr = new Sprite(shanTex);
    shanSpr.anchor.set(0.5, 1);
    const shanFit = Math.min((cardW * 0.80) / shanSpr.texture.width, (cardH * 0.72) / shanSpr.texture.height);
    shanSpr.scale.set(shanFit);
    shanSpr.position.set(shanLeft + Math.round(cardW / 2), cardTop + Math.round(cardH * 0.80));
    c.addChild(shanSpr);

    const shanName = new Text({ text: 'Shannon', style: charNameStyle });
    shanName.anchor.set(0.5);
    shanName.position.set(shanLeft + Math.round(cardW / 2), cardTop + cardH - Math.max(xs(18), 12));
    c.addChild(shanName);

    this.lucCard.gfx.on('pointerdown', () => { this.char = 'luc'; this.refresh(); this.syncPlay(); });
    this.shanCard.gfx.on('pointerdown', () => { this.char = 'shannon'; this.refresh(); this.syncPlay(); });

    y += cardH;

    // ── How to play text (between cards and select_character) ──
    const howWrapW = isMobile ? W * 0.82 : W * 0.90;
    const howFontSize = Math.max(isTablet ? 16 : 13, xs(13));
    this.howToPlayTxt = new HTMLText({
      text: this.t('how_to_play'),
      style: new HTMLTextStyle({
        fill: '#5C3A1E',
        fontFamily: 'Courier New',
        fontSize: howFontSize,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: howWrapW,
        tagStyles: {
          b: { fontWeight: 'bold', fontSize: Math.max(isTablet ? 17 : 12, xs(13)) },
        },
      }),
    });
    this.howToPlayTxt.anchor.set(0.5, 0);
    c.addChild(this.howToPlayTxt);

    const howToPlayGapAbove = xs(14);
    const howToPlayGapBelow = xs(14);
    y += howToPlayGapAbove;
    const howToPlayFlowY = y;
    y += this.howToPlayTxt.height + howToPlayGapBelow;

    // ── Tooltip params (select_character) ──
    const tipPadX = xs(12) + (isMobile ? 2 : 0);
    const tipPadY = xs(7) + (isMobile ? 2 : 0);
    const tipR = xs(6);
    this._W = W;
    this._tipParams = { padX: tipPadX, padY: tipPadY, r: tipR };
    const hintGapBefore = isMobile ? xs(28) : xs(60);
    const hintGapAfter = isMobile ? xs(10) : xs(4);

    const tooltipContainer = new Container();
    tooltipContainer.visible = true;
    c.addChild(tooltipContainer);

    const tooltipBg = new Graphics();
    const tooltipTxt = new Text({
      text: '',
      style: new TextStyle({
        fill: '#5C3A1E',
        fontFamily: 'Courier New',
        fontSize: Math.max(isTablet ? 16 : 11, xs(12)),
        align: 'center',
        wordWrap: true,
        wordWrapWidth: isMobile ? W * 0.65 : W,
      }),
    });
    tooltipTxt.anchor.set(0.5, 0.5);
    tooltipContainer.addChild(tooltipBg, tooltipTxt);

    this.tooltip = { container: tooltipContainer, bg: tooltipBg, txt: tooltipTxt };

    // ── Play button (above select_character on desktop) ──
    const playH = Math.max(isTablet ? 84 : 54, xs(54));
    const playW = Math.min(Math.max(isTablet ? 300 : 200, xs(200)), W - xs(60));
    const shadow = Math.max(xs(5), 3);

    const playY = isMobile
      ? Math.round(H * (isSmallScreen ? 0.91 : 0.88)) - shadow - playH
      : y + hintGapBefore;

    if (isMobile) {
      // Anchor from bottom: howToPlayTxt → play button → tooltip
      this.howToPlayTxt.position.set(W / 2, playY - hintGapBefore - this.howToPlayTxt.height);
      this._hintY = playY + playH + shadow + hintGapAfter;
    } else {
      this.howToPlayTxt.position.set(W / 2, howToPlayFlowY);
      this._hintY = playY + playH + shadow + hintGapAfter;
    }

    this.playBtn = new PlayBtn(Math.round(W / 2 - playW / 2), playY, playW, playH, shadow);
    c.addChild(this.playBtn.gfx);

    this.playTxt = new Text({
      text: '',
      style: new TextStyle({
        fill: '#ffffff',
        fontFamily: 'Courier New',
        fontSize: Math.max(isTablet ? 32 : 20, xs(22)),
        fontWeight: 'bold',
        letterSpacing: xs(1),
      }),
    });
    this.playTxt.anchor.set(0.5);
    this.playTxt.position.set(W / 2, playY + Math.round(playH / 2));
    c.addChild(this.playTxt);

    this.playBtn.gfx.on('pointerdown', () => {
      if (this.char) onPlay(this.char, this.lang);
    });
  }

  private updateSign(): void {
    const { padX, h, r, y, borderW, W } = this._signParams;
    const w = Math.min(this.titleTxt.width + padX * 2, W - borderW * 2);
    const x = Math.round((W - w) / 2);
    this.sign.clear();
    this.sign.roundRect(borderW, borderW, w, h, r).fill({ color: 0xBCA882, alpha: 0.5 });
    this.sign.roundRect(0, 0, w, h, r).fill({ color: 0xF5E6C0 });
    this.sign.roundRect(0, 0, w, h, r).stroke({ color: 0xBCA882, width: borderW });
    this.sign.position.set(x, y);
    this.titleTxt.position.set(W / 2, y + Math.round(h / 2));
  }

  private refresh(): void {
    this.titleTxt.text = this.t('title');
    this.updateSign();
    this.tooltip.txt.text = this.t('select_character');
    this.redrawTooltip();
    const howRaw = this.t('how_to_play');
    const colonIdx = howRaw.indexOf(': ');
    this.howToPlayTxt.text = colonIdx >= 0
      ? `<b>${howRaw.slice(0, colonIdx)}:</b> ${howRaw.slice(colonIdx + 2)}`
      : howRaw;
    this.langLbl.text = `✦ ${this.t('language')} ✦`;
    this.rulesTxt.text = this.t('rules').replace('75 points', '<b>75 points</b>');
    this.charLbl.text = `✦ ${this.t('character')} ✦`;
    this.frTxt.text = this.t('lang_fr');
    this.enTxt.text = this.t('lang_en');
    this.playTxt.text = this.t('play');
    this.frBtn.selected = this.lang === 'fr';
    this.enBtn.selected = this.lang === 'en';
    this.lucCard.selected = this.char === 'luc';
    this.shanCard.selected = this.char === 'shannon';
  }

  private redrawTooltip(): void {
    const { padX, padY, r } = this._tipParams;
    const tw = this.tooltip.txt.width + padX * 2;
    const th = this.tooltip.txt.height + padY * 2;
    this.tooltip.bg.clear();
    this.tooltip.bg.roundRect(-tw / 2, -th / 2, tw, th, r).fill({ color: 0xFFF8E7 });
    this.tooltip.bg.roundRect(-tw / 2, -th / 2, tw, th, r).stroke({ color: 0xBCA882, width: 1.5 });
    this.tooltip.container.position.set(this._W / 2, this._hintY + th / 2);
  }

  private syncPlay(): void {
    const enabled = this.char !== null;
    this.playBtn.enabled = enabled;
    this.playTxt.alpha = enabled ? 1 : 0.5;
    this.tooltip.container.visible = !enabled;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

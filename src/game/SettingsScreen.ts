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
    private readonly _r?: number,
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
    const r = this._r ?? Math.round(Math.min(this.w, this.h) * 0.22);
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
    const r = Math.round(Math.min(this.w, this.h) * 0.22);
    const fill = this._enabled ? 0x4A7C3F : 0xBECA7A;
    const shade = this._enabled ? 0x2D5224 : 0xAAB462;
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
  private _signParams!: { padX: number; h: number; r: number; y: number; borderW: number; W: number; titleH?: number; fixedW?: number };

  private langLbl: Text | null = null;
  private _rulesTxt: HTMLText | null = null;
  private charLbl: Text | null = null;
  private _saveDateCalTxt: Text | null = null;
  private _saveDateLocTxt: Text | null = null;
  private _saveDateCalRow: Container | null = null;
  private _saveDateLocRow: Container | null = null;
  private _leaderboardTitleTxt: Text | null = null;
  private _howCont: Container | null = null;
  private _howTxt1: Text | null = null;
  private _howTxt2: Text | null = null;
  private frBtn: OptionBtn | null = null;
  private enBtn: OptionBtn | null = null;
  private frTxt: Text | null = null;
  private enTxt: Text | null = null;
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
    private readonly saveTheDateShown: boolean = false,
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

    const sc = Math.max(Math.min(W / 960, H / 600), 0.45);
    const xs = (v: number) => Math.round(v * sc);
    const isMobile = W < H;
    const isTablet = isMobile && W >= 600;
    const isSmallScreen = isMobile && H < 665;
    const cornerR = Math.max(isTablet ? 11 : 8, xs(7));

    // ─── Background ───
    const bgImg = W < H ? '/assets/background-settings-mobile.png' : '/assets/background-settings.png';
    const bgSpr = new Sprite(Texture.from(bgImg));
    bgSpr.width = W;
    bgSpr.height = H;
    c.addChild(bgSpr);

    let y = isMobile ? Math.round(H * 0.08) : Math.round(H * 0.05);

    // ── Title sign ──
    const baseTitleH = isMobile ? xs(76) : xs(58);
    const signR = cornerR;
    const signBorderW = xs(4);
    const signPadX = isMobile ? xs(36) : xs(24);

    const extraIconSz = this.saveTheDateShown ? Math.max(isTablet ? 22 : 16, xs(16)) : 0;
    const extraLineH = this.saveTheDateShown ? extraIconSz + xs(2) : 0;
    const extraRowGap = this.saveTheDateShown ? xs(7) : 0;
    const signExtraH = this.saveTheDateShown ? extraLineH * 2 + extraRowGap + xs(5) : 0;
    const signH = baseTitleH + signExtraH;
    this.titleTxt = new Text({
      text: '',
      style: new TextStyle({
        fill: '#5C3A1E',
        fontFamily: 'TypoWriter',
        fontSize: Math.max(isTablet ? 32 : isMobile ? 18 : 0, xs(26)),
        fontWeight: 'bold',
        letterSpacing: xs(0),
      }),
    });
    this.titleTxt.anchor.set(0.5);

    this._signParams = { padX: signPadX, h: signH, r: signR, y, borderW: signBorderW, W, titleH: baseTitleH };
    this.sign = new Graphics();
    c.addChild(this.sign);
    c.addChild(this.titleTxt);

    if (this.saveTheDateShown) {
      const signTitleY = y;
      const iconTextGap = xs(8);
      const extraTxtStyle = new TextStyle({
        fill: '#5C3A1E',
        fontFamily: 'TypoWriter',
        fontSize: Math.max(isTablet ? 18 : 13, xs(14)),
        fontWeight: 'bold',
      });
      const line1CenterY = signTitleY + baseTitleH - xs(8) + extraLineH / 2;
      const line2CenterY = line1CenterY + extraLineH + extraRowGap;

      this._saveDateCalRow = new Container();
      this._saveDateCalRow.y = line1CenterY;
      const calIcon = new Sprite(Texture.from('/assets/calendar-icon.png'));
      calIcon.width = extraIconSz;
      calIcon.height = extraIconSz;
      calIcon.anchor.set(0, 0.5);
      calIcon.position.set(0, 0);
      this._saveDateCalRow.addChild(calIcon);
      this._saveDateCalTxt = new Text({ text: '', style: extraTxtStyle });
      this._saveDateCalTxt.anchor.set(0, 0.5);
      this._saveDateCalTxt.position.set(extraIconSz + iconTextGap, 0);
      this._saveDateCalRow.addChild(this._saveDateCalTxt);
      c.addChild(this._saveDateCalRow);

      this._saveDateLocRow = new Container();
      this._saveDateLocRow.y = line2CenterY;
      const locIcon = new Sprite(Texture.from('/assets/location-icon.png'));
      locIcon.width = extraIconSz;
      locIcon.height = extraIconSz;
      locIcon.anchor.set(0, 0.5);
      locIcon.position.set(0, 0);
      this._saveDateLocRow.addChild(locIcon);
      this._saveDateLocTxt = new Text({ text: '', style: extraTxtStyle });
      this._saveDateLocTxt.anchor.set(0, 0.5);
      this._saveDateLocTxt.position.set(extraIconSz + iconTextGap, 0);
      this._saveDateLocRow.addChild(this._saveDateLocTxt);
      c.addChild(this._saveDateLocRow);
    }

    y += signH + (isMobile ? (isTablet ? 20 : 14) : xs(20));

    if (this.saveTheDateShown) {
      this.buildRevealedSection(c, W, H, y, xs, isMobile, isTablet, isSmallScreen, onPlay);
      return;
    }

    // ─── Standard layout ───

    y += isMobile ? (isTablet ? 40 : 14) : xs(10);

    // ── Language label ──
    const secStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter',
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
    const lbH = Math.max(isTablet ? 64 : 38, xs(30));
    const lbW = Math.max(isTablet ? 170 : 95, xs(85));
    const lbGap = xs(16);
    const lbY = y;

    this.frBtn = new OptionBtn(W / 2 - lbGap / 2 - lbW, lbY, lbW, lbH, cornerR);
    this.enBtn = new OptionBtn(W / 2 + lbGap / 2, lbY, lbW, lbH, cornerR);
    c.addChild(this.frBtn.gfx, this.enBtn.gfx);

    const btnTxtStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter',
      fontSize: Math.max(isTablet ? 24 : 14, xs(14)),
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

    y += lbH + (isMobile ? (isSmallScreen ? 8 : isTablet ? 24 : 14) : xs(16));

    // ── Rules text ──
    const rulesWrapW = isMobile ? W * 0.92 : W * 0.90;
    const rulesFontSize = Math.max(isTablet ? 22 : 13, xs(13));
    this._rulesTxt = new HTMLText({
      text: this.t('rules'),
      style: new HTMLTextStyle({
        fill: '#5C3A1E',
        fontFamily: 'TypoWriter',
        fontSize: rulesFontSize,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: rulesWrapW,
        tagStyles: {
          b: { fontWeight: 'bold' },
        },
      }),
    });
    this._rulesTxt.anchor.set(0.5, 0);
    this._rulesTxt.position.set(W / 2, y);
    c.addChild(this._rulesTxt);

    y += this._rulesTxt.height + (isMobile ? (isSmallScreen ? 8 : isTablet ? 24 : 14) : xs(16));

    // ── Character label ──
    this.charLbl = new Text({ text: '', style: secStyle });
    this.charLbl.anchor.set(0.5);
    this.charLbl.position.set(W / 2, y + xs(4));
    c.addChild(this.charLbl);

    y += Math.max(isTablet ? 32 : 16, xs(13)) + (isMobile ? (isTablet ? 10 : 6) : xs(4));

    // ── Character cards ──
    const maxCardW = Math.floor((W - xs(60)) / 2);
    const cardW = isMobile
      ? Math.min(Math.floor((W - (isSmallScreen ? xs(310) : isTablet ? xs(360) : xs(200))) / 2), maxCardW)
      : Math.min(Math.max(xs(130), 80), maxCardW);
    const cardH = Math.round(cardW * 1.08);
    const cardGap = xs(36);
    const cardTop = y;
    const lucLeft = Math.round(W / 2 - cardGap / 2 - cardW);
    const shanLeft = Math.round(W / 2 + cardGap / 2);

    this.lucCard = new OptionBtn(lucLeft, cardTop, cardW, cardH, cornerR);
    this.shanCard = new OptionBtn(shanLeft, cardTop, cardW, cardH, cornerR);
    c.addChild(this.lucCard.gfx, this.shanCard.gfx);

    const lucSpr = new Sprite(Texture.from('/assets/luc-idle-resize.png'));
    lucSpr.anchor.set(0.5, 1);
    const lucFit = Math.min((cardW * 0.80) / lucSpr.texture.width, (cardH * 0.72) / lucSpr.texture.height);
    lucSpr.scale.set(lucFit);
    lucSpr.position.set(lucLeft + Math.round(cardW / 2), cardTop + Math.round(cardH * 0.80));
    c.addChild(lucSpr);

    const charNameStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter',
      fontSize: Math.max(isTablet ? 24 : 14, xs(14)),
    });

    const lucName = new Text({ text: 'Luc', style: charNameStyle });
    lucName.anchor.set(0.5);
    lucName.position.set(lucLeft + Math.round(cardW / 2), cardTop + cardH - Math.max(xs(18), 12));
    c.addChild(lucName);

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

    // ── How to play text ──
    const howWrapW = isMobile ? W * 0.92 : W * 0.90;
    const howFontSize = Math.max(isTablet ? 22 : 13, xs(13));
    const howBaseStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter',
      fontSize: howFontSize,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: howWrapW,
    });
    const how1Style = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter',
      fontSize: howFontSize,
      fontWeight: 'bold',
      align: 'center',
    });
    const howGap = xs(2);
    this._howTxt1 = new Text({ text: this.t('how_to_play_1'), style: how1Style });
    this._howTxt1.anchor.set(0.5, 0);
    this._howTxt1.x = W / 2;
    this._howTxt2 = new Text({ text: this.t('how_to_play_2'), style: howBaseStyle });
    this._howTxt2.anchor.set(0.5, 0);
    this._howTxt2.position.set(W / 2, this._howTxt1.height + howGap);
    this._howCont = new Container();
    this._howCont.addChild(this._howTxt1, this._howTxt2);
    c.addChild(this._howCont);

    const howToPlayGapAbove = xs(14);
    const howToPlayGapBelow = xs(14);
    y += howToPlayGapAbove;
    const howToPlayFlowY = y;
    y += this._howCont.height + howToPlayGapBelow;

    // ── Tooltip (select_character) ──
    const tipPadX = xs(12) + (isMobile ? 2 : 0);
    const tipPadY = xs(7) + (isMobile ? 2 : 0);
    this._W = W;
    this._tipParams = { padX: tipPadX, padY: tipPadY, r: cornerR };
    const hintGapBefore = isMobile ? (isSmallScreen ? xs(14) : xs(28)) : xs(40);
    const hintGapAfter = isMobile ? xs(10) : xs(4);

    const tooltipContainer = new Container();
    tooltipContainer.visible = true;
    c.addChild(tooltipContainer);

    const tooltipBg = new Graphics();
    const tooltipTxt = new Text({
      text: '',
      style: new TextStyle({
        fill: '#5C3A1E',
        fontFamily: 'TypoWriter',
        fontSize: Math.max(isTablet ? 16 : 11, xs(12)),
        align: 'center',
        wordWrap: true,
        wordWrapWidth: isMobile ? W * 0.65 : W,
      }),
    });
    tooltipTxt.anchor.set(0.5, 0.5);
    tooltipContainer.addChild(tooltipBg, tooltipTxt);
    this.tooltip = { container: tooltipContainer, bg: tooltipBg, txt: tooltipTxt };

    // ── Play button ──
    const playH = Math.max(isSmallScreen ? 44 : isTablet ? 84 : 54, xs(isSmallScreen ? 44 : 54));
    const playW = Math.min(Math.max(isTablet ? 300 : 200, xs(200)), W - xs(60));
    const shadow = Math.max(xs(5), 3);

    const playY = isMobile
      ? Math.round(H * (isSmallScreen ? 0.91 : 0.88)) - shadow - playH
      : y + hintGapBefore;

    if (isMobile) {
      this._howCont!.position.set(0, playY - hintGapBefore - this._howCont!.height);
      this._hintY = playY + playH + shadow + hintGapAfter;
    } else {
      this._howCont!.position.set(0, howToPlayFlowY);
      this._hintY = playY + playH + shadow + hintGapAfter;
    }

    this.playBtn = new PlayBtn(Math.round(W / 2 - playW / 2), playY, playW, playH, shadow);
    c.addChild(this.playBtn.gfx);

    this.playTxt = new Text({
      text: '',
      style: new TextStyle({
        fill: '#ffffff',
        fontFamily: 'TypoWriter',
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

  private buildRevealedSection(
    c: Container,
    W: number,
    H: number,
    y: number,
    xs: (v: number) => number,
    isMobile: boolean,
    isTablet: boolean,
    isSmallScreen: boolean,
    onPlay: (char: Character, lang: Language) => void,
  ): void {
    const tr = this.tr[this.lang] as Record<string, string>;
    const cornerR = Math.max(isTablet ? 11 : 8, xs(7));

    const secStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter',
      fontSize: Math.max(isTablet ? 28 : 15, xs(13)),
      fontWeight: 'bold',
      letterSpacing: xs(1),
    });

    // ── Leaderboard ──
    const topScores: Array<{ pseudo: string; highScore: number }> = [
      { pseudo: 'Shannon', highScore: 4200 },
      { pseudo: 'Luc',     highScore: 4200 },
      { pseudo: 'Stephanie', highScore: 3800 },
      { pseudo: 'Evan',    highScore: 1000 },
      { pseudo: 'Ana',     highScore: 550 },
    ];
    const boardW = Math.min(isTablet ? 450 : isMobile ? 270 : 350, W - xs(24));
    const boardX = Math.round((W - boardW) / 2);
    const frameW = xs(2);
    const boardPadX = xs(10);
    const boardPadY = xs(5);
    const rowH = Math.max(isTablet ? 28 : 20, xs(18));
    const rowGap = xs(3);
    const badgeSize = rowH;
    const badgeGap = xs(5);
    const innerW = boardW - frameW * 2;
    const colW = innerW - boardPadX * 2;
    const lbTitleFontSize = Math.max(isTablet ? 22 : 15, xs(15));
    const lbTitleH = Math.round(lbTitleFontSize * 1.2);
    const lbTitleGap = xs(4);
    const boardInnerH = lbTitleH + lbTitleGap + 5 * rowH + 4 * rowGap;
    const boardH = boardInnerH + boardPadY * 2 + frameW * 2;
    const boardR = cornerR;

    const boardGfx = new Graphics();
    boardGfx.roundRect(frameW, frameW, boardW, boardH, boardR).fill({ color: 0x7A4F2E, alpha: 0.25 });
    boardGfx.roundRect(0, 0, boardW, boardH, boardR).fill({ color: 0xE8CDB0 });
    boardGfx.roundRect(0, 0, boardW, boardH, boardR).stroke({ color: 0x7A4F2E, width: frameW });
    boardGfx.position.set(boardX, y);
    c.addChild(boardGfx);

    this._leaderboardTitleTxt = new Text({
      text: tr['leaderboard'] ?? 'High scores',
      style: new TextStyle({
        fill: '#5C3A1E',
        fontFamily: 'TypoWriter',
        fontSize: lbTitleFontSize,
        fontWeight: 'bold',
        letterSpacing: xs(1),
      }),
    });
    this._leaderboardTitleTxt.anchor.set(0.5);
    this._leaderboardTitleTxt.position.set(W / 2, y + frameW + boardPadY + Math.round(lbTitleH / 2));
    c.addChild(this._leaderboardTitleTxt);

    const rankStyle = new TextStyle({
      fill: '#ffffff',
      fontFamily: 'TypoWriter',
      fontSize: Math.max(isTablet ? 16 : 11, xs(10)),
      fontWeight: 'bold',
    });
    const nameStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter',
      fontSize: Math.max(isTablet ? 22 : 15, xs(14)),
      fontWeight: 'bold',
    });
    const scoreStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter',
      fontSize: Math.max(isTablet ? 20 : 14, xs(13)),
    });

    const colInnerX = boardX + frameW + boardPadX;
    const rowsStartY = y + frameW + boardPadY + lbTitleH + lbTitleGap;
    for (let row = 0; row < 5; row++) {
      const entry = topScores[row] ?? null;
      const rowY = rowsStartY + row * (rowH + rowGap);

      const badge = new Graphics();
      badge.circle(badgeSize / 2, badgeSize / 2, badgeSize / 2).fill({ color: 0x4A7C3F });
      badge.position.set(colInnerX, rowY);
      c.addChild(badge);

      const rankTxt = new Text({ text: String(row + 1), style: rankStyle });
      rankTxt.anchor.set(0.5);
      rankTxt.position.set(colInnerX + badgeSize / 2, rowY + badgeSize / 2);
      c.addChild(rankTxt);

      const nameTxt = new Text({
        text: entry ? entry.pseudo : '- -',
        style: nameStyle,
      });
      nameTxt.anchor.set(0, 0.5);
      nameTxt.position.set(colInnerX + badgeSize + badgeGap, rowY + rowH / 2);
      c.addChild(nameTxt);

      const scoreTxt = new Text({
        text: entry ? `${entry.highScore} ${this.t('points')}` : '',
        style: scoreStyle,
      });
      scoreTxt.anchor.set(1, 0.5);
      scoreTxt.position.set(colInnerX + colW - xs(2), rowY + rowH / 2);
      c.addChild(scoreTxt);
    }

    y += boardH + (isMobile ? xs(28) : xs(12));

    // ── Character label ──
    this.charLbl = new Text({ text: '', style: secStyle });
    this.charLbl.anchor.set(0.5);
    this.charLbl.position.set(W / 2, y + xs(4));
    c.addChild(this.charLbl);
    y += Math.max(isTablet ? 32 : 16, xs(13)) + (isMobile ? (isTablet ? 10 : 6) : xs(4));

    // ── Character cards ──
    const maxCardW = Math.floor((W - xs(60)) / 2);
    const cardW = isMobile
      ? Math.min(Math.floor((W - (isSmallScreen ? xs(310) : isTablet ? xs(360) : xs(200))) / 2), maxCardW)
      : Math.min(Math.max(xs(130), 80), maxCardW);
    const cardH = Math.round(cardW * 1.08);
    const cardGap = xs(36);
    const cardTop = y;
    const lucLeft = Math.round(W / 2 - cardGap / 2 - cardW);
    const shanLeft = Math.round(W / 2 + cardGap / 2);

    this.lucCard = new OptionBtn(lucLeft, cardTop, cardW, cardH, cornerR);
    this.shanCard = new OptionBtn(shanLeft, cardTop, cardW, cardH, cornerR);
    c.addChild(this.lucCard.gfx, this.shanCard.gfx);

    const lucSpr = new Sprite(Texture.from('/assets/luc-idle-resize.png'));
    lucSpr.anchor.set(0.5, 1);
    const lucFit = Math.min((cardW * 0.80) / lucSpr.texture.width, (cardH * 0.72) / lucSpr.texture.height);
    lucSpr.scale.set(lucFit);
    lucSpr.position.set(lucLeft + Math.round(cardW / 2), cardTop + Math.round(cardH * 0.80));
    c.addChild(lucSpr);

    const charNameStyle = new TextStyle({
      fill: '#5C3A1E',
      fontFamily: 'TypoWriter',
      fontSize: Math.max(isTablet ? 24 : 14, xs(14)),
    });

    const lucName = new Text({ text: 'Luc', style: charNameStyle });
    lucName.anchor.set(0.5);
    lucName.position.set(lucLeft + Math.round(cardW / 2), cardTop + cardH - Math.max(xs(18), 12));
    c.addChild(lucName);

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

    // ── Tooltip (select_character) ──
    const tipPadX = xs(12) + (isMobile ? 2 : 0);
    const tipPadY = xs(7) + (isMobile ? 2 : 0);
    this._W = W;
    this._tipParams = { padX: tipPadX, padY: tipPadY, r: cornerR };

    // ── Play button ──
    const playH = Math.max(isSmallScreen ? 44 : isTablet ? 84 : 54, xs(isSmallScreen ? 44 : 54));
    const playW = Math.min(Math.max(isTablet ? 300 : 200, xs(200)), W - xs(60));
    const shadow = Math.max(xs(5), 3);
    const hintGapAfter = isMobile ? xs(10) : xs(4);

    const playY = isMobile
      ? Math.round(H * (isSmallScreen ? 0.91 : 0.88)) - shadow - playH
      : y + xs(20);

    this._hintY = playY + playH + shadow + hintGapAfter;

    this.playBtn = new PlayBtn(Math.round(W / 2 - playW / 2), playY, playW, playH, shadow);
    c.addChild(this.playBtn.gfx);

    this.playTxt = new Text({
      text: '',
      style: new TextStyle({
        fill: '#ffffff',
        fontFamily: 'TypoWriter',
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

    const tooltipContainer = new Container();
    c.addChild(tooltipContainer);
    const tooltipBg = new Graphics();
    const tooltipTxt = new Text({
      text: '',
      style: new TextStyle({
        fill: '#5C3A1E',
        fontFamily: 'TypoWriter',
        fontSize: Math.max(isTablet ? 16 : 11, xs(12)),
        align: 'center',
        wordWrap: true,
        wordWrapWidth: isMobile ? W * 0.65 : W,
      }),
    });
    tooltipTxt.anchor.set(0.5, 0.5);
    tooltipContainer.addChild(tooltipBg, tooltipTxt);
    this.tooltip = { container: tooltipContainer, bg: tooltipBg, txt: tooltipTxt };
  }

  private updateSign(): void {
    const { padX, h, r, y, borderW, W, titleH, fixedW } = this._signParams;
    const w = fixedW !== undefined ? fixedW : Math.min(this.titleTxt.width + padX * 2, W - borderW * 2);
    const x = Math.round((W - w) / 2);
    this.sign.clear();
    this.sign.roundRect(borderW, borderW, w, h, r).fill({ color: 0xBCA882, alpha: 0.5 });
    this.sign.roundRect(0, 0, w, h, r).fill({ color: 0xF5E6C0 });
    this.sign.roundRect(0, 0, w, h, r).stroke({ color: 0xBCA882, width: borderW });
    this.sign.position.set(x, y);
    this.titleTxt.position.set(W / 2, y + Math.round((titleH ?? h) / 2));
  }

  private refresh(): void {
    this.titleTxt.text = this.t('title');
    this.updateSign();
    this.tooltip.txt.text = this.t('select_character');
    this.redrawTooltip();
    if (this.charLbl) this.charLbl.text = `✦ ${this.t('character')} ✦`;
    if (this.langLbl) this.langLbl.text = `✦ ${this.t('language')} ✦`;
    if (this._rulesTxt) this._rulesTxt.text = this.t('rules').replace('75 points', '<b>75 points</b>');
    if (this.frTxt) this.frTxt.text = this.t('lang_fr');
    if (this.enTxt) this.enTxt.text = this.t('lang_en');
    if (this._howTxt1) this._howTxt1.text = this.t('how_to_play_1');
    if (this._howTxt2) this._howTxt2.text = this.t('how_to_play_2');
    if (this._saveDateCalTxt && this._saveDateCalRow) {
      this._saveDateCalTxt.text = this.t('save_the_date_body_2');
      this._saveDateCalRow.x = Math.round(this._W / 2 - this._saveDateCalRow.width / 2);
    }
    if (this._saveDateLocTxt && this._saveDateLocRow) {
      this._saveDateLocTxt.text = this.t('save_the_date_body_3');
      this._saveDateLocRow.x = Math.round(this._W / 2 - this._saveDateLocRow.width / 2);
    }
    if (this._leaderboardTitleTxt) this._leaderboardTitleTxt.text = this.t('leaderboard');
    this.playTxt.text = this.t('play');
    if (this.frBtn) this.frBtn.selected = this.lang === 'fr';
    if (this.enBtn) this.enBtn.selected = this.lang === 'en';
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

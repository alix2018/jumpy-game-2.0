import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';

export interface InfoCard {
  icon: string;
  label: string;
  value: string;
  onClick?: () => void;
}

export function renderInfoCards(
  c: Container,
  cards: InfoCard[],
  W: number,
  y: number,
  isMobile: boolean,
  isTablet: boolean,
  xs: (v: number) => number,
  stackVertically = false,
): number {
  const cardsW = stackVertically ? W * 0.65 : Math.min(isMobile ? W * 0.74 : W * 0.68, W - xs(24));
  const cardGap = stackVertically ? xs(42) : xs(8);
  const cardW = stackVertically ? cardsW : Math.floor((cardsW - cardGap) / 2);
  const cardPadX = xs(16);
  const cardPadY = xs(8);
  const labelFontSize = Math.max(isTablet ? 23 : isMobile ? 15 : 0, xs(16));
  const valueFontSize = Math.max(isTablet ? 21 : isMobile ? 15 : 0, xs(16));
  const iconSizeInCard = Math.round(labelFontSize * 1.6);
  const iconLabelGap = xs(6);
  const labelValueGap = xs(5);
  const cardBorderW = xs(2);
  const cardR = xs(8);
  const cardX0 = Math.round((W - cardsW) / 2);

  const labelStyle = new TextStyle({
    fill: '#5C3A1E',
    fontFamily: 'TypoWriter',
    fontSize: labelFontSize,
    fontWeight: 'bold',
    letterSpacing: xs(1),
  });
  const valueStyle = new TextStyle({
    fill: '#7A5C3A',
    fontFamily: 'TypoWriter',
    fontSize: valueFontSize,
    fontWeight: 'bold',
    wordWrap: true,
    wordWrapWidth: cardW - cardPadX * 2,
    align: 'left',
  });

  const cardTexts = cards.map(cardData => ({
    label: new Text({ text: cardData.label.toUpperCase(), style: labelStyle }),
    value: new Text({ text: cardData.value, style: valueStyle }),
  }));

  const rowH = Math.max(...cardTexts.map(t => Math.max(iconSizeInCard, t.label.height)));
  const maxCardH = Math.max(...cardTexts.map(t =>
    cardPadY + rowH + labelValueGap + t.value.height + cardPadY,
  ));

  for (let i = 0; i < cards.length; i++) {
    const cardData = cards[i];
    const cardX = cardX0;
    const cardY = stackVertically ? y + i * (maxCardH + cardGap) : y;
    const cardXOffset = stackVertically ? 0 : i * (cardW + cardGap);
    const { label: labelTxt, value: valueTxt } = cardTexts[i];

    const card = new Graphics();
    card.roundRect(cardBorderW, cardBorderW, cardW, maxCardH, cardR).fill({ color: 0x7A4F2E, alpha: 0.25 });
    card.roundRect(0, 0, cardW, maxCardH, cardR).fill({ color: 0xE8CDB0 });
    card.roundRect(0, 0, cardW, maxCardH, cardR).stroke({ color: 0x7A4F2E, width: cardBorderW });
    card.position.set(cardX + cardXOffset, cardY);
    c.addChild(card);

    const iconSpr = new Sprite(Texture.from(cardData.icon));
    iconSpr.width = iconSizeInCard;
    iconSpr.height = iconSizeInCard;
    iconSpr.position.set(cardX + cardXOffset + cardPadX, cardY + cardPadY + Math.round((rowH - iconSizeInCard) / 2));
    c.addChild(iconSpr);

    labelTxt.position.set(
      cardX + cardXOffset + cardPadX + iconSizeInCard + iconLabelGap,
      cardY + cardPadY + Math.round((rowH - labelTxt.height) / 2),
    );
    c.addChild(labelTxt);

    valueTxt.position.set(cardX + cardXOffset + cardPadX, cardY + cardPadY + rowH + labelValueGap);
    c.addChild(valueTxt);

    if (cardData.onClick) {
      card.eventMode = 'static';
      card.cursor = 'pointer';
      const underlineGfx = new Graphics();
      underlineGfx.visible = false;
      c.addChild(underlineGfx);
      card.on('pointerover', () => {
        underlineGfx.clear();
        underlineGfx.rect(valueTxt.x, valueTxt.y + valueTxt.height, valueTxt.width, 1.5).fill({ color: 0x7A5C3A });
        underlineGfx.visible = true;
      });
      card.on('pointerout', () => { underlineGfx.visible = false; });
      card.on('pointerdown', cardData.onClick);
    }
  }

  return stackVertically
    ? cards.length * maxCardH + (cards.length - 1) * cardGap
    : maxCardH;
}

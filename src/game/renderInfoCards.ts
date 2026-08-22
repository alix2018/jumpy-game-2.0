import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';

export interface InfoCard {
  icon: string;
  label: string;
  value: string;
}

export function renderInfoCards(
  c: Container,
  cards: InfoCard[],
  W: number,
  y: number,
  isMobile: boolean,
  isTablet: boolean,
  xs: (v: number) => number,
): number {
  const cardsW = Math.min(isMobile ? W * 0.74 : W * 0.68, W - xs(24));
  const cardGap = xs(8);
  const cardW = Math.floor((cardsW - cardGap) / 2);
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
    const cardX = cardX0 + i * (cardW + cardGap);
    const { label: labelTxt, value: valueTxt } = cardTexts[i];

    const card = new Graphics();
    card.roundRect(cardBorderW, cardBorderW, cardW, maxCardH, cardR).fill({ color: 0x7A4F2E, alpha: 0.25 });
    card.roundRect(0, 0, cardW, maxCardH, cardR).fill({ color: 0xFFFBF2, alpha: 0.85 });
    card.roundRect(0, 0, cardW, maxCardH, cardR).stroke({ color: 0x7A4F2E, width: cardBorderW });
    card.position.set(cardX, y);
    c.addChild(card);

    const iconSpr = new Sprite(Texture.from(cardData.icon));
    iconSpr.width = iconSizeInCard;
    iconSpr.height = iconSizeInCard;
    iconSpr.position.set(cardX + cardPadX, y + cardPadY + Math.round((rowH - iconSizeInCard) / 2));
    c.addChild(iconSpr);

    labelTxt.position.set(
      cardX + cardPadX + iconSizeInCard + iconLabelGap,
      y + cardPadY + Math.round((rowH - labelTxt.height) / 2),
    );
    c.addChild(labelTxt);

    valueTxt.position.set(cardX + cardPadX, y + cardPadY + rowH + labelValueGap);
    c.addChild(valueTxt);
  }

  return maxCardH;
}

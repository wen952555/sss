// 动态堆叠卡牌：保证每张牌都能看到主要牌面，且不会重叠遮住全部内容
const renderStackedCards = (cards) => {
  let cardWidth = 80, cardHeight = 96, overlapRatio = 0.55;
  if (window.innerWidth < 700) {
    cardWidth = 38; cardHeight = 48; overlapRatio = 0.55;
  } else if (window.innerWidth < 1200) {
    cardWidth = 56; cardHeight = 68; overlapRatio = 0.55;
  }
  const overlap = cardWidth * overlapRatio;
  const totalWidth = cards.length > 1
    ? cardWidth + (cards.length - 1) * overlap
    : cardWidth;
  return (
    <div
      className="mini-cards"
      style={{
        width: `${totalWidth}px`,
        height: `${cardHeight}px`,
      }}
    >
      {cards.map((c, i) => (
        <StaticCard
          key={c.id + '_static'}
          cardData={c}
          style={{
            position: 'absolute',
            left: `${i * overlap}px`,
            zIndex: i + 1,
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
          }}
        />
      ))}
    </div>
  );
};

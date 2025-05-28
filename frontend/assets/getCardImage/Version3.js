function getCardImage(card) {
  // card.suit: 's', 'h', 'd', 'c'
  // card.rank: 2-10, 11=jack, 12=queen, 13=king, 14=ace
  let rank = card.rank;
  if (rank === 11) rank = 'jack';
  if (rank === 12) rank = 'queen';
  if (rank === 13) rank = 'king';
  if (rank === 14) rank = 'ace';
  return CONFIG.IMAGE_SERVER_BASE_URL + card.suit + '_' + rank + '.png';
}

export const getCardImage = (val) => {
  // 假设 val 格式为: "10_C", "A_S", "K_D", "Q_H", "J_S", "RJ", "BJ"
  // 映射规则
  const suits = { 'C': 'clubs', 'S': 'spades', 'D': 'diamonds', 'H': 'hearts' };
  const ranks = { 
    'A': 'ace', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', 
    '7': '7', '8': '8', '9': '9', '10': '10', 'J': 'jack', 'Q': 'queen', 'K': 'king' 
  };

  if (val === 'RJ') return '/cards/red_joker.svg';
  if (val === 'BJ') return '/cards/black_joker.svg';

  const [rankRaw, suitRaw] = val.split('_');
  return `/cards/${ranks[rankRaw]}_of_${suits[suitRaw]}.svg`;
};
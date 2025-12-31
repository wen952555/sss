export const suitMap = {
    S: { name: 'Spades', symbol: '♠', color: 'text-black' },
    H: { name: 'Hearts', symbol: '♥', color: 'text-red-500' },
    D: { name: 'Diamonds', symbol: '♦', color: 'text-red-500' },
    C: { name: 'Clubs', symbol: '♣', color: 'text-black' },
  };
  
  export const rankMap = {
    A: 'A',
    K: 'K',
    Q: 'Q',
    J: 'J',
    T: '10',
    '9': '9',
    '8': '8',
    '7': '7',
    '6': '6',
    '5': '5',
    '4': '4',
    '3': '3',
    '2': '2',
  };
  
  export const parseCard = (cardCode) => {
    if (typeof cardCode !== 'string' || cardCode.length !== 2) {
      return { suit: '?', rank: '?', suitInfo: { name: '', symbol: '', color: '' } };
    }
    const suit = cardCode.charAt(0).toUpperCase();
    const rank = cardCode.charAt(1).toUpperCase();
    return {
      suit,
      rank,
      suitInfo: suitMap[suit],
    };
  };
  
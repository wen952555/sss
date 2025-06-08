// 十三水AI分牌算法
export const AI = {
  // 牌型权重
  HAND_RANKS: {
    ROYAL_FLUSH: 10,
    STRAIGHT_FLUSH: 9,
    FOUR_OF_A_KIND: 8,
    FULL_HOUSE: 7,
    FLUSH: 6,
    STRAIGHT: 5,
    THREE_OF_A_KIND: 4,
    TWO_PAIR: 3,
    ONE_PAIR: 2,
    HIGH_CARD: 1
  },
  
  // 将牌名转换为可处理的对象
  parseCard(cardName) {
    const [rank, , suit] = cardName.replace('.png', '').split('_');
    return { rank, suit };
  },
  
  // 获取牌值 (A=14, K=13, Q=12, J=11, 10=10, ... 2=2)
  getCardValue(rank) {
    const values = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, 
      '9': 9, '10': 10, 'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
    };
    return values[rank.toLowerCase()];
  },
  
  // 评估牌型
  evaluateHand(cards) {
    const parsedCards = cards.map(card => this.parseCard(card));
    const values = parsedCards.map(card => this.getCardValue(card.rank));
    const suits = parsedCards.map(card => card.suit);
    
    // 排序牌值
    values.sort((a, b) => a - b);
    
    // 检查同花
    const isFlush = suits.every(suit => suit === suits[0]);
    
    // 检查顺子
    let isStraight = true;
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i-1] + 1) {
        isStraight = false;
        break;
      }
    }
    
    // 特殊顺子：A,2,3,4,5
    const isLowStraight = JSON.stringify(values) === JSON.stringify([2,3,4,5,14]);
    if (isLowStraight) {
      isStraight = true;
      values[values.length-1] = 1; // 将A设为1
      values.sort((a, b) => a - b);
    }
    
    // 检查皇家同花顺
    if (isFlush && isStraight && values[0] === 10) {
      return { type: 'ROYAL_FLUSH', value: 100 };
    }
    
    // 同花顺
    if (isFlush && isStraight) {
      return { type: 'STRAIGHT_FLUSH', value: 90 + values[values.length-1] };
    }
    
    // 四张相同
    const valueCounts = {};
    values.forEach(value => {
      valueCounts[value] = (valueCounts[value] || 0) + 1;
    });
    
    const counts = Object.values(valueCounts).sort((a,b) => b-a);
    
    if (counts[0] === 4) {
      const fourValue = Object.keys(valueCounts).find(key => valueCounts[key] === 4);
      return { type: 'FOUR_OF_A_KIND', value: 80 + parseInt(fourValue) };
    }
    
    // 葫芦
    if (counts[0] === 3 && counts[1] === 2) {
      const threeValue = Object.keys(valueCounts).find(key => valueCounts[key] === 3);
      return { type: 'FULL_HOUSE', value: 70 + parseInt(threeValue) };
    }
    
    // 同花
    if (isFlush) {
      return { type: 'FLUSH', value: 60 + values[values.length-1] };
    }
    
    // 顺子
    if (isStraight) {
      return { type: 'STRAIGHT', value: 50 + values[values.length-1] };
    }
    
    // 三张相同
    if (counts[0] === 3) {
      const threeValue = Object.keys(valueCounts).find(key => valueCounts[key] === 3);
      return { type: 'THREE_OF_A_KIND', value: 40 + parseInt(threeValue) };
    }
    
    // 两对
    if (counts[0] === 2 && counts[1] === 2) {
      const pairs = Object.keys(valueCounts).filter(key => valueCounts[key] === 2);
      const maxPair = Math.max(...pairs.map(Number));
      return { type: 'TWO_PAIR', value: 30 + maxPair };
    }
    
    // 一对
    if (counts[0] === 2) {
      const pairValue = Object.keys(valueCounts).find(key => valueCounts[key] === 2);
      return { type: 'ONE_PAIR', value: 20 + parseInt(pairValue) };
    }
    
    // 高牌
    return { type: 'HIGH_CARD', value: values[values.length-1] };
  },
  
  // 自动分牌算法
  arrangeCards(cards) {
    // 创建所有可能的牌组组合
    const combinations = this.generateCombinations(cards);
    
    let bestScore = -Infinity;
    let bestArrangement = null;
    
    // 评估所有可能的组合
    combinations.forEach(comb => {
      const frontScore = this.evaluateHand(comb.front).value;
      const middleScore = this.evaluateHand(comb.middle).value;
      const backScore = this.evaluateHand(comb.back).value;
      
      // 检查牌型是否合法（后墩 > 中墩 > 前墩）
      if (backScore >= middleScore || middleScore >= frontScore) {
        return;
      }
      
      const totalScore = frontScore + middleScore + backScore;
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestArrangement = comb;
      }
    });
    
    return bestArrangement || {
      front: cards.slice(0, 3),
      middle: cards.slice(3, 8),
      back: cards.slice(8, 13)
    };
  },
  
  // 生成所有可能的牌组组合
  generateCombinations(cards) {
    const combinations = [];
    
    // 生成前墩(3张)的所有组合
    const frontCombinations = this.getCombinations(cards, 3);
    
    frontCombinations.forEach(front => {
      const remaining = cards.filter(card => !front.includes(card));
      
      // 生成中墩(5张)的所有组合
      const middleCombinations = this.getCombinations(remaining, 5);
      
      middleCombinations.forEach(middle => {
        const back = remaining.filter(card => !middle.includes(card));
        
        combinations.push({
          front,
          middle,
          back
        });
      });
    });
    
    return combinations;
  },
  
  // 获取组合
  getCombinations(array, size) {
    const result = [];
    
    function combine(start, combo) {
      if (combo.length === size) {
        result.push([...combo]);
        return;
      }
      
      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    }
    
    combine(0, []);
    return result;
  }
};

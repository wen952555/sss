// frontend/src/utils/thirteenAi.js

// ... (保留之前的牌型常量和辅助函数) ...

// 智能分牌主函数
export function smartAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return fallbackArrangement(allCardsInput);
    }

    // 1. 准备阶段：克隆卡片并添加排序属性
    const cards = allCardsInput.map(card => ({
        ...card,
        rankValue: getRankValue(card.value),
        suitValue: card.suit
    }));

    // 2. 按点数降序排序
    cards.sort((a, b) => b.rankValue - a.rankValue);

    // 3. 生成强牌型候选（同花顺、铁支、葫芦）
    const strongCandidates = generateStrongHandCandidates(cards);
    
    // 4. 尝试所有候选组合
    let bestArrangement = null;
    let bestScore = -Infinity;
    
    for (const backHand of strongCandidates) {
        // 跳过无效候选
        if (backHand.length !== 5) continue;
        
        // 评估后墩
        const backEval = evaluateHandSimple(backHand);
        const remaining = cards.filter(c => !backHand.find(bc => bc.id === c.id));
        
        // 生成中墩候选
        const middleOptions = generateMiddleHandCandidates(remaining, backEval);
        
        for (const middleHand of middleOptions) {
            if (middleHand.length !== 5) continue;
            
            // 评估中墩
            const middleEval = evaluateHandSimple(middleHand);
            if (compareHandsFrontend(backEval, middleEval) < 0) continue;
            
            // 确定前墩
            const frontHand = remaining.filter(c => !middleHand.find(mc => mc.id === c.id));
            if (frontHand.length !== 3) continue;
            
            // 评估前墩
            const frontEval = evaluateHandSimple(frontHand);
            if (compareHandsFrontend(middleEval, frontEval) < 0) continue;
            
            // 计算总分
            const arrangementScore = calculateArrangementScore(backEval, middleEval, frontEval);
            
            // 更新最佳组合
            if (arrangementScore > bestScore) {
                bestScore = arrangementScore;
                bestArrangement = {
                    backHand: [...backHand],
                    middleHand: [...middleHand],
                    frontHand: [...frontHand]
                };
            }
        }
    }
    
    // 5. 返回最佳组合或回退方案
    if (bestArrangement) {
        console.log("AI智能分牌完成");
        return bestArrangement;
    }
    
    console.warn("AI智能分牌未找到理想解，使用回退方案");
    return fallbackArrangement(allCardsInput);
}

// 生成强牌型候选（后墩）
function generateStrongHandCandidates(cards) {
    const candidates = new Set();
    
    // 候选1：同花顺
    findStraightFlushes(cards).forEach(hand => {
        candidates.add(hand);
    });
    
    // 候选2：铁支（四张相同）
    findFourOfAKind(cards).forEach(hand => {
        candidates.add(hand);
    });
    
    // 候选3：葫芦（三带二）
    findFullHouses(cards).forEach(hand => {
        candidates.add(hand);
    });
    
    // 候选4：同花
    findFlushes(cards).forEach(hand => {
        candidates.add(hand);
    });
    
    // 候选5：顺子
    findStraights(cards).forEach(hand => {
        candidates.add(hand);
    });
    
    // 必选候选：最大5张牌（高牌）
    const highCardHand = cards.slice(0, 5);
    candidates.add(highCardHand);
    
    return Array.from(candidates);
}

// 生成中墩候选（确保≤后墩）
function generateMiddleHandCandidates(remainingCards, backEval) {
    const candidates = new Set();
    
    // 候选1：同类型但更弱的组合
    if (backEval.type_code > HAND_TYPE_HIGH_CARD) {
        findSimilarTypeHands(remainingCards, backEval.type_code).forEach(hand => {
            const eval = evaluateHandSimple(hand);
            if (compareHandsFrontend(eval, backEval) <= 0) {
                candidates.add(hand);
            }
        });
    }
    
    // 候选2：弱一级牌型
    if (backEval.type_code > HAND_TYPE_PAIR) {
        const weakerType = backEval.type_code - 1;
        findSimilarTypeHands(remainingCards, weakerType).forEach(hand => {
            candidates.add(hand);
        });
    }
    
    // 必选候选：剩余牌中最大的5张
    const sortedRemaining = [...remainingCards].sort((a, b) => b.rankValue - a.rankValue);
    candidates.add(sortedRemaining.slice(0, 5));
    
    return Array.from(candidates);
}

// 计算布局得分
function calculateArrangementScore(backEval, middleEval, frontEval) {
    // 牌型权重 + 牌力值
    return (
        backEval.rank * 1000000 + 
        middleEval.rank * 1000 + 
        frontEval.rank
    );
}

// --- 牌型检测函数 ---

// 查找同花顺
function findStraightFlushes(cards) {
    const suits = {};
    const results = [];
    
    // 按花色分组
    cards.forEach(card => {
        if (!suits[card.suitValue]) suits[card.suitValue] = [];
        suits[card.suitValue].push(card);
    });
    
    // 检查每个花色的顺子
    Object.values(suits).forEach(suitCards => {
        if (suitCards.length < 5) return;
        
        // 按点数排序
        suitCards.sort((a, b) => b.rankValue - a.rankValue);
        
        // 查找连续点数
        for (let i = 0; i <= suitCards.length - 5; i++) {
            const segment = suitCards.slice(i, i + 5);
            const isStraight = checkStraight(segment);
            if (isStraight) {
                results.push(segment);
            }
        }
    });
    
    return results;
}

// 查找铁支（四张相同）
function findFourOfAKind(cards) {
    const rankGroups = groupByRank(cards);
    const results = [];
    
    Object.values(rankGroups).forEach(group => {
        if (group.length === 4) {
            // 添加最大的单牌
            const kicker = cards.find(c => !group.includes(c));
            if (kicker) {
                results.push([...group, kicker]);
            }
        }
    });
    
    return results;
}

// 查找葫芦（三带二）
function findFullHouses(cards) {
    const rankGroups = groupByRank(cards);
    const trips = [];
    const pairs = [];
    
    // 收集三条和对子
    Object.values(rankGroups).forEach(group => {
        if (group.length >= 3) trips.push(group.slice(0, 3));
        if (group.length >= 2) pairs.push(group.slice(0, 2));
    });
    
    const results = [];
    
    // 组合葫芦
    trips.forEach(trip => {
        pairs.forEach(pair => {
            // 确保不是同一牌型
            if (trip[0].rankValue !== pair[0].rankValue) {
                results.push([...trip, ...pair]);
            }
        });
    });
    
    return results;
}

// 查找同花
function findFlushes(cards) {
    const suits = {};
    const results = [];
    
    // 按花色分组
    cards.forEach(card => {
        if (!suits[card.suitValue]) suits[card.suitValue] = [];
        suits[card.suitValue].push(card);
    });
    
    // 取每个花色最大的5张
    Object.values(suits).forEach(suitCards => {
        if (suitCards.length >= 5) {
            suitCards.sort((a, b) => b.rankValue - a.rankValue);
            results.push(suitCards.slice(0, 5));
        }
    });
    
    return results;
}

// 查找顺子
function findStraights(cards) {
    const uniqueRanks = [...new Set(cards.map(c => c.rankValue))].sort((a, b) => b - a);
    const results = [];
    
    // 检查连续序列
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        const segment = uniqueRanks.slice(i, i + 5);
        if (segment[0] - segment[4] === 4) {
            // 构建顺子组合
            const straightCards = [];
            segment.forEach(rank => {
                const card = cards.find(c => c.rankValue === rank);
                if (card) straightCards.push(card);
            });
            if (straightCards.length === 5) {
                results.push(straightCards);
            }
        }
    }
    
    return results;
}

// 查找同类型牌型
function findSimilarTypeHands(cards, targetType) {
    switch (targetType) {
        case HAND_TYPE_STRAIGHT_FLUSH:
            return findStraightFlushes(cards);
        case HAND_TYPE_FOUR_OF_A_KIND:
            return findFourOfAKind(cards);
        case HAND_TYPE_FULL_HOUSE:
            return findFullHouses(cards);
        case HAND_TYPE_FLUSH:
            return findFlushes(cards);
        case HAND_TYPE_STRAIGHT:
            return findStraights(cards);
        default:
            return [];
    }
}

// 辅助函数：按点数分组
function groupByRank(cards) {
    const groups = {};
    cards.forEach(card => {
        if (!groups[card.rankValue]) groups[card.rankValue] = [];
        groups[card.rankValue].push(card);
    });
    return groups;
}

// 辅助函数：检查顺子
function checkStraight(cards) {
    for (let i = 0; i < cards.length - 1; i++) {
        if (cards[i].rankValue - 1 !== cards[i + 1].rankValue) {
            return false;
        }
    }
    return true;
}

// 改进的回退方案
function fallbackArrangement(allCardsInput) {
    const cards = [...allCardsInput];
    cards.sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
    
    // 初始分组
    let backHand = cards.slice(0, 5);
    let middleHand = cards.slice(5, 10);
    let frontHand = cards.slice(10, 13);
    
    // 确保后墩≥中墩
    const backEval = evaluateHandSimple(backHand);
    const middleEval = evaluateHandSimple(middleHand);
    
    if (compareHandsFrontend(backEval, middleEval) < 0) {
        [backHand, middleHand] = [middleHand, backHand];
    }
    
    // 确保中墩≥前墩
    const newMiddleEval = evaluateHandSimple(middleHand);
    const frontEval = evaluateHandSimple(frontHand);
    
    if (compareHandsFrontend(newMiddleEval, frontEval) < 0) {
        // 合并中墩和前墩重新分配
        const merged = [...middleHand, ...frontHand];
        merged.sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
        
        // 尝试所有可能的5张组合
        const possibleMiddles = combinations(merged, 5);
        for (const mid of possibleMiddles) {
            const front = removeSelectedCards(merged, mid);
            const midEval = evaluateHandSimple(mid);
            const frontEvalNew = evaluateHandSimple(front);
            
            if (compareHandsFrontend(midEval, frontEvalNew) >= 0) {
                return {
                    backHand,
                    middleHand: mid,
                    frontHand: front
                };
            }
        }
    }
    
    return {
        backHand,
        middleHand,
        frontHand
    };
}

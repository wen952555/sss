/* frontend/src/utils.js */

// 将数字 (1-52) 转换为牌面名称 (e.g., d1, s13)
export function numToName(num) {
    const suit = ['d', 'c', 'h', 's'][Math.floor((num - 1) / 13)];
    const rank = ((num - 1) % 13) + 1;
    return `${suit}${rank}`;
}

// 将数字 (1-52) 转换为可读的牌名 (e.g., 方块A, 黑桃K)
export function cardToDisplayName(num) {
    const suits = {'d': '方块', 'c': '梅花', 'h': '红心', 's': '黑桃'};
    const ranks = {1: 'A', 11: 'J', 12: 'Q', 13: 'K'};
    
    const suitKey = ['d', 'c', 'h', 's'][Math.floor((num - 1) / 13)];
    const rankNum = ((num - 1) % 13) + 1;
    
    const rankName = ranks[rankNum] || rankNum;
    const suitName = suits[suitKey];
    
    return `${suitName}${rankName}`;
}

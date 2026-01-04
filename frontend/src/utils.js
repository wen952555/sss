/* frontend/src/utils.js */
export const numToName = (num) => {
    if (num === 53) return "red_joker";
    if (num === 54) return "black_joker";
    const suits = ["spades", "hearts", "clubs", "diamonds"];
    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"];
    const suit = suits[Math.floor((num - 1) / 13)];
    const val = values[(num - 1) % 13];
    return `${val}_of_${suit}`;
};

// 解析牌面数据用于校验
export const parseCard = (num) => ({
    val: ((num - 1) % 13) + 1,
    suit: Math.floor((num - 1) / 13)
});

// 简单的相公检查 (头<中<尾)
export const isIllegal = (head, mid, tail) => {
    // 实际项目中需调用后端同样的 evaluate 逻辑
    return false; // 占位
};

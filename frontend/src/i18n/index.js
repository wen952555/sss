// frontend/src/i18n/index.js
const translations = {
  en: {
    "正在准备游戏...": "Preparing game...",
    "请您调整牌型": "Please arrange your hand",
    "查看结果": "View results",
    "进行中...": "In progress...",
    "墩牌不合法!": "Invalid arrangement!",
    "总牌数需13张,当前%s张": "Total cards must be 13, currently %s",
    "墩牌数量错误": "Incorrect number of cards in a dun",
    "AI未能给出建议。": "AI could not provide a suggestion.",
    "请稍候，应用正在加载...": "Please wait, the application is loading...",
    "多人游戏大厅": "Multiplayer Lobby",
    "当前用户: %s (ID: %s)": "Current user: %s (ID: %s)",
    "快速开始 (自动匹配/创建)": "Quick Start (Auto-match/create)",
    "返回单人游戏": "Back to Single Player",
    "正在准备游戏界面... (%s)": "Preparing game interface... (%s)",
    "比牌结束! 各玩家得分已更新。": "Comparison finished! Player scores have been updated.",
    "等待玩家...": "Waiting for players...",
    "%s 胜": "%s wins",
    "平": "Draw",
  },
  zh: {
    "正在准备游戏...": "正在准备游戏...",
    "请您调整牌型": "请您调整牌型",
    "查看结果": "查看结果",
    "进行中...": "进行中...",
    "墩牌不合法!": "墩牌不合法!",
    "总牌数需13张,当前%s张": "总牌数需13张,当前%s张",
    "墩牌数量错误": "墩牌数量错误",
    "AI未能给出建议。": "AI未能给出建议。",
    "请稍候，应用正在加载...": "请稍候，应用正在加载...",
    "多人游戏大厅": "多人游戏大厅",
    "当前用户: %s (ID: %s)": "当前用户: %s (ID: %s)",
    "快速开始 (自动匹配/创建)": "快速开始 (自动匹配/创建)",
    "返回单人游戏": "返回单人游戏",
    "正在准备游戏界面... (%s)": "正在准备游戏界面... (%s)",
    "比牌结束! 各玩家得分已更新。": "比牌结束! 各玩家得分已更新。",
    "等待玩家...": "等待玩家...",
    "%s 胜": "%s 胜",
    "平": "平",
  }
};

let currentLanguage = "zh";

export const setLanguage = (lang) => {
  currentLanguage = lang;
};

export const t = (key, ...args) => {
  const translation = translations[currentLanguage]?.[key] || key;
  if (args.length > 0) {
    return translation.replace(/%s/g, () => args.shift());
  }
  return translation;
};

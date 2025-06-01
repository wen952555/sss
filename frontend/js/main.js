// 主逻辑模块
import { displayPlayerHand, showGameMessage, toggleButton } from './ui.js';
import { fetchDealCards, fetchSortHand } from './api.js'; // 引入 fetchSortHand
import { getCardSortValue } from './card.js'; // 引入排序函数

const dealCardsBtn = document.getElementById('dealCardsBtn');
const sortHandBtn = document.getElementById('sortHandBtn'); // 获取理牌按钮

let currentPlayerHand = []; // 用于存储当前手牌

async function handleDealCards() {
    showGameMessage("正在发牌...", "info");
    dealCardsBtn.disabled = true;
    try {
        const cards = await fetchDealCards();
        currentPlayerHand = cards; // 保存手牌
        displayPlayerHand(cards);
        showGameMessage("发牌完成！请理牌。", "success");
        toggleButton('sortHandBtn', true); // 显示理牌按钮
    } catch (error) {
        showGameMessage(`错误: ${error.message}`, "error");
        console.error(error);
    } finally {
        dealCardsBtn.disabled = false;
    }
}

// 前端理牌函数 (示例)
function sortHandClientSide(hand) {
    // 复制一份进行排序，避免修改原数组 (如果currentPlayerHand需要保持原始顺序)
    const handToSort = [...hand];
    handToSort.sort((a, b) => {
        return getCardSortValue(b) - getCardSortValue(a); // 降序排列 (大牌在前)
    });
    return handToSort;
}


async function handleSortHand() {
    if (currentPlayerHand.length === 0) {
        showGameMessage("请先发牌。", "info");
        return;
    }

    showGameMessage("正在理牌...", "info");
    sortHandBtn.disabled = true;

    // 方案一：前端理牌 (如果后端没有实现理牌接口)
    const sortedHand = sortHandClientSide(currentPlayerHand);
    currentPlayerHand = sortedHand; // 更新当前手牌为已排序
    displayPlayerHand(sortedHand);
    showGameMessage("理牌完成 (前端处理)！", "success");
    sortHandBtn.disabled = false;


    // 方案二：后端理牌 (如果后端实现了 sort_hand.php 接口)
    /*
    try {
        const sortedHand = await fetchSortHand(currentPlayerHand);
        currentPlayerHand = sortedHand; // 更新当前手牌
        displayPlayerHand(sortedHand);
        showGameMessage("理牌完成 (后端处理)！", "success");
    } catch (error) {
        showGameMessage(`理牌错误: ${error.message}`, "error");
        console.error(error);
    } finally {
        sortHandBtn.disabled = false;
    }
    */
}


// 初始化
function init() {
    dealCardsBtn.addEventListener('click', handleDealCards);
    sortHandBtn.addEventListener('click', handleSortHand); // 添加理牌按钮事件监听

    displayPlayerHand([]); // 初始显示空手牌
    showGameMessage("欢迎来到十三水游戏！点击发牌开始。", "info");
    toggleButton('sortHandBtn', false); // 初始隐藏理牌按钮
}

// DOM 加载完成后执行初始化
document.addEventListener('DOMContentLoaded', init);

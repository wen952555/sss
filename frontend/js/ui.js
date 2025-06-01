// UI 更新模块
import { createCardImageElement } from './card.js';

const handCardsContainer = document.getElementById('handCards');
const gameMessagesDiv = document.getElementById('gameMessages');

/**
 * 在玩家手牌区域显示卡牌
 * @param {Array<object>} cards - 卡牌对象数组，每个对象包含 rank 和 suit
 */
export function displayPlayerHand(cards) {
    handCardsContainer.innerHTML = ''; // 清空现有卡牌
    if (cards && cards.length > 0) {
        cards.forEach(card => {
            const cardElement = createCardImageElement(card);
            handCardsContainer.appendChild(cardElement);
        });
    } else {
        handCardsContainer.textContent = '等待发牌...';
    }
}

/**
 * 显示游戏消息
 * @param {string} message - 要显示的消息
 * @param {string} type - 'info', 'error', 'success' (可选, 用于样式)
 */
export function showGameMessage(message, type = 'info') {
    gameMessagesDiv.textContent = message;
    gameMessagesDiv.className = `message-area ${type}`; // 可根据 type 添加不同样式
}

/**
 * 控制按钮的显示/隐藏
 * @param {string} buttonId - 按钮的 ID
 * @param {boolean} show - true 显示, false 隐藏
 */
export function toggleButton(buttonId, show) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.style.display = show ? 'inline-block' : 'none';
    }
}

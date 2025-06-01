// frontend/js/ui.js
import { createCardImageElement } from './card.js'; // 仍然需要它来创建图片

// const handCardsContainer = document.getElementById('handCards'); // 已移除
const simpleMessageFooter = document.getElementById('simpleMessage');

/**
 * 显示简短的游戏消息在底部
 * @param {string} message - 要显示的消息
 * @param {string} type - 'info', 'error', 'success', 'warning' (可选, 用于样式, 但这里简化不处理)
 */
export function showGameMessage(message, type = 'info') {
    if (simpleMessageFooter) {
        simpleMessageFooter.textContent = message;
        // 可以根据type改变颜色，但保持简单
        simpleMessageFooter.className = `simple-message-footer ${type}`; // 如果需要特定样式
    } else {
        console.log("UI Message:", message, `(${type})`); // 降级处理
    }
}

/**
 * 控制按钮的显示/隐藏和禁用/启用状态
 * @param {string} buttonId - 按钮的 ID
 * @param {object} options - { show?: boolean, enable?: boolean }
 */
export function configureButton(buttonId, { show, enable }) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (typeof show === 'boolean') {
            button.style.display = show ? 'inline-block' : 'none';
        }
        if (typeof enable === 'boolean') {
            button.disabled = !enable;
        }
    }
}

// createCardImageElement 依然由 card.js 导出，这里不需要重复定义
// displayPlayerHand 函数不再需要，它的功能由 arrange.js 的 renderUnassignedCards 替代

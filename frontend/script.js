// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('dealButton');
    const frontHandDiv = document.getElementById('frontHand');
    const playerHandOrMiddleDeckDiv = document.getElementById('playerHandOrMiddleDeck');
    // middleOrHandTitle 和 middleDeckLabel 现在是 playerHandOrMiddleDeckDiv 的子元素
    const backHandDiv = document.getElementById('backHand');
    
    let activeDropZones = [frontHandDiv, backHandDiv]; 
    const messageArea = document.getElementById('messageArea');
    const submitArrangementButton = document.getElementById('submitArrangement');

    const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; 
    const CARD_IMAGE_BASE_PATH = './cards/';

    let currentHandRaw = [];
    let draggedCard = null;
    let draggedCardData = null;
    let isMiddleDeckActive = false;

    const HAND_TYPES = { /* ... (与之前相同) ... */ };
    const SUIT_VALUES = { /* ... (与之前相同) ... */ };

    dealButton.addEventListener('click', fetchNewHand);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement);

    async function fetchNewHand() {
        messageArea.textContent = '正在发牌...';
        // ... (其他重置) ...
        isMiddleDeckActive = false; 

        // 清空所有牌区，并确保标签存在 (更稳妥的方式)
        const recreateLabelsInZone = (zone, mainLabelHTML, secondaryLabelHTML = '') => {
            zone.innerHTML = mainLabelHTML + secondaryLabelHTML;
        };

        recreateLabelsInZone(frontHandDiv, '<h3 class="deck-label">头墩 (3张)</h3>');
        recreateLabelsInZone(playerHandOrMiddleDeckDiv, 
            `<h2 id="middle-or-hand-title" class="deck-label">我的手牌 (<span id="card-count">0</span>/13)</h2>`,
            `<h3 id="middleDeckLabel" class="deck-label" style="display: none;">中墩 (5张)</h3>`
        );
        recreateLabelsInZone(backHandDiv, '<h3 class="deck-label">尾墩 (5张)</h3>');
        
        playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active'); 
        
        const initialHandTitle = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const initialMiddleLbl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');
        if(initialHandTitle) initialHandTitle.style.display = 'block';
        if(initialMiddleLbl) initialMiddleLbl.style.display = 'none';

        try {
            const response = await fetch(BACKEND_API_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (!data || !Array.isArray(data.hand)) { // 检查后端返回的数据结构
                console.error('后端返回的手牌数据无效:', data);
                throw new Error('后端返回的手牌数据无效');
            }
            currentHandRaw = data.hand;
            currentHandRaw.forEach(card => { // 确保card是对象
                if (card && typeof card === 'object') {
                    if (card.value === undefined) card.value = getCardValue(card.rank);
                    if (card.suitValue === undefined) card.suitValue = getSuitValue(card.suit);
                } else {
                    console.warn('手牌数据中存在无效的卡牌项:', card);
                }
            });
            // 过滤掉可能存在的无效卡牌项
            const validHand = currentHandRaw.filter(card => card && typeof card === 'object' && card.rank && card.suit);
            displayInitialHand(validHand); 

            messageArea.textContent = '发牌完成！请将手牌拖拽到头墩或尾墩。';
            messageArea.className = 'success';
        } catch (error) {
            console.error('获取手牌失败:', error); // 打印详细错误到控制台
            messageArea.textContent = `获取手牌失败: ${error.message}. 请查看控制台获取更多信息。`;
            messageArea.className = 'error';
        } finally {
            dealButton.disabled = false;
            updateCardCountAndCheckCompletion(); 
        }
    }
    
    function getSuitValue(suit) { /* ... (与之前相同) ... */ }

    function displayInitialHand(hand) { // hand 现在应该是过滤后的有效手牌数组
        // 先确保标签存在且正确
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');

        // 清空除了标签以外的卡牌
        Array.from(playerHandOrMiddleDeckDiv.children).forEach(child => {
            if (child !== handTitleEl && child !== middleLabelEl) {
                playerHandOrMiddleDeckDiv.removeChild(child);
            }
        });
        
        const sortedHand = [...hand].sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return b.suitValue - a.suitValue; 
        });

        console.log("Sorted hand to display:", sortedHand); // 调试：查看排序后的手牌

        sortedHand.forEach((cardData, index) => {
            console.log(`Processing card ${index}:`, cardData); // 调试：查看当前处理的卡牌数据
            if (!cardData || typeof cardData.rank === 'undefined' || typeof cardData.suit === 'undefined') {
                console.error('无效的 cardData 在 sortedHand 中:', cardData, '索引:', index);
                return; // 跳过无效的卡牌数据
            }
            const cardElement = createCardElement(cardData, true); 
            
            // 在 appendChild 之前添加检查和日志
            if (cardElement instanceof Node) {
                console.log(`Appending card ${index}:`, cardElement);
                playerHandOrMiddleDeckDiv.appendChild(cardElement); 
            } else {
                console.error(`创建的 cardElement 在索引 ${index} 处不是有效的 Node:`, cardElement, '原始 cardData:', cardData);
            }
        });
        updateCardCountAndCheckCompletion(); 
    }

    function createCardElement(cardData, draggable = true) {
        const img = document.createElement('img');
        // 基本的保护，防止 cardData 为 null 或 undefined
        if (!cardData) {
            console.error("createCardElement 接收到无效的 cardData", cardData);
            img.alt = "无效卡牌"; // 提供一个备用alt
            // 你可以选择返回一个占位符图像或一个空的img，但它仍然是一个Node
            return img; 
        }

        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file || 'placeholder.svg'}`; // 如果 image_file 未定义，使用占位符
        img.alt = `${cardData.rank || 'N/A'} of ${cardData.suit || 'N/A'} (V:${cardData.value} S:${cardData.suitValue})`;
        img.classList.add('card');
        img.dataset.cardId = cardData.card_id || `invalid-card-${Date.now()}`;
        img.cardData = cardData; // 即使cardData不完整，也附加它以便调试
        
        if (draggable && !isMiddleDeckActive) { 
            img.draggable = true;
            // ... (拖拽事件监听) ...
        } else {
            img.draggable = false; 
        }
        return img;
    }
    
    // ... (addDropZoneListeners, updateCardCountAndCheckCompletion, handleSubmitArrangement, 牌型逻辑函数等与之前基本相同) ...
    // 确保在这些函数中，凡是操作DOM元素（特别是通过 querySelector 获取的）之前，都最好检查一下元素是否存在。

    // 例如，在 updateCardCountAndCheckCompletion:
    function updateCardCountAndCheckCompletion() {
        const countCardsInZone = (zone) => Array.from(zone.children).filter(el => el.classList.contains('card')).length;

        const frontCount = countCardsInZone(frontHandDiv);
        const backCount = countCardsInZone(backHandDiv);
        const handCardsCount = countCardsInZone(playerHandOrMiddleDeckDiv); 
        
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');

        // 添加存在性检查
        if (!handTitleEl || !middleLabelEl) {
            console.warn("updateCardCountAndCheckCompletion: 无法找到手牌区或中墩区的标签元素。");
            // 可以考虑在这里重新初始化标签，或者至少避免后续操作导致错误
        }

        if (!isMiddleDeckActive) {
            if (handTitleEl) { /* ... */ }
            if (middleLabelEl) { /* ... */ }
        } else { /* ... */ }
        // ... (后续逻辑相同) ...
    }
    
    // 确保其他函数中的DOM操作也类似地安全
    
    updateCardCountAndCheckCompletion(); // 初始调用
});

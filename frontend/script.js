// frontend/script.js (Card Interaction Logic)
console.log("script.js: INTERACTION_DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: INTERACTION_DEBUG - DOMContentLoaded 事件已触发。");

    // --- DOM 元素获取 ---
    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const submitButton = document.getElementById('submitButton');
    const resetArrangementButton = document.getElementById('resetArrangementButton'); // 新按钮
    const playerHandDiv = document.getElementById('player-hand');
    const handCardCountSpan = document.getElementById('hand-card-count');

    const arrangementZones = { // 存储每个牌道的容器和计数span
        head: { div: document.getElementById('arranged-head'), countSpan: document.querySelector('.arranged-count[data-lane="head"]'), typeDisplay: document.getElementById('head-type-display') },
        middle: { div: document.getElementById('arranged-middle'), countSpan: document.querySelector('.arranged-count[data-lane="middle"]'), typeDisplay: document.getElementById('middle-type-display') },
        tail: { div: document.getElementById('arranged-tail'), countSpan: document.querySelector('.arranged-count[data-lane="tail"]'), typeDisplay: document.getElementById('tail-type-display') }
    };

    // 基本的元素检查
    if (!messageArea || !dealButton || !submitButton || !resetArrangementButton || !playerHandDiv || !handCardCountSpan ||
        !arrangementZones.head.div || !arrangementZones.middle.div || !arrangementZones.tail.div ||
        !arrangementZones.head.countSpan || !arrangementZones.middle.countSpan || !arrangementZones.tail.countSpan) {
        console.error("script.js: INTERACTION_FATAL - 一个或多个必需的DOM元素未找到。请检查HTML的ID和类名。");
        if (messageArea) messageArea.textContent = "页面初始化错误：关键元素缺失！";
        return;
    }
    messageArea.textContent = "请点击“发牌”按钮。";

    // --- 配置获取 ---
    if (typeof CONFIG === 'undefined' || !CONFIG || typeof CONFIG.API_BASE_URL !== 'string' || !CONFIG.API_BASE_URL.trim() || typeof CONFIG.IMAGE_SERVER_BASE_URL !== 'string' || !CONFIG.IMAGE_SERVER_BASE_URL.trim()) {
        console.error("script.js: INTERACTION_FATAL - CONFIG对象或其关键URL无效。", CONFIG);
        messageArea.textContent = "前端配置错误！"; dealButton.disabled = true; return;
    }
    const API_BASE_URL = CONFIG.API_BASE_URL;
    const IMAGE_SERVER_BASE_URL = CONFIG.IMAGE_SERVER_BASE_URL;
    console.log("script.js: INTERACTION_DEBUG - 配置加载: API_URL=", API_BASE_URL, "IMAGE_URL=", IMAGE_SERVER_BASE_URL);

    let originalHandData = []; // 存储从后端获取的原始13张牌数据
    let currentHandElements = {}; // 对象，键是card.id, 值是对应的DOM元素，用于在手牌区管理
    let arrangedCardsData = { head: [], middle: [], tail: [] }; // 存储每个牌道中的卡牌数据对象
    let selectedCardElement = null; // 当前从手牌区选中的卡牌DOM元素

    // --- 卡牌图片路径转换 (与上一版相同) ---
    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') return IMAGE_SERVER_BASE_URL + "placeholder_error.png";
        const s = String(card.suit).toLowerCase(), r = String(card.rank).toLowerCase();
        const rankName = {'a':'ace','k':'king','q':'queen','j':'jack','t':'10'}[r] || r;
        return `${IMAGE_SERVER_BASE_URL}${s}_${rankName}.png`;
    }

    // --- 渲染单张卡牌 (增加点击事件) ---
    function renderCardElement(cardData, isInHand = true) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.dataset.id = cardData.id; // 使用后端或发牌时生成的唯一ID
        cardDiv.dataset.suit = cardData.suit;
        cardDiv.dataset.rank = cardData.rank;

        const imagePath = getCardImagePath(cardData);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;
        const cardText = `${cardData.rank.toUpperCase()}${cardData.suit.toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText; cardDiv.style.color = 'transparent';

        const imgTest = new Image(); imgTest.src = imagePath;
        imgTest.onload = () => { /* console.log(`Img loaded: ${imagePath}`); */ };
        imgTest.onerror = () => { console.warn(`Img fail: ${imagePath}.`); cardDiv.style.backgroundImage = 'none'; cardDiv.style.color = 'black'; };

        if (isInHand) {
            cardDiv.addEventListener('click', handleHandCardClick);
        } else {
            cardDiv.addEventListener('click', handleArrangedCardClick);
        }
        return cardDiv;
    }

    // --- 点击手牌区的牌 ---
    function handleHandCardClick(event) {
        const clickedCard = event.currentTarget;
        if (selectedCardElement === clickedCard) { // 再次点击同一张牌，取消选择
            selectedCardElement.classList.remove('selected-from-hand');
            selectedCardElement = null;
            Object.values(arrangementZones).forEach(zone => zone.div.classList.remove('can-drop'));
            messageArea.textContent = "已取消选择。";
        } else {
            if (selectedCardElement) { // 如果已选中其他牌，先取消其他牌的选择
                selectedCardElement.classList.remove('selected-from-hand');
            }
            selectedCardElement = clickedCard;
            selectedCardElement.classList.add('selected-from-hand');
            Object.values(arrangementZones).forEach(zone => { // 高亮可以放牌的区域
                const lane = zone.div.dataset.lane;
                const maxCards = parseInt(zone.div.dataset.maxCards, 10);
                if (arrangedCardsData[lane].length < maxCards) {
                    zone.div.classList.add('can-drop');
                } else {
                    zone.div.classList.remove('can-drop');
                }
            });
            messageArea.textContent = `已选择 ${selectedCardElement.dataset.rank}${selectedCardElement.dataset.suit}。请点击目标牌道放置。`;
        }
    }

    // --- 点击已摆放的牌 (将其移回手牌区) ---
    function handleArrangedCardClick(event) {
        if (selectedCardElement) { // 如果手牌区有牌被选中，不处理这里的点击，避免误操作
            messageArea.textContent = "请先将选中的手牌放置或取消选择。";
            return;
        }
        const clickedArrangedCard = event.currentTarget;
        const cardId = clickedArrangedCard.dataset.id;
        const sourceLane = clickedArrangedCard.parentElement.dataset.lane;

        // 从 arrangedCardsData 中移除
        const cardIndex = arrangedCardsData[sourceLane].findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
            const cardData = arrangedCardsData[sourceLane].splice(cardIndex, 1)[0];
            // 在手牌区重新创建并显示它
            const newHandCardElement = renderCardElement(cardData, true);
            playerHandDiv.appendChild(newHandCardElement);
            currentHandElements[cardData.id] = newHandCardElement; // 加回到手牌元素管理
            // 从原牌道DOM中移除
            clickedArrangedCard.parentElement.removeChild(clickedArrangedCard);
            updateCountsAndStates();
            messageArea.textContent = `已将 ${cardData.rank}${cardData.suit} 移回手牌区。`;
        }
    }

    // --- 点击摆牌区 (放置选中的手牌) ---
    Object.values(arrangementZones).forEach(zoneData => {
        zoneData.div.addEventListener('click', function() { // 使用function声明以正确处理this（虽然这里没用）
            const targetLaneDiv = this; // this 是被点击的 drop-zone div
            const lane = targetLaneDiv.dataset.lane;
            const maxCards = parseInt(targetLaneDiv.dataset.maxCards, 10);

            if (selectedCardElement && arrangedCardsData[lane].length < maxCards) {
                const cardId = selectedCardElement.dataset.id;
                // 从 originalHandData 找到这张牌的完整数据
                const cardDataToMove = originalHandData.find(c => c.id === cardId);

                if (cardDataToMove) {
                    // 1. 从手牌区DOM移除选中的牌，并从 currentHandElements 中移除
                    selectedCardElement.removeEventListener('click', handleHandCardClick); // 移除旧监听器
                    playerHandDiv.removeChild(selectedCardElement);
                    delete currentHandElements[cardId];

                    // 2. 创建新的不可交互的牌元素（或可交互用于移回）放入目标牌道
                    const newArrangedCardElement = renderCardElement(cardDataToMove, false); // false表示不可从手牌区选中
                    targetLaneDiv.appendChild(newArrangedCardElement);

                    // 3. 更新数据结构
                    arrangedCardsData[lane].push(cardDataToMove);

                    // 4. 清理选中状态
                    selectedCardElement.classList.remove('selected-from-hand');
                    selectedCardElement = null;
                    Object.values(arrangementZones).forEach(z => z.div.classList.remove('can-drop'));
                    messageArea.textContent = `${cardDataToMove.rank}${cardDataToMove.suit} 已放入${lane}道。`;
                    updateCountsAndStates();
                }
            } else if (selectedCardElement && arrangedCardsData[lane].length >= maxCards) {
                messageArea.textContent = `${lane}道已满！`;
            } else if (!selectedCardElement) {
                // messageArea.textContent = "请先从手牌区选择一张牌。"; // 如果没选牌，点击摆牌区不提示，避免干扰移回操作
            }
        });
    });

    // --- 更新手牌数和牌道牌数显示，以及按钮状态 ---
    function updateCountsAndStates() {
        let handCount = Object.keys(currentHandElements).length;
        handCardCountSpan.textContent = handCount;

        let totalArranged = 0;
        for (const lane in arrangementZones) {
            const count = arrangedCardsData[lane].length;
            arrangementZones[lane].countSpan.textContent = count;
            totalArranged += count;
        }

        // 启用/禁用按钮
        resetArrangementButton.disabled = totalArranged === 0;
        submitButton.disabled = !(handCount === 0 && totalArranged === 13);

        // 如果牌道满了，移除 can-drop 类
        Object.values(arrangementZones).forEach(zone => {
            const lane = zone.div.dataset.lane;
            const maxCards = parseInt(zone.div.dataset.maxCards, 10);
            if (arrangedCardsData[lane].length >= maxCards) {
                zone.div.classList.remove('can-drop');
            } else if (selectedCardElement) { // 如果有牌选中且牌道未满，可以高亮
                 zone.div.classList.add('can-drop');
            }
        });
    }

    // --- (重置整个牌局的函数，后续实现) ---
    function resetGame() {
        console.log("script.js: INTERACTION_DEBUG - resetGame() 被调用。");
        originalHandData = [];
        currentHandElements = {};
        arrangedCardsData = { head: [], middle: [], tail: [] };
        playerHandDiv.innerHTML = '';
        Object.values(arrangementZones).forEach(zone => {
            zone.div.innerHTML = '';
            zone.typeDisplay.textContent = '';
        });
        selectedCardElement = null;
        if(messageArea) messageArea.textContent = "请点击“发牌”开始新牌局。";
        dealButton.disabled = false;
        updateCountsAndStates();
    }

    // --- 重置当前摆牌（牌回到手牌区） ---
    resetArrangementButton.addEventListener('click', () => {
        console.log("script.js: INTERACTION_DEBUG - 重置摆牌按钮被点击。");
        playerHandDiv.innerHTML = ''; // 清空手牌区，重新渲染
        currentHandElements = {};   // 清空手牌元素管理

        // 将所有已摆放的牌数据移回原始手牌数据 (注意：我们从originalHandData取数据，所以只需清空arranged)
        // 并重新渲染所有原始手牌
        originalHandData.forEach(cardData => {
            const cardElement = renderCardElement(cardData, true);
            playerHandDiv.appendChild(cardElement);
            currentHandElements[cardData.id] = cardElement;
        });

        arrangedCardsData = { head: [], middle: [], tail: [] }; // 清空摆牌数据
        Object.values(arrangementZones).forEach(zone => { // 清空摆牌区DOM
            zone.div.innerHTML = '';
            zone.typeDisplay.textContent = ''; // 清空牌型提示
        });

        if (selectedCardElement) {
            selectedCardElement.classList.remove('selected-from-hand');
            selectedCardElement = null;
        }
        Object.values(arrangementZones).forEach(z => z.div.classList.remove('can-drop'));
        messageArea.textContent = "所有牌已移回手牌区。";
        updateCountsAndStates();
    });


    // --- 发牌按钮事件监听器 (与上一版基本一致，但调用新的resetGame) ---
    dealButton.addEventListener('click', async () => {
        console.log("script.js: INTERACTION_DEBUG - 发牌按钮被点击！");
        resetGame(); // 发新牌前先重置整个牌局
        dealButton.disabled = true;
        if (messageArea) messageArea.textContent = "正在从服务器获取新手牌...";

        const endpoint = 'deal_cards.php';
        const fullApiUrl = `${API_BASE_URL}/${endpoint}`;
        try {
            // (fetchFromServer 函数与上一版基本一致，这里直接使用)
            const response = await fetch(fullApiUrl);
            if (!response.ok) {
                let errDetail = `Status: ${response.status}`; try { errDetail = await response.text(); } catch(e){}
                throw new Error(`API请求失败! ${errDetail.substring(0,100)}`);
            }
            const data = await response.json();

            if (data && data.success === true && data.hand && Array.isArray(data.hand)) {
                if (messageArea) messageArea.textContent = data.message || "新手牌已获取，请摆牌！";
                originalHandData = data.hand.map((card, index) => ({ // 存储原始手牌数据，并确保有ID
                    ...card,
                    id: card.id || `card-${Date.now()}-${index}`
                }));
                console.log("script.js: INTERACTION_DEBUG - 原始手牌数据已存储:", originalHandData);
                // 初始化手牌显示
                originalHandData.forEach(cardData => {
                    const cardElement = renderCardElement(cardData, true);
                    playerHandDiv.appendChild(cardElement);
                    currentHandElements[cardData.id] = cardElement;
                });
            } else {
                const errorMsg = (data && data.message) ? data.message : "获取手牌数据格式不正确。";
                console.error("script.js: INTERACTION_ERROR - ", errorMsg, data);
                if (messageArea) messageArea.textContent = errorMsg;
            }
        } catch (error) {
            console.error("script.js: INTERACTION_ERROR - 发牌操作错误:", error);
            if (messageArea) messageArea.textContent = `发牌请求错误: ${String(error.message).substring(0,100)}`;
        } finally {
            dealButton.disabled = false; // 允许再次发牌（如果需要）
            updateCountsAndStates(); // 更新所有计数和按钮状态
            console.log("script.js: INTERACTION_DEBUG - 发牌事件处理结束。");
        }
    });

    // 初始化按钮状态
    updateCountsAndStates();
    console.log("script.js: INTERACTION_DEBUG - 初始化完成。");
});
console.log("script.js: INTERACTION_DEBUG - 文件加载结束。");

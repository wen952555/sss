// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const playerHandDiv = document.getElementById('player-hand');
    const arrangedHeadDiv = document.getElementById('arranged-head');
    const arrangedMiddleDiv = document.getElementById('arranged-middle');
    const arrangedTailDiv = document.getElementById('arranged-tail');
    const dealButton = document.getElementById('dealButton');
    const submitButton = document.getElementById('submitButton');
    const resetButton = document.getElementById('resetButton');
    const messageArea = document.getElementById('message-area');

    const arrangementZones = {
        head: arrangedHeadDiv,
        middle: arrangedMiddleDiv,
        tail: arrangedTailDiv
    };

    let currentHand = []; // 存放从后端获取的13张牌的对象数组 {suit, rank, id}
    let arrangedCards = { head: [], middle: [], tail: [] }; // 存放已摆放牌的对象数组
    let draggedCard = null; // 当前拖动的卡牌元素
    let selectedCardForPlacement = null; // 当前通过点击选择的卡牌元素

    // --- 卡牌图片路径转换 ---
    function getCardImagePath(card) {
        // card: { suit: 'spades', rank: 'A' }
        // 图片命名: spades_ace.svg, clubs_10.svg
        const suitName = card.suit.toLowerCase();
        let rankName = card.rank.toLowerCase();

        if (rankName === 'a') rankName = 'ace';
        else if (rankName === 'k') rankName = 'king';
        else if (rankName === 'q') rankName = 'queen';
        else if (rankName === 'j') rankName = 'jack';
        else if (rankName === 't') rankName = '10'; // 后端传T，前端用10

        return `${CONFIG.CARD_IMAGE_PATH}${suitName}_${rankName}.svg`;
    }

    // --- 渲染卡牌 ---
    function renderCard(cardData, isDraggable = true) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.dataset.id = cardData.id; // 使用后端或前端生成的唯一ID
        cardDiv.dataset.suit = cardData.suit;
        cardDiv.dataset.rank = cardData.rank;

        // 设置背景图片
        const imagePath = getCardImagePath(cardData);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;
        // 如果图片加载失败，显示文字作为后备
        cardDiv.textContent = `${cardData.rank}${cardData.suit.charAt(0).toUpperCase()}`; // e.g., AH, KS
        cardDiv.style.color = 'transparent'; // 使文字透明，优先显示背景图

        if (isDraggable) {
            cardDiv.draggable = true;
            cardDiv.addEventListener('dragstart', handleDragStart);
            cardDiv.addEventListener('dragend', handleDragEnd);
            cardDiv.addEventListener('click', handleCardClickInHand);
        } else {
            // 已摆放的牌可以点击移回手牌区
            cardDiv.addEventListener('click', handlePlacedCardClick);
        }
        return cardDiv;
    }

    // --- 显示手牌 ---
    function displayHand() {
        playerHandDiv.innerHTML = '';
        currentHand.forEach(card => {
            if (!isCardArranged(card.id)) { // 只显示未摆放的牌
                const cardElement = renderCard(card, true);
                playerHandDiv.appendChild(cardElement);
            }
        });
        updateButtonStates();
    }

    // --- 更新按钮状态 ---
    function updateButtonStates() {
        const totalArrangedCount = arrangedCards.head.length + arrangedCards.middle.length + arrangedCards.tail.length;
        submitButton.disabled = totalArrangedCount !== 13;
        resetButton.disabled = totalArrangedCount === 0 && currentHand.length === 0; // 或其他逻辑
        dealButton.disabled = currentHand.length > 0 && totalArrangedCount < 13; // 发牌后，未完成摆牌前禁用
    }

    // --- 卡牌拖放事件处理 ---
    function handleDragStart(e) {
        draggedCard = e.target;
        e.dataTransfer.setData('text/plain', draggedCard.dataset.id);
        setTimeout(() => draggedCard.classList.add('dragging'), 0);
    }

    function handleDragEnd() {
        if (draggedCard) {
            draggedCard.classList.remove('dragging');
        }
        draggedCard = null;
    }

    // --- 放置区域事件处理 ---
    Object.values(arrangementZones).forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
        zone.addEventListener('click', handleDropZoneClick); // 点击区域放置
    });

    function handleDragOver(e) {
        e.preventDefault();
        const zone = e.currentTarget;
        const lane = zone.dataset.lane;
        const maxSize = parseInt(zone.dataset.size, 10);
        if (arrangedCards[lane].length < maxSize) {
            zone.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        const zone = e.currentTarget;
        zone.classList.remove('drag-over');
        const cardId = e.dataTransfer.getData('text/plain');
        const cardData = findCardById(currentHand, cardId) || findCardInArrangement(cardId);

        if (cardData && draggedCard) { // 确保拖动的是有效卡牌
            moveCardToZone(cardData, zone, draggedCard.parentElement === playerHandDiv ? playerHandDiv : arrangementZones[findLaneOfCard(cardId)]);
            draggedCard = null; // 清除拖动状态
        }
    }
    
    // --- 通过点击选择和放置卡牌 ---
    function handleCardClickInHand(e) {
        const clickedCardElement = e.currentTarget;
        if (selectedCardForPlacement === clickedCardElement) {
            //再次点击同一张牌，取消选择
            selectedCardForPlacement.classList.remove('selected-for-placement');
            selectedCardForPlacement = null;
            messageArea.textContent = "已取消选择。";
        } else {
            if (selectedCardForPlacement) {
                selectedCardForPlacement.classList.remove('selected-for-placement');
            }
            selectedCardForPlacement = clickedCardElement;
            selectedCardForPlacement.classList.add('selected-for-placement');
            messageArea.textContent = `已选择 ${selectedCardForPlacement.dataset.rank}${selectedCardForPlacement.dataset.suit.charAt(0)}. 请点击目标牌道放置。`;
        }
    }

    function handleDropZoneClick(e) {
        const zone = e.currentTarget;
        if (selectedCardForPlacement) {
            const cardId = selectedCardForPlacement.dataset.id;
            const cardData = findCardById(currentHand, cardId); // 确保从手牌中拿
            if (cardData) {
                 moveCardToZone(cardData, zone, playerHandDiv);
                 selectedCardForPlacement.classList.remove('selected-for-placement');
                 selectedCardForPlacement = null;
                 messageArea.textContent = "卡牌已放置。";
            }
        } else {
             messageArea.textContent = "请先从手牌区选择一张牌。";
        }
    }
    
    // --- 移动卡牌到区域的通用逻辑 ---
    function moveCardToZone(cardData, targetZoneElement, sourceZoneElement) {
        const targetLane = targetZoneElement.dataset.lane;
        const maxSize = parseInt(targetZoneElement.dataset.size, 10);

        if (arrangedCards[targetLane].length < maxSize) {
            // 从原位置数据中移除
            if (sourceZoneElement === playerHandDiv) {
                // currentHand = currentHand.filter(c => c.id !== cardData.id); // 牌仍在currentHand，只是不显示
            } else { // 从其他摆牌区移来
                const sourceLane = sourceZoneElement.dataset.lane;
                arrangedCards[sourceLane] = arrangedCards[sourceLane].filter(c => c.id !== cardData.id);
            }

            // 添加到新位置数据
            arrangedCards[targetLane].push(cardData);
            
            // 更新UI
            const cardElementToMove = document.querySelector(`.card[data-id='${cardData.id}']`);
            if (cardElementToMove) {
                targetZoneElement.appendChild(cardElementToMove);
                // 移除拖拽能力，添加点击移回能力
                cardElementToMove.draggable = false;
                cardElementToMove.removeEventListener('dragstart', handleDragStart);
                cardElementToMove.removeEventListener('dragend', handleDragEnd);
                cardElementToMove.removeEventListener('click', handleCardClickInHand);
                cardElementToMove.addEventListener('click', handlePlacedCardClick);
            }
            displayHand(); // 重绘手牌区
            updateButtonStates();
        } else {
            messageArea.textContent = `${targetLane.charAt(0).toUpperCase() + targetLane.slice(1)}道已满！`;
        }
    }


    // --- 点击已摆放的牌，将其移回手牌区 ---
    function handlePlacedCardClick(e) {
        const clickedCardElement = e.currentTarget;
        const cardId = clickedCardElement.dataset.id;
        const cardData = findCardInArrangement(cardId);
        const sourceZoneElement = clickedCardElement.parentElement;

        if (cardData && sourceZoneElement) {
            const sourceLane = sourceZoneElement.dataset.lane;
            // 从摆牌区数据中移除
            arrangedCards[sourceLane] = arrangedCards[sourceLane].filter(c => c.id !== cardData.id);
            // 添加回手牌区UI (数据仍在currentHand)
            playerHandDiv.appendChild(renderCard(cardData, true)); // 重新渲染为可拖拽/可点击
            // 从原摆牌区UI移除
            sourceZoneElement.removeChild(clickedCardElement);
            
            displayHand(); // 确保手牌区正确显示
            updateButtonStates();
            messageArea.textContent = `已将 ${cardData.rank}${cardData.suit.charAt(0)} 移回手牌。`;
        }
    }

    // --- 辅助函数 ---
    function findCardById(cardArray, id) {
        return cardArray.find(card => card.id === id);
    }

    function findCardInArrangement(cardId) {
        for (const lane in arrangedCards) {
            const card = arrangedCards[lane].find(c => c.id === cardId);
            if (card) return card;
        }
        return null;
    }
    
    function findLaneOfCard(cardId) {
        for (const lane in arrangedCards) {
            if (arrangedCards[lane].find(c => c.id === cardId)) return lane;
        }
        return null;
    }

    function isCardArranged(cardId) {
        return !!findCardInArrangement(cardId);
    }

    // --- API 调用 ---
    async function fetchFromServer(endpoint, options = {}) {
        messageArea.textContent = "正在与服务器通信...";
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                throw new Error(errorData.message || `服务器错误，状态码: ${response.status}`);
            }
            const data = await response.json();
            messageArea.textContent = data.message || "操作成功！";
            return data;
        } catch (error) {
            console.error(`请求 ${endpoint} 失败:`, error);
            messageArea.textContent = `错误: ${error.message}`;
            return null; // 或者 throw error; 让调用者处理
        }
    }

    // --- 事件监听器绑定 ---
    dealButton.addEventListener('click', async () => {
        dealButton.disabled = true;
        const data = await fetchFromServer('deal_cards.php');
        if (data && data.success && data.hand) {
            // 给每张牌一个唯一ID，方便追踪
            currentHand = data.hand.map((card, index) => ({ ...card, id: `card-${Date.now()}-${index}` }));
            resetGame(false); // 重置牌局但不清除手牌
            displayHand();
            messageArea.textContent = "已发牌，请摆牌。";
        } else {
            messageArea.textContent = data ? data.message : "发牌失败，请检查网络或联系管理员。";
        }
        updateButtonStates();
    });

    submitButton.addEventListener('click', async () => {
        if (arrangedCards.head.length !== 3 || arrangedCards.middle.length !== 5 || arrangedCards.tail.length !== 5) {
            messageArea.textContent = "牌墩数量不正确！头3中5尾5。";
            return;
        }
        submitButton.disabled = true;

        // 只发送 suit 和 rank
        const payload = {
            head: arrangedCards.head.map(({ suit, rank }) => ({ suit, rank })),
            middle: arrangedCards.middle.map(({ suit, rank }) => ({ suit, rank })),
            tail: arrangedCards.tail.map(({ suit, rank }) => ({ suit, rank })),
        };

        const data = await fetchFromServer('submit_hand.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (data && data.success) {
            messageArea.textContent = `提交成功！服务器消息: ${data.message || '已处理'}`;
            // 显示牌型 (如果后端返回了)
            document.getElementById('head-type').textContent = data.details?.head_type || '';
            document.getElementById('middle-type').textContent = data.details?.middle_type || '';
            document.getElementById('tail-type').textContent = data.details?.tail_type || '';
            // 游戏结束，可以禁用提交，启用发牌
            dealButton.disabled = false;
        } else {
            messageArea.textContent = data ? `提交失败: ${data.message}` : "提交失败，未知错误。";
            submitButton.disabled = false; // 允许重新提交或调整
        }
    });

    resetButton.addEventListener('click', () => resetGame(true));

    function resetGame(clearCurrentHand = true) {
        if (clearCurrentHand) {
            currentHand = [];
        }
        arrangedCards = { head: [], middle: [], tail: [] };
        Object.values(arrangementZones).forEach(zone => zone.innerHTML = '');
        playerHandDiv.innerHTML = ''; // 清空手牌显示
        if (!clearCurrentHand && currentHand.length > 0) {
            displayHand(); // 如果不清除手牌（如发牌后的重置），则重新显示
        }
        document.getElementById('head-type').textContent = '';
        document.getElementById('middle-type').textContent = '';
        document.getElementById('tail-type').textContent = '';
        messageArea.textContent = "牌局已重置。";
        selectedCardForPlacement = null;
        updateButtonStates();
        if(clearCurrentHand) dealButton.disabled = false;
    }

    // 初始化
    updateButtonStates();
});

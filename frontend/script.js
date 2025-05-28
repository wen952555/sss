// frontend/script.js (Using suit_rank.png naming, CHECK IMAGE SERVER CORS!)
console.log("script.js: CORS_CHECK_DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: CORS_CHECK_DEBUG - DOMContentLoaded 事件已触发。");

    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('player-hand');
    // ... (其他DOM元素获取，与上一版带交互逻辑的一致)
    const submitButton = document.getElementById('submitButton');
    const resetArrangementButton = document.getElementById('resetArrangementButton');
    const handCardCountSpan = document.getElementById('hand-card-count');
    const arrangementZones = {
        head: { div: document.getElementById('arranged-head'), countSpan: document.querySelector('.arranged-count[data-lane="head"]'), typeDisplay: document.getElementById('head-type-display') },
        middle: { div: document.getElementById('arranged-middle'), countSpan: document.querySelector('.arranged-count[data-lane="middle"]'), typeDisplay: document.getElementById('middle-type-display') },
        tail: { div: document.getElementById('arranged-tail'), countSpan: document.querySelector('.arranged-count[data-lane="tail"]'), typeDisplay: document.getElementById('tail-type-display') }
    };


    if (!messageArea || !dealButton || !playerHandDiv || !submitButton || !resetArrangementButton || !handCardCountSpan ||
        !arrangementZones.head.div || !arrangementZones.middle.div || !arrangementZones.tail.div) {
        console.error("script.js: CORS_CHECK_FATAL - 关键DOM元素未找到。");
        if(messageArea) messageArea.textContent = "页面初始化错误！"; return;
    }
    messageArea.textContent = "请点击“发牌”。";

    if (typeof CONFIG === 'undefined' || !CONFIG ||
        typeof CONFIG.API_BASE_URL !== 'string' || !CONFIG.API_BASE_URL.trim() ||
        typeof CONFIG.IMAGE_SERVER_BASE_URL !== 'string' || !CONFIG.IMAGE_SERVER_BASE_URL.trim() ) {
        console.error("script.js: CORS_CHECK_FATAL - CONFIG对象或其关键URL无效。", CONFIG);
        messageArea.textContent = "前端配置错误！"; dealButton.disabled = true; return;
    }
    const API_BASE_URL = CONFIG.API_BASE_URL;
    const IMAGE_SERVER_BASE_URL = CONFIG.IMAGE_SERVER_BASE_URL; // 应为 https://xxx.9525.ip-ddns.com/assets/images/
    console.log("script.js: CORS_CHECK_DEBUG - 配置: API_URL=", API_BASE_URL, "IMAGE_URL=", IMAGE_SERVER_BASE_URL);

    let originalHandData = [];
    let currentHandElements = {};
    let arrangedCardsData = { head: [], middle: [], tail: [] };
    let selectedCardElement = null;

    // --- 卡牌图片路径转换 (suit_rank.png 格式) ---
    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
            return IMAGE_SERVER_BASE_URL + "placeholder_error.png";
        }
        const suitName = String(card.suit).toLowerCase();
        let rankName = String(card.rank).toLowerCase(); // 后端可能返回大写或小写

        if (rankName === 'a') rankName = 'ace';
        else if (rankName === 'k') rankName = 'king';
        else if (rankName === 'q') rankName = 'queen';
        else if (rankName === 'j') rankName = 'jack';
        else if (rankName === 't') rankName = '10'; // 'T' 转换为 "10"

        const finalPath = `${IMAGE_SERVER_BASE_URL}${suitName}_${rankName}.png`;
        // console.log(`script.js: CORS_CHECK_DEBUG - getCardImagePath for ${card.suit}${card.rank} -> ${finalPath}`);
        return finalPath;
    }

    function renderCardElement(cardData, isInHand = true) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (!cardData || !cardData.suit || !cardData.rank) {
            cardDiv.textContent = "ERR"; cardDiv.style.backgroundColor = "red"; return cardDiv;
        }
        cardDiv.dataset.id = cardData.id; // 使用后端提供的ID
        cardDiv.dataset.suit = cardData.suit; cardDiv.dataset.rank = cardData.rank;

        const imagePath = getCardImagePath(cardData);
        // console.log(`script.js: CORS_CHECK_DEBUG - Render: ${cardData.suit}${cardData.rank} -> ${imagePath}`);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;

        const cardText = `${cardData.rank.toUpperCase()}${cardData.suit.toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText;
        cardDiv.style.color = 'transparent';

        const imgTest = new Image();
        // imgTest.crossOrigin = "Anonymous"; // 尝试添加这个，但主要还是服务器CORS要对
        imgTest.src = imagePath;
        imgTest.onload = () => {
            console.log(`script.js: CORS_CHECK_SUCCESS - Img loaded: ${imagePath}`);
        };
        imgTest.onerror = () => {
            console.warn(`script.js: CORS_CHECK_FAIL - Img fail: ${imagePath}. Showing text: ${cardText}. CHECK IMAGE SERVER CORS HEADERS!`);
            cardDiv.style.backgroundImage = 'none';
            cardDiv.style.color = 'black';
        };

        if (isInHand) {
            cardDiv.addEventListener('click', handleHandCardClick);
        } else {
            cardDiv.addEventListener('click', handleArrangedCardClick);
        }
        return cardDiv;
    }

    // --- handleHandCardClick, handleArrangedCardClick, 牌道点击事件, updateCountsAndStates, resetGame, resetArrangementButton 事件 ---
    // 【这些交互函数与我倒数第二条回复中提供的 "frontend/script.js (实现卡牌点击选择和放置逻辑)" 版本中的对应函数保持一致】
    // 【为了简洁，这里不再重复粘贴，请确保你使用的是那个版本中的这些交互函数】
    // 【如果需要，我可以把它们也完整粘贴进来】

    // 假设交互函数已存在... (以下是主要的发牌逻辑，与上一版基本一致)

    function updateCountsAndStates() { /* ...与上一版交互逻辑代码一致... */
        let handCount = Object.keys(currentHandElements).length;
        if(handCardCountSpan) handCardCountSpan.textContent = handCount;
        let totalArranged = 0;
        for (const lane in arrangementZones) {
            if(arrangementZones[lane] && arrangementZones[lane].countSpan && arrangedCardsData[lane]) {
                const count = arrangedCardsData[lane].length;
                arrangementZones[lane].countSpan.textContent = count;
                totalArranged += count;
            }
        }
        if(resetArrangementButton) resetArrangementButton.disabled = totalArranged === 0;
        if(submitButton) submitButton.disabled = !(handCount === 0 && totalArranged === 13);
        Object.values(arrangementZones).forEach(zone => {
            if (zone && zone.div && arrangedCardsData[zone.div.dataset.lane]) {
                const lane = zone.div.dataset.lane;
                const maxCards = parseInt(zone.div.dataset.maxCards, 10);
                if (arrangedCardsData[lane].length >= maxCards) zone.div.classList.remove('can-drop');
                else if (selectedCardElement) zone.div.classList.add('can-drop');
            }
        });
    }
    function resetGame() { /* ...与上一版交互逻辑代码一致... */
        originalHandData = []; currentHandElements = {};
        arrangedCardsData = { head: [], middle: [], tail: [] };
        if(playerHandDiv) playerHandDiv.innerHTML = '';
        Object.values(arrangementZones).forEach(zone => {
            if(zone && zone.div) zone.div.innerHTML = '';
            if(zone && zone.typeDisplay) zone.typeDisplay.textContent = '';
        });
        selectedCardElement = null; if(messageArea) messageArea.textContent = "请点击“发牌”。";
        if(dealButton) dealButton.disabled = false; updateCountsAndStates();
    }
    if(resetArrangementButton) resetArrangementButton.addEventListener('click', () => { /* ...与上一版交互逻辑代码一致... */
        if(playerHandDiv) playerHandDiv.innerHTML = ''; currentHandElements = {};
        originalHandData.forEach(cardData => {
            const cardElement = renderCardElement(cardData, true);
            if(playerHandDiv) playerHandDiv.appendChild(cardElement);
            currentHandElements[cardData.id] = cardElement;
        });
        arrangedCardsData = { head: [], middle: [], tail: [] };
        Object.values(arrangementZones).forEach(zone => {
            if(zone && zone.div) zone.div.innerHTML = '';
            if(zone && zone.typeDisplay) zone.typeDisplay.textContent = '';
        });
        if (selectedCardElement) { selectedCardElement.classList.remove('selected-from-hand'); selectedCardElement = null; }
        Object.values(arrangementZones).forEach(z => {if(z && z.div) z.div.classList.remove('can-drop')});
        if(messageArea) messageArea.textContent = "摆牌已重置。"; updateCountsAndStates();
    });

    function handleHandCardClick(event) { /* ...与上一版交互逻辑代码一致... */
        const clickedCard = event.currentTarget;
        if (selectedCardElement === clickedCard) {
            selectedCardElement.classList.remove('selected-from-hand'); selectedCardElement = null;
            Object.values(arrangementZones).forEach(zone => {if(zone && zone.div)zone.div.classList.remove('can-drop')});
            if(messageArea) messageArea.textContent = "取消选择。";
        } else {
            if (selectedCardElement) selectedCardElement.classList.remove('selected-from-hand');
            selectedCardElement = clickedCard; selectedCardElement.classList.add('selected-from-hand');
            Object.values(arrangementZones).forEach(zone => {
                if (zone && zone.div && arrangedCardsData[zone.div.dataset.lane]) {
                    const lane = zone.div.dataset.lane; const maxCards = parseInt(zone.div.dataset.maxCards, 10);
                    if (arrangedCardsData[lane].length < maxCards) zone.div.classList.add('can-drop');
                    else zone.div.classList.remove('can-drop');
                }
            });
            if(messageArea) messageArea.textContent = `选中 ${selectedCardElement.dataset.rank}${selectedCardElement.dataset.suit}。`;
        }
    }
    function handleArrangedCardClick(event) { /* ...与上一版交互逻辑代码一致... */
        if (selectedCardElement) { if(messageArea) messageArea.textContent = "请先放置手牌。"; return; }
        const clickedArrangedCard = event.currentTarget; const cardId = clickedArrangedCard.dataset.id;
        const sourceLaneDiv = clickedArrangedCard.parentElement;
        if (!sourceLaneDiv || !sourceLaneDiv.dataset.lane) return;
        const sourceLane = sourceLaneDiv.dataset.lane;
        const cardIndex = arrangedCardsData[sourceLane].findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
            const cardData = arrangedCardsData[sourceLane].splice(cardIndex, 1)[0];
            const newHandCardElement = renderCardElement(cardData, true);
            if(playerHandDiv) playerHandDiv.appendChild(newHandCardElement);
            currentHandElements[cardData.id] = newHandCardElement;
            sourceLaneDiv.removeChild(clickedArrangedCard);
            updateCountsAndStates(); if(messageArea) messageArea.textContent = `${cardData.rank}${cardData.suit} 已移回手牌。`;
        }
    }
    Object.values(arrangementZones).forEach(zoneData => {
        if (zoneData && zoneData.div) {
            zoneData.div.addEventListener('click', function() { /* ...与上一版交互逻辑代码一致... */
                const targetLaneDiv = this; const lane = targetLaneDiv.dataset.lane;
                const maxCards = parseInt(targetLaneDiv.dataset.maxCards, 10);
                if (selectedCardElement && arrangedCardsData[lane].length < maxCards) {
                    const cardId = selectedCardElement.dataset.id;
                    const cardDataToMove = originalHandData.find(c => c.id === cardId);
                    if (cardDataToMove) {
                        selectedCardElement.removeEventListener('click', handleHandCardClick);
                        if(playerHandDiv) playerHandDiv.removeChild(selectedCardElement);
                        delete currentHandElements[cardId];
                        const newArrangedCardElement = renderCardElement(cardDataToMove, false);
                        targetLaneDiv.appendChild(newArrangedCardElement);
                        arrangedCardsData[lane].push(cardDataToMove);
                        selectedCardElement.classList.remove('selected-from-hand'); selectedCardElement = null;
                        Object.values(arrangementZones).forEach(z => {if(z && z.div)z.div.classList.remove('can-drop')});
                        if(messageArea) messageArea.textContent = `${cardDataToMove.rank}${cardDataToMove.suit} 放入${lane}道。`;
                        updateCountsAndStates();
                    }
                } else if (selectedCardElement && arrangedCardsData[lane].length >= maxCards) {
                    if(messageArea) messageArea.textContent = `${lane}道已满！`;
                }
            });
        }
    });

    function displayHand() { // displayHand也需要定义在dealButton的addEventListener之前
        if(playerHandDiv) playerHandDiv.innerHTML = ''; else return;
        if (originalHandData && Array.isArray(originalHandData) && originalHandData.length > 0) {
             // 清空 currentHandElements 并根据 originalHandData 重新填充和渲染到 playerHandDiv
            currentHandElements = {};
            originalHandData.forEach(cardData => {
                // 只渲染那些还没有被放到摆牌区的牌
                let isArranged = false;
                for (const lane in arrangedCardsData) {
                    if (arrangedCardsData[lane].find(c => c.id === cardData.id)) {
                        isArranged = true;
                        break;
                    }
                }
                if (!isArranged) {
                    const cardElement = renderCardElement(cardData, true);
                    playerHandDiv.appendChild(cardElement);
                    currentHandElements[cardData.id] = cardElement;
                }
            });
            console.log("script.js: CORS_CHECK_DEBUG - displayHand - 渲染了", Object.keys(currentHandElements).length, "张牌到手牌区。");
        }
        updateCountsAndStates(); // 确保在显示手牌后更新计数
    }


    dealButton.addEventListener('click', async () => {
        console.log("script.js: CORS_CHECK_DEBUG - 发牌按钮被点击！");
        resetGame(); // 发牌前重置
        dealButton.disabled = true;
        if (messageArea) messageArea.textContent = "正在获取手牌...";
        const fullApiUrl = `${API_BASE_URL}/deal_cards.php`;
        try {
            const response = await fetch(fullApiUrl);
            if (!response.ok) {
                let errDetail = `Status: ${response.status}`; try { errDetail = await response.text(); } catch(e){}
                throw new Error(`API请求失败! ${errDetail.substring(0,100)}`);
            }
            const data = await response.json();
            if (data && data.success === true && data.hand && Array.isArray(data.hand)) {
                if (messageArea) messageArea.textContent = data.message || "手牌获取成功...";
                originalHandData = data.hand.map((card, index) => ({ // 使用 originalHandData 存储原始牌
                    ...card,
                    id: card.id || `card-${Date.now()}-${index}` // 确保每张牌有唯一ID
                }));
                console.log("script.js: CORS_CHECK_DEBUG - 原始手牌数据:", originalHandData.slice(0,3));
                displayHand(); // 调用 displayHand 来显示初始手牌
            } else {
                const errorMsg = (data && data.message) ? data.message : "手牌数据格式不正确。";
                if (messageArea) messageArea.textContent = errorMsg; originalHandData = []; displayHand();
            }
        } catch (error) {
            if (messageArea) messageArea.textContent = `请求错误: ${String(error.message).substring(0,100)}`;
            originalHandData = []; displayHand();
        } finally {
            dealButton.disabled = false;
            // updateCountsAndStates(); // displayHand 末尾会调用
        }
    });
    console.log("script.js: CORS_CHECK_DEBUG - 初始化完成。");
    updateCountsAndStates(); // 页面加载后也初始化一次计数和按钮状态
});
console.log("script.js: CORS_CHECK_DEBUG - 文件加载结束。");

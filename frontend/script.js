console.log("script.js: CORS_CHECK_DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    // === DOM获取 ===
    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const matchButton = document.getElementById('matchButton');
    const resetArrangementButton = document.getElementById('resetArrangementButton');
    const submitButton = document.getElementById('submitButton');
    const aiSuggestButton = document.getElementById('aiSuggestButton');
    const aiAutoButton = document.getElementById('aiAutoButton');
    const aiReleaseButton = document.getElementById('aiReleaseButton');
    const handCardCountSpan = document.getElementById('hand-card-count');
    const arrangementZones = {
        head: { div: document.getElementById('arranged-head'), countSpan: document.querySelector('.arranged-count[data-lane="head"]'), typeDisplay: document.getElementById('head-type-display'), max: 3 },
        hand: { div: document.getElementById('arranged-hand'), countSpan: document.querySelector('.arranged-count[data-lane="hand"]'), typeDisplay: document.getElementById('hand-type-display'), max: 5 },
        tail: { div: document.getElementById('arranged-tail'), countSpan: document.querySelector('.arranged-count[data-lane="tail"]'), typeDisplay: document.getElementById('tail-type-display'), max: 5 }
    };

    // === 变量 ===
    let originalHandData = [];
    let arrangedCardsData = { head: [], hand: [], tail: [] };
    let selectedCardElement = null;
    let isAIAuto = false;

    // === 功能函数 ===
    function renderCardElement(cardData, sourceLane) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.dataset.id = cardData.id;
        cardDiv.dataset.suit = cardData.suit; cardDiv.dataset.rank = cardData.rank;
        const imagePath = getCardImage(cardData);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;
        const cardText = `${cardData.rank.toString().toUpperCase()}${cardData.suit.toString().toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText;
        cardDiv.style.color = 'transparent';
        if (!isAIAuto) {
          cardDiv.addEventListener('click', (event) => handleZoneCardClick(event, sourceLane));
        } else {
          cardDiv.style.opacity = 0.7; cardDiv.style.cursor = "not-allowed";
        }
        return cardDiv;
    }

    function renderAllZones() {
        // 清空
        Object.values(arrangementZones).forEach(zone => { if(zone.div) zone.div.innerHTML = ''; });
        // 渲染
        for(const lane of ['head','hand','tail']) {
            arrangedCardsData[lane].forEach(card => {
                arrangementZones[lane].div.appendChild(renderCardElement(card, lane));
            });
        }
        updateCountsAndStates();
    }

    function updateCountsAndStates() {
        // 更新计数
        for (const lane in arrangementZones) {
            arrangementZones[lane].countSpan.textContent = arrangedCardsData[lane].length;
        }
        handCardCountSpan.textContent = arrangedCardsData.hand.length;
        resetArrangementButton.disabled = originalHandData.length === 0 || isAIAuto;
        submitButton.disabled = !(
            arrangedCardsData.head.length === 3 &&
            arrangedCardsData.tail.length === 5 &&
            arrangedCardsData.hand.length === 5
        );
        // 判型
        for (const lane of ['head', 'hand', 'tail']) {
            const cards = arrangedCardsData[lane];
            if ((lane === "head" && cards.length === 3) || ((lane === "tail" || lane === "hand") && cards.length === 5)) {
                arrangementZones[lane].typeDisplay.textContent = getHandType(cards).description;
            } else {
                arrangementZones[lane].typeDisplay.textContent = "";
            }
        }
        // 满足 3+5+5，隐藏“手牌”区
        if (arrangedCardsData.head.length === 3 && arrangedCardsData.tail.length === 5 && arrangedCardsData.hand.length === 5) {
            arrangementZones.hand.div.style.display = "none";
        } else {
            arrangementZones.hand.div.style.display = "";
        }
    }

    function resetGame() {
        arrangedCardsData = { head: [], hand: [], tail: [] };
        selectedCardElement = null;
        isAIAuto = false;
        aiAutoButton.style.display = "inline-block";
        aiReleaseButton.style.display = "none";
        Object.values(arrangementZones).forEach(zone => {
            if(zone.div) zone.div.innerHTML = '';
            if(zone.typeDisplay) zone.typeDisplay.textContent = '';
        });
        messageArea.textContent = "请点击“发牌”或“自动匹配”开始。";
        updateCountsAndStates();
    }

    function deal(handArr) {
        originalHandData = handArr.map((card, i) => ({...card, id: card.id || `card-${Date.now()}-${i}`}));
        arrangedCardsData = { head: [], hand: [...originalHandData], tail: [] };
        renderAllZones();
        messageArea.textContent = "请拖动或点击移动牌到头道和尾道。";
    }

    // --- 牌点击移动 ---
    function handleZoneCardClick(event, fromLane) {
        if (isAIAuto) return;
        const cardDiv = event.currentTarget;
        const cardId = cardDiv.dataset.id;
        // 选中未选中：高亮选中
        if (!selectedCardElement || selectedCardElement !== cardDiv) {
            if (selectedCardElement) selectedCardElement.classList.remove('selected-from-hand');
            selectedCardElement = cardDiv;
            cardDiv.classList.add('selected-from-hand');
            messageArea.textContent = `选中 ${cardDiv.dataset.rank}${cardDiv.dataset.suit}，点击目标区放置。`;
            // 高亮可投放区
            Object.entries(arrangementZones).forEach(([lane, zone]) => {
                if (lane !== fromLane && zone.div.style.display !== "none") zone.div.classList.add('can-drop');
            });
        } else {
            // 已选中再次点击：取消
            selectedCardElement.classList.remove('selected-from-hand');
            selectedCardElement = null;
            Object.values(arrangementZones).forEach(zone => zone.div.classList.remove('can-drop'));
            messageArea.textContent = "取消选择。";
        }
    }

    // --- 区域点击投放 ---
    Object.entries(arrangementZones).forEach(([lane, zone]) => {
        zone.div.addEventListener('click', function(){
            if (isAIAuto || !selectedCardElement) return;
            // 不能把牌投放到原区
            const fromLane = selectedCardElement.parentElement.dataset.lane;
            if (lane === fromLane) return;
            // 移动
            const cardId = selectedCardElement.dataset.id;
            const fromArr = arrangedCardsData[fromLane];
            const cardIdx = fromArr.findIndex(c => c.id === cardId);
            if (cardIdx !== -1) {
                const cardObj = fromArr.splice(cardIdx, 1)[0];
                arrangedCardsData[lane].push(cardObj);
                selectedCardElement.classList.remove('selected-from-hand');
                selectedCardElement = null;
                Object.values(arrangementZones).forEach(z => z.div.classList.remove('can-drop'));
                renderAllZones();
                messageArea.textContent = `已将 ${cardObj.rank}${cardObj.suit} 移至${zone.div.querySelector('.zone-title').textContent.split(' ')[0]}。`;
            }
        });
    });

    // --- 重置 ---
    resetArrangementButton.addEventListener('click', () => {
        if(isAIAuto) return;
        arrangedCardsData = { head: [], hand: [...originalHandData], tail: [] };
        selectedCardElement = null;
        renderAllZones();
        messageArea.textContent = "已重置摆牌。";
    });

    // --- 发牌 ---
    dealButton.addEventListener('click', async () => {
        resetGame();
        dealButton.disabled = true;
        messageArea.textContent = "正在获取手牌...";
        const API_BASE_URL = CONFIG.API_BASE_URL;
        const fullApiUrl = `${API_BASE_URL}/deal_cards.php`;
        try {
            const response = await fetch(fullApiUrl);
            if (!response.ok) throw new Error("发牌API错误");
            const data = await response.json();
            if (data && data.success && Array.isArray(data.hand)) {
                deal(data.hand);
            } else {
                messageArea.textContent = (data && data.message) || "手牌数据格式不正确";
            }
        } catch (e) {
            messageArea.textContent = "请求错误: " + e.message;
        }
        dealButton.disabled = false;
    });

    // --- 自动匹配 ---
    matchButton.addEventListener('click', async () => {
        resetGame();
        dealButton.disabled = true; matchButton.disabled = true;
        messageArea.innerHTML = '正在自动匹配玩家，请稍候... <span id="matching-loading"></span>';
        try {
            const API_BASE_URL = CONFIG.API_BASE_URL;
            await new Promise(r=>setTimeout(r, 1000));
            const response = await fetch(`${API_BASE_URL}/match.php`);
            if (!response.ok) throw new Error("匹配失败");
            const data = await response.json();
            if (data && data.success && Array.isArray(data.hand)) {
                deal(data.hand);
                if (data.opponents && Array.isArray(data.opponents)) {
                  messageArea.innerHTML = `已匹配成功！您的对手：${data.opponents.map(o=>o.name).join('、')}`;
                } else messageArea.innerHTML = "已匹配成功！";
            } else {
                messageArea.textContent = (data && data.message) || "匹配失败！";
            }
        } catch (e) {
            messageArea.textContent = "匹配失败：" + e.message;
        }
        dealButton.disabled = false; matchButton.disabled = false;
        const loading = document.getElementById('matching-loading');
        if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
    });

    // --- AI参考/托管 ---
    aiSuggestButton.addEventListener('click', () => {
      if (!originalHandData || originalHandData.length !== 13) {
        messageArea.textContent = "请先发牌。";
        return;
      }
      const aiResult = simpleAIDivide13(originalHandData);
      arrangedCardsData = { head: [...aiResult.head], hand: [...aiResult.hand], tail: [...aiResult.tail] };
      renderAllZones();
      messageArea.textContent = "AI参考摆牌已自动分配，请根据需要微调。";
    });

    aiAutoButton.addEventListener('click', () => {
      if (!originalHandData || originalHandData.length !== 13) {
        messageArea.textContent = "请先发牌。";
        return;
      }
      const aiResult = simpleAIDivide13(originalHandData);
      arrangedCardsData = { head: [...aiResult.head], hand: [...aiResult.hand], tail: [...aiResult.tail] };
      isAIAuto = true;
      renderAllZones();
      messageArea.textContent = "AI已自动摆牌并托管。如需手动操作请解除托管。";
      aiAutoButton.style.display = "none";
      aiReleaseButton.style.display = "inline-block";
    });

    aiReleaseButton.addEventListener('click', () => {
      isAIAuto = false;
      arrangedCardsData = { head: [], hand: [...originalHandData], tail: [] };
      renderAllZones();
      aiAutoButton.style.display = "inline-block";
      aiReleaseButton.style.display = "none";
      messageArea.textContent = "已解除托管，请手动摆牌。";
    });

    // --- 简单AI分牌 ---
    function simpleAIDivide13(hand) {
        // 尾道最大5张，头道最大3张，剩下5张为手牌
        const sorted = [...hand].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
        return {
            tail: sorted.slice(0,5),
            hand: sorted.slice(5,10),
            head: sorted.slice(10,13)
        };
    }

    // --- 提交 ---
    submitButton.addEventListener('click', () => {
      if (arrangedCardsData.head.length === 3 && arrangedCardsData.tail.length === 5 && arrangedCardsData.hand.length === 5) {
        const headType = getHandType(arrangedCardsData.head);
        const handType = getHandType(arrangedCardsData.hand);
        const tailType = getHandType(arrangedCardsData.tail);
        arrangementZones.head.typeDisplay.textContent = headType.description;
        arrangementZones.hand.typeDisplay.textContent = handType.description;
        arrangementZones.tail.typeDisplay.textContent = tailType.description;
        if (
          compareHandType(tailType, handType) >= 0 &&
          compareHandType(handType, headType) >= 0
        ) {
          messageArea.textContent = "牌型摆放合法！";
        } else {
          messageArea.textContent = "不合法的摆牌，请调整！";
        }
      }
    });

    // --- 启动 ---
    resetGame();
});
console.log("script.js: CORS_CHECK_DEBUG - 文件加载结束。");

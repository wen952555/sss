console.log("script.js: CORS_CHECK_DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    // === DOM获取 ===
    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const sortHandButton = document.getElementById('sortHandButton');
    const resetArrangementButton = document.getElementById('resetArrangementButton');
    const submitButton = document.getElementById('submitButton');
    const aiSuggestButton = document.getElementById('aiSuggestButton');
    const aiAutoButton = document.getElementById('aiAutoButton');
    const aiReleaseButton = document.getElementById('aiReleaseButton');
    const handCardCountSpan = document.getElementById('hand-card-count');
    const playerHandDiv = document.getElementById('player-hand');
    const arrangementZones = {
        head: { div: document.getElementById('arranged-head'), countSpan: document.querySelector('.arranged-count[data-lane="head"]'), typeDisplay: document.getElementById('head-type-display') },
        middle: { div: document.getElementById('arranged-middle'), countSpan: document.querySelector('.arranged-count[data-lane="middle"]'), typeDisplay: document.getElementById('middle-type-display') },
        tail: { div: document.getElementById('arranged-tail'), countSpan: document.querySelector('.arranged-count[data-lane="tail"]'), typeDisplay: document.getElementById('tail-type-display') }
    };

    // === 变量 ===
    let originalHandData = [];
    let currentHandElements = {};
    let arrangedCardsData = { head: [], middle: [], tail: [] };
    let selectedCardElement = null;
    let isAIAuto = false;

    // === 功能函数 ===
    function getCardImagePath(card) { return getCardImage(card); }

    function renderCardElement(cardData, isInHand = true) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (!cardData || !cardData.suit || !cardData.rank) {
            cardDiv.textContent = "ERR"; cardDiv.style.backgroundColor = "red"; return cardDiv;
        }
        cardDiv.dataset.id = cardData.id; cardDiv.dataset.suit = cardData.suit; cardDiv.dataset.rank = cardData.rank;
        const imagePath = getCardImagePath(cardData);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;
        const cardText = `${cardData.rank.toString().toUpperCase()}${cardData.suit.toString().toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText;
        cardDiv.style.color = 'transparent';
        const imgTest = new Image();
        imgTest.src = imagePath;
        imgTest.onerror = () => { cardDiv.style.backgroundImage = 'none'; cardDiv.style.color = 'black'; };
        if (isInHand && !isAIAuto) cardDiv.addEventListener('click', handleHandCardClick);
        if (!isInHand && !isAIAuto) cardDiv.addEventListener('click', handleArrangedCardClick);
        if (isAIAuto) { cardDiv.style.opacity = 0.7; cardDiv.style.cursor = "not-allowed"; }
        return cardDiv;
    }

    function displayHand() {
        if(playerHandDiv) playerHandDiv.innerHTML = ''; else return;
        if (originalHandData && Array.isArray(originalHandData) && originalHandData.length > 0) {
            currentHandElements = {};
            originalHandData.forEach(cardData => {
                let isArranged = false;
                for (const lane in arrangedCardsData) {
                    if (arrangedCardsData[lane].find(c => c.id === cardData.id)) {
                        isArranged = true; break;
                    }
                }
                if (!isArranged) {
                    const cardElement = renderCardElement(cardData, true);
                    playerHandDiv.appendChild(cardElement);
                    currentHandElements[cardData.id] = cardElement;
                }
            });
        }
        updateCountsAndStates();
    }

    function updateCountsAndStates() {
        // update counters
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
        if(resetArrangementButton) resetArrangementButton.disabled = totalArranged === 0 || isAIAuto;
        if(submitButton) submitButton.disabled = !(handCount === 0 && totalArranged === 13);

        // 判型显示
        for (const lane in arrangementZones) {
            const cards = arrangedCardsData[lane];
            if (arrangementZones[lane].typeDisplay) {
                if ((lane === "head" && cards.length === 3) || ((lane === "middle" || lane === "tail") && cards.length === 5)) {
                    const type = getHandType(cards);
                    arrangementZones[lane].typeDisplay.textContent = type.description;
                } else {
                    arrangementZones[lane].typeDisplay.textContent = "";
                }
            }
        }

        // 托管下禁用所有操作
        if (isAIAuto) {
            dealButton.disabled = true;
            sortHandButton.disabled = true;
        } else {
            dealButton.disabled = false;
            sortHandButton.disabled = false;
        }
    }

    function resetGame() {
        originalHandData = []; currentHandElements = {};
        arrangedCardsData = { head: [], middle: [], tail: [] };
        if(playerHandDiv) playerHandDiv.innerHTML = '';
        Object.values(arrangementZones).forEach(zone => {
            if(zone && zone.div) zone.div.innerHTML = '';
            if(zone && zone.typeDisplay) zone.typeDisplay.textContent = '';
        });
        selectedCardElement = null; messageArea.textContent = "请点击“发牌”。";
        isAIAuto = false;
        aiAutoButton.style.display = "inline-block";
        aiReleaseButton.style.display = "none";
        updateCountsAndStates();
    }

    if(resetArrangementButton) resetArrangementButton.addEventListener('click', () => {
        if(isAIAuto) return;
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
        messageArea.textContent = "摆牌已重置。"; updateCountsAndStates();
    });

    function sortHandByRankAndSuit() {
      if(isAIAuto) return;
      if (!originalHandData || !Array.isArray(originalHandData)) return;
      originalHandData.sort((a, b) => {
        const rankOrder = (rank) => {
          if (typeof rank === "string") rank = rank.toUpperCase();
          if (rank === 'A') return 14;
          if (rank === 'K') return 13;
          if (rank === 'Q') return 12;
          if (rank === 'J') return 11;
          if (rank === 'T') return 10;
          return Number(rank);
        };
        const suitOrder = { s: 4, h: 3, d: 2, c: 1 };
        if (rankOrder(a.rank) !== rankOrder(b.rank)) {
          return rankOrder(b.rank) - rankOrder(a.rank);
        }
        return (suitOrder[a.suit] || 0) - (suitOrder[b.suit] || 0);
      });
      displayHand();
    }
    sortHandButton.addEventListener('click', sortHandByRankAndSuit);

    function handleHandCardClick(event) {
        if(isAIAuto) return;
        const clickedCard = event.currentTarget;
        if (selectedCardElement === clickedCard) {
            selectedCardElement.classList.remove('selected-from-hand'); selectedCardElement = null;
            Object.values(arrangementZones).forEach(zone => {if(zone && zone.div)zone.div.classList.remove('can-drop')});
            messageArea.textContent = "取消选择。";
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
            messageArea.textContent = `选中 ${selectedCardElement.dataset.rank}${selectedCardElement.dataset.suit}。`;
        }
    }
    function handleArrangedCardClick(event) {
        if(isAIAuto) return;
        if (selectedCardElement) { messageArea.textContent = "请先放置手牌。"; return; }
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
            updateCountsAndStates(); messageArea.textContent = `${cardData.rank}${cardData.suit} 已移回手牌。`;
        }
    }
    Object.values(arrangementZones).forEach(zoneData => {
        if (zoneData && zoneData.div) {
            zoneData.div.addEventListener('click', function() {
                if(isAIAuto) return;
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
                        messageArea.textContent = `${cardDataToMove.rank}${cardDataToMove.suit} 放入${lane}道。`;
                        updateCountsAndStates();
                    }
                } else if (selectedCardElement && arrangedCardsData[lane].length >= maxCards) {
                    messageArea.textContent = `${lane}道已满！`;
                }
            });
        }
    });

    // --- AI相关 ---
    function simpleAIDivide13(hand) {
        // 基于牌点简单分配（可替换为更强AI）
        const sorted = [...hand].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
        // 尾道：最大5张，中道：次大5张，头道：最小3张（实际项目建议用更强AI）
        return {
            tail: sorted.slice(0,5),
            middle: sorted.slice(5,10),
            head: sorted.slice(10,13)
        };
    }

    aiSuggestButton.addEventListener('click', () => {
      if (!originalHandData || originalHandData.length !== 13) {
        messageArea.textContent = "请先发牌。";
        return;
      }
      const aiResult = simpleAIDivide13(originalHandData);
      highlightAIReference(aiResult);
      messageArea.textContent = "AI推荐摆牌已高亮显示，仅供参考。";
    });

    aiAutoButton.addEventListener('click', () => {
      if (!originalHandData || originalHandData.length !== 13) {
        messageArea.textContent = "请先发牌。";
        return;
      }
      const aiResult = simpleAIDivide13(originalHandData);
      arrangedCardsData = {head: [...aiResult.head], middle: [...aiResult.middle], tail: [...aiResult.tail]};
      isAIAuto = true;
      updateArrangementUI(true);
      messageArea.textContent = "AI已自动摆牌并托管。如需手动操作请解除托管。";
      aiAutoButton.style.display = "none";
      aiReleaseButton.style.display = "inline-block";
    });

    aiReleaseButton.addEventListener('click', () => {
      isAIAuto = false;
      arrangedCardsData = {head: [], middle: [], tail: []};
      displayHand();
      aiAutoButton.style.display = "inline-block";
      aiReleaseButton.style.display = "none";
      messageArea.textContent = "已解除托管，请手动摆牌。";
    });

    function highlightAIReference(aiResult) {
      Object.values(arrangementZones).forEach(zone => {
        if(zone && zone.div) zone.div.classList.remove('ai-suggest');
      });
      Object.entries(aiResult).forEach(([lane, cards]) => {
        if(arrangementZones[lane] && arrangementZones[lane].div) {
          arrangementZones[lane].div.classList.add('ai-suggest');
          let type = getHandType(cards);
          if(arrangementZones[lane].typeDisplay) arrangementZones[lane].typeDisplay.textContent = "AI参考："+type.description;
        }
      });
      setTimeout(()=> {
        Object.values(arrangementZones).forEach(zone => {
          if(zone && zone.div) zone.div.classList.remove('ai-suggest');
          if(zone && zone.typeDisplay) zone.typeDisplay.textContent = "";
        });
        updateCountsAndStates();
      }, 2000);
    }

    function updateArrangementUI(isAIMode) {
      Object.values(arrangementZones).forEach(zone => {
        if(zone && zone.div) zone.div.innerHTML = '';
        if(zone && zone.typeDisplay) zone.typeDisplay.textContent = '';
      });
      playerHandDiv.innerHTML = '';
      if(isAIMode) {
        Object.entries(arrangedCardsData).forEach(([lane, cards]) => {
          cards.forEach(card => {
            const cardDiv = renderCardElement(card, false);
            arrangementZones[lane].div.appendChild(cardDiv);
          });
        });
        dealButton.disabled = true;
        sortHandButton.disabled = true;
        resetArrangementButton.disabled = true;
        submitButton.disabled = false;
      } else {
        displayHand();
        dealButton.disabled = false;
        sortHandButton.disabled = false;
        resetArrangementButton.disabled = false;
        submitButton.disabled = true;
      }
      updateCountsAndStates();
    }

    // --- 发牌功能 ---
    dealButton.addEventListener('click', async () => {
        resetGame();
        dealButton.disabled = true;
        messageArea.textContent = "正在获取手牌...";
        const API_BASE_URL = CONFIG.API_BASE_URL;
        const fullApiUrl = `${API_BASE_URL}/deal_cards.php`;
        try {
            const response = await fetch(fullApiUrl);
            if (!response.ok) {
                let errDetail = `Status: ${response.status}`; try { errDetail = await response.text(); } catch(e){}
                throw new Error(`API请求失败! ${errDetail.substring(0,100)}`);
            }
            const data = await response.json();
            if (data && data.success === true && data.hand && Array.isArray(data.hand)) {
                messageArea.textContent = data.message || "手牌获取成功...";
                originalHandData = data.hand.map((card, index) => ({
                    ...card,
                    id: card.id || `card-${Date.now()}-${index}`
                }));
                displayHand();
            } else {
                const errorMsg = (data && data.message) ? data.message : "手牌数据格式不正确。";
                messageArea.textContent = errorMsg; originalHandData = []; displayHand();
            }
        } catch (error) {
            messageArea.textContent = `请求错误: ${String(error.message).substring(0,100)}`;
            originalHandData = []; displayHand();
        } finally {
            dealButton.disabled = false;
        }
    });

    // --- 提交摆牌（判定三道关系） ---
    submitButton.addEventListener('click', () => {
      if(isAIAuto || (Object.keys(currentHandElements).length === 0 && Object.values(arrangedCardsData).flat().length === 13)) {
        const headType = getHandType(arrangedCardsData.head);
        const middleType = getHandType(arrangedCardsData.middle);
        const tailType = getHandType(arrangedCardsData.tail);
        arrangementZones.head.typeDisplay.textContent = headType.description;
        arrangementZones.middle.typeDisplay.textContent = middleType.description;
        arrangementZones.tail.typeDisplay.textContent = tailType.description;
        if (
          compareHandType(tailType, middleType) >= 0 &&
          compareHandType(middleType, headType) >= 0
        ) {
          messageArea.textContent = "牌型摆放合法！";
        } else {
          messageArea.textContent = "不合法的摆牌，请调整！";
        }
      }
    });

    // --- 启动 ---
    updateCountsAndStates();
    messageArea.textContent = "请点击“发牌”。";
});
console.log("script.js: CORS_CHECK_DEBUG - 文件加载结束。");

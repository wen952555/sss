// frontend/js/ui.js (保持图片路径修改和 onerror 日志)

function getElem(id) {
    const elem = document.getElementById(id);
    if (!elem) {
        console.warn(`[UI.js] Element with ID '${id}' not found.`);
    }
    return elem;
}

function clearElement(elementOrId) {
    const element = typeof elementOrId === 'string' ? getElem(elementOrId) : elementOrId;
    if (element) {
        element.innerHTML = '';
    }
}

function createCardElement(cardObject) {
    // *** 添加对 cardObject 和 imageName 的存在性检查 ***
    if (!cardObject || typeof cardObject.imageName !== 'string' || cardObject.imageName.trim() === '') {
        console.error("[UI.js] createCardElement: Invalid or missing imageName in cardObject:", cardObject);
        const errorCardDiv = document.createElement('div');
        errorCardDiv.classList.add('card', 'card-error'); // 你需要为 .card-error 添加CSS
        errorCardDiv.innerHTML = `<span style="font-size:9px; color:red; text-align:center;">卡牌数据<br>错误</span>`;
        return errorCardDiv;
    }
    console.log("[UI.js] createCardElement called with cardObject (imageName: '" + cardObject.imageName + "'):", JSON.parse(JSON.stringify(cardObject)));

    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.draggable = true;
    cardDiv.dataset.cardId = cardObject.id;

    const img = document.createElement('img');
    const imagePath = `cards/${cardObject.imageName}`; // 图片路径已修改
    img.src = imagePath;
    img.alt = `${cardObject.displayRank}${cardObject.suitSymbol}`;
    img.title = img.alt;

    console.log("[UI.js] Attempting to load image for card " + cardObject.id + ": " + imagePath);

    img.onerror = function() {
        console.error(`[UI.js] FAILED TO LOAD IMAGE: ${imagePath}. Associated card data:`, cardObject);
        cardDiv.innerHTML = `<span style="font-size:10px; text-align:center; color:red;">${img.alt}<br>图片加载<br>失败</span>`;
    };
    img.onload = function() {
        // console.log(`[UI.js] Image loaded successfully: ${imagePath}`);
    };

    cardDiv.appendChild(img);
    return cardDiv;
}

function renderCardsToArea(areaId, cards) {
    const areaElement = getElem(areaId);
    if (!areaElement) {
        console.error(`[UI.js] renderCardsToArea: Element with ID '${areaId}' not found.`);
        return;
    }
    clearElement(areaElement);
    console.log(`[UI.js] Rendering ${cards ? cards.length : 0} cards to area '${areaId}'. First card data (if any):`, cards && cards[0] ? JSON.parse(JSON.stringify(cards[0])) : 'No cards');

    if (cards && Array.isArray(cards)) {
        cards.forEach((cardObj, index) => {
            if (cardObj && typeof cardObj.rank !== 'undefined' && typeof cardObj.imageName === 'string') { // 额外检查imageName
                try {
                    const cardElement = createCardElement(cardObj);
                    areaElement.appendChild(cardElement);
                } catch (e) {
                    console.error(`[UI.js] Error creating card element for card at index ${index}:`, cardObj, e);
                }
            } else {
                console.warn(`[UI.js] Invalid card object or missing imageName at index ${index} for area '${areaId}':`, cardObj);
            }
        });
    } else if (cards) {
        console.error(`[UI.js] renderCardsToArea: 'cards' argument is not an array for area '${areaId}'. Received:`, cards);
    }
}

// ... (updateDunTypeDisplay, showFeedbackMessage, updateAIPlayerStatus, displayGameResults, hideGameResults 函数不变) ...

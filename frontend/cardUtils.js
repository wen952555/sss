document.addEventListener('DOMContentLoaded', () => {
    const playerHandDiv = document.getElementById('playerHand');
    const headDunDiv = document.getElementById('headDun');
    const middleDunDiv = document.getElementById('middleDun');
    const tailDunDiv = document.getElementById('tailDun');

    const dunElements = {
        head: headDunDiv,
        middle: middleDunDiv,
        tail: tailDunDiv
    };
    const dunData = { // 用于存储每个墩的牌对象数组和元数据
        hand: { div: playerHandDiv, cards: [], max: 13, name: '手牌区', typeDisplay: null },
        head: { div: headDunDiv, cards: [], max: 3, name: '头墩', typeDisplay: document.getElementById('headDunType') },
        middle: { div: middleDunDiv, cards: [], max: 5, name: '中墩', typeDisplay: document.getElementById('middleDunType') },
        tail: { div: tailDunDiv, cards: [], max: 5, name: '尾墩', typeDisplay: document.getElementById('tailDunType') }
    };

    const dealButton = document.getElementById('dealButton');
    const submitArrangementButton = document.getElementById('submitArrangementButton');
    const checkBackendButton = document.getElementById('checkBackendButton');

    const backendStatusDiv = document.getElementById('backendStatus');
    const arrangementResultDiv = document.getElementById('arrangementResult');
    const recognitionResultDiv = document.getElementById('recognitionResult');

    // 从 config.js 引入 (全局变量)
    // FRONTEND_URL, BACKEND_URL, API_ENDPOINT_STATUS, API_ENDPOINT_GAME

    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const rankValues = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
    };
    const suitSymbols = { 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠' };
    const rankDisplays = { 'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A' };

    let fullDeck = [];
    let playerHandObjects = []; // 存储当前玩家13张牌的完整对象

    let draggedCardElement = null; // DOM元素
    let draggedCardData = null;    // 卡牌对象 {id, suit, rank, ...}
    let sourceAreaName = null;     // 卡牌拖拽的起始区域名 ('hand', 'head', 'middle', 'tail')

    function createDeck() {
        fullDeck = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                const cardId = `${rank}_of_${suit}`; // 用作唯一标识符和图片文件名一部分
                fullDeck.push({
                    id: cardId,
                    suit: suit,
                    rank: rank,
                    value: rankValues[rank],
                    imageName: `${cardId}.svg`,
                    displaySuit: suitSymbols[suit],
                    displayRank: rankDisplays[rank] || rank.toUpperCase()
                });
            }
        }
    }

    function shuffleDeck(deckToShuffle) {
        for (let i = deckToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
        }
    }

    function dealNewHand() {
        createDeck();
        shuffleDeck(fullDeck);
        playerHandObjects = fullDeck.slice(0, 13);

        // 清空所有墩区数据和显示
        Object.values(dunData).forEach(area => {
            area.cards = [];
            area.div.innerHTML = '';
            if (area.typeDisplay) area.typeDisplay.textContent = '(-)';
        });

        // 将牌放入手牌区数据模型并显示
        dunData.hand.cards = [...playerHandObjects];
        renderArea('hand');

        submitArrangementButton.style.display = 'inline-block';
        arrangementResultDiv.textContent = '请将13张牌拖到头、中、尾墩。';
        arrangementResultDiv.style.color = 'inherit';
    }

    function renderCard(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.draggable = true;
        cardDiv.dataset.cardId = cardData.id; // 存储卡牌ID

        const img = document.createElement('img');
        img.src = `cards/${cardData.imageName}`;
        img.alt = `${cardData.displayRank}${cardData.displaySuit}`;
        img.title = `${cardData.displayRank}${cardData.displaySuit}`;
        cardDiv.appendChild(img);

        cardDiv.addEventListener('dragstart', handleDragStart);
        cardDiv.addEventListener('dragend', handleDragEnd);
        return cardDiv;
    }

    function renderArea(areaName) {
        const area = dunData[areaName];
        area.div.innerHTML = ''; // 清空
        area.cards.forEach(cardObj => {
            const cardElement = renderCard(cardObj);
            area.div.appendChild(cardElement);
        });
        updateDunTypeDisplay(areaName); // 渲染后更新牌型显示
    }

    function handleDragStart(e) {
        draggedCardElement = e.target; // The card div
        const cardId = draggedCardElement.dataset.cardId;
        
        // 找到这张牌在哪个区域
        for (const name in dunData) {
            const card = dunData[name].cards.find(c => c.id === cardId);
            if (card) {
                draggedCardData = card;
                sourceAreaName = name;
                break;
            }
        }
        
        if (draggedCardData) {
            e.dataTransfer.setData('text/plain', cardId);
            setTimeout(() => { // 让拖拽的元素视觉上“消失”
                draggedCardElement.classList.add('dragging');
            }, 0);
        } else {
            e.preventDefault(); // 找不到数据则阻止
        }
    }

    function handleDragEnd(e) {
        if (draggedCardElement) {
            draggedCardElement.classList.remove('dragging');
        }
        draggedCardElement = null;
        draggedCardData = null;
        sourceAreaName = null;
        // 清除所有区域的 drag-over 状态
        Object.values(dunData).forEach(area => area.div.classList.remove('drag-over'));
    }

    function setupDropZones() {
        Object.keys(dunData).forEach(areaName => {
            const area = dunData[areaName];
            area.div.addEventListener('dragover', handleDragOver);
            area.div.addEventListener('dragenter', handleDragEnter);
            area.div.addEventListener('dragleave', handleDragLeave);
            area.div.addEventListener('drop', handleDrop);
        });
    }

    function handleDragOver(e) {
        e.preventDefault(); // 必须, 允许drop
        const targetAreaName = e.currentTarget.dataset.areaName; // data-area-name="hand/head/middle/tail"
        const targetArea = dunData[targetAreaName];

        if (draggedCardData && targetArea.cards.length < targetArea.max) {
             e.dataTransfer.dropEffect = 'move';
        } else {
             e.dataTransfer.dropEffect = 'none'; // 不允许放置
        }
    }

    function handleDragEnter(e) {
        e.preventDefault();
        const targetAreaName = e.currentTarget.dataset.areaName;
        const targetArea = dunData[targetAreaName];
        if (draggedCardData && targetArea.cards.length < targetArea.max) {
            e.currentTarget.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        const targetAreaName = e.currentTarget.dataset.areaName;
        const targetArea = dunData[targetAreaName];
        e.currentTarget.classList.remove('drag-over');

        if (!draggedCardData || !sourceAreaName) return;

        // 如果目标区域已满，并且拖拽的牌不来自该区域 (即不是在区域内排序)
        if (targetArea.cards.length >= targetArea.max && sourceAreaName !== targetAreaName) {
            console.warn(`区域 ${targetArea.name} 已满 (${targetArea.max} 张).`);
            return;
        }
        
        // 从原区域数据模型中移除
        const source = dunData[sourceAreaName];
        const cardIndexInSource = source.cards.findIndex(c => c.id === draggedCardData.id);
        if (cardIndexInSource > -1) {
            source.cards.splice(cardIndexInSource, 1);
        }

        // 添加到目标区域数据模型
        // 如果是从一个墩拖到另一个墩，或者从手牌区拖到墩
        targetArea.cards.push(draggedCardData);
        
        // 重新渲染原区域和目标区域
        renderArea(sourceAreaName);
        renderArea(targetAreaName);

        // 检查所有牌是否都已摆放
        checkAllCardsPlaced();
    }
    
    function checkAllCardsPlaced() {
        const placedCardsCount = dunData.head.cards.length + dunData.middle.cards.length + dunData.tail.cards.length;
        if (placedCardsCount === 13 && dunData.hand.cards.length === 0) {
            // 可以做一些提示，或者自动触发什么
            console.log("所有13张牌已摆放到墩位。");
        }
    }

    function updateDunTypeDisplay(areaName) {
        if (areaName === 'hand') return; // 手牌区不显示牌型

        const area = dunData[areaName];
        if (!area || !area.typeDisplay) return;

        let evaluation = { name: '-' }; // 默认
        if (area.cards.length > 0) {
            if ((areaName === 'head' && area.cards.length === 3) ||
                ((areaName === 'middle' || areaName === 'tail') && area.cards.length === 5)) {
                // 使用 cardUtils.js 中的 evaluateHandArray
                // 注意：cardUtils.js 的 evaluateHandArray 需要能处理3张和5张牌的情况
                evaluation = evaluateHandArray(area.cards); // 这个函数在 cardUtils.js
            } else {
                evaluation.name = `差 ${area.max - area.cards.length} 张`;
            }
        }
        area.typeDisplay.textContent = `(${evaluation.name || '未知'})`;
    }


    async function submitArrangement() {
        if (dunData.hand.cards.length > 0) {
            arrangementResultDiv.textContent = '错误：手牌区还有牌未摆放！';
            arrangementResultDiv.style.color = 'red';
            return;
        }
        if (dunData.head.cards.length !== 3) {
            arrangementResultDiv.textContent = '错误：头墩必须是3张牌！';
            arrangementResultDiv.style.color = 'red';
            return;
        }
        if (dunData.middle.cards.length !== 5) {
            arrangementResultDiv.textContent = '错误：中墩必须是5张牌！';
            arrangementResultDiv.style.color = 'red';
            return;
        }
        if (dunData.tail.cards.length !== 5) {
            arrangementResultDiv.textContent = '错误：尾墩必须是5张牌！';
            arrangementResultDiv.style.color = 'red';
            return;
        }

        arrangementResultDiv.textContent = '正在提交给后端验证...';
        arrangementResultDiv.style.color = 'blue';

        const payload = {
            head: dunData.head.cards.map(c => ({ rank: c.rank, suit: c.suit })),
            middle: dunData.middle.cards.map(c => ({ rank: c.rank, suit: c.suit })),
            tail: dunData.tail.cards.map(c => ({ rank: c.rank, suit: c.suit })),
        };

        try {
            const response = await fetch(API_ENDPOINT_GAME, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }
            
            let resultHTML = "<strong>后端验证结果:</strong><br>";
            resultHTML += `头墩: ${result.head.type.name} (内部值: ${result.head.type.score}, 主牌值: ${result.head.main_card_value})<br>`;
            resultHTML += `中墩: ${result.middle.type.name} (内部值: ${result.middle.type.score}, 主牌值: ${result.middle.main_card_value})<br>`;
            resultHTML += `尾墩: ${result.tail.type.name} (内部值: ${result.tail.type.score}, 主牌值: ${result.tail.main_card_value})<br>`;
            
            if (result.isDaoshui) {
                resultHTML += `<strong style="color:red;">判定: 倒水!</strong><br>`;
                arrangementResultDiv.style.color = 'red';
            } else {
                resultHTML += `<strong style="color:green;">判定: 未倒水 (符合基本规则)</strong><br>`;
                arrangementResultDiv.style.color = 'green';
            }
            if (result.specialType) {
                resultHTML += `特殊牌型: <strong style="color:purple;">${result.specialType}</strong><br>`;
            }
            if (result.comparisons) { // 后端可以返回更详细的比较日志
                resultHTML += "比较过程:<br>";
                resultHTML += `头墩 vs 中墩: ${result.comparisons.head_vs_middle ? '头墩 <= 中墩 (OK)' : '头墩 > 中墩 (倒水!)'}<br>`;
                if (!result.isDaoshui || result.comparisons.middle_vs_tail !== undefined) { // 只有在头不倒水时才显示中尾比较，或者明确有此比较结果
                     resultHTML += `中墩 vs 尾墩: ${result.comparisons.middle_vs_tail ? '中墩 <= 尾墩 (OK)' : '中墩 > 尾墩 (倒水!)'}<br>`;
                }
            }

            arrangementResultDiv.innerHTML = resultHTML;

        } catch (error) {
            arrangementResultDiv.textContent = `提交失败: ${error.message}`;
            arrangementResultDiv.style.color = 'red';
            console.error('Error submitting arrangement:', error);
        }
    }

    // 辅助函数：根据文件名识别扑克牌信息 (用于旧的识别测试，游戏逻辑中已不直接使用)
    function getCardInfoFromFilename(filename) {
        // ... (代码同之前版本)
        if (!filename.endsWith('.svg')) return null;
        const nameWithoutExtension = filename.slice(0, -4);
        const parts = nameWithoutExtension.split('_of_');
        if (parts.length !== 2) return null;
        const rankStr = parts[0]; const suitStr = parts[1];
        if (!ranks.includes(rankStr) || !suits.includes(suitStr)) return null;
        return { originalFilename: filename, suit: suitStr, rank: rankStr, value: rankValues[rankStr],
                 displaySuit: suitSymbols[suitStr], displayRank: rankDisplays[rankStr] || rankStr.toUpperCase(), imageName: filename };
    }
    function runRecognitionTest() {
        // ... (代码同之前版本)
        const testFilenames = ['10_of_clubs.svg', 'ace_of_spades.svg', 'king_of_diamonds.svg', 'queen_of_hearts.svg', 'jack_of_spades.svg','invalid.png'];
        recognitionResultDiv.innerHTML = '<h3>文件名识别示例 (用于卡牌数据生成):</h3><ul>';
        testFilenames.forEach(filename => {
            const cardInfo = getCardInfoFromFilename(filename);
            if (cardInfo) {
                recognitionResultDiv.innerHTML += `<li>${filename} => ${cardInfo.displayRank}${cardInfo.displaySuit}</li>`;
            } else {
                recognitionResultDiv.innerHTML += `<li>${filename} => 无法识别</li>`;
            }
        });
        recognitionResultDiv.innerHTML += '</ul>';
    }
    
    // "测试后端连接" 按钮的事件监听 (代码同之前版本)
    checkBackendButton.addEventListener('click', async () => {
        backendStatusDiv.textContent = '后端状态: 连接中...';
        try {
            const response = await fetch(API_ENDPOINT_STATUS);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            backendStatusDiv.textContent = `后端状态: 已连接 - 消息: ${data.message || JSON.stringify(data)}`;
            backendStatusDiv.style.color = 'green';
        } catch (error) {
            backendStatusDiv.textContent = `后端状态: 连接失败 - ${error.message}`;
            backendStatusDiv.style.color = 'red';
        }
    });

    // 初始化
    dealButton.addEventListener('click', dealNewHand);
    submitArrangementButton.addEventListener('click', submitArrangement);
    
    runRecognitionTest(); // 运行旧的识别测试
    setupDropZones();     // 设置拖放区域
    dealNewHand();        // 页面加载后自动发牌
});

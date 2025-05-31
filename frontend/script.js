// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- 常量和DOM元素获取 (与之前相同，增加新按钮) ---
    const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; 
    const CARD_IMAGE_BASE_PATH = './cards/';
    const HAND_TYPES = { /* ... */ };
    const SUIT_VALUES = { /* ... */ };

    const dealButton = document.getElementById('dealButton');
    const frontHandDiv = document.getElementById('frontHand');
    const playerHandOrMiddleDeckDiv = document.getElementById('playerHandOrMiddleDeck');
    const backHandDiv = document.getElementById('backHand');
    const messageArea = document.getElementById('messageArea');
    const submitArrangementButton = document.getElementById('submitArrangement');
    
    const aiArrangeButton = document.getElementById('aiArrangeButton'); // 新
    const ai托管Button = document.getElementById('ai托管Button');   // 新
    const ai托管RoundsSelect = document.getElementById('ai托管Rounds'); // 新
    
    // --- 状态变量 ---
    let currentHandData = []; // 存储当前玩家手牌的数据对象数组
    let draggedCardElement = null; 
    let isMiddleDeckActive = false;
    let ai托管RemainingRounds = 0; // AI托管剩余局数
    let isAi托管Active = false;

    // --- 辅助函数：标签重建 (与之前相同) ---
    const recreateLabelsInZone = (zone, mainLabelHTML, secondaryLabelHTML = '') => { /* ... */ };

    // --- 核心功能函数 ---
    async function fetchNewHand(isAiCall = false) { // 添加 isAiCall 参数
        console.log("FN: Resetting state. isAiCall:", isAiCall);
        isMiddleDeckActive = false; 
        messageArea.textContent = '正在发牌...';
        messageArea.className = ''; 
        dealButton.disabled = true;
        aiArrangeButton.style.display = 'none'; // 发牌时先隐藏
        ai托管Button.style.display = 'none';
        ai托管RoundsSelect.style.display = 'none';
        submitArrangementButton.style.display = 'none';
        submitArrangementButton.disabled = true;

        // ... (标签重建与之前相同) ...
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
            if (!data || !Array.isArray(data.hand)) throw new Error('后端返回手牌数据无效');
            
            currentHandData = data.hand.map(card => ({/* ... (数据处理) ... */})).filter(card => card && card.rank && card.suit);

            if (currentHandData.length !== 13) { /* ... (警告) ... */ }

            displayAndSortHand(currentHandData); // 显示并整理手牌
            
            if (!isAi托管Active) { // 如果不是AI托管中，显示AI按钮
                aiArrangeButton.style.display = 'inline-block';
                ai托管Button.style.display = 'inline-block';
                ai托管RoundsSelect.style.display = 'inline-block';
            }
            
            messageArea.textContent = '发牌完成！';
            if (!isAi托管Active) {
                 messageArea.textContent += '请摆牌或使用AI分牌。';
            }
            messageArea.className = 'success';

            if (isAiCall && isAi托管Active) { // 如果是AI托管调用的发牌
                console.log("FN: AI托管中，自动进行AI分牌。");
                await delay(500); // 短暂延迟，模拟思考
                handleAiArrange(); // AI自动分牌
            }

        } catch (error) { 
            console.error('获取手牌失败:', error);
            messageArea.textContent = `获取手牌失败: ${error.message}.`;
            messageArea.className = 'error';
            if (isAi托管Active) stopAi托管("获取手牌失败，取消托管。");
        } 
        finally { 
            if (!isAi托管Active) dealButton.disabled = false; 
            updateUIState(); 
        }
    }

    function displayAndSortHand(handDataArray) { /* ... (与之前相同，负责清空和显示排序后的手牌) ... */ }
    function createCardElement(cardData, draggable) { /* ... (与之前相同，依赖 draggable 参数) ... */ }
    function handleDragStart(event) { /* ... (与之前相同) ... */ }
    function handleDragEnd(event) { /* ... (与之前相同) ... */ }
    
    [frontHandDiv, playerHandOrMiddleDeckDiv, backHandDiv].forEach(zone => {
        addDropZoneListeners(zone, zone === playerHandOrMiddleDeckDiv);
    });
    function addDropZoneListeners(zone, isPlayerHandZone) { /* ... (与之前相同) ... */ }

    function updateUIState() { /* ... (与之前相同，负责根据牌数更新 isMiddleDeckActive 和相关UI，包括卡牌拖拽性) ... */ }
    
    function handleSubmitArrangement(isAiCall = false) { // 添加 isAiCall 参数
        console.log("HS: Submitting arrangement. isAiCall:", isAiCall);
        // ... (牌型验证和墩序比较逻辑与之前相同) ...
        let message = `...`; // 牌型结果
        let isValidOrder = true; // ...
        
        // ... (计算牌型和墩序) ...
        
        if (isValidOrder) { /* ... */ } else { /* ... */ }
        messageArea.innerHTML = message; 
        
        if (!isAi托管Active) { // 如果不是AI托管，正常禁用按钮
            dealButton.disabled = true;
            aiArrangeButton.style.display = 'none';
        }
        submitArrangementButton.disabled = true;
        submitArrangementButton.style.display = 'none'; // 提交后隐藏

        setTimeout(async () => { // 改为 async 以便在 AI 托管时 await fetchNewHand
            if (isAi托管Active && ai托管RemainingRounds > 0) {
                ai托管RemainingRounds--;
                messageArea.textContent = `AI托管：剩余 ${ai托管RemainingRounds} 局。正在开始下一局...`;
                console.log(`HS: AI托管，剩余 ${ai托管RemainingRounds} 局。`);
                if (ai托管RemainingRounds > 0) {
                    await delay(1000); // 下一局开始前的延迟
                    await fetchNewHand(true); // AI调用发牌
                } else {
                    stopAi托管("托管局数已完成。");
                }
            } else if (isAi托管Active && ai托管RemainingRounds <= 0) {
                stopAi托管("托管局数已完成。");
            } else { // 非托管模式
                dealButton.disabled = false;
                aiArrangeButton.style.display = 'inline-block'; // 重新显示AI分牌按钮
                messageArea.textContent = '可以重新发牌开始新的一局。';
                messageArea.className = '';
                // ... (重置UI状态，如标签和清空牌区，与之前类似) ...
            }
        }, isAiCall ? 1500 : 7000); // AI调用时结果显示时间短一点
    }

    // --- AI 功能 ---
    function handleAiArrange() {
        console.log("AI: Attempting to arrange cards.");
        if (currentHandData.length !== 13) {
            messageArea.textContent = "AI错误：手牌不完整！";
            messageArea.className = "error";
            return;
        }
        if (isMiddleDeckActive) { // 如果已经是中墩状态，AI不操作
            console.log("AI: Middle deck already active, AI will not rearrange.");
            if (isAi托管Active) handleSubmitArrangement(true); // AI托管时直接提交
            return;
        }

        // 1. 清空所有墩区的现有牌 (放回手牌数据池，如果需要从部分摆放开始)
        // 为了简单，我们总是从13张手牌开始为AI摆牌
        // (确保 currentHandData 是当前可用的13张牌)
        // 如果牌已经在墩里，需要先收集回 currentHandData
        let allCardsForAI = [...currentHandData]; // 假设 currentHandData 总是最新的13张牌
        
        // 实际项目中，如果允许用户先摆一部分再AI，需要从各墩收集牌
        // clearDunsAndReturnToHand(); // 一个假设的函数
        // allCardsForAI = getFullHandDataFromUI();


        // 2. AI 摆牌逻辑 (这是核心，目前是占位符)
        const arrangement = findBestArrangement(allCardsForAI); // 这是需要实现的复杂函数

        if (arrangement) {
            console.log("AI: Found arrangement:", arrangement);
            // 3. 将AI找到的牌型摆放到界面上
            placeArrangementOnBoard(arrangement);
            // 4. 更新UI状态（会检查是否形成中墩，并显示提交按钮）
            updateUIState(); 
            messageArea.textContent = "AI已分牌！";
            messageArea.className = "success";

            if (isAi托管Active) {
                console.log("AI: AI托管中，自动提交牌型。");
                setTimeout(() => handleSubmitArrangement(true), 500); // AI托管时自动提交
            }

        } else {
            console.log("AI: Could not find a valid arrangement.");
            messageArea.textContent = "AI未能找到合适的牌型。";
            messageArea.className = "error";
            if (isAi托管Active) stopAi托管("AI无法分牌，取消托管。");
        }
    }

    /**
     * AI摆牌核心逻辑 (占位符 - 需要复杂实现)
     * @param {Array<Object>} hand - 13张手牌数据对象数组
     * @returns {Object|null} 返回一个包含 front, middle, back 牌墩的对象，或null
     */
    function findBestArrangement(hand) {
        // 这是一个非常复杂的部分。十三水AI需要：
        // 1. 枚举所有可能的13张牌分成3-5-5墩的组合方式（组合数巨大）
        // 2. 对每种组合，识别三墩的牌型
        // 3. 验证墩序是否合法（头 <= 中 <= 尾）
        // 4. （可选）对合法的摆法进行评分，选择分数最高的
        // 5. （可选）加入随机性或多种策略

        // 简化版AI：
        // - 尝试优先凑出最大的尾墩，然后中墩，最后头墩
        // - 或者反过来，先凑特殊牌型（如三同花顺、一条龙等，如果实现了）

        // ---------------------------------------------------------------------
        // 这是一个非常非常基础的、随机尝试的占位符AI，几乎肯定不是最优的
        // 真正的AI需要复杂的算法和大量的牌型组合判断
        // ---------------------------------------------------------------------
        console.log("AI_findBest: Starting with hand:", hand);
        let attempts = 0;
        const MAX_ATTEMPTS = 1000; // 防止无限循环

        while (attempts < MAX_ATTEMPTS) {
            attempts++;
            let remainingCards = [...hand];
            shuffleArray(remainingCards); // 打乱牌序以尝试不同组合

            const back = remainingCards.slice(0, 5);
            const middle = remainingCards.slice(5, 10);
            const front = remainingCards.slice(10, 13);

            if (front.length === 3 && middle.length === 5 && back.length === 5) {
                const frontDetails = getHandDetails(front);
                const middleDetails = getHandDetails(middle);
                const backDetails = getHandDetails(back);

                const frontVsMiddle = compareHands(middleDetails, frontDetails);
                const middleVsBack = compareHands(backDetails, middleDetails);

                if (frontVsMiddle !== -1 && middleVsBack !== -1) { // 合法墩序
                    console.log(`AI_findBest: Found valid arrangement (attempt ${attempts}):`, { front, middle, back });
                    return { front, middle, back };
                }
            }
        }
        console.log("AI_findBest: Failed to find a valid arrangement after MAX_ATTEMPTS.");
        return null; // 简化版：如果随机尝试多次失败，则返回null
    }

    function placeArrangementOnBoard(arrangement) {
        // 清空所有牌区（保留标签）
        clearAllDecksDOM();

        // 放置头墩
        arrangement.front.forEach(cardData => {
            frontHandDiv.appendChild(createCardElement(cardData, false)); // AI摆的牌初始不可拖动
        });
        // 放置中墩 (到 playerHandOrMiddleDeckDiv)
        arrangement.middle.forEach(cardData => {
            playerHandOrMiddleDeckDiv.appendChild(createCardElement(cardData, false));
        });
        // 放置尾墩
        arrangement.back.forEach(cardData => {
            backHandDiv.appendChild(createCardElement(cardData, false));
        });
    }
    
    function clearAllDecksDOM() {
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');
        
        frontHandDiv.innerHTML = '<h3 class="deck-label">头墩 (3张)</h3>';
        playerHandOrMiddleDeckDiv.innerHTML = ''; // 先完全清空
        if(handTitleEl) playerHandOrMiddleDeckDiv.appendChild(handTitleEl); // 重新添加，状态由 updateUIState 管理
        if(middleLabelEl) playerHandOrMiddleDeckDiv.appendChild(middleLabelEl);
        backHandDiv.innerHTML = '<h3 class="deck-label">尾墩 (5张)</h3>';
    }


    // --- AI 托管功能 ---
    function startAi托管() {
        const rounds = parseInt(ai托管RoundsSelect.value);
        if (rounds === 0) { // 选择取消托管
            stopAi托管("手动取消托管。");
            return;
        }
        if (rounds > 0) {
            isAi托管Active = true;
            ai托管RemainingRounds = rounds;
            messageArea.textContent = `AI托管已启动，将进行 ${rounds} 局。`;
            messageArea.className = "info";
            console.log(`AI托管启动，共 ${rounds} 局。`);

            // 禁用手动操作按钮
            dealButton.disabled = true;
            aiArrangeButton.style.display = 'none';
            ai托管Button.textContent = "取消托管"; // 按钮文字变为取消
            ai托管RoundsSelect.disabled = true; // 托管期间禁止修改局数

            // 如果当前有手牌，AI先处理当前局
            if (currentHandData.length === 13 && !isMiddleDeckActive) {
                console.log("AI托管：处理当前手牌。");
                handleAiArrange();
            } else if (currentHandData.length === 0 || isMiddleDeckActive) { // 如果没牌或已摆好，开始新的一局
                console.log("AI托管：开始新的一局。");
                fetchNewHand(true); // AI调用发牌
            }
        }
    }

    function stopAi托管(reason = "AI托管已停止。") {
        isAi托管Active = false;
        ai托管RemainingRounds = 0;
        messageArea.textContent = reason;
        messageArea.className = "info";
        console.log(reason);

        dealButton.disabled = false;
        aiArrangeButton.style.display = 'inline-block';
        ai托管Button.textContent = "AI托管";
        ai托管RoundsSelect.disabled = false;
        ai托管RoundsSelect.value = "0"; // 重置选择为取消
    }

    // --- 工具函数 ---
    function shuffleArray(array) { /* Fisher-Yates shuffle */ /* ... */ }
    function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    function getCardValue(rank) { /* ... */ }
    function getSuitValue(suit) { /* ... */ }
    function getHandDetails(cardsData) { /* ... (确保此函数健壮) ... */ }
    function compareHands(hand1Details, hand2Details) { /* ... */ }
    
    // --- 事件绑定 ---
    dealButton.addEventListener('click', () => fetchNewHand(false)); // 手动发牌
    submitArrangementButton.addEventListener('click', () => handleSubmitArrangement(false)); // 手动提交
    aiArrangeButton.addEventListener('click', handleAiArrange);
    ai托管Button.addEventListener('click', () => {
        if (isAi托管Active) {
            stopAi托管("手动取消托管。");
        } else {
            startAi托管();
        }
    });
    ai托管RoundsSelect.addEventListener('change', () => { // 如果在非托管状态下更改选择，可以提示用户点击托管按钮
        if (!isAi托管Active && parseInt(ai托管RoundsSelect.value) > 0) {
            messageArea.textContent = `已选择托管 ${ai托管RoundsSelect.value} 局，请点击“AI托管”按钮开始。`;
            messageArea.className = "info";
        } else if (!isAi托管Active && parseInt(ai托管RoundsSelect.value) === 0) {
             messageArea.textContent = "";
             messageArea.className = "";
        }
    });

    // --- 初始调用 ---
    updateUIState();
});

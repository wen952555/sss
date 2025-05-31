// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('playerHand');
    const frontHandDiv = document.getElementById('frontHand');
    const middleHandDiv = document.getElementById('middleHand');
    const backHandDiv = document.getElementById('backHand');
    const dropZones = [frontHandDiv, middleHandDiv, backHandDiv];
    const messageArea = document.getElementById('messageArea');
    const cardCountSpan = document.getElementById('card-count');
    const submitArrangementButton = document.getElementById('submitArrangement');

    // ================== 主要修改点 ==================
    // 将 'http://' 修改为 'https://'
    // 请确保 'https://9525.ip-ddns.com/api.php' 是您后端API实际可访问的HTTPS地址
    const BACKEND_API_URL = 'https://9525.ip-ddns.com/api.php'; 
    // ================================================

    const CARD_IMAGE_BASE_PATH = './cards/'; // SVG图片相对于index.html的路径

    let currentHand = []; // 存储当前手牌数据
    let draggedCard = null; // 当前拖动的卡牌元素
    let draggedCardData = null; // 当前拖动卡牌的数据

    dealButton.addEventListener('click', fetchNewHand);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement);

    async function fetchNewHand() {
        messageArea.textContent = '正在发牌...';
        messageArea.className = ''; // 清除样式
        dealButton.disabled = true;
        submitArrangementButton.style.display = 'none';

        // 清空所有区域
        playerHandDiv.innerHTML = '';
        dropZones.forEach(zone => zone.innerHTML = '');
        cardCountSpan.textContent = '0';

        try {
            const response = await fetch(BACKEND_API_URL); // 现在使用 HTTPS 地址
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            currentHand = data.hand;
            displayHand(currentHand);
            messageArea.textContent = '发牌完成！请将手牌拖拽到对应牌墩。';
            messageArea.className = 'success';
        } catch (error) {
            console.error('获取手牌失败:', error);
            // 错误信息现在会更准确地反映 fetch 失败的原因 (如果仍有问题)
            messageArea.textContent = `获取手牌失败: ${error.message}. 请检查后端API (${BACKEND_API_URL}) 是否可以通过HTTPS正常访问，以及CORS设置是否正确。`;
            messageArea.className = 'error';
        } finally {
            dealButton.disabled = false;
        }
    }

    function displayHand(hand) {
        playerHandDiv.innerHTML = ''; // 清空现有手牌
        hand.forEach(cardData => {
            const cardElement = createCardElement(cardData);
            playerHandDiv.appendChild(cardElement);
        });
        updateCardCount();
        checkArrangementCompletion();
    }

    function createCardElement(cardData) {
        const img = document.createElement('img');
        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file}`;
        img.alt = `${cardData.rank} of ${cardData.suit}`;
        img.classList.add('card');
        img.draggable = true; 
        img.dataset.cardId = cardData.card_id; 
        img.cardData = cardData; 

        img.addEventListener('dragstart', (event) => {
            draggedCard = event.target;
            draggedCardData = event.target.cardData;
            event.target.classList.add('dragging');
        });

        img.addEventListener('dragend', (event) => {
            event.target.classList.remove('dragging');
            draggedCard = null;
            draggedCardData = null;
        });
        return img;
    }

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault(); 
            const maxCards = parseInt(zone.dataset.maxCards);
            if (zone.children.length < maxCards) {
                zone.classList.add('over');
            }
        });

        zone.addEventListener('dragleave', (event) => {
            zone.classList.remove('over');
        });

        zone.addEventListener('drop', (event) => {
            event.preventDefault();
            zone.classList.remove('over');
            const maxCards = parseInt(zone.dataset.maxCards);

            if (draggedCard && zone.children.length < maxCards) {
                if (draggedCard.parentElement !== playerHandDiv && draggedCard.parentElement !== zone) {
                    if (dropZones.includes(draggedCard.parentElement)) {
                        draggedCard.parentElement.removeChild(draggedCard);
                    }
                }
                else if (draggedCard.parentElement === playerHandDiv) {
                     playerHandDiv.removeChild(draggedCard);
                }
                zone.appendChild(draggedCard); 
                updateCardCount();
                checkArrangementCompletion();
            } else if (draggedCard) {
                messageArea.textContent = `这个牌墩已满 (${maxCards}张)!`;
                messageArea.className = 'error';
            }
        });
    });
    
    playerHandDiv.addEventListener('dragover', (event) => {
        event.preventDefault();
        playerHandDiv.classList.add('over');
    });
    playerHandDiv.addEventListener('dragleave', (event) => {
        playerHandDiv.classList.remove('over');
    });
    playerHandDiv.addEventListener('drop', (event) => {
        event.preventDefault();
        playerHandDiv.classList.remove('over');
        if (draggedCard && draggedCard.parentElement !== playerHandDiv) {
            if (dropZones.includes(draggedCard.parentElement)) {
                draggedCard.parentElement.removeChild(draggedCard);
            }
            playerHandDiv.appendChild(draggedCard);
            updateCardCount();
            checkArrangementCompletion();
        }
    });

    function updateCardCount() {
        cardCountSpan.textContent = playerHandDiv.children.length;
    }

    function checkArrangementCompletion() {
        const frontCount = frontHandDiv.children.length;
        const middleCount = middleHandDiv.children.length;
        const backCount = backHandDiv.children.length;

        if (frontCount === 3 && middleCount === 5 && backCount === 5) {
            submitArrangementButton.style.display = 'block';
            messageArea.textContent = '牌已摆好，可以确认牌型了！';
            messageArea.className = 'success';
        } else {
            submitArrangementButton.style.display = 'none';
        }
    }
    
    function handleSubmitArrangement() {
        const frontCards = Array.from(frontHandDiv.children).map(c => c.cardData.card_id);
        const middleCards = Array.from(middleHandDiv.children).map(c => c.cardData.card_id);
        const backCards = Array.from(backHandDiv.children).map(c => c.cardData.card_id);

        console.log("头墩:", frontCards);
        console.log("中墩:", middleCards);
        console.log("尾墩:", backCards);

        if (frontCards.length !== 3 || middleCards.length !== 5 || backCards.length !== 5) {
             messageArea.textContent = '牌墩数量不正确！头墩3张，中墩5张，尾墩5张。';
             messageArea.className = 'error';
             return;
        }

        messageArea.textContent = '牌型已确认！(计分逻辑待实现)';
        messageArea.className = 'success';
        dealButton.disabled = true;
        submitArrangementButton.disabled = true;

        setTimeout(() => {
            dealButton.disabled = false;
            submitArrangementButton.disabled = false;
            submitArrangementButton.style.display = 'none';
            messageArea.textContent = '可以重新发牌开始新的一局。';
            messageArea.className = '';
        }, 3000);
    }
});

// --- UI 辅助函数 ---
const playerCardsContainer = document.getElementById('player-hand-cards');
const frontDunEl = document.getElementById('front-dun');
const middleDunEl = document.getElementById('middle-dun');
const backDunEl = document.getElementById('back-dun');
const dunElements = { front: frontDunEl, middle: middleDunEl, back: backDunEl };

// 牌面英文到中文/SVG文件名的映射
function getCardRankForImage(rank) {
    const rankMap = { 'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack', 'T': '10' };
    return rankMap[rank] || rank;
}
function getCardSuitForImage(suit) {
    const suitMap = { 'S': 'spades', 'H': 'hearts', 'D': 'diamonds', 'C': 'clubs' };
    return suitMap[suit.toUpperCase()];
}

function createCardElement(card, cardId) { // card = {rank: 'A', suit: 'S'}
    const el = document.createElement('div');
    el.classList.add('card');
    el.id = cardId || cardToId(card); // 使用 rank+suit 作为ID, e.g., "AS" for Ace of Spades
    el.draggable = true;
    
    // SVG 文件名约定：ace_of_spades.svg, 10_of_clubs.svg
    const rankName = getCardRankForImage(card.rank);
    const suitName = getCardSuitForImage(card.suit);
    const svgFilename = `${rankName}_of_${suitName}.svg`.toLowerCase();
    
    el.style.backgroundImage = `url(assets/cards/${svgFilename})`;
    // el.textContent = `${card.rank}${SUIT_NAMES[card.suit]}`; // Fallback or for debugging

    el.addEventListener('dragstart', handleDragStart);
    return el;
}

function renderPlayerHand(handCards) { // handCards = array of {rank, suit}
    playerCardsContainer.innerHTML = '';
    handCards.forEach(card => {
        playerCardsContainer.appendChild(createCardElement(card));
    });
}

function renderDun(dunName, cards) { // dunName: 'front', 'middle', 'back'
    const dunEl = dunElements[dunName];
    dunEl.innerHTML = '';
    cards.forEach(card => {
        dunEl.appendChild(createCardElement(card));
    });
    // 更新牌型显示 (需要 game_rules.js 中的 evaluateHandDisplay)
    const dunTypeEl = document.getElementById(`${dunName}-dun-type`);
    if (dunTypeEl && typeof evaluateHandDisplay === 'function') {
        dunTypeEl.textContent = evaluateHandDisplay(cards) || '';
    }
}

function displayResults(resultData, playerId) {
    const opponentId = Object.keys(resultData.scores).find(id => id !== playerId);

    document.getElementById('results-area').style.display = 'block';
    
    const displayHandDetails = (playerKey, handEval) => {
        return `${handEval.name} (${handEval.kickers.map(k => RANK_VALUES_INV[k] || k).join(',')})`;
    };

    // 构造 RANK_VALUES_INV 用于显示牌面
    const RANK_VALUES_INV = Object.fromEntries(Object.entries(RANK_VALUES).map(([key, value]) => [value, key]));

    if (resultData.last_round_details && resultData.last_round_details[playerId]) {
        const pResult = resultData.last_round_details[playerId];
        document.getElementById('player-front-result').textContent = displayHandDetails('player', pResult.front);
        document.getElementById('player-middle-result').textContent = displayHandDetails('player', pResult.middle);
        document.getElementById('player-back-result').textContent = displayHandDetails('player', pResult.back);
    }
    if (resultData.last_round_details && resultData.last_round_details[opponentId]) {
        const oResult = resultData.last_round_details[opponentId];
        document.getElementById('opponent-front-result').textContent = displayHandDetails('opponent', oResult.front);
        document.getElementById('opponent-middle-result').textContent = displayHandDetails('opponent', oResult.middle);
        document.getElementById('opponent-back-result').textContent = displayHandDetails('opponent', oResult.back);
    }

    if (resultData.last_round_details) {
        const scoreChange = resultData.last_round_details.score_change[playerId];
        document.getElementById('score-change-info').textContent = `本局得分: ${scoreChange}`;
        document.getElementById('da-qiang-info').textContent = resultData.last_round_details.is_da_qiang ? "恭喜打枪！" : "";
    }
    
    document.getElementById('player-score').textContent = resultData.scores[playerId];
    document.getElementById('cpu-score').textContent = resultData.scores[opponentId];
}


// --- Drag and Drop Logic ---
let draggedCard = null;

function handleDragStart(event) {
    draggedCard = event.target;
    event.dataTransfer.setData('text/plain', event.target.id);
    event.target.classList.add('dragging');
}

function handleDragOver(event) {
    event.preventDefault(); // Necessary to allow dropping
    const dropZone = event.currentTarget;
    if (dropZone.classList.contains('drop-zone')) {
        dropZone.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const dropZone = event.currentTarget;
    if (dropZone.classList.contains('drop-zone')) {
        dropZone.classList.remove('drag-over');
    }
}

function handleDrop(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    dropZone.classList.remove('drag-over');

    if (draggedCard && dropZone.classList.contains('drop-zone')) {
        const maxCards = parseInt(dropZone.dataset.max);
        if (dropZone.children.length < maxCards) {
            dropZone.appendChild(draggedCard);
        } else {
            // Optional: Notify user zone is full or send back to hand
            playerCardsContainer.appendChild(draggedCard); // Send back if full
            Telegram.WebApp.showAlert(`此墩已满 (${maxCards}张)`);
        }
    } else if (draggedCard && dropZone.id === 'player-hand-cards') { // Dropping back to hand
        playerCardsContainer.appendChild(draggedCard);
    }
    
    if (draggedCard) {
        draggedCard.classList.remove('dragging');
    }
    draggedCard = null;
    updateAllDunTypes(); // Update牌型显示
}

function setupDragAndDrop() {
    const dropZones = document.querySelectorAll('.drop-zone, #player-hand-cards');
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
    });
}

function updateAllDunTypes() {
    ['front', 'middle', 'back'].forEach(dunName => {
        const dunEl = dunElements[dunName];
        const cardsInDun = Array.from(dunEl.children).map(cardEl => idToCard(cardEl.id));
        const dunTypeEl = document.getElementById(`${dunName}-dun-type`);
        if (dunTypeEl && typeof evaluateHandDisplay === 'function') {
            dunTypeEl.textContent = evaluateHandDisplay(cardsInDun) || '';
        }
    });
}

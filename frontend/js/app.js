const tg = window.Telegram.WebApp;
tg.ready(); // Inform Telegram the app is ready
tg.expand(); // Expand the Mini App to full height

const BACKEND_URL = 'https://9525.ip-ddns.com/api/thirteen/'; // 你的后端API路径
let CURRENT_GAME_ID = null;
let PLAYER_ID = tg.initDataUnsafe?.user?.id?.toString() || `guest_${Date.now()}`; // Get user ID or generate guest
let INITIAL_HAND = []; // Store the initially dealt hand to reset arrangement

const createGameBtn = document.getElementById('create-game-btn');
const submitArrangementBtn = document.getElementById('submit-arrangement-btn');
const resetArrangementBtn = document.getElementById('reset-arrangement-btn');
const gameStatusEl = document.getElementById('game-status');
const playerScoreEl = document.getElementById('player-score');
const cpuScoreEl = document.getElementById('cpu-score');
const resultsAreaEl = document.getElementById('results-area');
const loadingIndicator = document.getElementById('loading-indicator');

function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
}

async function apiCall(action, data = {}, method = 'POST') {
    showLoading(true);
    try {
        const url = `${BACKEND_URL}?action=${action}`;
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (method === 'POST') {
            // Always include player_id and game_id (if available) in POST body
            options.body = JSON.stringify({ ...data, player_id: PLAYER_ID, game_id: CURRENT_GAME_ID });
        } else { // GET, append to URL for game_id and player_id if needed
            // For GET, action like get_state might need game_id and player_id in query params
            // The current PHP router handles this by checking $input or $_GET
        }
        
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'HTTP error: ' + response.status }));
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }
        const responseData = await response.json();
        showLoading(false);
        return responseData;
    } catch (error) {
        showLoading(false);
        console.error(`API call to ${action} failed:`, error);
        tg.showAlert(`操作失败: ${error.message}`);
        return { success: false, message: error.message };
    }
}

function updateUIFromGameState(gameState) {
    if (!gameState || !gameState.success) {
        gameStatusEl.textContent = gameState.message || '错误';
        return;
    }

    CURRENT_GAME_ID = gameState.game_id;
    gameStatusEl.textContent = gameState.status;
    
    const currentPlayerStatus = gameState.players_status?.[PLAYER_ID];
    const opponentId = Object.keys(gameState.players_status || {}).find(id => id !== PLAYER_ID);
    const opponentStatus = opponentId ? gameState.players_status[opponentId] : null;

    if (gameState.scores) {
        playerScoreEl.textContent = gameState.scores[PLAYER_ID] || 0;
        if (opponentId) {
            cpuScoreEl.textContent = gameState.scores[opponentId] || 0;
        }
    }

    if (gameState.status === 'arranging') {
        createGameBtn.style.display = 'none';
        submitArrangementBtn.style.display = 'block';
        resetArrangementBtn.style.display = 'block';
        resultsAreaEl.style.display = 'none';

        if (currentPlayerStatus && currentPlayerStatus.hand && (!document.getElementById('player-hand-cards').hasChildNodes() || INITIAL_HAND.length === 0) ) {
            INITIAL_HAND = JSON.parse(JSON.stringify(currentPlayerStatus.hand)); // Deep copy
            renderPlayerHand(INITIAL_HAND);
        }
         // Clear duns if not already cleared or if starting fresh
        if (document.getElementById('front-dun').childNodes.length === 0 &&
            document.getElementById('middle-dun').childNodes.length === 0 &&
            document.getElementById('back-dun').childNodes.length === 0) {
             renderPlayerHand(INITIAL_HAND); // Ensure hand is populated for reset
        }


    } else if (gameState.status === 'comparing') {
        gameStatusEl.textContent = '比牌中...请稍候';
        submitArrangementBtn.style.display = 'none';
        resetArrangementBtn.style.display = 'none';
        // Could poll here for 'finished' status
        setTimeout(() => apiCall('get_state', {}, 'POST').then(updateUIFromGameState), 2000); // Poll after 2s
    } else if (gameState.status === 'finished') {
        createGameBtn.style.display = 'block'; // Allow starting a new game
        submitArrangementBtn.style.display = 'none';
        resetArrangementBtn.style.display = 'none';
        displayResults(gameState, PLAYER_ID);
    }

    // Disable submit button if already submitted
    if (currentPlayerStatus && currentPlayerStatus.submitted) {
        submitArrangementBtn.disabled = true;
        resetArrangementBtn.disabled = true;
        gameStatusEl.textContent += " (已提交，等待CPU...)";
    } else {
        submitArrangementBtn.disabled = false;
        resetArrangementBtn.disabled = false;
    }
}


createGameBtn.addEventListener('click', async () => {
    const response = await apiCall('create_game', { player_id: PLAYER_ID });
    if (response.success) {
        CURRENT_GAME_ID = response.game_id;
        INITIAL_HAND = JSON.parse(JSON.stringify(response.player_hand)); // Deep copy
        renderPlayerHand(INITIAL_HAND); // Display the hand dealt by backend
        // Clear duns
        ['front', 'middle', 'back'].forEach(dunKey => {
            dunElements[dunKey].innerHTML = '';
            document.getElementById(`${dunKey}-dun-type`).textContent = '';
        });
        updateUIFromGameState({ // Initial state after creation
            success: true,
            game_id: CURRENT_GAME_ID,
            status: 'arranging',
            players_status: { [PLAYER_ID]: { hand: INITIAL_HAND, submitted: false } },
            scores: { [PLAYER_ID]: 0, 'cpu': 0 } // Assuming CPU starts at 0
        });
    }
});

submitArrangementBtn.addEventListener('click', async () => {
    const arrangement = { front: [], middle: [], back: [] };
    let totalCardsInDuns = 0;

    for (const dunName in dunElements) {
        const dunEl = dunElements[dunName];
        const cardsInDun = Array.from(dunEl.children).map(cardEl => idToCard(cardEl.id));
        arrangement[dunName] = cardsInDun;
        totalCardsInDuns += cardsInDun.length;
    }

    if (totalCardsInDuns !== 13) {
        tg.showAlert('请将13张牌全部摆放到牌墩中。');
        return;
    }
    if (arrangement.front.length !== 3 || arrangement.middle.length !== 5 || arrangement.back.length !== 5) {
        tg.showAlert('头道3张，中道5张，尾道5张，请检查牌数。');
        return;
    }

    // The actual validation of hand strength order (front <= middle <= back) is done on the backend
    // but you could add a client-side check here using game_rules.js for quicker feedback.

    const response = await apiCall('submit_arrangement', arrangement);
    updateUIFromGameState(response);
});

resetArrangementBtn.addEventListener('click', () => {
    // Clear duns
    ['front', 'middle', 'back'].forEach(dunKey => {
        dunElements[dunKey].innerHTML = '';
        document.getElementById(`${dunKey}-dun-type`).textContent = '';
    });
    // Re-render hand from initial deal
    renderPlayerHand(INITIAL_HAND);
});


// Initialization
function initApp() {
    tg.MainButton.setText("十三水游戏"); // Example main button
    // tg.MainButton.show();
    // tg.MainButton.onClick(() => { /* ... */ });

    setupDragAndDrop(); // Initialize drag and drop listeners

    // Optionally, try to load existing game state if game_id is known (e.g., from URL params)
    // const urlParams = new URLSearchParams(window.location.search);
    // const gameIdFromParam = urlParams.get('game_id');
    // if (gameIdFromParam) {
    //     CURRENT_GAME_ID = gameIdFromParam;
    //     apiCall('get_state', { game_id: CURRENT_GAME_ID, player_id: PLAYER_ID }, 'GET')
    //         .then(updateUIFromGameState);
    // }
    
    // Show the create game button initially
    createGameBtn.style.display = 'block';
    submitArrangementBtn.style.display = 'none';
    resetArrangementBtn.style.display = 'none';
    resultsAreaEl.style.display = 'none';
}

initApp();

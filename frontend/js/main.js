// frontend/js/main.js
import { showGameMessage, configureButton } from './ui.js';
import { fetchDealCards, fetchSubmitArrangement, fetchAISuggestion } from './api.js'; // Assuming api.js exists
import {
    initializeArrangeUIDependencies,
    initializeArrangement,
    resetArrangement,
    getArrangedPilesData,
    setupPileClickHandlers,
    clearBoardForNewGame,
    applyAISuggestion
} from './arrange.js'; // Assuming arrange.js exists

// --- Global State Variables ---
let dealCardsBtn, resetArrangementBtn, submitArrangementBtn, aiSuggestBtn, roomInput, joinRoomBtn, createRoomBtn, chatInput, sendChatBtn; // UI Elements
let websocket = null;
let currentRoomCode = null;
let myUserId = null;
let myUsername = "玩家";
let roomPlayers = []; // Array of {userId, username, seat, isReady, hasSubmitted (client-side flag)}
let currentRawHand = []; // Stores [{rank, suit}, ...] from server
let aiSuggestedHashes = [];

// --- Initialization Functions ---
function initializeUserIdentity() {
    const storedUserId = localStorage.getItem('十三水_userId');
    const storedUsername = localStorage.getItem('十三水_username');

    if (storedUserId && storedUsername) {
        myUserId = parseInt(storedUserId);
        myUsername = storedUsername;
    } else {
        const inputId = prompt("首次使用，请输入您的用户ID (数字，例如101):", Math.floor(Math.random() * 900) + 100);
        if (inputId === null) { showGameMessage("需要用户ID才能开始游戏。", "error"); return false; }
        myUserId = parseInt(inputId);

        const inputName = prompt("请输入您的昵称:", "玩家" + myUserId);
        if (inputName === null) { showGameMessage("需要昵称才能开始游戏。", "error"); return false; }
        myUsername = inputName.trim() || "玩家" + myUserId;

        if (isNaN(myUserId) || !myUsername) {
            showGameMessage("无效的用户ID或昵称。", "error"); myUserId = null; myUsername = "玩家"; return false;
        }
        localStorage.setItem('十三水_userId', myUserId.toString());
        localStorage.setItem('十三水_username', myUsername);
    }
    console.log(`用户初始化: ID=${myUserId}, 昵称=${myUsername}`);
    // Update any UI elements that display username
    const usernameDisplay = document.getElementById('usernameDisplay'); // ASSUME you add this
    if (usernameDisplay) usernameDisplay.textContent = `欢迎, ${myUsername} (ID: ${myUserId})!`;
    return true;
}

function initializeMainUIDependencies() {
    dealCardsBtn = document.getElementById('dealCardsBtn'); // This button will change its role
    resetArrangementBtn = document.getElementById('resetArrangementBtn');
    submitArrangementBtn = document.getElementById('submitArrangementBtn');
    aiSuggestBtn = document.getElementById('aiSuggestBtn');

    // Example elements for room joining - ASSUME these IDs exist in your HTML
    roomInput = document.getElementById('roomCodeInput');
    joinRoomBtn = document.getElementById('joinRoomBtn');
    createRoomBtn = document.getElementById('createRoomBtn'); // You might not have a separate create button initially

    // Example elements for chat - ASSUME these IDs exist
    chatInput = document.getElementById('chatInput');
    sendChatBtn = document.getElementById('sendChatBtn');


    let allFound = true;
    [dealCardsBtn, resetArrangementBtn, submitArrangementBtn, aiSuggestBtn, roomInput, joinRoomBtn, createRoomBtn, chatInput, sendChatBtn].forEach(el => {
        if (!el) {
            // console.warn(`UI Element not found (check ID in HTML). This might be okay if element is optional.`);
            // For core buttons, it's an error.
            if (['dealCardsBtn', 'resetArrangementBtn', 'submitArrangementBtn', 'aiSuggestBtn'].includes(el?.id) && !el) {
                 console.error(`核心UI按钮 "${el?.id || '未知'}" 未找到!`);
                 allFound = false;
            }
        }
    });
    if (!allFound) {
        showGameMessage("部分界面元素加载不完整，某些功能可能无法使用。", "error");
    }
    return allFound;
}

// --- WebSocket Functions ---
function connectWebSocket(roomCode) {
    if (!roomCode || !roomCode.trim()) {
        showGameMessage("请输入有效的房间号。", "warning"); return;
    }
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        showGameMessage("正在尝试关闭现有连接...", "info");
        websocket.onclose = null; // Prevent previous onclose from firing unexpectedly
        websocket.close();
        // Give it a moment to close before re-opening
        setTimeout(() => attemptConnection(roomCode.toUpperCase()), 500);
        return;
    }
    attemptConnection(roomCode.toUpperCase());
}

function attemptConnection(roomCode) {
    if (!myUserId || !myUsername) {
        showGameMessage("无法连接：用户信息未初始化。", "error"); return;
    }
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // IMPORTANT: Replace 'localhost:8080' with your WebSocket server.
    const wsUrl = `${wsProtocol}//9525.ip-ddns.com:8080?userId=${myUserId}&username=${encodeURIComponent(myUsername)}&roomCode=${encodeURIComponent(roomCode)}`;
    // const wsUrl = `ws://localhost:8080?userId=${myUserId}&username=${encodeURIComponent(myUsername)}&roomCode=${encodeURIComponent(roomCode)}`;

    showGameMessage(`正在连接到房间 ${roomCode}...`, "info");
    configureButton('joinRoomBtn', { enable: false });
    if(createRoomBtn) configureButton('createRoomBtn', { enable: false });


    websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
        console.log("WebSocket连接已建立。房间:", roomCode);
        currentRoomCode = roomCode;
        showGameMessage(`已连接到房间 ${currentRoomCode}。等待其他玩家...`, "success");
        document.getElementById('roomControls').style.display = 'none'; // Hide room input section
        document.getElementById('gameArea').style.display = 'flex';    // Show game board area
        document.getElementById('chatArea').style.display = 'block';   // Show chat area
        configureButton(dealCardsBtn.id, { text:'准备 (0/4)', enable: true, show: true }); // Main button is now "Ready"
        if(roomInput) roomInput.value = ''; // Clear room input
        configureButton('joinRoomBtn', { enable: true }); // Re-enable for potential future use if disconnected
        if(createRoomBtn) configureButton('createRoomBtn', { enable: true });
    };

    websocket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("MSG RCVD:", data);
            handleWebSocketMessage(data);
        } catch (e) {
            console.error("解析WebSocket消息错误:", e, "原始数据:", event.data);
            showGameMessage("收到无法解析的服务器消息。", "warning");
        }
    };

    websocket.onerror = (event) => {
        console.error("WebSocket错误:", event);
        showGameMessage("WebSocket连接发生错误。", "error");
        resetToRoomEntryState();
    };

    websocket.onclose = (event) => {
        console.log("WebSocket连接已关闭。", event);
        if (currentRoomCode) { // Only show message if was actually in a room
            showGameMessage(event.wasClean ? `已从房间 ${currentRoomCode} 断开。` : `与房间 ${currentRoomCode} 意外断开。`, "warning");
        }
        resetToRoomEntryState();
    };
}

function resetToRoomEntryState() {
    currentRoomCode = null;
    websocket = null;
    roomPlayers = [];
    updatePlayerListUI();
    clearBoardForNewGame();
    document.getElementById('roomControls').style.display = 'block';
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('chatArea').style.display = 'none';
    configureButton(dealCardsBtn.id, {show:false}); // Hide game-specific ready button
    configureButton('aiSuggestBtn', { show: false });
    configureButton('resetArrangementBtn', { show: false });
    configureButton('submitArrangementBtn', { show: false });
    configureButton('joinRoomBtn', { enable: true });
    if(createRoomBtn) configureButton('createRoomBtn', { enable: true });
}


function sendWebSocketMessage(data) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(data));
    } else {
        console.warn("WebSocket未连接或未打开，无法发送消息:", data);
        showGameMessage("未连接到服务器，操作失败。", "error");
    }
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'error':
            showGameMessage(`服务器: ${data.message}`, "error");
            if (data.action === 'disconnect_room_full' || data.action === 'disconnect_invalid_room') {
                websocket?.close(); // Server initiated disconnect for specific reasons
                resetToRoomEntryState(); // Go back to room entry
            }
            break;
        case 'info': showGameMessage(`提示: ${data.message}`, "info"); break;
        case 'joined_room':
            roomPlayers = data.players || [];
            updatePlayerListUI();
            configureButton(dealCardsBtn.id, { text: `准备 (${roomPlayers.filter(p=>p.isReady).length}/${roomPlayers.length})`, enable: true });
            break;
        case 'player_joined':
        case 'player_left':
        case 'player_status_changed':
            roomPlayers = data.players || [];
            updatePlayerListUI();
            const actionText = data.type === 'player_joined' ? '加入房间' :
                               data.type === 'player_left' ? '离开房间' : '状态改变';
            const playerName = data.username || data.player?.username || '有玩家';
            if (data.type !== 'player_status_changed' || data.userId !== myUserId) { // Don't announce my own ready status change
                 showGameMessage(`${playerName} ${actionText}`, "info");
            }
            // Update ready button text
            if (dealCardsBtn.style.display !== 'none') { // If ready button is visible
                 configureButton(dealCardsBtn.id, { text: `准备 (${roomPlayers.filter(p=>p.isReady).length}/${roomPlayers.length})` });
            }
            break;
        case 'game_start':
            showGameMessage(`第 ${data.roundNumber} 局开始！请理牌。`, "info");
            currentRawHand = data.hand;
            aiSuggestedHashes = [];
            initializeArrangement(data.hand);
            configureButton('aiSuggestBtn', { show: true, enable: true });
            configureButton('resetArrangementBtn', { show: true, enable: true });
            configureButton(dealCardsBtn.id, { show: false });
            document.getElementById('gameResultsArea').style.display = 'none'; // Hide previous results
            roomPlayers.forEach(p => p.hasSubmitted = false); // Reset submission status for UI
            updatePlayerListUI();
            break;
        case 'arranging_phase_start':
             showGameMessage(data.message || "理牌阶段开始！", "info");
            break;
        case 'player_submitted_piles':
            showGameMessage(`${data.username} 已提交牌型。`, "info");
            const pSubmit = roomPlayers.find(p => p.userId === data.userId);
            if (pSubmit) pSubmit.hasSubmitted = true;
            updatePlayerListUI();
            break;
        case 'round_results':
            showGameMessage(`第 ${data.roundNumber} 局结束！`, "success");
            displayRoundResults(data.results);
            clearBoardForNewGame();
            configureButton(dealCardsBtn.id, { text: `准备下局 (${roomPlayers.filter(p=>p.isReady).length}/${roomPlayers.length})`, show: true, enable: true });
            configureButton('aiSuggestBtn', {show: false});
            configureButton('resetArrangementBtn', {show: false});
            configureButton('submitArrangementBtn', {show: false});
            roomPlayers.forEach(p => { p.isReady = false; p.hasSubmitted = false; });
            updatePlayerListUI();
            break;
        case 'new_chat_message':
            displayChatMessage(data.username, data.message);
            break;
        default: console.warn("收到未知类型的WebSocket消息:", data);
    }
}

// --- UI Update Functions ---
function updatePlayerListUI() {
    const playerListDiv = document.getElementById('playerListDisplayArea');
    if (!playerListDiv) return;
    playerListDiv.innerHTML = `<h3>房间玩家 (${roomPlayers.length}/${/* Max Players e.g. 4 */''}):</h3>`;
    if (roomPlayers.length === 0 && currentRoomCode) {
        playerListDiv.innerHTML += '<p>等待玩家加入...</p>';
    }
    roomPlayers.forEach(p => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-status-item';
        let statusIcons = "";
        if (p.hasSubmitted) statusIcons += " ✅"; // Submitted
        else if (p.isReady) statusIcons += " 👍";   // Ready

        playerDiv.textContent = `${p.seat || '?'}. ${p.username} ${statusIcons}`;
        if (p.userId === myUserId) playerDiv.style.cssText = "font-weight: bold; color: #58a6ff;";
        playerListDiv.appendChild(playerDiv);
    });
}

function displayRoundResults(resultsData) {
    const resultsDiv = document.getElementById('gameResultsArea');
    if (!resultsDiv) { console.error("gameResultsArea not found"); return; }
    let resultHtml = "<h2>本局结算</h2>";
    resultsData.forEach(playerResult => {
        resultHtml += `<div class="player-result"><h4>玩家: ${playerResult.username} (ID: ${playerResult.userId})</h4>`;
        if(playerResult.isFoulA) {
            resultHtml += "<p class='foul-text'>此玩家犯规（倒水）!</p>";
        } else if (playerResult.pileDetails) {
            resultHtml += `<p>头墩: ${playerResult.pileDetails.head?.name || '未提交/错误'}</p>`;
            resultHtml += `<p>中墩: ${playerResult.pileDetails.middle?.name || '未提交/错误'}</p>`;
            resultHtml += `<p>尾墩: ${playerResult.pileDetails.tail?.name || '未提交/错误'}</p>`;
        }
        let totalPlayerScoreThisRound = 0;
        if (playerResult.comparisons && playerResult.comparisons.length > 0) {
            resultHtml += "<h5>比牌详情:</h5><ul>";
            playerResult.comparisons.forEach(comp => {
                resultHtml += `<li>对 ${comp.opponentUsername}: <span class="${comp.scoreChange > 0 ? 'score-win' : (comp.scoreChange < 0 ? 'score-loss' : '')}">${comp.scoreChange > 0 ? '+' : ''}${comp.scoreChange}</span> 水</li>`;
                totalPlayerScoreThisRound += comp.scoreChange;
            });
            resultHtml += "</ul>";
        }
        resultHtml += `<p><strong>本局总得分: <span class="${totalPlayerScoreThisRound > 0 ? 'score-win' : (totalPlayerScoreThisRound < 0 ? 'score-loss' : '')}">${totalPlayerScoreThisRound > 0 ? '+' : ''}${totalPlayerScoreThisRound}</span> 水</strong></p>`;
        resultHtml += `</div><hr class="result-hr">`;
    });
    resultsDiv.innerHTML = resultHtml;
    resultsDiv.style.display = 'block';
}

function displayChatMessage(username, message) {
    const chatLogDiv = document.getElementById('chatLogArea');
    if (!chatLogDiv) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message-item';
    const userStrong = document.createElement('strong');
    userStrong.textContent = username;
    if (username === myUsername) userStrong.style.color = '#58a6ff'; // Highlight my messages

    msgDiv.appendChild(userStrong);
    msgDiv.appendChild(document.createTextNode(`: ${message}`)); // Sanitize message if from untrusted source
    chatLogDiv.appendChild(msgDiv);
    chatLogDiv.scrollTop = chatLogDiv.scrollHeight; // Auto-scroll
}

// --- Event Handlers ---
async function handleMainButtonAction() { // Main button: Join Room / Ready / Next Round
    if (!dealCardsBtn) return;
    if (!currentRoomCode || !websocket || websocket.readyState !== WebSocket.OPEN) {
        // Not in a room, so this is "Join/Create Room"
        const roomCodeValue = roomInput ? roomInput.value.trim().toUpperCase() : '';
        if (!roomCodeValue) {
            showGameMessage("请输入房间号。", "warning");
            roomInput?.focus();
            return;
        }
        connectWebSocket(roomCodeValue);
    } else { // In a room, this is "Ready" or "Next Round"
        sendWebSocketMessage({ type: 'player_ready', isReady: true });
        configureButton(dealCardsBtn.id, { enable: false, text: '等待开始...' });
        showGameMessage("已准备，等待其他玩家...", "info");
    }
}

function handleReset() { /* ... (same as before, ensure currentRawHand check) ... */
    if (!resetArrangementBtn) return;
    if (currentRawHand.length === 0) { showGameMessage("请等待发牌后再重置。", "info"); return; }
    aiSuggestedHashes = []; resetArrangement();
}
async function handleSubmit() { /* ... (same as before, ensure getArrangedPilesData pre-validation) ... */
    if (!submitArrangementBtn) return;
    const arrangedPiles = getArrangedPilesData();
    if (!arrangedPiles) { return; }
    showGameMessage("正在提交牌型...", "info");
    configureButton('submitArrangementBtn', { enable: false });
    configureButton('resetArrangementBtn', { enable: false });
    configureButton('aiSuggestBtn', { enable: false });
    sendWebSocketMessage({ type: 'submit_piles', piles: arrangedPiles });
}
async function handleAISuggest() { /* ... (same as before) ... */
    if (!aiSuggestBtn) return;
    if (currentRawHand.length !== 13) { showGameMessage("请等待发牌获得完整手牌。", "warning"); return; }
    showGameMessage("AI正在思考...", "info");
    configureButton('aiSuggestBtn', { enable: false });
    try {
        const result = await fetchAISuggestion(currentRawHand, aiSuggestedHashes);
        if (result.success && result.arrangement) {
            applyAISuggestion(result.arrangement);
            if (result.hash && !aiSuggestedHashes.includes(result.hash)) aiSuggestedHashes.push(result.hash);
            if (result.all_tried_reset) { aiSuggestedHashes = []; if (result.hash) aiSuggestedHashes.push(result.hash); }
        } else {
            showGameMessage(result.message || "AI没有新的建议。", "info");
            if (result.message && result.message.includes("没有更多")) { aiSuggestedHashes = []; showGameMessage("AI已展示所有组合，再次点击将循环。", "info");}
        }
    } catch (error) { showGameMessage(`AI建议错误: ${error.message}`, "error"); console.error(error);
    } finally { configureButton('aiSuggestBtn', { enable: true }); }
}
function handleSendChat() {
    if (!chatInput || !sendChatBtn) return;
    const message = chatInput.value.trim();
    if (message) {
        sendWebSocketMessage({ type: 'chat_message', message: message });
        chatInput.value = '';
    }
    chatInput.focus();
}


// --- Initial Setup ---
function init() {
    if (!initializeUserIdentity()) return; // Stop if user cancels identity prompts
    if (!initializeMainUIDependencies()) return; // Stop if core buttons are missing

    initializeArrangeUIDependencies(); // From arrange.js

    // Initial button states for room entry
    resetToRoomEntryState(); // Sets up UI for joining/creating a room

    // Event Listeners
    if (joinRoomBtn) joinRoomBtn.addEventListener('click', handleMainButtonAction); // Join button uses main action
    if (createRoomBtn) { // If you have a separate create button
        createRoomBtn.addEventListener('click', () => {
            const newRoomCode = prompt("输入新房间名 (推荐3-6位字母数字):", "ROOM" + Math.floor(Math.random()*1000))?.toUpperCase();
            if (newRoomCode) {
                if (roomInput) roomInput.value = newRoomCode; // Populate input
                handleMainButtonAction(); // Then trigger join/create
            }
        });
    }
    if (dealCardsBtn) dealCardsBtn.addEventListener('click', handleMainButtonAction); // Main game button
    if (aiSuggestBtn) aiSuggestBtn.addEventListener('click', handleAISuggest);
    if (resetArrangementBtn) resetArrangementBtn.addEventListener('click', handleReset);
    if (submitArrangementBtn) submitArrangementBtn.addEventListener('click', handleSubmit);
    if (sendChatBtn) sendChatBtn.addEventListener('click', handleSendChat);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSendChat(); });


    setupPileClickHandlers(); // From arrange.js
    // clearBoardForNewGame(); // Done by resetToRoomEntryState
    // updatePlayerListUI([]); // Done by resetToRoomEntryState
    showGameMessage("欢迎！请输入房间号加入或创建房间。", "info");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

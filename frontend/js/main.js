// frontend/js/main.js
import { showGameMessage, configureButton } from './ui.js';
import { fetchDealCards, fetchSubmitArrangement, fetchAISuggestion } from './api.js';
import {
    initializeArrangeUIDependencies,
    initializeArrangement,
    resetArrangement,
    getArrangedPilesData,
    setupPileClickHandlers,
    clearBoardForNewGame,
    applyAISuggestion
} from './arrange.js';

// Declare button variables at the top level of the module
let dealCardsBtn, resetArrangementBtn, submitArrangementBtn, aiSuggestBtn;

let websocket = null;
let currentRoomCode = null;
let myUserId = null;
let myUsername = "玩家"; // Default, should be updated after login/auth

// Store player data for the current room, received from WebSocket
let roomPlayers = []; // Array of {userId, username, seat, isReady, hasSubmitted (custom client flag)}

// Initialize User ID and Username (replace with actual authentication later)
function initializeUserIdentity() {
    // Try to get from localStorage first
    const storedUserId = localStorage.getItem('十三水_userId');
    const storedUsername = localStorage.getItem('十三水_username');

    if (storedUserId && storedUsername) {
        myUserId = parseInt(storedUserId);
        myUsername = storedUsername;
    } else {
        // Fallback to prompt if not found, and then store it
        const inputId = prompt("请输入您的用户ID (数字，例如101):", Math.floor(Math.random() * 1000) + 100);
        if (inputId === null) { // User cancelled prompt
            showGameMessage("需要用户ID才能开始游戏。", "error");
            return false; // Indicate failure
        }
        myUserId = parseInt(inputId);

        const inputName = prompt("请输入您的昵称:", "玩家" + myUserId);
        if (inputName === null) {
            showGameMessage("需要昵称才能开始游戏。", "error");
            return false;
        }
        myUsername = inputName;

        if (isNaN(myUserId) || !myUsername.trim()) {
            showGameMessage("无效的用户ID或昵称。", "error");
            myUserId = null; myUsername = "玩家"; // Reset
            return false;
        }
        localStorage.setItem('十三水_userId', myUserId.toString());
        localStorage.setItem('十三水_username', myUsername);
    }
    console.log(`User initialized: ID=${myUserId}, Username=${myUsername}`);
    return true;
}


function initializeMainUIDependencies() {
    dealCardsBtn = document.getElementById('dealCardsBtn');
    resetArrangementBtn = document.getElementById('resetArrangementBtn');
    submitArrangementBtn = document.getElementById('submitArrangementBtn');
    aiSuggestBtn = document.getElementById('aiSuggestBtn');

    if (!dealCardsBtn || !resetArrangementBtn || !submitArrangementBtn || !aiSuggestBtn) {
        console.error("MAIN.JS Error: One or more control buttons not found! Check HTML IDs.");
        // You might want to disable game functionality or show a generic error message to the user here
        showGameMessage("界面元素加载不完整，请刷新页面。", "error");
        return false; // Indicate failure
    }
    return true; // Indicate success
}

function connectWebSocket(roomCode) {
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        console.log("WebSocket已连接或正在连接，将先关闭旧连接。");
        websocket.close();
    }

    if (!myUserId || !myUsername) {
        showGameMessage("无法连接：用户信息未初始化。", "error");
        return;
    }

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // IMPORTANT: Replace 'localhost:8080' with your actual WebSocket server address and port
    // For production, this should be your domain and secure WebSocket port (e.g., wss://yourdomain.com/ws)
    // If your PHP WebSocket server is on a different machine/port, specify it here.
    // If Serv00 doesn't allow custom ports easily, you might need a reverse proxy or use a PaaS for WebSockets.
    const wsUrl = `${wsProtocol}//9525.ip-ddns.com:8080?userId=${myUserId}&username=${encodeURIComponent(myUsername)}&roomCode=${encodeURIComponent(roomCode)}`;
    // const wsUrl = `ws://localhost:8080?userId=${myUserId}&username=${encodeURIComponent(myUsername)}&roomCode=${encodeURIComponent(roomCode)}`;


    showGameMessage(`正在连接到房间 ${roomCode}...`, "info");
    websocket = new WebSocket(wsUrl);

    websocket.onopen = function(event) {
        console.log("WebSocket连接已建立。房间:", roomCode);
        showGameMessage(`已连接到房间 ${roomCode}。`, "success");
        currentRoomCode = roomCode;
        // UI changes for being in a room (e.g., hide room join form, show game area)
        // The "dealCardsBtn" might now function as a "Ready" button.
        configureButton('dealCardsBtn', { text:'准备', enable: true, show: true });
    };

    websocket.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            console.log("收到消息:", data); // Log all messages for debugging
            handleWebSocketMessage(data);
        } catch (e) {
            console.error("解析WebSocket消息错误:", e, "原始数据:", event.data);
            showGameMessage("收到无法解析的服务器消息。", "warning");
        }
    };

    websocket.onerror = function(event) {
        console.error("WebSocket错误:", event);
        showGameMessage("WebSocket连接发生错误。", "error");
        // Potentially try to reconnect or guide user
    };

    websocket.onclose = function(event) {
        console.log("WebSocket连接已关闭。原因:", event.reason, "代码:", event.code, "是否正常关闭:", event.wasClean);
        showGameMessage(event.wasClean ? "已断开连接。" : "与服务器意外断开。", "warning");
        currentRoomCode = null;
        websocket = null; // Clear websocket object
        // Reset UI to a state where user can try to join/create again
        configureButton('dealCardsBtn', { text:'发牌/加入', enable: true, show: true }); // Reset button
        configureButton('aiSuggestBtn', { show: false });
        configureButton('resetArrangementBtn', { show: false });
        configureButton('submitArrangementBtn', { show: false });
        clearBoardForNewGame(); // Clear the game board UI
        updatePlayerListUI([]); // Clear player list UI
    };
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
            showGameMessage(`服务器消息: ${data.message}`, "error");
            if (data.action === 'disconnect') websocket?.close(); // Server requests disconnect
            break;
        case 'info': // General info message from server
            showGameMessage(`提示: ${data.message}`, "info");
            break;
        case 'joined_room':
            console.log("成功加入房间", data.roomCode, "我的信息", data.yourData);
            roomPlayers = data.players || []; // Initial player list
            updatePlayerListUI();
            // "dealCardsBtn" is now "Ready" button
            configureButton('dealCardsBtn', { text: '准备', enable: true, show: true });
            break;
        case 'player_joined':
        case 'player_left':
        case 'player_status_changed':
            roomPlayers = data.players || [];
            updatePlayerListUI();
            const actionText = data.type === 'player_joined' ? '加入房间' :
                               data.type === 'player_left' ? '离开房间' : '状态改变';
            showGameMessage(`${data.username || data.player?.username || '有玩家'} ${actionText}`, "info");
            break;
        case 'game_start':
            showGameMessage(`第 ${data.roundNumber} 局开始！请理牌。`, "info");
            currentRawHand = data.hand;
            aiSuggestedHashes = []; // Reset AI history for new round
            initializeArrangement(data.hand);
            configureButton('aiSuggestBtn', { show: true, enable: true });
            configureButton('resetArrangementBtn', { show: true, enable: true });
            // Submit button visibility handled by arrange.js logic (checkAndHandleGameStateTransition)
            configureButton('dealCardsBtn', { show: false }); // Hide "Ready" button during game
            break;
        case 'arranging_phase_start':
             showGameMessage(data.message || "理牌阶段开始！", "info");
             // UI already set up by 'game_start'
            break;
        case 'player_submitted_piles':
            showGameMessage(`${data.username} 已提交牌型。`, "info");
            const pSubmit = roomPlayers.find(p => p.userId === data.userId);
            if (pSubmit) pSubmit.hasSubmitted = true; // Custom client-side flag
            updatePlayerListUI();
            break;
        case 'round_results':
            showGameMessage(`第 ${data.roundNumber} 局结束！`, "success");
            displayRoundResults(data.results);
            // clearBoardForNewGame(); // Don't clear immediately, let user see results
            // Instead, prepare for next round
            configureButton('dealCardsBtn', { text: '准备下局', show: true, enable: true });
            configureButton('aiSuggestBtn', {show: false});
            configureButton('resetArrangementBtn', {show: false});
            configureButton('submitArrangementBtn', {show: false});
            roomPlayers.forEach(p => { p.isReady = false; p.hasSubmitted = false; }); // Reset player states for UI
            updatePlayerListUI();
            break;
        case 'new_chat_message':
            displayChatMessage(data.username, data.message);
            break;
        default:
            console.warn("收到未知类型的WebSocket消息:", data);
    }
}

function updatePlayerListUI() {
    console.log("更新玩家列表UI:", roomPlayers);
    const playerListDiv = document.getElementById('playerListDisplayArea'); // ASSUME you add this div to index.html
    if (playerListDiv) {
        playerListDiv.innerHTML = '<h3>当前玩家:</h3>';
        if (roomPlayers.length === 0 && currentRoomCode) {
            playerListDiv.innerHTML += '<p>等待其他玩家加入...</p>';
        }
        roomPlayers.forEach(p => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-status-item';
            let statusText = '';
            if (p.hasSubmitted) statusText = '(已提交)';
            else if (p.isReady) statusText = '(已准备)';

            playerDiv.textContent = `${p.seat || '?'}. ${p.username} ${statusText}`;
            if (p.userId === myUserId) playerDiv.style.fontWeight = 'bold';
            playerListDiv.appendChild(playerDiv);
        });
    }
}

function displayRoundResults(results) {
    console.log("本局结果:", results);
    let resultHtml = "<h2>本局结算</h2>";
    results.forEach(playerResult => {
        resultHtml += `<div class="player-result"><h4>玩家: ${playerResult.username} (ID: ${playerResult.userId})</h4>`;
        if(playerResult.isFoulA) { // Assuming 'isFoulA' means this player fouled
            resultHtml += "<p style='color:red;'>此玩家犯规（倒水）!</p>";
        } else if (playerResult.pileDetails) {
            resultHtml += `<p>头墩: ${playerResult.pileDetails.head?.name || 'N/A'}</p>`;
            resultHtml += `<p>中墩: ${playerResult.pileDetails.middle?.name || 'N/A'}</p>`;
            resultHtml += `<p>尾墩: ${playerResult.pileDetails.tail?.name || 'N/A'}</p>`;
        }
        let totalPlayerScoreThisRound = 0;
        if (playerResult.comparisons && playerResult.comparisons.length > 0) {
            resultHtml += "<h5>比牌详情:</h5><ul>";
            playerResult.comparisons.forEach(comp => {
                resultHtml += `<li>对 ${comp.opponentUsername}: ${comp.scoreChange > 0 ? '+' : ''}${comp.scoreChange} 水</li>`;
                totalPlayerScoreThisRound += comp.scoreChange;
            });
            resultHtml += "</ul>";
        } else if (!playerResult.isFoulA) {
             resultHtml += "<p>等待其他玩家完成...</p>" // Or if it's a solo result display
        }
        resultHtml += `<p><strong>本局总得分: ${totalPlayerScoreThisRound} 水</strong></p>`;
        resultHtml += `</div><hr>`;
    });

    // Create a modal or update a specific div for results
    // For now, using simpleMessage footer or a new dedicated div
    const resultsDiv = document.getElementById('gameResultsArea'); // ASSUME you add this div
    if (resultsDiv) {
        resultsDiv.innerHTML = resultHtml;
        resultsDiv.style.display = 'block'; // Show it
        // Hide it after some time or when "Ready for next round" is clicked
    } else {
        // Fallback to alert for critical information if no dedicated div
        alert(resultHtml.replace(/<[^>]*>/g, '\n')); // Basic text version for alert
    }
    showGameMessage("对局结束。点击“准备下局”开始新一轮。", "info");
}

function displayChatMessage(username, message) {
    console.log(`聊天 [${username}]: ${message}`);
    const chatLogDiv = document.getElementById('chatLogArea'); // ASSUME you add this div
    if (chatLogDiv) {
        const msgDiv = document.createElement('div');
        const userSpan = document.createElement('strong');
        userSpan.textContent = `${username}: `;
        msgDiv.appendChild(userSpan);
        msgDiv.appendChild(document.createTextNode(message)); // Sanitize message if needed
        chatLogDiv.appendChild(msgDiv);
        chatLogDiv.scrollTop = chatLogDiv.scrollHeight;
    }
}

let currentRawHand = [];
let aiSuggestedHashes = [];

async function handleMainButtonAction() { // Replaces handleDealCards
    if (!dealCardsBtn) return;

    if (!currentRoomCode || !websocket || websocket.readyState !== WebSocket.OPEN) {
        const roomToJoin = prompt("输入要加入或创建的房间号 (例如 ABCDE):", "DEMO1")?.toUpperCase();
        if (roomToJoin && myUserId) {
            connectWebSocket(roomToJoin);
            // Button text will be updated in websocket.onopen or on error
            configureButton('dealCardsBtn', {text: '连接中...', enable: false});
        } else if (myUserId) { // User cancelled room prompt but ID exists
            showGameMessage("请输入房间号以加入或创建。", "info");
        } else { // No user ID
            // initializeUserIdentity should have been called and failed, or user needs to "login"
            if(initializeUserIdentity()){ // Try again to get user identity
                 handleMainButtonAction(); // Recurse if identity is now set
            }
        }
        return;
    }

    // If connected, this button is likely "Ready" or "Start Next Round"
    sendWebSocketMessage({ type: 'player_ready', isReady: true });
    configureButton('dealCardsBtn', { enable: false, text: '等待开始...' });
    showGameMessage("已准备，等待其他玩家或服务器开始...", "info");
}

function handleReset() {
    if (!resetArrangementBtn) return;
    if (currentRawHand.length === 0) { // Only allow reset if cards are dealt
        showGameMessage("请等待发牌后再重置。", "info");
        return;
    }
    aiSuggestedHashes = [];
    resetArrangement(); // arrange.js local reset
}

async function handleSubmit() {
    if (!submitArrangementBtn) return;
    const arrangedPiles = getArrangedPilesData(); // Performs pre-validation
    if (!arrangedPiles) { return; }

    showGameMessage("正在提交牌型...", "info");
    configureButton('submitArrangementBtn', { enable: false });
    configureButton('resetArrangementBtn', { enable: false }); // Also disable reset
    configureButton('aiSuggestBtn', { enable: false });     // And AI

    sendWebSocketMessage({ type: 'submit_piles', piles: arrangedPiles });
}

async function handleAISuggest() {
    if (!aiSuggestBtn) return;
    if (currentRawHand.length !== 13) {
        showGameMessage("请等待发牌获得完整手牌。", "warning"); return;
    }

    showGameMessage("AI正在思考...", "info");
    configureButton('aiSuggestBtn', { enable: false });
    // Optionally disable reset while AI is thinking, re-enable in finally
    // configureButton('resetArrangementBtn', { enable: false });

    try {
        const result = await fetchAISuggestion(currentRawHand, aiSuggestedHashes);
        if (result.success && result.arrangement) {
            applyAISuggestion(result.arrangement); // arrange.js function
            if (result.hash && !aiSuggestedHashes.includes(result.hash)) {
                aiSuggestedHashes.push(result.hash);
            }
            if (result.all_tried_reset) {
                aiSuggestedHashes = [];
                if (result.hash) aiSuggestedHashes.push(result.hash);
            }
        } else {
            showGameMessage(result.message || "AI没有新的建议。", "info");
            if (result.message && result.message.includes("没有更多")) {
                 aiSuggestedHashes = [];
                 showGameMessage("AI已展示所有组合，再次点击将循环。", "info");
            }
        }
    } catch (error) {
        showGameMessage(`AI建议错误: ${error.message}`, "error");
        console.error(error);
    } finally {
        configureButton('aiSuggestBtn', { enable: true });
        // configureButton('resetArrangementBtn', { enable: true });
    }
}


function init() {
    if (!initializeUserIdentity()) {
        // If user identity fails (e.g. cancelled prompts), stop further initialization
        return;
    }
    if (!initializeMainUIDependencies()) {
        // If main UI elements are missing, stop
        return;
    }
    initializeArrangeUIDependencies(); // From arrange.js

    if (dealCardsBtn) dealCardsBtn.addEventListener('click', handleMainButtonAction); // Changed to main action
    if (aiSuggestBtn) aiSuggestBtn.addEventListener('click', handleAISuggest);
    if (resetArrangementBtn) resetArrangementBtn.addEventListener('click', handleReset);
    if (submitArrangementBtn) submitArrangementBtn.addEventListener('click', handleSubmit);

    setupPileClickHandlers(); // From arrange.js
    clearBoardForNewGame();   // From arrange.js
    updatePlayerListUI([]);   // Clear player list UI initially
    showGameMessage("欢迎！点击“加入/创建房间”开始。", "info");

    configureButton('aiSuggestBtn', { show: false });
    configureButton('resetArrangementBtn', { show: false });
    configureButton('submitArrangementBtn', { show: false });
    configureButton('dealCardsBtn', { text: '加入/创建房间', show: true, enable: true });
}

// Ensure DOM is loaded before running init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init(); // DOMContentLoaded has already fired
}

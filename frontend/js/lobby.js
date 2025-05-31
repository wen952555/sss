// frontend/js/lobby.js (更详细的DOM元素检查)

let currentUserData = null;
let matchmakingPollInterval = null;
let matchmakingStartTime = null;
let isInMatchmakingQueue = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Lobby.js: DOMContentLoaded event fired."); // 确认事件触发

    // 身份验证检查 (保持不变)
    if (localStorage.getItem('isLoggedIn') !== 'true') { /* ... */ window.location.href = 'index.html'; return; }
    const cuJSON = localStorage.getItem('currentUser');
    if (!cuJSON) { /* ... */ window.location.href = 'index.html'; return; }
    currentUserData = JSON.parse(cuJSON);
    if (!currentUserData || typeof currentUserData.id === 'undefined') { /* ... */ window.location.href = 'index.html'; return; }

    const userNicknameEl = document.getElementById('userNickname');
    const userPointsEl = document.getElementById('userPoints');
    if (userNicknameEl) userNicknameEl.textContent = currentUserData.nickname || '玩家';
    if (userPointsEl) userPointsEl.textContent = currentUserData.points || '0';

    // --- 详细的DOM元素获取和检查 ---
    const domElements = {
        startMatchmakingButton: document.getElementById('startMatchmakingButton'),
        enterTrialRoomButton: document.getElementById('enterTrialRoomButton'),
        cancelMatchmakingButton: document.getElementById('cancelMatchmakingButton'),
        matchmakingSection: document.getElementById('matchmakingSection'),
        matchmakingStatusArea: document.getElementById('matchmakingStatusArea'),
        matchmakingTimeSpan: document.getElementById('matchmakingTime'),
        lobbyMessageDiv: document.getElementById('lobbyMessage'),
        logoutButton: document.getElementById('logoutButton'),
        // 确保也检查之前可能遗漏的元素
        userNicknameDisplay: userNicknameEl, // 已在上面获取
        userPointsDisplay: userPointsEl      // 已在上面获取
    };

    let missingElements = [];
    for (const key in domElements) {
        if (!domElements[key]) {
            missingElements.push(key + " (expected id: " + key.replace(/Display$|El$|Button$|Section$|Area$|Span$|Div$/, '') + ")");
            // 尝试从 key 生成预期的 id，例如 'startMatchmakingButton' 的预期 id 是 'startMatchmakingButton'
            // 对于 userNicknameEl，我们直接用它的 id
            if (key === 'userNicknameDisplay' && !domElements[key]) missingElements.pop(); missingElements.push("userNickname (expected id: userNickname)");
            if (key === 'userPointsDisplay' && !domElements[key]) missingElements.pop(); missingElements.push("userPoints (expected id: userPoints)");
        }
    }

    if (missingElements.length > 0) {
        const errorMessage = "Lobby page critical DOM elements are missing: " + missingElements.join(', ') + ". Aborting setup.";
        console.error(errorMessage);
        // 尝试显示到页面上，如果 lobbyMessageDiv 存在的话
        if (domElements.lobbyMessageDiv) {
            showMessage(domElements.lobbyMessageDiv, "页面初始化失败: 关键元素缺失。详情请查看控制台。", "error");
        } else {
            // 如果连 lobbyMessageDiv 都没有，只能 alert
            alert("页面初始化失败: 关键元素缺失，请检查控制台！\nMissing: " + missingElements.join(', '));
        }
        return; // 中止后续的 lobby.js 初始化
    }
    console.log("Lobby.js: All critical DOM elements found.");


    // --- 事件监听 (只有在所有元素都找到后才添加) ---
    domElements.startMatchmakingButton.addEventListener('click', handleStartMatchmaking);
    domElements.enterTrialRoomButton.addEventListener('click', handleEnterTrialRoom);
    domElements.cancelMatchmakingButton.addEventListener('click', handleCancelMatchmaking);
    domElements.logoutButton.addEventListener('click', handleLogout);

    updateMatchmakingButtonUI(false);
    checkAndRestoreMatchmakingState();
});


// ... (handleStartMatchmaking, handleEnterTrialRoom, handleCancelMatchmaking, stopMatchmakingAndClearState 等函数定义保持不变) ...
// ... (确保这些函数内部使用的也是 domElements.elementName 或者在函数开头重新获取并检查)

// 示例修改 updateMatchmakingButtonUI
function updateMatchmakingButtonUI(isMatching) {
    // 从 domElements 获取，因为它们已经过验证
    const startBtn = document.getElementById('startMatchmakingButton'); // 或者 domElements.startMatchmakingButton
    const cancelBtn = document.getElementById('cancelMatchmakingButton');
    const statusArea = document.getElementById('matchmakingStatusArea');
    const matchmakingSectionEl = document.getElementById('matchmakingSection');

    // 再次检查以防万一（理论上如果初始化检查通过，这里应该都存在）
    if(!startBtn || !cancelBtn || !statusArea || !matchmakingSectionEl) {
        console.error("updateMatchmakingButtonUI: One or more UI elements for matchmaking buttons/status are missing.");
        return;
    }

    if (isMatching) {
        startBtn.disabled = true;
        startBtn.textContent = "正在匹配中...";
        matchmakingSectionEl.style.display = 'block';
        statusArea.style.display = 'block';
    } else {
        startBtn.disabled = false;
        startBtn.textContent = "开始匹配";
        matchmakingSectionEl.style.display = 'none';
        statusArea.style.display = 'none';
    }
}

// 同样，其他函数如 pollMatchmakingStatus, updateMatchmakingTimer 等如果直接操作DOM，
// 也应该使用 domElements 中的引用，或者在使用前重新获取并检查。
// 例如，在 pollMatchmakingStatus 中:
// const matchmakingTimeEl = domElements.matchmakingTimeSpan;
// if (matchmakingTimeEl) { ... }

// --- 确保 ui.js 中的函数也被正确使用 ---
// 例如，showMessage 和 displayError 的第一个参数应该是元素本身或其ID字符串
// function showMessage(elementOrId, message, type = 'info')
// function displayError(elementOrId, message)


// 把之前的 handleStartMatchmaking 等函数粘贴到这里，并确保它们使用验证过的 domElements
// 或者在函数内部通过 getElementById 获取并检查。

async function handleStartMatchmaking() {
    const lobbyMessageDiv = document.getElementById('lobbyMessage'); // 重新获取并检查
    if (!lobbyMessageDiv) { console.error("lobbyMessageDiv not found in handleStartMatchmaking"); return; }

    if (isInMatchmakingQueue) return;
    try {
        showMessage(lobbyMessageDiv, '', 'info');
        showLoading(lobbyMessageDiv, true, '正在加入匹配队列...'); // showLoading 内部会获取元素
        const response = await roomsAPI.requestMatchmaking();
        showLoading(lobbyMessageDiv, false); // 确保传递的是元素或ID

        if (response && response.status === 'queued') {
            isInMatchmakingQueue = true;
            matchmakingStartTime = Date.now();
            updateMatchmakingButtonUI(true);
            showMessage(lobbyMessageDiv, '已加入匹配队列！您现在可以进入试玩房间或等待匹配。', 'success');
            setTempState('matchmakingState', { isMatching: true, startTime: matchmakingStartTime });

            if (matchmakingPollInterval) clearInterval(matchmakingPollInterval);
            matchmakingPollInterval = setInterval(pollMatchmakingStatus, 3000);
            pollMatchmakingStatus();
        } else {
            const errorMsg = response?.error?.message || response?.message || '加入匹配队列失败。';
            showMessage(lobbyMessageDiv, errorMsg, 'error');
        }
    } catch (error) { /* ... */ }
}

async function handleEnterTrialRoom() {
    const lobbyMessageDiv = document.getElementById('lobbyMessage');
    if (!lobbyMessageDiv) { console.error("lobbyMessageDiv not found in handleEnterTrialRoom"); return; }
    // ... (其他逻辑同之前，确保showMessage/showLoading使用正确的元素或ID) ...
    try {
        showMessage(lobbyMessageDiv, '', 'info');
        showLoading(lobbyMessageDiv, true, '正在准备试玩房间...');
        const response = await roomsAPI.startTrialGame();
        showLoading(lobbyMessageDiv, false);
        if (response && response.room_id && response.game_id) { /* ... */ }
        else { /* ... */ }
    } catch (error) { /* ... */ }
}

async function handleCancelMatchmaking() {
    const lobbyMessageDiv = document.getElementById('lobbyMessage');
    if (!lobbyMessageDiv) { console.error("lobbyMessageDiv not found in handleCancelMatchmaking"); return; }
    // ... (其他逻辑同之前) ...
    try {
        showMessage(lobbyMessageDiv, '', 'info');
        showLoading(lobbyMessageDiv, true, '正在取消匹配...');
        const response = await roomsAPI.cancelMatchmaking();
        showLoading(lobbyMessageDiv, false);
        if (response && response.status === 'cancelled') { /* ... */ }
        else { /* ... */ }
    } catch (error) { /* ... */ }
}

function stopMatchmakingAndClearState() { /* ... (同之前) ... */ }
// updateMatchmakingButtonUI 已在上面修改

function updateMatchmakingTimer() {
    const matchmakingTimeEl = document.getElementById('matchmakingTime'); // 获取并检查
    if (isInMatchmakingQueue && matchmakingStartTime && matchmakingTimeEl) {
        const elapsedSeconds = Math.floor((Date.now() - matchmakingStartTime) / 1000);
        matchmakingTimeEl.textContent = elapsedSeconds;
    }
}

async function pollMatchmakingStatus() {
    const lobbyMessageDiv = document.getElementById('lobbyMessage'); // 获取并检查
    const matchmakingStatusArea = document.getElementById('matchmakingStatusArea'); // 获取并检查

    if (!lobbyMessageDiv || !matchmakingStatusArea) {
        console.error("Required elements for pollMatchmakingStatus not found.");
        if (matchmakingPollInterval) clearInterval(matchmakingPollInterval);
        matchmakingPollInterval = null;
        return;
    }
    // ... (其他逻辑同之前，确保showMessage使用正确的元素或ID) ...
    if (!isInMatchmakingQueue) { /* ... */ return; }
    updateMatchmakingTimer();
    try {
        const response = await roomsAPI.checkMatchmakingStatus();
        console.log("Lobby Poll - Matchmaking status:", response);
        if (response && response.status) {
            switch (response.status) {
                case 'queued':
                    showMessage(matchmakingStatusArea, `正在匹配中... (已等待 ${document.getElementById('matchmakingTime')?.textContent || 0} 秒)`, 'info');
                    break;
                case 'matched': /* ... */ break;
                case 'cancelled': case 'error': /* ... */ break;
                default: break;
            }
        } else { /* ... */ }
    } catch (error) { /* ... */ }
}

async function handleLogout() { /* ... (同之前) ... */ }

async function checkAndRestoreMatchmakingState() {
    const lobbyMessageDiv = document.getElementById('lobbyMessage');
    if (!lobbyMessageDiv) { console.error("lobbyMessageDiv not found in checkAndRestoreMatchmakingState"); return; }
    // ... (其他逻辑同之前，确保showMessage使用正确的元素或ID) ...
    const existingMatchState = getTempState('matchmakingState');
    if (existingMatchState && existingMatchState.isMatching) {
        isInMatchmakingQueue = true;
        matchmakingStartTime = existingMatchState.startTime || Date.now();
        updateMatchmakingButtonUI(true);
        showMessage(lobbyMessageDiv, '已恢复之前的匹配状态。', 'info');
        if (matchmakingPollInterval) clearInterval(matchmakingPollInterval);
        matchmakingPollInterval = setInterval(pollMatchmakingStatus, 3000);
        pollMatchmakingStatus();
    }
}

// 确保 ui.js 中的函数被正确定义和加载
// function showMessage(elementOrId, message, type = 'info') { ... }
// function displayError(elementOrId, message) { ... }
// function showLoading(elementOrId, show = true, message = '加载中...') { ... }
// function clearElement(elementOrId) { ... }
// function setTempState(key, value) { ... }
// function getTempState(key) { ... }
// function clearTempState(key) { ... }
